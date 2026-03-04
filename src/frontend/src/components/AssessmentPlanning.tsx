import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";
import { PROCESS_GROUPS } from "@/data/aspiceData";
import {
  useDeleteAssessmentDay,
  useGetAllAssessments,
  useGetAssessmentDays,
  useGetProcessGroupConfig,
  useSaveAssessmentDay,
  useUpdateAssessmentStep,
} from "@/hooks/useQueries";
import {
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  LayoutDashboard,
  Loader2,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AssessmentDay } from "../backend.d";

interface SessionData {
  sid: string;
  sessionName: string;
  processId: string;
  notes: string;
}

interface DayData {
  backendId: bigint | null;
  dayNumber: number;
  date: string;
  timeFrom: string;
  timeTo: string;
  sessions: SessionData[];
  collapsed: boolean;
  saving: boolean;
}

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

function buildEnabledProcessList(
  config: { enabledGroups: string; processLevels: string } | null,
): string[] {
  if (!config) return [];
  try {
    const enabledGroups = JSON.parse(config.enabledGroups) as string[];
    const processes: string[] = [];
    for (const group of PROCESS_GROUPS) {
      if (enabledGroups.includes(group.id)) {
        for (const p of group.processes) {
          processes.push(p.id);
        }
      }
    }
    return processes;
  } catch {
    return [];
  }
}

export function AssessmentPlanning() {
  const { currentAssessmentId, currentAssessmentTitle, navigateTo } =
    useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: savedDays, isLoading: loadingDays } =
    useGetAssessmentDays(currentAssessmentId);
  const { data: processConfig, isLoading: loadingConfig } =
    useGetProcessGroupConfig(currentAssessmentId);
  const saveDayMutation = useSaveAssessmentDay();
  const deleteDayMutation = useDeleteAssessmentDay();
  const updateStepMutation = useUpdateAssessmentStep();

  const [days, setDays] = useState<DayData[]>([]);
  const [saveAllPending, setSaveAllPending] = useState(false);

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );
  const isCompleted = currentAssessment?.status === "Completed";
  const enabledProcesses = buildEnabledProcessList(processConfig ?? null);

  // Load saved days into local state
  useEffect(() => {
    if (savedDays && savedDays.length > 0) {
      const loaded: DayData[] = savedDays.map((d: AssessmentDay) => {
        let sessions: SessionData[] = [];
        try {
          const raw = JSON.parse(d.sessions) as Array<{
            processId: string;
            notes: string;
            sid?: string;
            sessionName?: string;
          }>;
          sessions = raw.map((s, i) => ({
            sid: s.sid ?? `loaded-${i}`,
            sessionName: s.sessionName ?? "",
            processId: s.processId,
            notes: s.notes,
          }));
        } catch {
          sessions = [];
        }
        return {
          backendId: d.id,
          dayNumber: Number(d.dayNumber),
          date: d.date,
          timeFrom: d.timeFrom,
          timeTo: d.timeTo,
          sessions,
          collapsed: false,
          saving: false,
        };
      });
      setDays(loaded);
    }
  }, [savedDays]);

  function addDay() {
    const maxNum = days.reduce((max, d) => Math.max(max, d.dayNumber), 0);
    setDays((prev) => [
      ...prev,
      {
        backendId: null,
        dayNumber: maxNum + 1,
        date: "",
        timeFrom: "",
        timeTo: "",
        sessions: [],
        collapsed: false,
        saving: false,
      },
    ]);
  }

  function updateDay(index: number, patch: Partial<DayData>) {
    setDays((prev) =>
      prev.map((d, i) => (i === index ? { ...d, ...patch } : d)),
    );
  }

  function removeDay(index: number) {
    const day = days[index];
    if (day.backendId && currentAssessmentId) {
      deleteDayMutation.mutate({
        id: day.backendId,
        assessmentId: currentAssessmentId,
      });
    }
    setDays((prev) => prev.filter((_, i) => i !== index));
  }

  function copyDay(index: number) {
    const day = days[index];
    const maxNum = days.reduce((max, d) => Math.max(max, d.dayNumber), 0);
    setDays((prev) => [
      ...prev,
      {
        ...day,
        backendId: null,
        dayNumber: maxNum + 1,
        collapsed: false,
      },
    ]);
  }

  function addSession(dayIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              sessions: [
                ...d.sessions,
                {
                  sid: `${Date.now()}-${Math.random()}`,
                  sessionName: "",
                  processId: enabledProcesses[0] ?? "",
                  notes: "",
                },
              ],
            }
          : d,
      ),
    );
  }

  function updateSession(
    dayIndex: number,
    sessionIndex: number,
    patch: Partial<SessionData>,
  ) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              sessions: d.sessions.map((s, si) =>
                si === sessionIndex ? { ...s, ...patch } : s,
              ),
            }
          : d,
      ),
    );
  }

  function removeSession(dayIndex: number, sessionIndex: number) {
    setDays((prev) =>
      prev.map((d, i) =>
        i === dayIndex
          ? {
              ...d,
              sessions: d.sessions.filter((_, si) => si !== sessionIndex),
            }
          : d,
      ),
    );
  }

  async function saveDay(index: number) {
    if (!currentAssessmentId) return;
    const day = days[index];
    updateDay(index, { saving: true });
    try {
      // Delete old record if exists
      if (day.backendId) {
        await deleteDayMutation.mutateAsync({
          id: day.backendId,
          assessmentId: currentAssessmentId,
        });
      }
      const newId = await saveDayMutation.mutateAsync({
        assessmentId: currentAssessmentId,
        dayNumber: BigInt(day.dayNumber),
        date: day.date,
        timeFrom: day.timeFrom,
        timeTo: day.timeTo,
        sessions: JSON.stringify(day.sessions),
      });
      updateDay(index, { saving: false, backendId: newId });
      toast.success(`Day ${day.dayNumber} saved`);
    } catch {
      updateDay(index, { saving: false });
      toast.error(`Failed to save Day ${day.dayNumber}`);
    }
  }

  async function handleSaveAll() {
    if (!currentAssessmentId) return;
    setSaveAllPending(true);
    try {
      await Promise.all(days.map((_, i) => saveDay(i)));
      toast.success("All days saved");
    } catch {
      toast.error("Some days failed to save");
    } finally {
      setSaveAllPending(false);
    }
  }

  async function handleContinue() {
    if (!currentAssessmentId) return;
    try {
      await handleSaveAll();
      await updateStepMutation.mutateAsync({
        id: currentAssessmentId,
        step: "perform",
      });
      toast.success("Navigating to Perform Assessment");
      navigateTo("perform");
    } catch {
      toast.error("Failed to save and continue");
    }
  }

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

  const isLoading = loadingDays || loadingConfig;

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
            Assessment Planning
          </p>
        </div>
        {currentAssessment && <StatusBadge status={currentAssessment.status} />}
      </div>

      <div>
        <p className="text-sm text-muted-foreground font-body">
          Manage your assessment sessions with enhanced planning tools
        </p>
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
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* Day Cards */}
          {days.map((day, dayIndex) => (
            <Card
              key={`day-${day.dayNumber}`}
              className="border-border/60"
              data-ocid={`planning.day_card.${dayIndex + 1}`}
            >
              {/* Day Header */}
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full spice-gradient flex items-center justify-center shrink-0">
                      <span className="text-white text-xs font-bold font-heading">
                        {day.dayNumber}
                      </span>
                    </div>
                    <div>
                      <p className="font-semibold font-heading text-sm text-foreground">
                        Day {day.dayNumber}
                      </p>
                      <p className="text-xs text-muted-foreground font-body">
                        {day.sessions.length} session
                        {day.sessions.length !== 1 ? "s" : ""}
                        {day.date && ` · ${day.date}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {!isCompleted && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        onClick={() => saveDay(dayIndex)}
                        disabled={day.saving}
                        title="Save day"
                        data-ocid={`planning.day_save_button.${dayIndex + 1}`}
                      >
                        {day.saving ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => copyDay(dayIndex)}
                      title="Copy day"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {!isCompleted && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() => removeDay(dayIndex)}
                        title="Delete day"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() =>
                        updateDay(dayIndex, { collapsed: !day.collapsed })
                      }
                      data-ocid={`planning.day_collapse_button.${dayIndex + 1}`}
                    >
                      {day.collapsed ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronUp className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardHeader>

              {/* Day Content (collapsible) */}
              {!day.collapsed && (
                <CardContent className="pt-4 space-y-4">
                  {/* Date & Time */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <Label className="font-body text-xs font-medium">
                        Date
                      </Label>
                      <Input
                        type="date"
                        value={day.date}
                        onChange={(e) =>
                          updateDay(dayIndex, { date: e.target.value })
                        }
                        className="font-body h-9"
                        disabled={isCompleted}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-body text-xs font-medium">
                        Time From
                      </Label>
                      <Input
                        type="time"
                        value={day.timeFrom}
                        onChange={(e) =>
                          updateDay(dayIndex, { timeFrom: e.target.value })
                        }
                        className="font-body h-9"
                        disabled={isCompleted}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-body text-xs font-medium">
                        Time To
                      </Label>
                      <Input
                        type="time"
                        value={day.timeTo}
                        onChange={(e) =>
                          updateDay(dayIndex, { timeTo: e.target.value })
                        }
                        className="font-body h-9"
                        disabled={isCompleted}
                      />
                    </div>
                  </div>

                  {/* Sessions */}
                  {day.sessions.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium font-body text-muted-foreground uppercase tracking-wide">
                        Sessions
                      </p>
                      {day.sessions.map((session, sessionIndex) => (
                        <div
                          key={session.sid}
                          className="flex items-center gap-2 p-2 rounded-lg bg-muted/40 border border-border/40"
                        >
                          <span className="text-xs font-body text-muted-foreground w-5 shrink-0 font-medium">
                            #{sessionIndex + 1}
                          </span>
                          {/* Session Name */}
                          <Input
                            value={session.sessionName}
                            onChange={(e) =>
                              updateSession(dayIndex, sessionIndex, {
                                sessionName: e.target.value,
                              })
                            }
                            placeholder="Session name"
                            className="h-8 text-xs font-body w-32 shrink-0"
                            disabled={isCompleted}
                          />
                          {/* Process selector */}
                          {enabledProcesses.length > 0 ? (
                            <Select
                              value={session.processId}
                              onValueChange={(v) =>
                                updateSession(dayIndex, sessionIndex, {
                                  processId: v,
                                })
                              }
                              disabled={isCompleted}
                            >
                              <SelectTrigger className="h-8 text-xs font-body w-28 shrink-0">
                                <SelectValue placeholder="Process" />
                              </SelectTrigger>
                              <SelectContent>
                                {enabledProcesses.map((pid) => (
                                  <SelectItem
                                    key={pid}
                                    value={pid}
                                    className="text-xs"
                                  >
                                    {pid}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={session.processId}
                              onChange={(e) =>
                                updateSession(dayIndex, sessionIndex, {
                                  processId: e.target.value,
                                })
                              }
                              placeholder="Process ID"
                              className="h-8 text-xs font-body w-28 shrink-0"
                              disabled={isCompleted}
                            />
                          )}
                          {/* Notes */}
                          <Input
                            value={session.notes}
                            onChange={(e) =>
                              updateSession(dayIndex, sessionIndex, {
                                notes: e.target.value,
                              })
                            }
                            placeholder="Notes"
                            className="h-8 text-xs font-body flex-1 min-w-0"
                            disabled={isCompleted}
                          />
                          {!isCompleted && (
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() =>
                                removeSession(dayIndex, sessionIndex)
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add Session */}
                  {!isCompleted && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-1.5 text-xs h-8"
                      onClick={() => addSession(dayIndex)}
                      data-ocid={`planning.add_session_button.${dayIndex + 1}`}
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Session
                    </Button>
                  )}
                </CardContent>
              )}
            </Card>
          ))}

          {/* Add Day Button */}
          {!isCompleted && (
            <Button
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={addDay}
              data-ocid="planning.add_day_button"
            >
              <Plus className="h-4 w-4" />
              Add Day
            </Button>
          )}

          {/* Action Buttons */}
          {!isCompleted && (
            <div className="flex items-center gap-3 pt-2 pb-6">
              <Button
                variant="outline"
                onClick={handleSaveAll}
                disabled={saveAllPending}
              >
                {saveAllPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save All
              </Button>
              <Button
                onClick={handleContinue}
                disabled={saveAllPending}
                className="spice-gradient text-white border-0"
                data-ocid="planning.continue_button"
              >
                {saveAllPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Continue to Perform Assessment →
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
