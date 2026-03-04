import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { useAppContext } from "@/context/AppContext";
import { DEFAULT_ENABLED_GROUPS, PROCESS_GROUPS } from "@/data/aspiceData";
import {
  useGetAllAssessments,
  useGetProcessGroupConfig,
  useSaveProcessGroupConfig,
  useUpdateAssessmentStep,
} from "@/hooks/useQueries";
import { AlertCircle, LayoutDashboard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-blue-50 text-blue-700 border-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Draft: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <Badge
      variant="outline"
      className={`font-body text-xs ${styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {status}
    </Badge>
  );
}

type Level = "1" | "2" | "3" | "NA";

export function DefineTargetProfile() {
  const { currentAssessmentId, currentAssessmentTitle, navigateTo } =
    useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: config, isLoading } =
    useGetProcessGroupConfig(currentAssessmentId);
  const saveMutation = useSaveProcessGroupConfig();
  const updateStepMutation = useUpdateAssessmentStep();

  const [enabledGroups, setEnabledGroups] = useState<Set<string>>(
    new Set(DEFAULT_ENABLED_GROUPS),
  );
  const [processLevels, setProcessLevels] = useState<Record<string, Level>>({});

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );
  const isCompleted = currentAssessment?.status === "Completed";

  // Initialize default levels
  useEffect(() => {
    const defaults: Record<string, Level> = {};
    for (const group of PROCESS_GROUPS) {
      for (const process of group.processes) {
        defaults[process.id] = "2";
      }
    }
    setProcessLevels(defaults);
  }, []);

  // Load saved config
  useEffect(() => {
    if (config) {
      try {
        const groups = JSON.parse(config.enabledGroups) as string[];
        setEnabledGroups(new Set(groups));
      } catch {
        setEnabledGroups(new Set(DEFAULT_ENABLED_GROUPS));
      }
      try {
        const levels = JSON.parse(config.processLevels) as Record<
          string,
          string
        >;
        const typed: Record<string, Level> = {};
        for (const [k, v] of Object.entries(levels)) {
          if (["1", "2", "3", "NA"].includes(v)) {
            typed[k] = v as Level;
          }
        }
        setProcessLevels((prev) => ({ ...prev, ...typed }));
      } catch {
        // keep defaults
      }
    }
  }, [config]);

  function toggleGroup(groupId: string) {
    setEnabledGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  }

  function setLevel(processId: string, level: Level) {
    setProcessLevels((prev) => ({ ...prev, [processId]: level }));
  }

  async function save() {
    if (!currentAssessmentId) return;
    const enabledArray = Array.from(enabledGroups);
    const enabledGroupsJson = JSON.stringify(enabledArray);
    const processLevelsJson = JSON.stringify(processLevels);
    await saveMutation.mutateAsync({
      assessmentId: currentAssessmentId,
      enabledGroups: enabledGroupsJson,
      processLevels: processLevelsJson,
    });
    return updateStepMutation.mutateAsync({
      id: currentAssessmentId,
      step: "target-profile",
    });
  }

  async function handleSaveDraft() {
    try {
      await save();
      toast.success("Draft saved successfully");
    } catch {
      toast.error("Failed to save draft");
    }
  }

  async function handleSaveAndContinue() {
    if (enabledGroups.size === 0) {
      toast.error("Please enable at least one process group");
      return;
    }
    try {
      await save();
      await updateStepMutation.mutateAsync({
        id: currentAssessmentId!,
        step: "planning",
      });
      toast.success("Saved — navigating to Assessment Planning");
      navigateTo("planning");
    } catch {
      toast.error("Failed to save");
    }
  }

  const isSaving = saveMutation.isPending || updateStepMutation.isPending;

  if (!currentAssessmentId) {
    return (
      <div className="page-enter flex flex-col items-center justify-center py-20 text-center space-y-4">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold font-heading text-foreground">
            No Assessment Selected
          </p>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Please select or create an assessment from the Dashboard.
          </p>
        </div>
        <Button
          onClick={() => navigateTo("dashboard")}
          className="spice-gradient text-white border-0 gap-2"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-body mb-1 uppercase tracking-wide">
            Current Assessment
          </p>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            {currentAssessmentTitle}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Define Target Profile
          </p>
        </div>
        {currentAssessment && <StatusBadge status={currentAssessment.status} />}
      </div>

      {isCompleted && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm font-body text-amber-800">
            This assessment is marked as Completed. No further edits are
            allowed.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Combined Process Groups & Target Level Section */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-heading font-semibold text-foreground uppercase tracking-wide">
                Process Groups &amp; Target Level
              </CardTitle>
              <p className="text-xs text-muted-foreground font-body">
                Enable or disable each process group and set the target
                capability level for its processes
              </p>
              <Separator />
            </CardHeader>
            <CardContent className="space-y-8">
              {PROCESS_GROUPS.map((group, groupIndex) => {
                const isEnabled = enabledGroups.has(group.id);
                return (
                  <div key={group.id} className="space-y-3">
                    {/* Group header row */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1 w-4 rounded-full spice-gradient" />
                        <h3
                          className={`font-semibold font-heading text-sm ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}
                        >
                          {group.name}
                        </h3>
                        <span className="text-xs text-muted-foreground font-body">
                          ({group.processes.length} process
                          {group.processes.length !== 1 ? "es" : ""})
                        </span>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onCheckedChange={() =>
                          !isCompleted && toggleGroup(group.id)
                        }
                        disabled={isCompleted}
                        data-ocid={`target_profile.group_toggle.${groupIndex + 1}`}
                      />
                    </div>

                    {/* Process rows — only shown when group is enabled */}
                    {isEnabled && (
                      <div className="space-y-2 pl-6">
                        {group.processes.map((process, processIndex) => (
                          <div
                            key={process.id}
                            className="flex items-center justify-between py-2 px-3 rounded-lg bg-muted/30 border border-border/40"
                          >
                            <div className="flex-1 min-w-0 mr-4">
                              <span className="font-medium font-body text-sm text-foreground">
                                {process.id}
                              </span>
                              <span className="text-muted-foreground font-body text-sm ml-2">
                                — {process.name}
                              </span>
                            </div>
                            <Select
                              value={processLevels[process.id] ?? "2"}
                              onValueChange={(v) =>
                                !isCompleted && setLevel(process.id, v as Level)
                              }
                              disabled={isCompleted}
                            >
                              <SelectTrigger
                                className="w-32 h-8 text-xs font-body"
                                data-ocid={`target_profile.${process.id.toLowerCase().replace(".", "_")}.level_select.${processIndex + 1}`}
                              >
                                <SelectValue placeholder="Select level" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem
                                  value="1"
                                  className="text-xs font-body"
                                >
                                  Level 1
                                </SelectItem>
                                <SelectItem
                                  value="2"
                                  className="text-xs font-body"
                                >
                                  Level 2
                                </SelectItem>
                                <SelectItem
                                  value="3"
                                  className="text-xs font-body"
                                >
                                  Level 3
                                </SelectItem>
                                <SelectItem
                                  value="NA"
                                  className="text-xs font-body"
                                >
                                  NA
                                </SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Disabled group hint */}
                    {!isEnabled && (
                      <p className="pl-6 text-xs text-muted-foreground font-body italic">
                        This group is disabled and will be excluded from
                        Planning and Perform Assessment.
                      </p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!isCompleted && (
            <div className="flex items-center gap-3 pt-2 pb-6">
              <Button
                variant="outline"
                onClick={handleSaveDraft}
                disabled={isSaving}
                data-ocid="target_profile.save_draft_button"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Draft
              </Button>
              <Button
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="spice-gradient text-white border-0"
                data-ocid="target_profile.save_continue_button"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save &amp; Continue →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
