import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
import { useAuth } from "@/context/AuthContext";
import { useCanisterHealth } from "@/hooks/useCanisterHealth";
import {
  useDeleteAssessment,
  useGetAllAssessmentResults,
  useGetAllAssessments,
  useGetAllReports,
  useMarkAssessmentCompleted,
} from "@/hooks/useQueries";
import { logAuditEvent } from "@/utils/auditLog";
import { getAssessmentOwnership } from "@/utils/authStorage";
import {
  AlertCircle,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  Clock,
  Eye,
  FileText,
  Loader2,
  Play,
  Plus,
  RefreshCw,
  Trash2,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Assessment } from "../backend.d";
import { CreateNewAssessmentModal } from "./CreateNewAssessmentModal";
import { ManageAccessDialog } from "./auth/ManageAccessDialog";

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
    Active: "bg-green-50 text-green-700 border-green-200",
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
      <CardHeader className="flex flex-row items-center justify-between pt-4 pb-2 px-4 space-y-0">
        <CardTitle className="text-xs font-medium text-muted-foreground font-body">
          {title}
        </CardTitle>
        <div className={`p-2 rounded-lg ${iconColor}`}>
          <Icon className="h-3.5 w-3.5 text-white" />
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold text-foreground">{value}</div>
        )}
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const [createOpen, setCreateOpen] = useState(false);
  const { setCurrentAssessment, navigateTo } = useAppContext();
  const { currentUser } = useAuth();
  const canisterHealth = useCanisterHealth();

  const { data: assessments, isLoading: loadingAssessments } =
    useGetAllAssessments();
  const { data: results, isLoading: loadingResults } =
    useGetAllAssessmentResults();
  const { data: reports, isLoading: loadingReports } = useGetAllReports();
  const markCompletedMutation = useMarkAssessmentCompleted();
  const deleteAssessmentMutation = useDeleteAssessment();

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

  async function handleDelete(id: bigint) {
    const assessmentName =
      assessments?.find((a) => a.id === id)?.name ?? String(id);
    try {
      await deleteAssessmentMutation.mutateAsync(id);
      if (currentUser) {
        logAuditEvent(
          "assessment_deleted",
          currentUser.username,
          `Assessment "${assessmentName}" deleted`,
          { assessmentId: String(id) },
        );
      }
      toast.success("Assessment deleted");
    } catch {
      toast.error("Failed to delete assessment");
    }
  }

  return (
    <div className="page-enter space-y-6">
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

      {/* Backend restarting banner */}
      {canisterHealth.isRestarting && (
        <Alert
          className="border-amber-200 bg-amber-50"
          data-ocid="dashboard.backend_restarting_state"
        >
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
          <AlertDescription className="font-body text-amber-800 text-sm flex items-center justify-between gap-4 flex-wrap">
            <span>
              <strong>Backend is restarting</strong> after a recent deployment.
              The app will automatically reconnect -- this usually takes a few
              minutes.
              {canisterHealth.nextProbeIn > 0 && (
                <span className="ml-1 text-amber-700">
                  Next check in {canisterHealth.nextProbeIn}s
                  {canisterHealth.attempts > 0 &&
                    ` (attempt ${canisterHealth.attempts})`}
                  ...
                </span>
              )}
            </span>
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100 gap-1.5 shrink-0"
              onClick={canisterHealth.checkNow}
              data-ocid="dashboard.backend_check_now_button"
            >
              <RefreshCw className="h-3 w-3" />
              Check Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Backend just came back online confirmation */}
      {canisterHealth.status === "ready" && (
        <Alert
          className="border-emerald-200 bg-emerald-50"
          data-ocid="dashboard.backend_ready_state"
        >
          <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          <AlertDescription className="font-body text-emerald-800 text-sm">
            <strong>Backend is back online.</strong> You can now create and
            manage assessments.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiCard
          title="Total Assessments"
          value={totalAssessments}
          icon={ClipboardList}
          iconColor="bg-slate-400"
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
          title="In Progress"
          value={activeCount}
          icon={Clock}
          iconColor="bg-amber-500"
          isLoading={loadingAssessments}
        />
        <KpiCard
          title="Assessment Results"
          value={resultsCount}
          icon={TrendingUp}
          iconColor="bg-slate-400"
          isLoading={loadingResults}
        />
        <KpiCard
          title="Reports Generated"
          value={reportsCount}
          icon={FileText}
          iconColor="bg-slate-400"
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
                  <TableRow className="hover:bg-transparent bg-gray-50">
                    <TableHead className="font-semibold text-xs text-gray-700">
                      Assessment Title
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-gray-700">
                      Status
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-gray-700">
                      Created By
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-gray-700">
                      Created
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-gray-700">
                      Last Updated
                    </TableHead>
                    <TableHead className="font-semibold text-xs text-gray-700 text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {assessments.map((assessment: Assessment, index: number) => {
                    const ownership = getAssessmentOwnership(
                      assessment.id.toString(),
                    );
                    const isOwner =
                      currentUser?.role === "admin" ||
                      ownership?.ownerUserId === currentUser?.userId;
                    return (
                      <TableRow
                        key={String(assessment.id)}
                        className={
                          index % 2 === 1
                            ? "even-row hover:bg-gray-50/70 bg-gray-50/40"
                            : "hover:bg-gray-50/70"
                        }
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
                          {ownership?.createdBy ?? "unknown"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-body whitespace-nowrap">
                          {formatDate(assessment.createdAt)}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground font-body whitespace-nowrap">
                          {formatDate(assessment.updatedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {assessment.status === "Completed" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-8 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200"
                                onClick={() =>
                                  handleContinue(assessment, index + 1)
                                }
                                data-ocid={`dashboard.continue_button.${index + 1}`}
                              >
                                <Eye className="h-3 w-3" />
                                View
                              </Button>
                            ) : (
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
                            )}
                            {assessment.status !== "Completed" && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-8 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-200"
                                onClick={() =>
                                  handleMarkCompleted(assessment.id)
                                }
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
                            {/* Manage Access — only for owner or admin */}
                            {isOwner && (
                              <ManageAccessDialog
                                assessmentId={assessment.id}
                                assessmentName={assessment.name}
                              />
                            )}
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="gap-1.5 text-xs h-8 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                  data-ocid={`dashboard.delete_button.${index + 1}`}
                                >
                                  <Trash2 className="h-3 w-3" />
                                  Delete
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>
                                    Delete Assessment
                                  </AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to delete &ldquo;
                                    {assessment.name}&rdquo;? This action cannot
                                    be undone and all assessment data will be
                                    permanently lost.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel
                                    data-ocid={`dashboard.delete_cancel_button.${index + 1}`}
                                  >
                                    Cancel
                                  </AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => handleDelete(assessment.id)}
                                    className="bg-red-600 hover:bg-red-700 text-white"
                                    data-ocid={`dashboard.delete_confirm_button.${index + 1}`}
                                  >
                                    Delete Assessment
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
        onCanisterStopped={canisterHealth.triggerRestart}
        isBackendRestarting={canisterHealth.isRestarting}
        backendReady={canisterHealth.status === "ready"}
        nextProbeIn={canisterHealth.nextProbeIn}
        checkNow={canisterHealth.checkNow}
      />
    </div>
  );
}
