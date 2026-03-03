import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart2, TrendingUp, AlertCircle } from "lucide-react";
import { useGetAllAssessmentResults, useGetAllAssessments } from "@/hooks/useQueries";

function formatDate(time: bigint): string {
  const ms = Number(time / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function ScoreRing({ score }: { score: number }) {
  const clamped = Math.min(Math.max(score, 0), 100);
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;

  const color =
    clamped >= 80 ? "#10b981" : clamped >= 60 ? "#3b82f6" : clamped >= 40 ? "#f59e0b" : "#ef4444";

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="rotate-[-90deg]" width="72" height="72" viewBox="0 0 72 72" aria-label={`Score: ${score}`} role="img">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="currentColor" strokeWidth="6" className="text-muted" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-700"
        />
      </svg>
      <span className="absolute text-lg font-bold font-heading text-foreground">{clamped}</span>
    </div>
  );
}

export function ViewResults() {
  const { data: results, isLoading } = useGetAllAssessmentResults();
  const { data: assessments } = useGetAllAssessments();

  function getAssessmentName(id: bigint) {
    return assessments?.find((a) => a.id === id)?.name ?? `Assessment #${String(id)}`;
  }

  const avgScore =
    results && results.length > 0
      ? Math.round(results.reduce((sum, r) => sum + Number(r.score), 0) / results.length)
      : null;

  const highest = results && results.length > 0
    ? Math.max(...results.map((r) => Number(r.score)))
    : null;

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">View Results</h1>
        <p className="text-muted-foreground text-sm mt-1 font-body">Review assessment scores and insights</p>
      </div>

      {/* Summary Stats */}
      {!isLoading && results && results.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <Card className="border-border/60 text-center">
            <CardContent className="py-4">
              <p className="text-3xl font-bold font-heading text-foreground">{results.length}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">Total Results</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 text-center">
            <CardContent className="py-4">
              <p className="text-3xl font-bold font-heading text-accent">{avgScore}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">Average Score</p>
            </CardContent>
          </Card>
          <Card className="border-border/60 text-center">
            <CardContent className="py-4">
              <p className="text-3xl font-bold font-heading text-emerald-600">{highest}</p>
              <p className="text-xs text-muted-foreground font-body mt-1">Highest Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Results Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
        </div>
      ) : results && results.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {results.map((result) => {
            const scoreNum = Number(result.score);
            const scoreLabel =
              scoreNum >= 80 ? "Excellent" : scoreNum >= 60 ? "Good" : scoreNum >= 40 ? "Fair" : "Needs Improvement";
            const scoreLabelColor =
              scoreNum >= 80
                ? "text-emerald-600"
                : scoreNum >= 60
                ? "text-blue-600"
                : scoreNum >= 40
                ? "text-amber-600"
                : "text-red-600";

            return (
              <Card key={String(result.id)} className="border-border/60 hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-sm font-heading">{getAssessmentName(result.assessmentId)}</CardTitle>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">{formatDate(result.completedAt)}</p>
                    </div>
                    <ScoreRing score={scoreNum} />
                  </div>
                  <p className={`text-xs font-semibold font-heading mt-1 ${scoreLabelColor}`}>{scoreLabel}</p>
                </CardHeader>
                <CardContent className="space-y-3 pt-0">
                  {result.findings && (
                    <div className="flex gap-2 p-3 bg-muted/60 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-muted-foreground font-heading uppercase tracking-wide mb-0.5">Findings</p>
                        <p className="text-xs text-foreground/80 font-body">{result.findings}</p>
                      </div>
                    </div>
                  )}
                  {result.recommendations && (
                    <div className="flex gap-2 p-3 bg-accent/5 rounded-lg">
                      <AlertCircle className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                      <div>
                        <p className="text-xs font-semibold text-accent font-heading uppercase tracking-wide mb-0.5">Recommendations</p>
                        <p className="text-xs text-foreground/80 font-body">{result.recommendations}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <BarChart2 className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-body text-sm">No results available.</p>
            <p className="text-muted-foreground/60 font-body text-xs mt-1">Perform assessments to see results here.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
