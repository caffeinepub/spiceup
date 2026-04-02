import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";
import {
  useGetAllAssessments,
  useGetAllPracticeRatingsForAssessment,
  useGetAssessmentDays,
  useGetAssessmentInfoData,
  useGetProcessGroupConfig,
  useGetProjectEvidenceForAssessment,
  useGetReportGlobalInputs,
  useSaveReportGlobalInputs,
} from "@/hooks/useQueries";
import { exportToPpt } from "@/utils/exportPpt";
import { buildReportData } from "@/utils/reportData";
import {
  ClipboardX,
  FileText,
  Import,
  Loader2,
  Monitor,
  Plus,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

// ─── Types ──────────────────────────────────────────────────────

interface SwEntry {
  id: string;
  type: "strength" | "weakness" | "observation" | "suggestion";
  text: string;
  status?: "draft" | "final";
  createdBy?: string;
  practiceIds?: string[];
}

// ─── Helper ──────────────────────────────────────────────────────

function stripRichText(text: string): string {
  return text
    .replace(/\*\*(.*?)\*\*/g, "$1") // bold
    .replace(/\*(.*?)\*/g, "$1") // italic
    .replace(/^•\s*/gm, "") // bullets
    .replace(/\[\[ev:[^\]]+\]\]/g, "") // evidence tokens
    .trim();
}

// Parse all SwEntries from practiceRatings (same logic as PerformAssessment)
function getAllSwEntriesFromRatings(
  ratings: Array<{
    workProductsInspected: string;
    processId: string;
    level: bigint;
    practiceId: string;
  }>,
): SwEntry[] {
  const allEntries: SwEntry[] = [];
  const seen = new Set<string>();

  for (const r of ratings) {
    let swEntries: SwEntry[] = [];
    try {
      const parsed = JSON.parse(r.workProductsInspected) as unknown;
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        const p = parsed as Record<string, unknown>;
        if (Array.isArray(p.swEntries)) {
          swEntries = p.swEntries as SwEntry[];
        }
      }
    } catch {
      // skip
    }
    for (const e of swEntries) {
      if (!seen.has(e.id)) {
        seen.add(e.id);
        allEntries.push(e);
      }
    }
  }
  return allEntries;
}

// ─── Main Component ──────────────────────────────────────────────

export function GenerateReport() {
  const { currentAssessmentId } = useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: info, isLoading: infoLoading } =
    useGetAssessmentInfoData(currentAssessmentId);
  const { data: config, isLoading: configLoading } =
    useGetProcessGroupConfig(currentAssessmentId);
  const { data: ratings, isLoading: ratingsLoading } =
    useGetAllPracticeRatingsForAssessment(currentAssessmentId);
  const { data: days, isLoading: daysLoading } =
    useGetAssessmentDays(currentAssessmentId);
  const { data: globalInputsData, isLoading: globalInputsLoading } =
    useGetReportGlobalInputs(currentAssessmentId);
  const saveGlobalInputsMutation = useSaveReportGlobalInputs();
  const { data: projectEvidence } =
    useGetProjectEvidenceForAssessment(currentAssessmentId);

  const [globalStrengths, setGlobalStrengths] = useState<string[]>([]);
  const [globalWeaknesses, setGlobalWeaknesses] = useState<string[]>([]);
  const [newStrength, setNewStrength] = useState("");
  const [newWeakness, setNewWeakness] = useState("");
  const [pptLoading, setPptLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const [isDirty, setIsDirty] = useState(false);

  // Refs for reliable access in effects/cleanup
  const strengthsRef = useRef<string[]>([]);
  const weaknessesRef = useRef<string[]>([]);
  const isDirtyRef = useRef(false);
  const assessmentIdRef = useRef(currentAssessmentId);
  const mutateRef = useRef(saveGlobalInputsMutation.mutate);
  // Track whether we have initialized data from backend for the current assessment
  const initializedForRef = useRef<string | null>(null);

  // Keep refs in sync
  useEffect(() => {
    strengthsRef.current = globalStrengths;
  }, [globalStrengths]);
  useEffect(() => {
    weaknessesRef.current = globalWeaknesses;
  }, [globalWeaknesses]);
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);
  useEffect(() => {
    assessmentIdRef.current = currentAssessmentId;
  }, [currentAssessmentId]);
  useEffect(() => {
    mutateRef.current = saveGlobalInputsMutation.mutate;
  }, [saveGlobalInputsMutation.mutate]);

  // Reset local state when assessment changes
  useEffect(() => {
    const key = currentAssessmentId?.toString() ?? null;
    if (initializedForRef.current !== key) {
      setGlobalStrengths([]);
      setGlobalWeaknesses([]);
      setIsDirty(false);
      setSaveStatus("idle");
      initializedForRef.current = null; // will be set once data arrives
    }
  }, [currentAssessmentId]);

  // Load backend data into local state — but ONLY if not dirty (don't overwrite in-progress edits)
  useEffect(() => {
    if (!globalInputsData) return;
    const key = currentAssessmentId?.toString() ?? null;
    // Skip if already initialized for this assessment AND user has pending changes
    if (initializedForRef.current === key && isDirtyRef.current) return;

    try {
      const s = JSON.parse(globalInputsData.globalStrengths) as string[];
      setGlobalStrengths(Array.isArray(s) ? s : []);
    } catch {
      setGlobalStrengths([]);
    }
    try {
      const w = JSON.parse(globalInputsData.globalWeaknesses) as string[];
      setGlobalWeaknesses(Array.isArray(w) ? w : []);
    } catch {
      setGlobalWeaknesses([]);
    }
    setIsDirty(false);
    initializedForRef.current = key;
  }, [globalInputsData, currentAssessmentId]);

  // Debounced autosave whenever strengths/weaknesses change and isDirty
  useEffect(() => {
    if (!isDirty || !currentAssessmentId) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      const aId = currentAssessmentId;
      if (!aId) return;
      mutateRef.current(
        {
          assessmentId: aId,
          globalStrengths: JSON.stringify(globalStrengths),
          globalWeaknesses: JSON.stringify(globalWeaknesses),
        },
        {
          onSuccess: () => {
            setIsDirty(false);
            setSaveStatus("saved");
            setTimeout(() => setSaveStatus("idle"), 2000);
          },
          onError: () => {
            setSaveStatus("idle");
            toast.error("Failed to save. Please try again.");
          },
        },
      );
    }, 600);
    return () => clearTimeout(timer);
  }, [globalStrengths, globalWeaknesses, isDirty, currentAssessmentId]);

  // Save on unmount if still dirty (navigation away before debounce fires)
  useEffect(() => {
    return () => {
      if (isDirtyRef.current && assessmentIdRef.current) {
        mutateRef.current({
          assessmentId: assessmentIdRef.current,
          globalStrengths: JSON.stringify(strengthsRef.current),
          globalWeaknesses: JSON.stringify(weaknessesRef.current),
        });
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isDataLoading =
    currentAssessmentId != null &&
    (infoLoading ||
      configLoading ||
      ratingsLoading ||
      daysLoading ||
      globalInputsLoading);

  const currentAssessment = assessments?.find(
    (a) => currentAssessmentId != null && a.id === currentAssessmentId,
  );
  const assessmentName = currentAssessment?.name ?? "Assessment";

  // All SW entries from the current assessment's ratings
  const allSwEntries: SwEntry[] = getAllSwEntriesFromRatings(ratings ?? []);
  const allStrengthFindings = allSwEntries.filter((e) => e.type === "strength");
  const allWeaknessFindings = allSwEntries.filter((e) => e.type === "weakness");

  function addStrength() {
    const text = newStrength.trim();
    if (!text) return;
    setGlobalStrengths((prev) => [...prev, text]);
    setNewStrength("");
    setIsDirty(true);
  }

  function removeStrength(i: number) {
    setGlobalStrengths((prev) => prev.filter((_, idx) => idx !== i));
    setIsDirty(true);
  }

  function importStrengthFinding(entry: SwEntry) {
    const plain = stripRichText(entry.text);
    if (!plain) return;
    setGlobalStrengths((prev) => {
      if (prev.includes(plain)) return prev;
      return [...prev, plain];
    });
    setIsDirty(true);
  }

  function addWeakness() {
    const text = newWeakness.trim();
    if (!text) return;
    setGlobalWeaknesses((prev) => [...prev, text]);
    setNewWeakness("");
    setIsDirty(true);
  }

  function removeWeakness(i: number) {
    setGlobalWeaknesses((prev) => prev.filter((_, idx) => idx !== i));
    setIsDirty(true);
  }

  function importWeaknessFinding(entry: SwEntry) {
    const plain = stripRichText(entry.text);
    if (!plain) return;
    setGlobalWeaknesses((prev) => {
      if (prev.includes(plain)) return prev;
      return [...prev, plain];
    });
    setIsDirty(true);
  }

  function handleManualSave() {
    const aId = currentAssessmentId;
    if (!aId) return;
    setSaveStatus("saving");
    mutateRef.current(
      {
        assessmentId: aId,
        globalStrengths: JSON.stringify(globalStrengths),
        globalWeaknesses: JSON.stringify(globalWeaknesses),
      },
      {
        onSuccess: () => {
          setIsDirty(false);
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
          toast.success("Saved");
        },
        onError: () => {
          setSaveStatus("idle");
          toast.error("Failed to save. Please try again.");
        },
      },
    );
  }

  async function handleExportPpt() {
    if (!currentAssessmentId) {
      toast.error("No assessment selected.");
      return;
    }
    if (!config || !ratings) {
      toast.error(
        "Assessment data is not yet loaded. Please wait and try again.",
      );
      return;
    }
    setPptLoading(true);
    try {
      const evidenceMap: Record<
        string,
        { name: string; link: string; version: string }
      > = {};
      for (const ev of projectEvidence ?? []) {
        evidenceMap[ev.id.toString()] = {
          name: ev.name,
          link: ev.link,
          version: ev.version,
        };
      }
      const reportData = buildReportData(
        assessmentName,
        info ?? null,
        config,
        ratings ?? [],
        days ?? [],
        globalStrengths,
        globalWeaknesses,
        evidenceMap,
      );
      await exportToPpt(reportData);
      toast.success("PowerPoint report downloaded successfully");
    } catch (err) {
      console.error("PPT export failed:", err);
      toast.error("Failed to generate PowerPoint. Please try again.");
    } finally {
      setPptLoading(false);
    }
  }

  if (!currentAssessmentId) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader />
        <Card
          data-ocid="report.empty_state"
          className="border-dashed border-border/60"
        >
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <FileText className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground font-body text-sm font-medium">
              No assessment selected
            </p>
            <p className="text-muted-foreground/60 font-body text-xs text-center max-w-xs">
              Select an assessment from the dropdown in the top-right corner to
              generate a report.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isDataLoading) {
    return (
      <div className="page-enter space-y-6">
        <PageHeader />
        <div data-ocid="report.loading_state" className="space-y-4">
          <Skeleton className="h-32 rounded-xl" />
          <Skeleton className="h-48 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  const noRatings =
    (ratings?.filter((r) => r.rating && ["N", "P", "L", "F"].includes(r.rating))
      .length ?? 0) === 0;

  return (
    <div className="page-enter space-y-6">
      <PageHeader
        saveStatus={saveStatus}
        assessmentName={assessmentName}
        info={info}
        isDirty={isDirty}
        onSave={handleManualSave}
      />

      {noRatings && (
        <div
          data-ocid="report.error_state"
          className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
        >
          <ClipboardX className="h-4 w-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-700 font-body">
            No ratings recorded yet. The report can still be exported but
            practice rating sections will be empty.
          </p>
        </div>
      )}

      <GlobalInputSection
        title="Global Strengths"
        description="Assessment-level strengths to include in Slide 5 of the report"
        accentClass="border-l-green-500"
        badgeBg="bg-green-100 text-green-800"
        items={globalStrengths}
        newValue={newStrength}
        onNewValueChange={setNewStrength}
        onAdd={addStrength}
        onRemove={removeStrength}
        placeholder="Enter a global strength..."
        addOcid="report.add_strength_button"
        inputOcid="report.strength_input"
        findingOptions={allStrengthFindings}
        onImportFinding={importStrengthFinding}
        alreadyImported={globalStrengths}
      />

      <GlobalInputSection
        title="Global Weaknesses"
        description="Assessment-level weaknesses to include in Slide 6 of the report"
        accentClass="border-l-red-500"
        badgeBg="bg-red-100 text-red-800"
        items={globalWeaknesses}
        newValue={newWeakness}
        onNewValueChange={setNewWeakness}
        onAdd={addWeakness}
        onRemove={removeWeakness}
        placeholder="Enter a global weakness..."
        addOcid="report.add_weakness_button"
        inputOcid="report.weakness_input"
        findingOptions={allWeaknessFindings}
        onImportFinding={importWeaknessFinding}
        alreadyImported={globalWeaknesses}
      />

      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          data-ocid="report.export_ppt_button"
          onClick={handleExportPpt}
          disabled={pptLoading}
          className="inline-flex items-center justify-center gap-3
            rounded-xl border-2 border-blue-200 bg-blue-50 px-8 py-4
            text-sm font-bold font-heading text-blue-700
            hover:border-blue-400 hover:bg-blue-100
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400
            disabled:cursor-not-allowed disabled:opacity-60
            transition-all duration-200"
        >
          {pptLoading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Monitor className="h-5 w-5" />
          )}
          {pptLoading ? "Generating..." : "Export PowerPoint (.pptx)"}
        </button>
      </div>
      <p className="text-xs text-muted-foreground font-body -mt-3">
        Includes all slides with ratings, findings, global strengths &amp;
        weaknesses
      </p>
    </div>
  );
}

function PageHeader({
  saveStatus,
  assessmentName,
  info,
  isDirty,
  onSave,
}: {
  saveStatus?: "idle" | "saving" | "saved";
  assessmentName?: string;
  info?: any;
  isDirty?: boolean;
  onSave?: () => void;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Generate Report
        </h1>
        {assessmentName && (
          <p className="text-muted-foreground text-sm mt-0.5 font-body">
            {assessmentName}
            {info?.projectName ? ` — ${info.projectName}` : ""}
          </p>
        )}
        {!assessmentName && (
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Export assessment as a PowerPoint presentation
          </p>
        )}
      </div>
      <div className="flex items-center gap-3">
        {saveStatus && saveStatus !== "idle" && (
          <div
            className={`text-xs font-medium font-body transition-opacity duration-300 ${
              saveStatus === "saved"
                ? "text-green-600"
                : "text-muted-foreground"
            }`}
          >
            {saveStatus === "saving" ? "Saving..." : "Saved ✓"}
          </div>
        )}
        {onSave && assessmentName && (
          <Button
            size="sm"
            variant="outline"
            onClick={onSave}
            className="gap-1.5 h-8 text-xs"
            data-ocid="report.save_button"
          >
            <Save className="h-3.5 w-3.5" />
            Save
            {isDirty && (
              <span className="ml-0.5 h-1.5 w-1.5 rounded-full bg-amber-500 inline-block" />
            )}
          </Button>
        )}
      </div>
    </div>
  );
}

interface SwEntry {
  id: string;
  type: "strength" | "weakness" | "observation" | "suggestion";
  text: string;
  status?: "draft" | "final";
  createdBy?: string;
  practiceIds?: string[];
}

interface GlobalInputSectionProps {
  title: string;
  description: string;
  accentClass: string;
  badgeBg: string;
  items: string[];
  newValue: string;
  onNewValueChange: (v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  placeholder: string;
  addOcid: string;
  inputOcid: string;
  findingOptions: SwEntry[];
  onImportFinding: (entry: SwEntry) => void;
  alreadyImported: string[];
}

function GlobalInputSection({
  title,
  description,
  accentClass,
  badgeBg,
  items,
  newValue,
  onNewValueChange,
  onAdd,
  onRemove,
  placeholder,
  addOcid,
  inputOcid,
  findingOptions,
  onImportFinding,
  alreadyImported,
}: GlobalInputSectionProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Close picker on outside click
  useEffect(() => {
    if (!pickerOpen) return;
    function handleClick(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [pickerOpen]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      onAdd();
    }
  }

  return (
    <Card className={`border-l-4 ${accentClass} border-border/60`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-sm font-bold font-heading text-foreground">
              {title}
            </h2>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              {description}
            </p>
          </div>
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full font-body ${badgeBg}`}
          >
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>

        {items.length > 0 && (
          <ul className="space-y-1.5 mb-3">
            {items.map((item, i) => (
              <li
                key={`${title}-${item}`}
                data-ocid={`report.${title.toLowerCase().replace(" ", "_")}.item.${i + 1}`}
                className="flex items-start gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2 text-sm font-body group"
              >
                <span className="text-muted-foreground font-semibold text-xs mt-0.5 shrink-0 w-4">
                  {i + 1}.
                </span>
                <span className="flex-1 text-foreground leading-relaxed">
                  {item}
                </span>
                <button
                  type="button"
                  data-ocid={`report.${title.toLowerCase().replace(" ", "_")}.delete_button.${i + 1}`}
                  onClick={() => onRemove(i)}
                  className="shrink-0 p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 opacity-0 group-hover:opacity-100 transition-all"
                  title={`Remove ${title.toLowerCase().slice(0, -1)}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="flex gap-2">
          <input
            data-ocid={inputOcid}
            type="text"
            value={newValue}
            onChange={(e) => onNewValueChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="flex-1 rounded-lg border border-border/60 bg-background px-3 py-2 text-sm font-body
              placeholder:text-muted-foreground/60
              focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent/60
              transition-colors"
          />
          <button
            type="button"
            data-ocid={addOcid}
            onClick={onAdd}
            disabled={!newValue.trim()}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2
              text-sm font-semibold font-body text-white
              hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
              transition-all"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>

          {/* Import from Assessment picker */}
          <div className="relative" ref={pickerRef}>
            <button
              type="button"
              data-ocid={`report.import_${title.toLowerCase().replace(" ", "_")}_button`}
              onClick={() => setPickerOpen((v) => !v)}
              title="Import from assessment findings"
              className="inline-flex items-center gap-1.5 rounded-lg border border-border/60 bg-background px-3 py-2
                text-sm font-semibold font-body text-muted-foreground
                hover:bg-muted/60 hover:text-foreground
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent
                transition-all"
            >
              <Import className="h-4 w-4" />
              <span className="hidden sm:inline">Import</span>
            </button>

            {pickerOpen && (
              <div
                className="absolute right-0 top-full mt-1 z-50 w-80 rounded-xl border border-border/60 bg-background shadow-lg"
                style={{ maxHeight: 320 }}
              >
                <div className="flex items-center justify-between px-3 py-2 border-b border-border/40">
                  <span className="text-xs font-semibold font-heading text-foreground">
                    Import from Assessment
                  </span>
                  <button
                    type="button"
                    onClick={() => setPickerOpen(false)}
                    className="text-muted-foreground hover:text-foreground p-0.5 rounded"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 260 }}>
                  {findingOptions.length === 0 ? (
                    <p className="text-xs text-muted-foreground font-body px-3 py-4 text-center italic">
                      No{" "}
                      {title.toLowerCase().includes("strength")
                        ? "strength"
                        : "weakness"}{" "}
                      findings found in Perform Assessment.
                    </p>
                  ) : (
                    findingOptions.map((entry) => {
                      const plain = stripRichText(entry.text);
                      const alreadyAdded = alreadyImported.includes(plain);
                      return (
                        <button
                          key={entry.id}
                          type="button"
                          disabled={alreadyAdded}
                          onClick={() => {
                            onImportFinding(entry);
                            setPickerOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2.5 border-b border-border/30 last:border-b-0
                            text-xs font-body leading-relaxed
                            transition-colors
                            ${
                              alreadyAdded
                                ? "text-muted-foreground/50 cursor-not-allowed bg-muted/30"
                                : "text-foreground hover:bg-muted/50 cursor-pointer"
                            }`}
                        >
                          <span
                            className="block overflow-hidden"
                            style={{
                              display: "-webkit-box",
                              WebkitLineClamp: 2,
                              WebkitBoxOrient: "vertical",
                              overflow: "hidden",
                            }}
                          >
                            {plain || "(empty description)"}
                          </span>
                          {alreadyAdded && (
                            <span className="text-[10px] text-muted-foreground/60 mt-0.5 block">
                              Already added
                            </span>
                          )}
                          {entry.practiceIds &&
                            entry.practiceIds.length > 0 && (
                              <span className="text-[10px] text-muted-foreground/70 mt-0.5 block">
                                {entry.practiceIds
                                  .map((k) => {
                                    // key format: processId_level_practiceId
                                    const parts = k.split("_");
                                    return parts.slice(2).join(".");
                                  })
                                  .join(", ")}
                              </span>
                            )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
