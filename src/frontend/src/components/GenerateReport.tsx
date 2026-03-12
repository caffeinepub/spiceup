import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";
import {
  useGetAllAssessments,
  useGetAllPracticeRatingsForAssessment,
  useGetAssessmentDays,
  useGetAssessmentInfoData,
  useGetProcessGroupConfig,
  useGetReportGlobalInputs,
  useSaveReportGlobalInputs,
} from "@/hooks/useQueries";
import { exportToPpt } from "@/utils/exportPpt";
import { buildReportData } from "@/utils/reportData";
import {
  ClipboardX,
  FileText,
  Loader2,
  Monitor,
  Plus,
  Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

  const [globalStrengths, setGlobalStrengths] = useState<string[]>([]);
  const [globalWeaknesses, setGlobalWeaknesses] = useState<string[]>([]);
  const [newStrength, setNewStrength] = useState("");
  const [newWeakness, setNewWeakness] = useState("");
  const [pptLoading, setPptLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle",
  );
  const isFirstLoad = useRef(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    if (globalInputsData) {
      try {
        const s = JSON.parse(globalInputsData.globalStrengths) as string[];
        if (Array.isArray(s)) setGlobalStrengths(s);
      } catch {
        setGlobalStrengths([]);
      }
      try {
        const w = JSON.parse(globalInputsData.globalWeaknesses) as string[];
        if (Array.isArray(w)) setGlobalWeaknesses(w);
      } catch {
        setGlobalWeaknesses([]);
      }
      isFirstLoad.current = false;
    }
  }, [globalInputsData]);

  const triggerSave = useCallback(
    (strengths: string[], weaknesses: string[]) => {
      if (!currentAssessmentId) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        setSaveStatus("saving");
        try {
          await saveGlobalInputsMutation.mutateAsync({
            assessmentId: currentAssessmentId,
            globalStrengths: JSON.stringify(strengths),
            globalWeaknesses: JSON.stringify(weaknesses),
          });
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        } catch {
          setSaveStatus("idle");
        }
      }, 1200);
    },
    [currentAssessmentId, saveGlobalInputsMutation],
  );

  function addStrength() {
    const text = newStrength.trim();
    if (!text) return;
    const updated = [...globalStrengths, text];
    setGlobalStrengths(updated);
    setNewStrength("");
    triggerSave(updated, globalWeaknesses);
  }

  function removeStrength(i: number) {
    const updated = globalStrengths.filter((_, idx) => idx !== i);
    setGlobalStrengths(updated);
    triggerSave(updated, globalWeaknesses);
  }

  function addWeakness() {
    const text = newWeakness.trim();
    if (!text) return;
    const updated = [...globalWeaknesses, text];
    setGlobalWeaknesses(updated);
    setNewWeakness("");
    triggerSave(globalStrengths, updated);
  }

  function removeWeakness(i: number) {
    const updated = globalWeaknesses.filter((_, idx) => idx !== i);
    setGlobalWeaknesses(updated);
    triggerSave(globalStrengths, updated);
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
      const reportData = buildReportData(
        assessmentName,
        info ?? null,
        config,
        ratings ?? [],
        days ?? [],
        globalStrengths,
        globalWeaknesses,
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
      />

      <div>
        <button
          type="button"
          data-ocid="report.export_ppt_button"
          onClick={handleExportPpt}
          disabled={pptLoading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-3
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
        <p className="text-xs text-muted-foreground font-body mt-2">
          Includes all slides with ratings, findings, global strengths &amp;
          weaknesses
        </p>
      </div>
    </div>
  );
}

function PageHeader({
  saveStatus,
  assessmentName,
  info,
}: {
  saveStatus?: "idle" | "saving" | "saved";
  assessmentName?: string;
  info?: any;
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
      {saveStatus && saveStatus !== "idle" && (
        <div
          className={`text-xs font-medium font-body transition-opacity duration-300 ${
            saveStatus === "saved" ? "text-green-600" : "text-muted-foreground"
          }`}
        >
          {saveStatus === "saving" ? "Saving..." : "Saved ✓"}
        </div>
      )}
    </div>
  );
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
}: GlobalInputSectionProps) {
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
                key={`${title}-item-${item.slice(0, 20)}-${i}`}
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
        </div>
      </CardContent>
    </Card>
  );
}
