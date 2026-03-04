import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAppContext } from "@/context/AppContext";
import {
  ASPICE_RATING_COLORS,
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
import { BarChart2, ClipboardX } from "lucide-react";
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

const RATING_FILL: Record<Rating, string> = {
  N: ASPICE_RATING_COLORS.N.bg,
  P: ASPICE_RATING_COLORS.P.bg,
  L: ASPICE_RATING_COLORS.L.bg,
  F: ASPICE_RATING_COLORS.F.bg,
};

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

// ─── Cross-Process Matrix Table ─────────────────────────────────

function MatrixRatingCell({
  rating,
  greyed,
}: {
  rating: Rating | null;
  greyed: boolean;
}) {
  if (greyed) {
    return (
      <td className="px-1 py-1.5 text-center border border-border/30 bg-muted/20 min-w-[36px]">
        <span className="text-muted-foreground/40 text-xs">—</span>
      </td>
    );
  }
  if (!rating) {
    return (
      <td className="px-1 py-1.5 text-center border border-border/30 min-w-[36px]">
        <span className="text-muted-foreground/50 text-xs">—</span>
      </td>
    );
  }
  const color = ASPICE_RATING_COLORS[rating];
  return (
    <td className="px-1 py-1.5 text-center border border-border/30 min-w-[36px]">
      <span
        className="inline-flex items-center justify-center w-6 h-6 rounded text-xs font-bold"
        style={{ backgroundColor: color.bg, color: color.text }}
      >
        {rating}
      </span>
    </td>
  );
}

function ResultsMatrixTable({
  processes,
}: {
  processes: ProcessResult[];
}) {
  // Determine max BP count across all processes
  const maxBPs = processes.reduce((max, p) => {
    const bpCount = p.practices.filter((pr) => pr.level === 1).length;
    return Math.max(max, bpCount);
  }, 0);

  // GP counts per PA
  const pa21Count =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA 2.1")?.practices.length ?? 6;
  const pa22Count =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA 2.2")?.practices.length ?? 4;
  const pa31Count =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA 3.1")?.practices.length ?? 4;
  const pa32Count =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA 3.2")?.practices.length ?? 4;

  // Build rating lookup per process: { practiceId -> rating }
  const processRatingLookup: Record<string, Record<string, Rating | null>> = {};
  for (const proc of processes) {
    processRatingLookup[proc.id] = {};
    for (const pr of proc.practices) {
      processRatingLookup[proc.id][pr.practiceId] = pr.rating;
    }
  }

  // PA 2.1 GPs
  const pa21GPs =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA 2.1")?.practices ?? [];
  // PA 2.2 GPs
  const pa22GPs =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA 2.2")?.practices ?? [];
  // PA 3.1 GPs
  const pa31GPs =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA 3.1")?.practices ?? [];
  // PA 3.2 GPs
  const pa32GPs =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA 3.2")?.practices ?? [];

  return (
    <div className="overflow-x-auto rounded-lg border border-border/60">
      <table className="border-collapse text-xs font-body min-w-full">
        <thead>
          {/* Group header row */}
          <tr className="bg-muted/60">
            <th
              className="sticky left-0 z-10 bg-muted/80 px-3 py-2 text-left font-heading font-semibold text-foreground border border-border/40 min-w-[90px]"
              rowSpan={2}
            >
              Process
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-slate-100"
              colSpan={maxBPs}
            >
              PA 1.1 — Base Practices
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-blue-50"
              colSpan={pa21Count}
            >
              PA 2.1
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-indigo-50"
              colSpan={pa22Count}
            >
              PA 2.2
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-violet-50"
              colSpan={pa31Count}
            >
              PA 3.1
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-purple-50"
              colSpan={pa32Count}
            >
              PA 3.2
            </th>
          </tr>
          {/* Sub-header row */}
          <tr className="bg-muted/40">
            {Array.from({ length: maxBPs }, (_, i) => (
              <th
                key={`bp-header-${i + 1}`}
                className="px-1 py-1.5 text-center font-heading text-[10px] text-muted-foreground border border-border/30 bg-slate-50 min-w-[36px]"
              >
                BP{i + 1}
              </th>
            ))}
            {pa21GPs.map((gp) => (
              <th
                key={gp.id}
                className="px-1 py-1.5 text-center font-heading text-[10px] text-muted-foreground border border-border/30 bg-blue-50/60 min-w-[36px]"
                title={gp.title}
              >
                {gp.id.replace("GP ", "G")}
              </th>
            ))}
            {pa22GPs.map((gp) => (
              <th
                key={gp.id}
                className="px-1 py-1.5 text-center font-heading text-[10px] text-muted-foreground border border-border/30 bg-indigo-50/60 min-w-[36px]"
                title={gp.title}
              >
                {gp.id.replace("GP ", "G")}
              </th>
            ))}
            {pa31GPs.map((gp) => (
              <th
                key={gp.id}
                className="px-1 py-1.5 text-center font-heading text-[10px] text-muted-foreground border border-border/30 bg-violet-50/60 min-w-[36px]"
                title={gp.title}
              >
                {gp.id.replace("GP ", "G")}
              </th>
            ))}
            {pa32GPs.map((gp) => (
              <th
                key={gp.id}
                className="px-1 py-1.5 text-center font-heading text-[10px] text-muted-foreground border border-border/30 bg-purple-50/60 min-w-[36px]"
                title={gp.title}
              >
                {gp.id.replace("GP ", "G")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processes.map((proc, rowIdx) => {
            const bps = proc.practices.filter((p) => p.level === 1);
            const ratingMap = processRatingLookup[proc.id] ?? {};
            const targetLevel = proc.targetLevel;
            const rowBg = rowIdx % 2 === 0 ? "bg-white" : "bg-muted/10";

            return (
              <tr
                key={proc.id}
                className={`${rowBg} hover:bg-accent/5 transition-colors`}
              >
                {/* Process ID */}
                <td className="sticky left-0 z-10 px-3 py-2 border border-border/40 font-heading font-semibold text-xs text-accent bg-inherit">
                  <div className="flex flex-col">
                    <span>{proc.id}</span>
                    <span className="text-[9px] text-muted-foreground font-normal font-body">
                      L{targetLevel}
                    </span>
                  </div>
                </td>

                {/* PA 1.1 — BPs */}
                {Array.from({ length: maxBPs }, (_, i) => {
                  const bp = bps[i];
                  if (!bp) {
                    return (
                      <td
                        key={`bp-cell-${proc.id}-${i + 1}`}
                        className="px-1 py-1.5 text-center border border-border/30 bg-muted/20 min-w-[36px]"
                      >
                        <span className="text-muted-foreground/30 text-xs">
                          ·
                        </span>
                      </td>
                    );
                  }
                  return (
                    <MatrixRatingCell
                      key={`${proc.id}-${bp.practiceId}`}
                      rating={ratingMap[bp.practiceId] ?? null}
                      greyed={false}
                    />
                  );
                })}

                {/* PA 2.1 GPs */}
                {pa21GPs.map((gp) => (
                  <MatrixRatingCell
                    key={`${proc.id}-${gp.id}`}
                    rating={
                      targetLevel >= 2 ? (ratingMap[gp.id] ?? null) : null
                    }
                    greyed={targetLevel < 2}
                  />
                ))}

                {/* PA 2.2 GPs */}
                {pa22GPs.map((gp) => (
                  <MatrixRatingCell
                    key={`${proc.id}-${gp.id}`}
                    rating={
                      targetLevel >= 2 ? (ratingMap[gp.id] ?? null) : null
                    }
                    greyed={targetLevel < 2}
                  />
                ))}

                {/* PA 3.1 GPs */}
                {pa31GPs.map((gp) => (
                  <MatrixRatingCell
                    key={`${proc.id}-${gp.id}`}
                    rating={
                      targetLevel >= 3 ? (ratingMap[gp.id] ?? null) : null
                    }
                    greyed={targetLevel < 3}
                  />
                ))}

                {/* PA 3.2 GPs */}
                {pa32GPs.map((gp) => (
                  <MatrixRatingCell
                    key={`${proc.id}-${gp.id}`}
                    rating={
                      targetLevel >= 3 ? (ratingMap[gp.id] ?? null) : null
                    }
                    greyed={targetLevel < 3}
                  />
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
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
              label="Not Achieved (N)"
              value={countN}
              accent="text-red-800"
              index={2}
            />
            <SummaryCard
              label="Partially Achieved (P)"
              value={countP}
              accent="text-yellow-600"
              index={3}
            />
            <SummaryCard
              label="Largely Achieved (L)"
              value={countL}
              accent="text-lime-600"
              index={4}
            />
            <SummaryCard
              label="Fully Achieved (F)"
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

          {/* Results Summary Matrix */}
          {processResults.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold font-heading text-foreground">
                  Assessment Results Summary
                </h2>
                <p className="text-xs text-muted-foreground font-body">
                  {processResults.length} process
                  {processResults.length !== 1 ? "es" : ""} included (NA
                  excluded)
                </p>
              </div>

              {/* Rating Legend */}
              <div className="flex flex-wrap items-center gap-2 text-xs font-body">
                <span className="font-semibold text-muted-foreground">
                  Legend:
                </span>
                {(
                  [
                    ["F", "Fully Achieved", "86–100%"],
                    ["L", "Largely Achieved", "51–85%"],
                    ["P", "Partially Achieved", "16–50%"],
                    ["N", "Not Achieved", "0–15%"],
                    ["NA", "Not Applicable", ""],
                  ] as [keyof typeof ASPICE_RATING_COLORS, string, string][]
                ).map(([r, label, range]) => {
                  const color = ASPICE_RATING_COLORS[r];
                  return (
                    <span
                      key={r}
                      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded border text-white text-[11px] font-semibold"
                      style={{
                        backgroundColor: color.bg,
                        borderColor: color.bg,
                      }}
                    >
                      <span className="font-bold">{r}</span>
                      <span className="opacity-90 font-normal">
                        {label}
                        {range ? ` (${range})` : ""}
                      </span>
                    </span>
                  );
                })}
              </div>

              {/* Matrix Table */}
              <ResultsMatrixTable processes={processResults} />
            </div>
          )}
        </>
      )}
    </div>
  );
}
