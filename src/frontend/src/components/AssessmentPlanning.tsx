import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  LayoutDashboard,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AssessmentDay } from "../backend.d";
import { StickyFooterBar } from "./StickyFooterBar";

interface RowData {
  rid: string;
  backendId: bigint | null;
  date: string;
  processId: string;
  timeStart: string;
  timeEnd: string;
  duration: string;
  attendees: string;
}

function buildEnabledProcessList(
  config: { enabledGroups: string; processLevels: string } | null,
): string[] {
  if (!config) return [];
  try {
    const enabledGroups = JSON.parse(config.enabledGroups) as string[];
    const processLevels = JSON.parse(config.processLevels) as Record<
      string,
      string
    >;
    const processes: string[] = [];
    for (const group of PROCESS_GROUPS) {
      if (enabledGroups.includes(group.id)) {
        for (const p of group.processes) {
          if (processLevels[p.id] === "NA" || processLevels[p.id] === undefined)
            continue;
          processes.push(p.id);
        }
      }
    }
    return processes;
  } catch {
    return [];
  }
}

function calcDuration(start: string, end: string): string {
  if (!start || !end) return "";
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const totalStart = sh * 60 + sm;
  const totalEnd = eh * 60 + em;
  const diff = totalEnd - totalStart;
  if (diff <= 0) return "";
  const h = Math.floor(diff / 60);
  const m = diff % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function AssessmentPlanning() {
  const { currentAssessmentId, navigateTo } = useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: savedDays, isLoading: loadingDays } =
    useGetAssessmentDays(currentAssessmentId);
  const { data: processConfig, isLoading: loadingConfig } =
    useGetProcessGroupConfig(currentAssessmentId);
  const saveDayMutation = useSaveAssessmentDay();
  const deleteDayMutation = useDeleteAssessmentDay();
  const updateStepMutation = useUpdateAssessmentStep();

  const [rows, setRows] = useState<RowData[]>([]);
  const [savePending, setSavePending] = useState(false);

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );
  const isCompleted = currentAssessment?.status === "Completed";
  const enabledProcesses = buildEnabledProcessList(processConfig ?? null);

  // Load saved days into flat rows
  useEffect(() => {
    if (savedDays && savedDays.length > 0) {
      const loaded: RowData[] = [];
      for (const d of savedDays as AssessmentDay[]) {
        try {
          const raw = JSON.parse(d.sessions) as Array<{
            rid?: string;
            processId: string;
            attendees?: string;
          }>;
          for (const s of raw) {
            loaded.push({
              rid: s.rid ?? `loaded-${d.id}-${Math.random()}`,
              backendId: d.id,
              date: d.date,
              processId: s.processId,
              timeStart: d.timeFrom,
              timeEnd: d.timeTo,
              duration: calcDuration(d.timeFrom, d.timeTo),
              attendees: s.attendees ?? "",
            });
          }
        } catch {
          loaded.push({
            rid: `loaded-${d.id}`,
            backendId: d.id,
            date: d.date,
            processId: "",
            timeStart: d.timeFrom,
            timeEnd: d.timeTo,
            duration: calcDuration(d.timeFrom, d.timeTo),
            attendees: "",
          });
        }
      }
      if (loaded.length > 0) setRows(loaded);
    }
  }, [savedDays]);

  function addRow() {
    setRows((prev) => [
      ...prev,
      {
        rid: `${Date.now()}-${Math.random()}`,
        backendId: null,
        date: "",
        processId: enabledProcesses[0] ?? "",
        timeStart: "",
        timeEnd: "",
        duration: "",
        attendees: "",
      },
    ]);
  }

  function updateRow(index: number, patch: Partial<RowData>) {
    setRows((prev) =>
      prev.map((r, i) => {
        if (i !== index) return r;
        const updated = { ...r, ...patch };
        if ("timeStart" in patch || "timeEnd" in patch) {
          updated.duration = calcDuration(updated.timeStart, updated.timeEnd);
        }
        return updated;
      }),
    );
  }

  function removeRow(index: number) {
    const row = rows[index];
    if (row.backendId && currentAssessmentId) {
      deleteDayMutation.mutate({
        id: row.backendId,
        assessmentId: currentAssessmentId,
      });
    }
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSave() {
    if (!currentAssessmentId) return;
    setSavePending(true);
    try {
      const existingIds = new Set<bigint>();
      for (const row of rows) {
        if (row.backendId) existingIds.add(row.backendId);
      }
      await Promise.all(
        Array.from(existingIds).map((id) =>
          deleteDayMutation.mutateAsync({
            id,
            assessmentId: currentAssessmentId,
          }),
        ),
      );

      const savedIds = new Map<number, bigint>();
      await Promise.all(
        rows.map(async (row, i) => {
          const sessions = JSON.stringify([
            {
              rid: row.rid,
              processId: row.processId,
              attendees: row.attendees,
            },
          ]);
          const newId = await saveDayMutation.mutateAsync({
            assessmentId: currentAssessmentId,
            dayNumber: BigInt(i + 1),
            date: row.date,
            timeFrom: row.timeStart,
            timeTo: row.timeEnd,
            sessions,
          });
          savedIds.set(i, newId);
        }),
      );

      setRows((prev) =>
        prev.map((r, i) => ({
          ...r,
          backendId: savedIds.get(i) ?? r.backendId,
        })),
      );

      await updateStepMutation.mutateAsync({
        id: currentAssessmentId,
        step: "planning",
      });

      toast.success("Schedule saved");
    } catch {
      toast.error("Failed to save schedule");
    } finally {
      setSavePending(false);
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
    <div className="page-enter flex flex-col min-h-full">
      <div className="flex-1 space-y-6 pb-2">
        {/* Page Header */}
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            Schedule
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Plan your assessment sessions
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
              <Skeleton key={i} className="h-12 w-full rounded-xl" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Table */}
            <div className="rounded-xl border border-border/60 overflow-x-auto bg-card">
              <table className="w-full text-sm font-body border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      Date <span className="text-destructive">*</span>
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      Process <span className="text-destructive">*</span>
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      Time Start
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      End
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700 whitespace-nowrap">
                      Duration
                    </th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-700">
                      Attendees
                    </th>
                    {!isCompleted && <th className="px-3 py-2.5 w-10" />}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && (
                    <tr>
                      <td
                        colSpan={isCompleted ? 6 : 7}
                        className="text-center py-8 text-muted-foreground text-sm font-body italic"
                        data-ocid="planning.table.empty_state"
                      >
                        No sessions added yet. Click "Add Row" to begin.
                      </td>
                    </tr>
                  )}
                  {rows.map((row, index) => (
                    <tr
                      key={row.rid}
                      className={
                        index % 2 === 1
                          ? "border-b border-gray-100 hover:bg-gray-50/70 bg-gray-50/40 transition-colors"
                          : "border-b border-gray-100 hover:bg-gray-50/70 transition-colors"
                      }
                      data-ocid={`planning.row.${index + 1}`}
                    >
                      {/* Date */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input
                          type="date"
                          value={row.date}
                          onChange={(e) =>
                            updateRow(index, { date: e.target.value })
                          }
                          className="h-8 text-xs font-body w-36"
                          disabled={isCompleted}
                          data-ocid={`planning.date_input.${index + 1}`}
                        />
                      </td>
                      {/* Process */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        {enabledProcesses.length > 0 ? (
                          <Select
                            value={row.processId}
                            onValueChange={(v) =>
                              updateRow(index, { processId: v })
                            }
                            disabled={isCompleted}
                          >
                            <SelectTrigger
                              className="h-8 text-xs font-body w-28"
                              data-ocid={`planning.process_select.${index + 1}`}
                            >
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
                            value={row.processId}
                            onChange={(e) =>
                              updateRow(index, { processId: e.target.value })
                            }
                            placeholder="Process ID"
                            className="h-8 text-xs font-body w-28"
                            disabled={isCompleted}
                            data-ocid={`planning.process_input.${index + 1}`}
                          />
                        )}
                      </td>
                      {/* Time Start */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input
                          type="time"
                          value={row.timeStart}
                          onChange={(e) =>
                            updateRow(index, { timeStart: e.target.value })
                          }
                          className="h-8 text-xs font-body w-28"
                          disabled={isCompleted}
                          data-ocid={`planning.time_start_input.${index + 1}`}
                        />
                      </td>
                      {/* Time End */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <Input
                          type="time"
                          value={row.timeEnd}
                          onChange={(e) =>
                            updateRow(index, { timeEnd: e.target.value })
                          }
                          className="h-8 text-xs font-body w-28"
                          disabled={isCompleted}
                          data-ocid={`planning.time_end_input.${index + 1}`}
                        />
                      </td>
                      {/* Duration (auto-calculated) */}
                      <td className="px-3 py-2 whitespace-nowrap">
                        <span className="text-xs font-body text-foreground px-2 py-1 rounded bg-muted/40 inline-block min-w-[48px] text-center">
                          {row.duration || "—"}
                        </span>
                      </td>
                      {/* Attendees */}
                      <td className="px-3 py-2">
                        <Input
                          value={row.attendees}
                          onChange={(e) =>
                            updateRow(index, { attendees: e.target.value })
                          }
                          placeholder="Names"
                          className="h-8 text-xs font-body min-w-[160px]"
                          disabled={isCompleted}
                          data-ocid={`planning.attendees_input.${index + 1}`}
                        />
                      </td>
                      {/* Delete */}
                      {!isCompleted && (
                        <td className="px-3 py-2 text-center">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 min-w-[44px] min-h-[44px] text-muted-foreground hover:text-destructive"
                            onClick={() => removeRow(index)}
                            title="Delete row"
                            data-ocid={`planning.delete_button.${index + 1}`}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Row action */}
            {!isCompleted && (
              <div className="flex items-center">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs h-9"
                  onClick={addRow}
                  data-ocid="planning.add_row_button"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Row
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Footer Save */}
      {!isCompleted && !isLoading && (
        <StickyFooterBar>
          <Button
            onClick={handleSave}
            disabled={savePending}
            className="spice-gradient text-white border-0 h-9"
            data-ocid="planning.save_button"
          >
            {savePending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </StickyFooterBar>
      )}
    </div>
  );
}
