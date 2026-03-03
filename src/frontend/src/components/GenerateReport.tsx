import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
import { FileText, Plus, Loader2, Download } from "lucide-react";
import { toast } from "sonner";
import {
  useGetAllReports,
  useGenerateReport,
  useGetAllAssessments,
} from "@/hooks/useQueries";

function formatDate(time: bigint): string {
  const ms = Number(time / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function GenerateReport() {
  const { data: reports, isLoading } = useGetAllReports();
  const { data: assessments } = useGetAllAssessments();
  const generateMutation = useGenerateReport();

  const [showForm, setShowForm] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [reportContent, setReportContent] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assessmentId) {
      toast.error("Please select an assessment");
      return;
    }
    if (!reportContent.trim()) {
      toast.error("Report content is required");
      return;
    }
    try {
      await generateMutation.mutateAsync({
        assessmentId: BigInt(assessmentId),
        reportContent: reportContent.trim(),
      });
      toast.success("Report generated successfully");
      setReportContent("");
      setAssessmentId("");
      setShowForm(false);
    } catch {
      toast.error("Failed to generate report");
    }
  }

  function getAssessmentName(id: bigint) {
    return assessments?.find((a) => a.id === id)?.name ?? `Assessment #${String(id)}`;
  }

  function handleDownload(report: { id: bigint; reportContent: string; assessmentId: bigint; generatedAt: bigint }) {
    const assessmentName = getAssessmentName(report.assessmentId);
    const content = `SPICEUP ASSESSMENT REPORT\n${"=".repeat(50)}\nAssessment: ${assessmentName}\nGenerated: ${formatDate(report.generatedAt)}\nReport ID: ${String(report.id)}\n\n${"=".repeat(50)}\n\n${report.reportContent}`;
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SpiceUp-Report-${String(report.id)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Generate Report</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Create and export assessment reports</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="spice-gradient text-white border-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          New Report
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Generate Assessment Report</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
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
                <Label>Report Content</Label>
                <Textarea
                  value={reportContent}
                  onChange={(e) => setReportContent(e.target.value)}
                  placeholder="Write a comprehensive report covering assessment scope, methodology, findings, scores, and recommendations..."
                  rows={8}
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={generateMutation.isPending} className="spice-gradient text-white border-0">
                  {generateMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Report
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Reports List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : reports && reports.length > 0 ? (
        <div className="space-y-4">
          {reports.map((report) => (
            <Card key={String(report.id)} className="border-border/60 hover:border-accent/30 transition-colors">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-accent/10">
                      <FileText className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-heading">{getAssessmentName(report.assessmentId)}</CardTitle>
                      <p className="text-xs text-muted-foreground font-body mt-0.5">
                        Report #{String(report.id)} · {formatDate(report.generatedAt)}
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(report)}
                    className="gap-2 shrink-0 hover:bg-accent/10 hover:text-accent hover:border-accent/40"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/70 font-body line-clamp-3">{report.reportContent}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <FileText className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-body text-sm">No reports generated yet.</p>
            <p className="text-muted-foreground/60 font-body text-xs mt-1">Generate your first assessment report.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
