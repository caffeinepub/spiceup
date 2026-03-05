import { Card, CardContent } from "@/components/ui/card";
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
  useGetAllPracticeRatingsForAssessment,
  useGetProcessGroupConfig,
} from "@/hooks/useQueries";
import { BarChart2, ClipboardX } from "lucide-react";
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
  // PA-level overall ratings keyed by paId ("PA1.1", "PA2.1", etc.)
  paRatings: Record<string, Rating | null>;
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

      // PA-level overall ratings — stored at level 5 with practiceId = paId
      // (e.g. "PA1.1", "PA2.1" ...) by the Perform Assessment save logic
      const paRatings: Record<string, Rating | null> = {};
      const paIds = ["PA1.1"];
      if (targetLevel >= 2) {
        paIds.push("PA2.1", "PA2.2");
      }
      if (targetLevel >= 3) {
        paIds.push("PA3.1", "PA3.2");
      }
      for (const paId of paIds) {
        const r = procRatings.find(
          (pr) => Number(pr.level) === 5 && pr.practiceId === paId,
        );
        const val =
          r?.rating && ["N", "P", "L", "F"].includes(r.rating)
            ? (r.rating as Rating)
            : null;
        paRatings[paId] = val;
      }

      results.push({
        id: proc.id,
        label: proc.name,
        targetLevel,
        practices: practiceRows,
        rollup,
        paRatings,
      });
    }
  }

  return results;
}

// ─── Capability Level Calculator ────────────────────────────────

function computeCapabilityLevel(
  targetLevel: number,
  paRatings: Record<string, Rating | null>,
): number | null {
  const get = (paId: string): Rating | null => paRatings[paId] ?? null;

  if (targetLevel === 1) {
    const pa11 = get("PA1.1");
    if (pa11 === null) return null;
    return pa11 === "L" || pa11 === "F" ? 1 : 0;
  }

  if (targetLevel === 2) {
    const pa11 = get("PA1.1");
    const pa21 = get("PA2.1");
    const pa22 = get("PA2.2");
    // If any of the PA2 ratings are not available, partial results are still ok
    if (pa11 === null) return null;
    if (
      pa11 === "F" &&
      (pa21 === "L" || pa21 === "F") &&
      (pa22 === "L" || pa22 === "F")
    )
      return 2;
    if (pa11 === "L" || pa11 === "F") return 1;
    return 0;
  }

  if (targetLevel === 3) {
    const pa11 = get("PA1.1");
    const pa21 = get("PA2.1");
    const pa22 = get("PA2.2");
    const pa31 = get("PA3.1");
    const pa32 = get("PA3.2");
    if (pa11 === null) return null;
    if (
      pa11 === "F" &&
      pa21 === "F" &&
      pa22 === "F" &&
      (pa31 === "L" || pa31 === "F") &&
      (pa32 === "L" || pa32 === "F")
    )
      return 3;
    if (
      pa11 === "F" &&
      (pa21 === "L" || pa21 === "F") &&
      (pa22 === "L" || pa22 === "F")
    )
      return 2;
    if (pa11 === "L" || pa11 === "F") return 1;
    return 0;
  }

  return null;
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

  // GP counts per PA (IDs in data have no spaces: "PA2.1", "PA2.2", etc.)
  const pa21Count =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA2.1")?.practices.length ?? 6;
  const pa22Count =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA2.2")?.practices.length ?? 4;
  const pa31Count =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA3.1")?.practices.length ?? 4;
  const pa32Count =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA3.2")?.practices.length ?? 4;

  // Build rating lookup per process: { practiceId -> rating }
  const processRatingLookup: Record<string, Record<string, Rating | null>> = {};
  for (const proc of processes) {
    processRatingLookup[proc.id] = {};
    for (const pr of proc.practices) {
      processRatingLookup[proc.id][pr.practiceId] = pr.rating;
    }
  }

  // PA 2.1 GPs (IDs in data have no spaces: "PA2.1", "PA2.2", etc.)
  const pa21GPs =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA2.1")?.practices ?? [];
  // PA 2.2 GPs
  const pa22GPs =
    LEVEL2_ATTRIBUTES.find((pa) => pa.id === "PA2.2")?.practices ?? [];
  // PA 3.1 GPs
  const pa31GPs =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA3.1")?.practices ?? [];
  // PA 3.2 GPs
  const pa32GPs =
    LEVEL3_ATTRIBUTES.find((pa) => pa.id === "PA3.2")?.practices ?? [];

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
            {/* PA 1.1: overall rating col + BP cols */}
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-slate-200 min-w-[40px]"
              rowSpan={2}
              title="PA 1.1 overall rating"
            >
              PA 1.1
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-slate-100"
              colSpan={maxBPs}
            >
              Base Practices
            </th>
            {/* PA 2.1: overall rating col + GP cols */}
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-blue-200 min-w-[40px]"
              rowSpan={2}
              title="PA 2.1 overall rating"
            >
              PA 2.1
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-blue-50"
              colSpan={pa21Count}
            >
              GPs
            </th>
            {/* PA 2.2 */}
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-indigo-200 min-w-[40px]"
              rowSpan={2}
              title="PA 2.2 overall rating"
            >
              PA 2.2
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-indigo-50"
              colSpan={pa22Count}
            >
              GPs
            </th>
            {/* PA 3.1 */}
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-violet-200 min-w-[40px]"
              rowSpan={2}
              title="PA 3.1 overall rating"
            >
              PA 3.1
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-violet-50"
              colSpan={pa31Count}
            >
              GPs
            </th>
            {/* PA 3.2 */}
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-purple-200 min-w-[40px]"
              rowSpan={2}
              title="PA 3.2 overall rating"
            >
              PA 3.2
            </th>
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-purple-50"
              colSpan={pa32Count}
            >
              GPs
            </th>
            {/* Capability Level */}
            <th
              className="px-2 py-2 text-center font-heading font-semibold text-foreground border border-border/40 bg-amber-200 min-w-[44px]"
              rowSpan={2}
              title="Capability Level"
            >
              CL
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

            // Helper to render a PA overall rating cell
            function PaOverallCell({
              paId,
              minLevel,
            }: { paId: string; minLevel: number }) {
              if (targetLevel < minLevel) {
                return (
                  <td className="px-1 py-1.5 text-center border border-border/30 bg-muted/20 min-w-[40px]">
                    <span className="text-muted-foreground/40 text-xs">—</span>
                  </td>
                );
              }
              const rating = proc.paRatings[paId] ?? null;
              if (!rating) {
                return (
                  <td className="px-1 py-1.5 text-center border border-border/30 bg-muted/10 min-w-[40px]">
                    <span className="text-muted-foreground/50 text-xs">—</span>
                  </td>
                );
              }
              const color = ASPICE_RATING_COLORS[rating];
              return (
                <td className="px-1 py-1.5 text-center border border-border/30 min-w-[40px]">
                  <span
                    className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold border-2"
                    style={{
                      backgroundColor: color.bg,
                      color: color.text,
                      borderColor: color.bg,
                    }}
                  >
                    {rating}
                  </span>
                </td>
              );
            }

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

                {/* PA 1.1 overall rating */}
                <PaOverallCell paId="PA1.1" minLevel={1} />

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

                {/* PA 2.1 overall rating */}
                <PaOverallCell paId="PA2.1" minLevel={2} />

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

                {/* PA 2.2 overall rating */}
                <PaOverallCell paId="PA2.2" minLevel={2} />

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

                {/* PA 3.1 overall rating */}
                <PaOverallCell paId="PA3.1" minLevel={3} />

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

                {/* PA 3.2 overall rating */}
                <PaOverallCell paId="PA3.2" minLevel={3} />

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

                {/* Capability Level */}
                {(() => {
                  const cl = computeCapabilityLevel(
                    targetLevel,
                    proc.paRatings,
                  );
                  if (cl === null) {
                    return (
                      <td className="px-1 py-1.5 text-center border border-border/30 bg-amber-50/40 min-w-[44px]">
                        <span className="text-muted-foreground/50 text-xs">
                          —
                        </span>
                      </td>
                    );
                  }
                  return (
                    <td className="px-1 py-1.5 text-center border border-border/30 bg-amber-50/40 min-w-[44px]">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded text-xs font-bold bg-amber-400 text-white border-2 border-amber-500">
                        {cl}
                      </span>
                    </td>
                  );
                })()}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── Main Component ─────────────────────────────────────────────

export function ViewResults() {
  const { currentAssessmentId, navigateTo } = useAppContext();

  const { data: config, isLoading: configLoading } =
    useGetProcessGroupConfig(currentAssessmentId);

  const { data: ratings, isLoading: ratingsLoading } =
    useGetAllPracticeRatingsForAssessment(currentAssessmentId);

  const isLoading =
    currentAssessmentId != null && (configLoading || ratingsLoading);

  // Build process results
  const processResults: ProcessResult[] =
    config && ratings
      ? buildProcessResults(config.enabledGroups, config.processLevels, ratings)
      : [];

  const hasRatings =
    (ratings?.filter((r) => r.rating && ["N", "P", "L", "F"].includes(r.rating))
      .length ?? 0) > 0;

  return (
    <div className="page-enter space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Results
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-body">
          Assessment results summary with practice ratings across all process
          areas
        </p>
      </div>

      {/* No assessment selected */}
      {!currentAssessmentId && (
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
              Select an assessment from the dropdown in the top-right corner, or
              go to the{" "}
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
      {currentAssessmentId && isLoading && (
        <div className="space-y-4">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-40 rounded-xl" />
        </div>
      )}

      {/* Results content */}
      {currentAssessmentId && !isLoading && (
        <>
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
