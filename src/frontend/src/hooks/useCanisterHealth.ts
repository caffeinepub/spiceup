import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useRef, useState } from "react";
import { createActorWithConfig } from "../config";

export type CanisterStatus = "unknown" | "starting" | "ready" | "restarting";

const MAX_POLL_ATTEMPTS = 40; // ~10 minutes at 15s intervals
const POLL_INTERVAL_MS = 15_000;
const INITIAL_DELAY_MS = 3_000;
// How long to wait (ms) on initial mount before the first probe
const STARTUP_CHECK_DELAY_MS = 2_000;

/**
 * Probes the canister by making a lightweight read-only call.
 * Returns true if the canister is reachable and running.
 */
async function probeCanister(): Promise<boolean> {
  try {
    const actor = await createActorWithConfig();
    // getAllAssessments is a cheap read-only call available on all deployments
    await actor.getAllAssessments();
    return true;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // IC0508 = canister stopped, IC0503 = canister out of cycles/frozen
    if (
      msg.includes("IC0508") ||
      msg.includes("IC0503") ||
      (msg.toLowerCase().includes("canister") &&
        msg.toLowerCase().includes("stopped"))
    ) {
      return false;
    }
    // Any other error (network glitch, timeout) -- treat as not-ready
    return false;
  }
}

interface CanisterHealthState {
  status: CanisterStatus;
  /** How many poll attempts have been made (for progress indication) */
  attempts: number;
  /** Estimated seconds until next probe */
  nextProbeIn: number;
}

/**
 * Hook that tracks canister health and actively polls when it's restarting.
 *
 * Automatically probes once on mount to detect a stopped canister after a
 * fresh deployment, so users see the banner immediately without needing to
 * click "Create New Assessment" first.
 *
 * Call `triggerRestart()` when an IC0508 error is detected manually. The hook
 * will start polling every POLL_INTERVAL_MS until the canister comes back, then
 * invalidate the actor cache so fresh queries are made.
 */
export function useCanisterHealth() {
  const queryClient = useQueryClient();
  const [state, setState] = useState<CanisterHealthState>({
    status: "unknown",
    attempts: 0,
    nextProbeIn: 0,
  });

  const pollingRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const attemptsRef = useRef(0);
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
    let remaining = seconds;
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

    const ready = await probeCanister();

    if (!isPollingRef.current) return; // was stopped while probing

    if (ready) {
      stopPolling();
      // Force-remove the stale actor so a fresh one is created
      queryClient.removeQueries({ queryKey: ["actor"] });
      // Invalidate all data queries so they refetch with the new actor
      queryClient.invalidateQueries({
        predicate: (q) => !q.queryKey.includes("actor"),
      });
      setState({
        status: "ready",
        attempts: attemptsRef.current,
        nextProbeIn: 0,
      });
      return;
    }

    if (attemptsRef.current >= MAX_POLL_ATTEMPTS) {
      stopPolling();
      setState((s) => ({ ...s, status: "restarting", nextProbeIn: 0 }));
      return;
    }

    // Schedule next probe
    startCountdown(POLL_INTERVAL_MS / 1000);
    pollingRef.current = setTimeout(runPollLoop, POLL_INTERVAL_MS);
  }, [queryClient, stopPolling, startCountdown]);

  /** Call this when an IC0508 / canister-stopped error is detected */
  const triggerRestart = useCallback(() => {
    if (isPollingRef.current) return; // already polling
    stopPolling();
    isPollingRef.current = true;
    attemptsRef.current = 0;
    // Force-remove stale actor immediately
    queryClient.removeQueries({ queryKey: ["actor"] });
    setState({
      status: "restarting",
      attempts: 0,
      nextProbeIn: INITIAL_DELAY_MS / 1000,
    });
    // Small initial delay before first probe
    startCountdown(INITIAL_DELAY_MS / 1000);
    pollingRef.current = setTimeout(runPollLoop, INITIAL_DELAY_MS);
  }, [queryClient, stopPolling, startCountdown, runPollLoop]);

  /** Manually trigger a single probe attempt (e.g., user clicks "Check Now") */
  const checkNow = useCallback(async () => {
    if (!isPollingRef.current) return;
    // Cancel the scheduled probe and run immediately
    if (pollingRef.current) {
      clearTimeout(pollingRef.current);
      pollingRef.current = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    setState((s) => ({ ...s, nextProbeIn: 0 }));
    await runPollLoop();
  }, [runPollLoop]);

  /**
   * On mount: do a single silent probe after a short delay.
   * If the canister is stopped (e.g., right after a fresh deployment), start
   * the polling loop so the amber banner appears immediately without the user
   * needing to click anything first.
   */
  useEffect(() => {
    if (hasInitialCheckRef.current) return;
    hasInitialCheckRef.current = true;

    const timer = setTimeout(async () => {
      // If we've already been triggered by an error, skip the startup probe
      if (isPollingRef.current) return;
      const ready = await probeCanister();
      if (!ready && !isPollingRef.current) {
        // Canister is not reachable -- start polling loop automatically
        triggerRestart();
      }
    }, STARTUP_CHECK_DELAY_MS);

    return () => clearTimeout(timer);
  }, [triggerRestart]);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopPolling();
  }, [stopPolling]);

  const isRestarting = state.status === "restarting";

  return {
    status: state.status,
    isRestarting,
    attempts: state.attempts,
    nextProbeIn: state.nextProbeIn,
    triggerRestart,
    checkNow,
  };
}
