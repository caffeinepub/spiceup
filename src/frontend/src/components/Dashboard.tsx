import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  useGetAllAssessmentResults,
  useGetAllAssessments,
  useGetAllReports,
  useMarkAssessmentCompleted,
} from "@/hooks/useQueries";
import {
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock,
  FileText,
  Loader2,
  Play,
  Plus,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Assessment } from "../backend.d";
import { CreateNewAssessmentModal } from "./CreateNewAssessmentModal";

function formatDate(time: bigint): string {
  const ms = Number(time / BigInt(1_000_000));
  return new Date(ms).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    Active: "bg-blue-50 text-blue-700 border-blue-200",
    Completed: "bg-emerald-50 text-emerald-700 border-emerald-200",
    Draft: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <Badge
      variant="outline"
      className={`font-body text-xs ${styles[status] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
    >
      {status}
    </Badge>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  iconColor,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  iconColor: string;
  isLoading: boolean;
}) {
  return (
    <Card className="stat-card-hover border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground font-body uppercase tracking-wide">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold font-heading text-foreground">
            {value}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [createOpen, setCreateOpen] = useState(false);
  const { setCurrentAssessment, navigateTo } = useAppContext();

  const { data: assessments, isLoading: loadingAssessments } =
    useGetAllAssessments();
  const { data: results, isLoading: loadingResults } =
    useGetAllAssessmentResults();
  const { data: reports, isLoading: loadingReports } = useGetAllReports();
  const markCompletedMutation = useMarkAssessmentCompleted();

  const totalAssessments = assessments?.length ?? 0;
  const completedCount =
    assessments?.filter((a: Assessment) => a.status === "Completed").length ??
    0;
  const activeCount =
    assessments?.filter((a: Assessment) => a.status !== "Completed").length ??
    0;
  const resultsCount = Array.isArray(results) ? results.length : 0;
  const reportsCount = Array.isArray(reports) ? reports.length : 0;

  function handleContinue(assessment: Assessment, index: number) {
    setCurrentAssessment(assessment.id, assessment.name);
    const step = assessment.currentStep || "assessment-info";
    navigateTo(step);
    void index; // used for data-ocid only
  }

  async function handleMarkCompleted(id: bigint) {
    try {
      await markCompletedMutation.mutateAsync(id);
      toast.success("Assessment marked as completed");
    } catch {
      toast.error("Failed to mark assessment as completed");
    }
  }

  return (
    <div className="page-enter space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            My Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Overview of your ASPICE assessment activities
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        <KpiCard
          title="Total Assessments"
          value={totalAssessments}
          icon={ClipboardList}
          iconColor="spice-gradient"
          isLoading={loadingAssessments}
        />
        <KpiCard
          title="Completed"
          value={completedCount}
          icon={CheckCircle2}
          iconColor="bg-emerald-500"
          isLoading={loadingAssessments}
        />
        <KpiCard
          title="Active Assessments"
          value={activeCount}
          icon={Clock}
          iconColor="bg-blue-500"
          isLoading={loadingAssessments}
        />
        <KpiCard
          title="Assessment Results"
          value={resultsCount}
          icon={TrendingUp}
          iconColor="bg-amber-500"
          isLoading={loadingResults}
        />
        <KpiCard
          title="Reports Generated"
          value={reportsCount}
          icon={FileText}
          iconColor="bg-rose-500"
          isLoading={loadingReports}
        />
      </div>

      {/* Assessments section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-heading text-foreground">
            Assessments
          </h2>
          <Button
            onClick={() => setCreateOpen(true)}
            className="spice-gradient text-white border-0 gap-2"
            data-ocid="dashboard.create_assessment_button"
          >
            <Plus className="h-4 w-4" />
            Create New Assessment
          </Button>
        </div>

        {/* Table */}
        <Card
          className="border-border/60"
          data-ocid="dashboard.assessments_table"
        >
          <CardContent className="p-0">
            {loadingAssessments ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : assessments && assessments.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                      Assessment Title
                    </TableHead>
                    <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground">
                      Last Updated
                    </TableHead>
                    <TableHead className="font-heading text-xs uppercase tracking-wide text-muted-foreground text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment: Assessment, index: number) => (
                    <TableRow
                      key={String(assessment.id)}
                      className="hover:bg-muted/30"
                      data-ocid={`dashboard.assessments_table.row.${index + 1}`}
                    >
                      <TableCell>
                        <p className="font-medium font-body text-foreground text-sm">
                          {assessment.name}
                        </p>
                        <p className="text-xs text-muted-foreground font-body mt-0.5 capitalize">
                          Step:{" "}
                          {assessment.currentStep?.replace(/-/g, " ") ||
                            "Not started"}
                        </p>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={assessment.status} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground font-body">
                        {formatDate(assessment.updatedAt)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="gap-1.5 text-xs h-8 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                            onClick={() =>
                              handleContinue(assessment, index + 1)
                            }
                            data-ocid={`dashboard.continue_button.${index + 1}`}
                          >
                            <Play className="h-3 w-3" />
                            Continue
                          </Button>
                          {assessment.status !== "Completed" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="gap-1.5 text-xs h-8 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                              onClick={() => handleMarkCompleted(assessment.id)}
                              disabled={markCompletedMutation.isPending}
                              data-ocid={`dashboard.mark_completed_button.${index + 1}`}
                            >
                              {markCompletedMutation.isPending ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <CheckSquare className="h-3 w-3" />
                              )}
                              Mark Completed
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div
                className="flex flex-col items-center justify-center py-16 text-center"
                data-ocid="dashboard.empty_state"
              >
                <ClipboardList className="h-10 w-10 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-body text-sm font-medium">
                  No assessments yet
                </p>
                <p className="text-muted-foreground/60 font-body text-xs mt-1">
                  Click "Create New Assessment" to get started.
                </p>
                <Button
                  className="mt-4 spice-gradient text-white border-0 gap-2"
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  Create New Assessment
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <CreateNewAssessmentModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
    </div>
  );
}
