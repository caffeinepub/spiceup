import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppContext } from "@/context/AppContext";
import { useActor } from "@/hooks/useActor";
import { useCreateAssessment } from "@/hooks/useQueries";
import { AlertCircle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CreateNewAssessmentModalProps {
  open: boolean;
  onClose: () => void;
  /** Called when a canister-stopped error is detected -- triggers health polling */
  onCanisterStopped?: () => void;
  /** True while the health hook is actively polling */
  isBackendRestarting?: boolean;
  /** True once the health hook confirmed the backend came back online */
  backendReady?: boolean;
  /** Seconds until the next health probe */
  nextProbeIn?: number;
  /** Let the user manually trigger an immediate health probe */
  checkNow?: () => Promise<void>;
}

export function CreateNewAssessmentModal({
  open,
  onClose,
  onCanisterStopped,
  isBackendRestarting = false,
  backendReady = false,
  nextProbeIn = 0,
  checkNow,
}: CreateNewAssessmentModalProps) {
  const [title, setTitle] = useState("");
  const createMutation = useCreateAssessment();
  const { actor, isFetching: actorFetching } = useActor();
  const { setCurrentAssessment, navigateTo } = useAppContext();

  // Track whether we had a canister-stopped failure while the modal was open,
  // so we can auto-retry once the backend comes back online.
  const pendingRetryRef = useRef<string | null>(null);
  const autoRetryInProgressRef = useRef(false);

  // The button should be clickable only when we're not waiting on anything
  const isBackendBusy = actorFetching || isBackendRestarting;
  const canSubmit =
    !!title.trim() && !createMutation.isPending && !isBackendBusy;

  const doCreate = useCallback(
    async (name: string) => {
      try {
        const newId = await createMutation.mutateAsync({ name });
        setCurrentAssessment(newId, name);
        toast.success("Assessment created successfully");
        setTitle("");
        pendingRetryRef.current = null;
        onClose();
        navigateTo("assessment-info");
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create assessment";
        if (message.startsWith("CANISTER_STOPPED:")) {
          // Store the title so we can retry once the backend comes back
          pendingRetryRef.current = name;
          // Notify the dashboard to start polling
          onCanisterStopped?.();
        } else {
          toast.error(message);
        }
      }
    },
    [
      createMutation,
      setCurrentAssessment,
      onClose,
      navigateTo,
      onCanisterStopped,
    ],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) {
      toast.error("Assessment title is required");
      return;
    }
    if (isBackendBusy) {
      toast.error(
        "Backend is still loading, please wait a moment and try again",
      );
      return;
    }
    await doCreate(trimmed);
  }

  // Auto-retry: when the backend comes back online and we have a pending title,
  // automatically submit without requiring the user to click again.
  useEffect(() => {
    if (
      backendReady &&
      !isBackendRestarting &&
      !actorFetching &&
      actor &&
      pendingRetryRef.current &&
      !autoRetryInProgressRef.current &&
      !createMutation.isPending
    ) {
      const name = pendingRetryRef.current;
      autoRetryInProgressRef.current = true;
      doCreate(name).finally(() => {
        autoRetryInProgressRef.current = false;
      });
    }
  }, [
    backendReady,
    isBackendRestarting,
    actorFetching,
    actor,
    createMutation.isPending,
    doCreate,
  ]);

  async function handleCheckNow() {
    await checkNow?.();
  }

  function handleClose() {
    if (!createMutation.isPending) {
      setTitle("");
      pendingRetryRef.current = null;
      onClose();
    }
  }

  const showAutoRetryNotice =
    pendingRetryRef.current !== null && isBackendRestarting;
  const showAutoRetrying =
    pendingRetryRef.current !== null &&
    backendReady &&
    !isBackendRestarting &&
    createMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent
        className="sm:max-w-md"
        data-ocid="create_assessment.modal"
      >
        <DialogHeader>
          <DialogTitle className="font-heading text-xl">
            Create New Assessment
          </DialogTitle>
          <DialogDescription className="font-body text-muted-foreground">
            Enter a title for your new assessment. You can add more details
            later.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Backend restarting banner */}
          {isBackendRestarting && (
            <Alert
              className="border-amber-200 bg-amber-50"
              data-ocid="create_assessment.backend_restarting_state"
            >
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <AlertDescription className="font-body text-amber-800 text-sm">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span>
                    {showAutoRetryNotice ? (
                      <>
                        <strong>Backend is restarting.</strong> Your assessment
                        will be created automatically once it comes back online.
                        {nextProbeIn > 0 && (
                          <span className="ml-1 text-amber-700">
                            Checking in {nextProbeIn}s...
                          </span>
                        )}
                      </>
                    ) : (
                      <>
                        <strong>Backend is restarting.</strong> Automatically
                        checking every 15 seconds.
                        {nextProbeIn > 0 && (
                          <span className="ml-1 text-amber-700">
                            Next check in {nextProbeIn}s...
                          </span>
                        )}
                      </>
                    )}
                  </span>
                  {checkNow && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 gap-1 shrink-0"
                      onClick={handleCheckNow}
                      data-ocid="create_assessment.check_now_button"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Check Now
                    </Button>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* Auto-retrying notice */}
          {showAutoRetrying && (
            <Alert
              className="border-blue-200 bg-blue-50"
              data-ocid="create_assessment.auto_retry_state"
            >
              <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
              <AlertDescription className="font-body text-blue-800 text-sm">
                <strong>Backend is back online.</strong> Creating your
                assessment now...
              </AlertDescription>
            </Alert>
          )}

          {/* Backend back online banner (no pending retry) */}
          {backendReady && !isBackendRestarting && !showAutoRetrying && (
            <Alert
              className="border-emerald-200 bg-emerald-50"
              data-ocid="create_assessment.backend_ready_state"
            >
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <AlertDescription className="font-body text-emerald-800 text-sm">
                <strong>Backend is back online.</strong> Click &ldquo;Create
                Assessment&rdquo; to proceed.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="assessment-title" className="font-body font-medium">
              Assessment Title
            </Label>
            <Input
              id="assessment-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Enter assessment title"
              className="font-body"
              disabled={createMutation.isPending}
              autoFocus
              data-ocid="create_assessment.title_input"
            />
          </div>
          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={createMutation.isPending}
              data-ocid="create_assessment.cancel_button"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!canSubmit}
              className="spice-gradient text-white border-0 gap-2"
              data-ocid="create_assessment.submit_button"
            >
              {(createMutation.isPending || showAutoRetrying) && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {actorFetching && !createMutation.isPending && (
                <Loader2 className="h-4 w-4 animate-spin" />
              )}
              {isBackendRestarting
                ? showAutoRetryNotice
                  ? "Will auto-create..."
                  : "Waiting for backend..."
                : actorFetching
                  ? "Connecting..."
                  : createMutation.isPending
                    ? "Creating..."
                    : "Create Assessment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
