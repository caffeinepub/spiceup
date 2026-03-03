import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppContext } from "@/context/AppContext";
import {
  BASE_PRACTICES,
  LEVEL2_ATTRIBUTES,
  LEVEL3_ATTRIBUTES,
  PROCESS_GROUPS,
} from "@/data/aspiceData";
import {
  useGetAllAssessments,
  useGetAllPracticeRatingsForAssessment,
  useGetProcessGroupConfig,
} from "@/hooks/useQueries";
import { BarChart2, ChevronDown, ChevronUp, ClipboardX } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { PracticeRating } from "../backend.d";

// ─── Types ─────────────────────────────────────────────────────

type Rating = "N" | "P" | "L" | "F";

interface PracticeRow {
  practiceId: string;
  title: string;
  rating: Rating | null;
  level: number;
  paGroup?: string; // e.g. "PA 2.1", "PA 3.2"
}

interface ProcessRollup {
  N: number;
  P: number;
  L: number;
  F: number;
  total: number;
  pctN: number;
  pctP: number;
  pctL: number;
  pctF: number;
}

interface ProcessResult {
  id: string;
  label: string;
  targetLevel: number;
  practices: PracticeRow[];
  rollup: ProcessRollup;
}

// ─── Rating color helpers ───────────────────────────────────────

const RATING_COLORS: Record<Rating, string> = {
  N: "bg-red-100 text-red-700 border-red-200",
  P: "bg-orange-100 text-orange-700 border-orange-200",
  L: "bg-blue-100 text-blue-700 border-blue-200",
  F: "bg-green-100 text-green-700 border-green-200",
};

const RATING_FILL: Record<Rating, string> = {
  N: "#ef4444",
  P: "#f97316",
  L: "#3b82f6",
  F: "#22c55e",
};

function RatingBadge({ rating }: { rating: Rating | null }) {
  if (!rating) return <span className="text-muted-foreground text-xs">—</span>;
  return (
    <span
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold border ${RATING_COLORS[rating]}`}
    >
      {rating}
    </span>
  );
}

// ─── Data builder ───────────────────────────────────────────────

function buildProcessResults(
  enabledGroupsJson: string,
  processLevelsJson: string,
  ratings: PracticeRating[],
): ProcessResult[] {
  let enabledGroups: string[] = [];
  let processLevels: Record<string, string> = {};

  try {
    enabledGroups = JSON.parse(enabledGroupsJson) as string[];
  } catch {
    enabledGroups = [];
  }
  try {
    processLevels = JSON.parse(processLevelsJson) as Record<string, string>;
  } catch {
    processLevels = {};
  }

  // Build a map: processId -> ratings
  const ratingMap: Record<string, PracticeRating[]> = {};
  for (const r of ratings) {
    if (!ratingMap[r.processId]) ratingMap[r.processId] = [];
    ratingMap[r.processId].push(r);
  }

  const results: ProcessResult[] = [];

  for (const group of PROCESS_GROUPS) {
    if (!enabledGroups.includes(group.id)) continue;

    for (const proc of group.processes) {
      const levelStr = processLevels[proc.id];
      if (levelStr === "NA" || levelStr === undefined) continue;

      const targetLevel = Number.parseInt(levelStr ?? "2", 10);
      const procRatings = ratingMap[proc.id] ?? [];

      // Build a lookup: practiceId -> rating
      const ratingByPracticeId: Record<string, Rating> = {};
      for (const r of procRatings) {
        if (r.rating && ["N", "P", "L", "F"].includes(r.rating)) {
          ratingByPracticeId[r.practiceId] = r.rating as Rating;
        }
      }

      const practiceRows: PracticeRow[] = [];

      // Level 1 — Base Practices
      const bps = BASE_PRACTICES[proc.id] ?? [];
      for (const bp of bps) {
        practiceRows.push({
          practiceId: bp.id,
          title: bp.title,
          rating: ratingByPracticeId[bp.id] ?? null,
          level: 1,
        });
      }

      // Level 2 — Generic Practices
      if (targetLevel >= 2) {
        for (const pa of LEVEL2_ATTRIBUTES) {
          for (const gp of pa.practices) {
            practiceRows.push({
              practiceId: gp.id,
              title: gp.title,
              rating: ratingByPracticeId[gp.id] ?? null,
              level: 2,
              paGroup: pa.name,
            });
          }
        }
      }

      // Level 3 — Generic Practices
      if (targetLevel >= 3) {
        for (const pa of LEVEL3_ATTRIBUTES) {
          for (const gp of pa.practices) {
            practiceRows.push({
              practiceId: gp.id,
              title: gp.title,
              rating: ratingByPracticeId[gp.id] ?? null,
              level: 3,
              paGroup: pa.name,
            });
          }
        }
      }

      // Rollup — count only rated practices
      const rated = practiceRows.filter((p) => p.rating !== null);
      const rollup: ProcessRollup = {
        N: rated.filter((p) => p.rating === "N").length,
        P: rated.filter((p) => p.rating === "P").length,
        L: rated.filter((p) => p.rating === "L").length,
        F: rated.filter((p) => p.rating === "F").length,
        total: rated.length,
        pctN: 0,
        pctP: 0,
        pctL: 0,
        pctF: 0,
      };

      if (rollup.total > 0) {
        rollup.pctN = Math.round((rollup.N / rollup.total) * 100);
        rollup.pctP = Math.round((rollup.P / rollup.total) * 100);
        rollup.pctL = Math.round((rollup.L / rollup.total) * 100);
        rollup.pctF = Math.round((rollup.F / rollup.total) * 100);
      }

      results.push({
        id: proc.id,
        label: proc.name,
        targetLevel,
        practices: practiceRows,
        rollup,
      });
    }
  }

  return results;
}

// ─── Summary Cards ──────────────────────────────────────────────

function SummaryCard({
  label,
  value,
  accent,
  index,
}: {
  label: string;
  value: number;
  accent: string;
  index: number;
}) {
  return (
    <Card
      data-ocid={`results.summary_card.${index}`}
      className="border-border/60 stat-card-hover"
    >
      <CardContent className="py-5 px-5">
        <p className={`text-3xl font-bold font-heading ${accent}`}>{value}</p>
        <p className="text-xs text-muted-foreground font-body mt-1">{label}</p>
      </CardContent>
    </Card>
  );
}

// ─── Process Section ────────────────────────────────────────────

function ProcessSection({
  process,
  index,
}: {
  process: ProcessResult;
  index: number;
}) {
  const [open, setOpen] = useState(true);

  // Group practices by level then by PA group
  const level1Practices = process.practices.filter((p) => p.level === 1);
  const level2Practices = process.practices.filter((p) => p.level === 2);
  const level3Practices = process.practices.filter((p) => p.level === 3);

  // Group L2/L3 by paGroup
  function groupByPA(practices: PracticeRow[]) {
    const groups: Record<string, PracticeRow[]> = {};
    for (const p of practices) {
      const key = p.paGroup ?? "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(p);
    }
    return Object.entries(groups);
  }

  const { rollup } = process;

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      data-ocid={`results.process_row.${index}`}
    >
      <Card className="border-border/60 overflow-hidden">
        {/* Process Header */}
        <CollapsibleTrigger asChild>
          <button
            type="button"
            className="w-full text-left"
            aria-expanded={open}
          >
            <div className="flex items-center justify-between px-5 py-4 bg-muted/40 hover:bg-muted/60 transition-colors border-b border-border/40">
              <div className="flex items-center gap-3">
                <span className="text-sm font-bold font-heading text-accent bg-accent/10 px-2.5 py-0.5 rounded-md">
                  {process.id}
                </span>
                <span className="text-sm font-medium text-foreground font-body">
                  {process.label}
                </span>
                <span className="text-xs text-muted-foreground font-body">
                  Target: Level {process.targetLevel}
                </span>
              </div>
              <div className="flex items-center gap-4">
                {/* Mini rollup */}
                {rollup.total > 0 && (
                  <div className="hidden sm:flex items-center gap-2 text-xs font-mono">
                    {(["N", "P", "L", "F"] as Rating[]).map((r) => (
                      <span
                        key={r}
                        className={`px-2 py-0.5 rounded font-semibold border ${RATING_COLORS[r]}`}
                      >
                        {r}:{rollup[r]}
                      </span>
                    ))}
                  </div>
                )}
                {open ? (
                  <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                )}
              </div>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/20 hover:bg-muted/20">
                  <TableHead className="w-32 font-heading text-xs uppercase tracking-wide">
                    Practice ID
                  </TableHead>
                  <TableHead className="font-heading text-xs uppercase tracking-wide">
                    Title
                  </TableHead>
                  <TableHead className="w-20 text-center font-heading text-xs uppercase tracking-wide">
                    Rating
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Level 1 */}
                {level1Practices.length > 0 && (
                  <>
                    <TableRow className="bg-slate-50/50 hover:bg-slate-50/50">
                      <TableCell
                        colSpan={3}
                        className="py-1.5 px-4 text-xs font-semibold font-heading text-muted-foreground uppercase tracking-wider"
                      >
                        Level 1 — Base Practices
                      </TableCell>
                    </TableRow>
                    {level1Practices.map((p) => (
                      <TableRow
                        key={p.practiceId}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                          {p.practiceId}
                        </TableCell>
                        <TableCell className="text-sm text-foreground font-body py-2.5">
                          {p.title}
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <RatingBadge rating={p.rating} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </>
                )}

                {/* Level 2 grouped by PA */}
                {level2Practices.length > 0 &&
                  groupByPA(level2Practices).flatMap(([paName, practices]) => [
                    <TableRow
                      key={`l2-header-${paName}`}
                      className="bg-blue-50/50 hover:bg-blue-50/50"
                    >
                      <TableCell
                        colSpan={3}
                        className="py-1.5 px-4 text-xs font-semibold font-heading text-blue-600 uppercase tracking-wider"
                      >
                        Level 2 — {paName}
                      </TableCell>
                    </TableRow>,
                    ...practices.map((p) => (
                      <TableRow
                        key={p.practiceId}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                          {p.practiceId}
                        </TableCell>
                        <TableCell className="text-sm text-foreground font-body py-2.5">
                          {p.title}
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <RatingBadge rating={p.rating} />
                        </TableCell>
                      </TableRow>
                    )),
                  ])}

                {/* Level 3 grouped by PA */}
                {level3Practices.length > 0 &&
                  groupByPA(level3Practices).flatMap(([paName, practices]) => [
                    <TableRow
                      key={`l3-header-${paName}`}
                      className="bg-purple-50/50 hover:bg-purple-50/50"
                    >
                      <TableCell
                        colSpan={3}
                        className="py-1.5 px-4 text-xs font-semibold font-heading text-purple-600 uppercase tracking-wider"
                      >
                        Level 3 — {paName}
                      </TableCell>
                    </TableRow>,
                    ...practices.map((p) => (
                      <TableRow
                        key={p.practiceId}
                        className="hover:bg-muted/20"
                      >
                        <TableCell className="font-mono text-xs text-muted-foreground py-2.5">
                          {p.practiceId}
                        </TableCell>
                        <TableCell className="text-sm text-foreground font-body py-2.5">
                          {p.title}
                        </TableCell>
                        <TableCell className="text-center py-2.5">
                          <RatingBadge rating={p.rating} />
                        </TableCell>
                      </TableRow>
                    )),
                  ])}

                {/* Rollup row */}
                {rollup.total > 0 && (
                  <TableRow className="bg-muted/30 border-t-2 border-border/60">
                    <TableCell className="py-3 font-heading text-xs font-bold text-foreground uppercase">
                      Rollup
                    </TableCell>
                    <TableCell className="py-3">
                      <span className="text-xs text-muted-foreground font-body">
                        {rollup.total} practices rated
                      </span>
                    </TableCell>
                    <TableCell className="py-3">
                      <div className="flex items-center gap-1.5 justify-center flex-wrap">
                        {(["N", "P", "L", "F"] as Rating[]).map((r) => (
                          <span
                            key={r}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-semibold border ${RATING_COLORS[r]}`}
                          >
                            {r}: {rollup[r]}
                            <span className="opacity-70">
                              ({rollup[`pct${r}` as keyof ProcessRollup]}%)
                            </span>
                          </span>
                        ))}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}

// ─── Stacked Bar Chart ──────────────────────────────────────────

function StackedBarChartView({
  processes,
}: {
  processes: ProcessResult[];
}) {
  const data = processes.map((p) => ({
    process: p.id,
    N: p.rollup.N,
    P: p.rollup.P,
    L: p.rollup.L,
    F: p.rollup.F,
  }));

  return (
    <Card data-ocid="results.bar_chart" className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">
          Rating Distribution per Process
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          Count of N / P / L / F ratings stacked per process area
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={320}>
          <BarChart
            data={data}
            margin={{ top: 8, right: 20, left: 0, bottom: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis
              dataKey="process"
              tick={{ fontSize: 11, fontFamily: "monospace" }}
              tickLine={false}
              axisLine={{ stroke: "hsl(var(--border))" }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
              iconType="square"
            />
            <Bar
              dataKey="N"
              name="Not Satisfied (N)"
              fill={RATING_FILL.N}
              stackId="a"
              radius={[0, 0, 0, 0]}
            />
            <Bar
              dataKey="P"
              name="Partially Satisfied (P)"
              fill={RATING_FILL.P}
              stackId="a"
            />
            <Bar
              dataKey="L"
              name="Largely Satisfied (L)"
              fill={RATING_FILL.L}
              stackId="a"
            />
            <Bar
              dataKey="F"
              name="Fully Satisfied (F)"
              fill={RATING_FILL.F}
              stackId="a"
              radius={[3, 3, 0, 0]}
            />
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Radar Chart ────────────────────────────────────────────────

function RadarChartView({ processes }: { processes: ProcessResult[] }) {
  const data = processes.map((p) => ({
    process: p.id,
    fullySatisfied:
      p.rollup.total > 0 ? Math.round((p.rollup.F / p.rollup.total) * 100) : 0,
  }));

  return (
    <Card data-ocid="results.radar_chart" className="border-border/60">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-heading">
          Maturity Overview — Fully Satisfied %
        </CardTitle>
        <p className="text-xs text-muted-foreground font-body">
          % of practices rated "F" (Fully Satisfied) per process
        </p>
      </CardHeader>
      <CardContent className="pt-2">
        <ResponsiveContainer width="100%" height={320}>
          <RadarChart
            data={data}
            margin={{ top: 20, right: 30, bottom: 20, left: 30 }}
          >
            <PolarGrid stroke="hsl(var(--border))" />
            <PolarAngleAxis
              dataKey="process"
              tick={{
                fontSize: 11,
                fontFamily: "monospace",
                fill: "hsl(var(--foreground))",
              }}
            />
            <Radar
              name="Fully Satisfied %"
              dataKey="fullySatisfied"
              stroke={RATING_FILL.F}
              fill={RATING_FILL.F}
              fillOpacity={0.25}
              strokeWidth={2}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value}%`, "Fully Satisfied"]}
            />
          </RadarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function ViewResults() {
  const { currentAssessmentId, navigateTo } = useAppContext();
  const [selectedAssessmentId, setSelectedAssessmentId] = useState<
    bigint | null
  >(currentAssessmentId);

  const { data: assessments, isLoading: assessmentsLoading } =
    useGetAllAssessments();

  const { data: config, isLoading: configLoading } =
    useGetProcessGroupConfig(selectedAssessmentId);

  const { data: ratings, isLoading: ratingsLoading } =
    useGetAllPracticeRatingsForAssessment(selectedAssessmentId);

  const isLoading =
    assessmentsLoading ||
    (selectedAssessmentId != null && (configLoading || ratingsLoading));

  // Build process results
  const processResults: ProcessResult[] =
    config && ratings
      ? buildProcessResults(config.enabledGroups, config.processLevels, ratings)
      : [];

  // Summary counts
  const allRatings = ratings ?? [];
  const ratedPractices = allRatings.filter(
    (r) => r.rating && ["N", "P", "L", "F"].includes(r.rating),
  );
  const totalRated = ratedPractices.length;
  const countN = ratedPractices.filter((r) => r.rating === "N").length;
  const countP = ratedPractices.filter((r) => r.rating === "P").length;
  const countL = ratedPractices.filter((r) => r.rating === "L").length;
  const countF = ratedPractices.filter((r) => r.rating === "F").length;

  const hasRatings = totalRated > 0;

  return (
    <div className="page-enter space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          View Results
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-body">
          Assessment results summary with practice ratings, process rollups, and
          visualizations
        </p>
      </div>

      {/* Assessment Selector */}
      <Card className="border-border/60">
        <CardContent className="py-4 px-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <label
              htmlFor="assessment-select"
              className="text-sm font-semibold font-heading text-foreground shrink-0"
            >
              Assessment:
            </label>
            <Select
              value={selectedAssessmentId?.toString() ?? ""}
              onValueChange={(val) => {
                setSelectedAssessmentId(val ? BigInt(val) : null);
              }}
            >
              <SelectTrigger
                id="assessment-select"
                data-ocid="results.assessment_select"
                className="max-w-sm"
              >
                <SelectValue placeholder="Select an assessment…" />
              </SelectTrigger>
              <SelectContent>
                {assessments?.map((a) => (
                  <SelectItem key={a.id.toString()} value={a.id.toString()}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedAssessmentId && assessments && (
              <Badge
                variant="outline"
                className="text-xs font-body shrink-0 self-start sm:self-auto"
              >
                {assessments.find((a) => a.id === selectedAssessmentId)
                  ?.status ?? "—"}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* No assessment selected */}
      {!selectedAssessmentId && (
        <Card
          data-ocid="results.empty_state"
          className="border-dashed border-border/60"
        >
          <CardContent className="flex flex-col items-center justify-center py-20 gap-3">
            <BarChart2 className="h-10 w-10 text-muted-foreground/30" />
            <p className="text-muted-foreground font-body text-sm font-medium">
              No assessment selected
            </p>
            <p className="text-muted-foreground/60 font-body text-xs text-center max-w-xs">
              Select an assessment from the dropdown above to view its results,
              or go to the{" "}
              <button
                type="button"
                className="text-accent hover:underline"
                onClick={() => navigateTo("dashboard")}
              >
                Dashboard
              </button>{" "}
              to create one.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Loading skeleton */}
      {selectedAssessmentId && isLoading && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-20 rounded-xl" />
            ))}
          </div>
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {/* Results content */}
      {selectedAssessmentId && !isLoading && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <SummaryCard
              label="Total Rated"
              value={totalRated}
              accent="text-foreground"
              index={1}
            />
            <SummaryCard
              label="Not Satisfied (N)"
              value={countN}
              accent="text-red-600"
              index={2}
            />
            <SummaryCard
              label="Partially Satisfied (P)"
              value={countP}
              accent="text-orange-500"
              index={3}
            />
            <SummaryCard
              label="Largely Satisfied (L)"
              value={countL}
              accent="text-blue-600"
              index={4}
            />
            <SummaryCard
              label="Fully Satisfied (F)"
              value={countF}
              accent="text-green-600"
              index={5}
            />
          </div>

          {/* No ratings yet */}
          {!hasRatings && (
            <Card
              data-ocid="results.empty_state"
              className="border-dashed border-border/60"
            >
              <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
                <ClipboardX className="h-10 w-10 text-muted-foreground/30" />
                <p className="text-muted-foreground font-body text-sm font-medium">
                  No ratings recorded yet
                </p>
                <p className="text-muted-foreground/60 font-body text-xs text-center max-w-xs">
                  Go to{" "}
                  <button
                    type="button"
                    className="text-accent hover:underline"
                    onClick={() => navigateTo("perform")}
                  >
                    Perform Assessment
                  </button>{" "}
                  to rate practices for this assessment.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Charts */}
          {hasRatings && processResults.length > 0 && (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
              <StackedBarChartView processes={processResults} />
              <RadarChartView processes={processResults} />
            </div>
          )}

          {/* Results Table */}
          {processResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-heading text-foreground">
                  Process Results
                </h2>
                <p className="text-xs text-muted-foreground font-body">
                  {processResults.length} process
                  {processResults.length !== 1 ? "es" : ""} included (NA
                  excluded)
                </p>
              </div>

              {/* Rating legend */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-body text-muted-foreground">
                <span className="font-semibold">Legend:</span>
                {(["N", "P", "L", "F"] as Rating[]).map((r) => {
                  const labels: Record<Rating, string> = {
                    N: "Not Satisfied",
                    P: "Partially Satisfied",
                    L: "Largely Satisfied",
                    F: "Fully Satisfied",
                  };
                  return (
                    <span
                      key={r}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border ${RATING_COLORS[r]}`}
                    >
                      <span className="font-bold">{r}</span> — {labels[r]}
                    </span>
                  );
                })}
              </div>

              {processResults.map((process, idx) => (
                <ProcessSection
                  key={process.id}
                  process={process}
                  index={idx + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
