import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";
import { PROCESS_GROUPS } from "@/data/aspiceData";
import {
  useGetAllAssessments,
  useGetAllPracticeRatingsForAssessment,
  useGetAssessmentDays,
  useGetAssessmentInfoData,
  useGetProcessGroupConfig,
} from "@/hooks/useQueries";
import { exportToExcel } from "@/utils/exportExcel";
import { exportToPdf } from "@/utils/exportPdf";
import { exportToPpt } from "@/utils/exportPpt";
import { buildReportData } from "@/utils/reportData";
import {
  CheckCircle2,
  ClipboardX,
  FileSpreadsheet,
  FileText,
  Loader2,
  Monitor,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

// ─── Section checklist data ──────────────────────────────────────

const REPORT_SECTIONS = [
  {
    icon: "📋",
    title: "Assessment Information",
    desc: "Project name, dates, assessors, assessed party, sponsor, PAM/VDA version, remarks",
  },
  {
    icon: "🎯",
    title: "Scope",
    desc: "All processes included in assessment with their target capability levels",
  },
  {
    icon: "📊",
    title: "Results Matrix",
    desc: "All processes × PA ratings (PA1.1–PA3.2) with computed Capability Levels",
  },
  {
    icon: "🔍",
    title: "Per-Process Detail",
    desc: "BP/GP ratings, strengths, weaknesses, and work products inspected per process",
  },
];

// ─── Export button component ─────────────────────────────────────

interface ExportButtonProps {
  icon: React.ReactNode;
  label: string;
  sublabel: string;
  isLoading: boolean;
  onClick: () => void;
  ocid: string;
  accent: string;
}

function ExportButton({
  icon,
  label,
  sublabel,
  isLoading,
  onClick,
  ocid,
  accent,
}: ExportButtonProps) {
  return (
    <button
      type="button"
      data-ocid={ocid}
      onClick={onClick}
      disabled={isLoading}
      className={`group relative flex flex-col items-center gap-3 rounded-xl border-2 p-6 text-center transition-all duration-200
        hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70
        disabled:cursor-not-allowed disabled:opacity-60
        ${accent}`}
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-background shadow-sm transition-transform group-hover:scale-110">
        {isLoading ? (
          <Loader2 className="h-7 w-7 animate-spin text-accent" />
        ) : (
          icon
        )}
      </div>
      <div>
        <p className="text-sm font-bold font-heading text-foreground">
          {label}
        </p>
        <p className="text-xs text-muted-foreground font-body mt-0.5">
          {sublabel}
        </p>
      </div>
      {isLoading && (
        <span className="absolute inset-0 flex items-end justify-center pb-2">
          <span className="text-[10px] text-muted-foreground font-body animate-pulse">
            Generating...
          </span>
        </span>
      )}
    </button>
  );
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

  const [pdfLoading, setPdfLoading] = useState(false);
  const [excelLoading, setExcelLoading] = useState(false);
  const [pptLoading, setPptLoading] = useState(false);

  const isDataLoading =
    currentAssessmentId != null &&
    (infoLoading || configLoading || ratingsLoading || daysLoading);

  const currentAssessment = assessments?.find(
    (a) => currentAssessmentId != null && a.id === currentAssessmentId,
  );
  const assessmentName = currentAssessment?.name ?? "Assessment";

  // Process count in scope
  let processCount = 0;
  if (config) {
    try {
      const enabledGroups = JSON.parse(config.enabledGroups) as string[];
      const processLevels = JSON.parse(config.processLevels) as Record<
        string,
        string
      >;
      processCount = PROCESS_GROUPS.filter((g) => enabledGroups.includes(g.id))
        .flatMap((g) => g.processes)
        .filter((p) => {
          const level = processLevels[p.id];
          return level !== "NA" && level !== undefined;
        }).length;
    } catch {
      processCount = 0;
    }
  }

  async function handleExport(type: "pdf" | "excel" | "ppt") {
    if (!currentAssessmentId) {
      toast.error("No assessment selected. Please select an assessment first.");
      return;
    }

    if (!config || !ratings) {
      toast.error(
        "Assessment data is not yet loaded. Please wait a moment and try again.",
      );
      return;
    }

    const setLoading =
      type === "pdf"
        ? setPdfLoading
        : type === "excel"
          ? setExcelLoading
          : setPptLoading;

    setLoading(true);
    try {
      const reportData = buildReportData(
        assessmentName,
        info ?? null,
        config,
        ratings ?? [],
        days ?? [],
      );

      if (type === "pdf") {
        exportToPdf(reportData);
        toast.success("PDF report downloaded successfully");
      } else if (type === "excel") {
        exportToExcel(reportData);
        toast.success("Excel report downloaded successfully");
      } else {
        exportToPpt(reportData);
        toast.success("PowerPoint report downloaded successfully");
      }
    } catch (err) {
      console.error(`Export ${type} failed:`, err);
      toast.error(
        `Failed to generate ${type.toUpperCase()} report. Please try again.`,
      );
    } finally {
      setLoading(false);
    }
  }

  // ── No assessment selected ──
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

  // ── Loading ──
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

  return (
    <div className="page-enter space-y-6">
      <PageHeader />

      {/* Assessment summary */}
      <Card className="border-border/60 bg-card">
        <CardContent className="pt-5 pb-4">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wide mb-1">
                Current Assessment
              </p>
              <h2 className="text-lg font-bold font-heading text-foreground">
                {assessmentName}
              </h2>
              {info && (
                <p className="text-sm text-muted-foreground font-body mt-0.5">
                  {info.projectName && <span>{info.projectName}</span>}
                  {info.startDate && info.endDate && (
                    <span className="ml-2 text-xs">
                      {info.startDate} – {info.endDate}
                    </span>
                  )}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {info?.leadAssessor && (
                <Badge variant="outline" className="text-xs font-body">
                  Lead: {info.leadAssessor}
                </Badge>
              )}
              {config && (
                <Badge className="text-xs font-body bg-accent/10 text-accent border-accent/30">
                  {processCount} processes
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-4" />

          {/* What's included */}
          <p className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wide mb-3">
            Report includes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {REPORT_SECTIONS.map((section) => (
              <div key={section.title} className="flex items-start gap-2.5">
                <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-semibold font-body text-foreground">
                    {section.icon} {section.title}
                  </p>
                  <p className="text-[11px] text-muted-foreground font-body leading-tight">
                    {section.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* No ratings warning */}
      {ratings &&
        ratings.filter(
          (r) => r.rating && ["N", "P", "L", "F"].includes(r.rating),
        ).length === 0 && (
          <div
            data-ocid="report.error_state"
            className="flex items-center gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <ClipboardX className="h-4 w-4 text-amber-600 shrink-0" />
            <p className="text-sm text-amber-700 font-body">
              No ratings recorded yet. Reports will be exported but practice
              rating sections will be empty.
            </p>
          </div>
        )}

      {/* Export buttons */}
      <div>
        <p className="text-xs font-semibold text-muted-foreground font-body uppercase tracking-wide mb-3">
          Export Format
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ExportButton
            ocid="report.export_pdf_button"
            icon={<FileText className="h-7 w-7 text-red-500" />}
            label="Export PDF"
            sublabel="Cover · Results Matrix · Per-process detail"
            isLoading={pdfLoading}
            onClick={() => handleExport("pdf")}
            accent="border-red-200 hover:border-red-400 hover:bg-red-50/50"
          />
          <ExportButton
            ocid="report.export_excel_button"
            icon={<FileSpreadsheet className="h-7 w-7 text-emerald-500" />}
            label="Export Excel"
            sublabel="Executive summary + one sheet per process"
            isLoading={excelLoading}
            onClick={() => handleExport("excel")}
            accent="border-emerald-200 hover:border-emerald-400 hover:bg-emerald-50/50"
          />
          <ExportButton
            ocid="report.export_ppt_button"
            icon={<Monitor className="h-7 w-7 text-blue-500" />}
            label="Export PowerPoint"
            sublabel="Cover · Results · One slide per process"
            isLoading={pptLoading}
            onClick={() => handleExport("ppt")}
            accent="border-blue-200 hover:border-blue-400 hover:bg-blue-50/50"
          />
        </div>
      </div>

      {/* Format description cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <FormatCard
          icon={<FileText className="h-4 w-4 text-red-400" />}
          title="PDF Layout"
          items={[
            "Page 1: Cover with assessment info",
            "Page 2: Executive summary matrix",
            "Page 3+: One page per process",
            "Colored NPLF rating cells",
          ]}
        />
        <FormatCard
          icon={<FileSpreadsheet className="h-4 w-4 text-emerald-400" />}
          title="Excel Structure"
          items={[
            "Sheet 1: Info + Scope + Results matrix",
            "Sheet per process (e.g. SWE.1)",
            "All BPs/GPs with ratings",
            "Strengths, weaknesses, evidence",
          ]}
        />
        <FormatCard
          icon={<Monitor className="h-4 w-4 text-blue-400" />}
          title="PowerPoint Structure"
          items={[
            "Slide 1: Cover slide",
            "Slide 2: Results matrix",
            "Slide per process with findings",
            "Strengths & weaknesses summary",
          ]}
        />
      </div>
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function PageHeader() {
  return (
    <div>
      <h1 className="text-2xl font-bold font-heading text-foreground">
        Generate Report
      </h1>
      <p className="text-muted-foreground text-sm mt-1 font-body">
        Export full assessment as PDF, Excel, or PowerPoint
      </p>
    </div>
  );
}

function FormatCard({
  icon,
  title,
  items,
}: {
  icon: React.ReactNode;
  title: string;
  items: string[];
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center gap-2 mb-2">
          {icon}
          <p className="text-xs font-bold font-heading text-foreground">
            {title}
          </p>
        </div>
        <ul className="space-y-1">
          {items.map((item) => (
            <li
              key={item}
              className="flex items-start gap-1.5 text-[11px] text-muted-foreground font-body"
            >
              <span className="text-muted-foreground/50 mt-0.5">·</span>
              {item}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
