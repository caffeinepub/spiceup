import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { createActorWithConfig } from "../config";

export type CanisterStatus = "unknown" | "starting" | "ready" | "restarting";

// Poll every 5 seconds while restarting for fast reconnect
const POLL_INTERVAL_MS = 5_000;
// Initial probe delay on mount
const STARTUP_CHECK_DELAY_MS = 1_500;
// After this many consecutive network errors (not canister-stopped),
// slow down to avoid hammering the network
const SLOW_POLL_THRESHOLD = 6;
const SLOW_POLL_INTERVAL_MS = 15_000;

/**
 * Probes the canister by making a lightweight read-only call.
 * Returns:
 *   "ready"   - canister responded successfully
 *   "stopped" - canister is explicitly stopped/frozen (IC0508/IC0503)
 *   "error"   - transient network or unknown error (keep retrying)
 */
async function probeCanister(): Promise<"ready" | "stopped" | "error"> {
  try {
    const actor = await createActorWithConfig();
    await actor.getAllAssessments();
    return "ready";
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (
      msg.includes("IC0508") ||
      msg.includes("IC0503") ||
      (msg.toLowerCase().includes("canister") &&
        (msg.toLowerCase().includes("stopped") ||
          msg.toLowerCase().includes("frozen")))
    ) {
      return "stopped";
    }
    // Treat everything else as a transient error — keep retrying
    return "error";
  }
}

interface CanisterHealthState {
  status: CanisterStatus;
  attempts: number;
  consecutiveErrors: number;
  nextProbeIn: number;
}

/**
 * Hook that tracks canister health and actively polls when it's restarting.
 *
 * Key behaviours:
 * - Auto-probes once on mount; if canister is down, starts polling immediately.
 * - Polls every 5 s (slows to 15 s after 6 consecutive transient network errors).
 * - NEVER stops polling on its own — keeps trying until the canister responds.
 * - On recovery: flushes the stale actor and invalidates all queries.
 */
export function useCanisterHealth() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<CanisterHealthState>({
    status: "unknown",
    attempts: 0,
    consecutiveErrors: 0,
    nextProbeIn: 0,
  });

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const attemptsRef = useRef(0);
  const consecutiveErrorsRef = useRef(0);
  const hasInitialCheckRef = useRef(false);

  const stopPolling = useCallback(() => {
    isPollingRef.current = false;
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }, []);

  const startCountdown = useCallback((seconds: number) => {
    if (countdownRef.current) clearInterval(countdownRef.current);
    let remaining = Math.ceil(seconds);
    setState((s) => ({ ...s, nextProbeIn: remaining }));
    countdownRef.current = setInterval(() => {
      remaining -= 1;
      setState((s) => ({ ...s, nextProbeIn: Math.max(0, remaining) }));
      if (remaining <= 0 && countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    }, 1000);
  }, []);

  const runPollLoop = useCallback(async () => {
    if (!isPollingRef.current) return;

    attemptsRef.current += 1;
    setState((s) => ({ ...s, attempts: attemptsRef.current }));

    const result = await probeCanister();

    if (!isPollingRef.current) return;

    if (result === "ready") {
      stopPolling();
      consecutiveErrorsRef.current = 0;
      // Flush stale actor so a fresh one is created
      queryClient.removeQueries({ queryKey: ["actor"] });
      queryClient.invalidateQueries({
        predicate: (q) => !q.queryKey.includes("actor"),
      });
      setState({
        status: "ready",
        attempts: attemptsRef.current,
        consecutiveErrors: 0,
        nextProbeIn: 0,
      });
      return;
    }

    // For both "stopped" and transient "error", keep polling
    if (result === "error") {
      consecutiveErrorsRef.current += 1;
    } else {
      // canister explicitly stopped — reset error streak
      consecutiveErrorsRef.current = 0;
    }

    setState((s) => ({
      ...s,
      status: "restarting",
      consecutiveErrors: consecutiveErrorsRef.current,
    }));

    // Slow down if we're getting many consecutive transient errors
    const interval =
      consecutiveErrorsRef.current >= SLOW_POLL_THRESHOLD
        ? SLOW_POLL_INTERVAL_MS
        : POLL_INTERVAL_MS;

    startCountdown(interval / 1000);
    pollingRef.current = setTimeout(runPollLoop, interval);
  }, [queryClient, stopPolling, startCountdown]);

  /** Call this when an IC0508 / canister-stopped error is detected externally */
  const triggerRestart = useCallback(() => {
    if (isPollingRef.current) return;
    stopPolling();
    isPollingRef.current = true;
    attemptsRef.current = 0;
    consecutiveErrorsRef.current = 0;
    queryClient.removeQueries({ queryKey: ["actor"] });
    setState({
      status: "restarting",
      attempts: 0,
      consecutiveErrors: 0,
      nextProbeIn: POLL_INTERVAL_MS / 1000,
    });
    startCountdown(POLL_INTERVAL_MS / 1000);
    pollingRef.current = setTimeout(runPollLoop, POLL_INTERVAL_MS);
  }, [queryClient, stopPolling, startCountdown, runPollLoop]);

  /** Immediately probe without waiting for the next scheduled interval */
  const checkNow = useCallback(async () => {
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    // Ensure polling flag is on even if not currently polling
    isPollingRef.current = true;
    setState((s) => ({ ...s, nextProbeIn: 0 }));
    await runPollLoop();
  }, [runPollLoop]);

  /**
   * On mount: silent probe. If the canister is down, kick off polling
   * immediately so users see the banner without needing to trigger any action.
   */
  useEffect(() => {
    if (hasInitialCheckRef.current) return;
    hasInitialCheckRef.current = true;

    const timer = setTimeout(async () => {
      if (isPollingRef.current) return;
      const result = await probeCanister();
      if (result !== "ready" && !isPollingRef.current) {
        triggerRestart();
      }
    }, STARTUP_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [triggerRestart]);

  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  return {
    status: state.status,
    isRestarting: state.status === "restarting",
    attempts: state.attempts,
    nextProbeIn: state.nextProbeIn,
    triggerRestart,
    checkNow,
  };
}
