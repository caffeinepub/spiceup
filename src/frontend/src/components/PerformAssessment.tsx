import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CheckSquare, Loader2, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import {
  useGetAllAssessmentResults,
  useAddAssessmentResult,
  useGetAllAssessments,
} from "@/hooks/useQueries";

function formatDate(time: bigint): string {
  const ms = Number(time / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ScoreBar({ score }: { score: bigint }) {
  const value = Number(score);
  const clamped = Math.min(Math.max(value, 0), 100);
  const color =
    clamped >= 80 ? "bg-emerald-500" : clamped >= 60 ? "bg-blue-500" : clamped >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${clamped}%` }} />
      </div>
      <span className="text-sm font-semibold font-heading text-foreground w-10 text-right">{value}</span>
    </div>
  );
}

export function PerformAssessment() {
  const { data: results, isLoading } = useGetAllAssessmentResults();
  const { data: assessments } = useGetAllAssessments();
  const addMutation = useAddAssessmentResult();

  const [showForm, setShowForm] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [score, setScore] = useState("75");
  const [findings, setFindings] = useState("");
  const [recommendations, setRecommendations] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assessmentId) {
      toast.error("Please select an assessment");
      return;
    }
    const scoreNum = parseInt(score, 10);
    if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > 100) {
      toast.error("Score must be between 0 and 100");
      return;
    }
    try {
      await addMutation.mutateAsync({
        assessmentId: BigInt(assessmentId),
        score: BigInt(scoreNum),
        findings: findings.trim(),
        recommendations: recommendations.trim(),
      });
      toast.success("Assessment result recorded");
      setFindings("");
      setRecommendations("");
      setAssessmentId("");
      setScore("75");
      setShowForm(false);
    } catch {
      toast.error("Failed to record result");
    }
  }

  function getAssessmentName(id: bigint) {
    return assessments?.find((a) => a.id === id)?.name ?? `Assessment #${String(id)}`;
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Perform Assessment</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Record assessment scores, findings, and recommendations</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="spice-gradient text-white border-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Result
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Record Assessment Result</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Assessment</Label>
                  <Select value={assessmentId} onValueChange={setAssessmentId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select assessment" />
                    </SelectTrigger>
                    <SelectContent>
                      {assessments?.map((a) => (
                        <SelectItem key={String(a.id)} value={String(a.id)}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Score (0–100)</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Findings</Label>
                <Textarea
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                  placeholder="Document key findings from the assessment..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Recommendations</Label>
                <Textarea
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                  placeholder="Provide actionable recommendations based on findings..."
                  rows={3}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={addMutation.isPending} className="spice-gradient text-white border-0">
                  {addMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Record Result
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : results && results.length > 0 ? (
        <div className="space-y-4">
          {results.map((result) => (
            <Card key={String(result.id)} className="border-border/60 hover:border-accent/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-sm font-heading">{getAssessmentName(result.assessmentId)}</CardTitle>
                  <span className="text-xs text-muted-foreground font-body">{formatDate(result.completedAt)}</span>
                </div>
                <ScoreBar score={result.score} />
              </CardHeader>
              <CardContent className="space-y-3 pt-0">
                {result.findings && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 font-heading">Findings</p>
                    <p className="text-sm text-foreground/80 font-body">{result.findings}</p>
                  </div>
                )}
                {result.recommendations && (
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1 font-heading">Recommendations</p>
                    <p className="text-sm text-foreground/80 font-body">{result.recommendations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CheckSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-body text-sm">No results recorded yet.</p>
            <p className="text-muted-foreground/60 font-body text-xs mt-1">Start by recording an assessment result.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
