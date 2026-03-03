import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  ClipboardList,
  CheckCircle2,
  Upload,
  FileText,
  TrendingUp,
  Clock,
} from "lucide-react";
import { useGetAllAssessments, useGetAllWorkProducts, useGetAllReports, useGetAllAssessmentResults } from "@/hooks/useQueries";

function StatCard({
  title,
  value,
  icon: Icon,
  description,
  color,
  isLoading,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  description: string;
  color: string;
  isLoading: boolean;
}) {
  return (
    <Card className="stat-card-hover border-border/60">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground font-body">{title}</CardTitle>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-3xl font-bold font-heading text-foreground">{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1 font-body">{description}</p>
      </CardContent>
    </Card>
  );
}

export function Dashboard() {
  const { data: assessments, isLoading: loadingAssessments } = useGetAllAssessments();
  const { data: workProducts, isLoading: loadingWorkProducts } = useGetAllWorkProducts();
  const { data: reports, isLoading: loadingReports } = useGetAllReports();
  const { data: results, isLoading: loadingResults } = useGetAllAssessmentResults();

  const totalAssessments = assessments?.length ?? 0;
  const completedAssessments = assessments?.filter((a) => a.status === "Completed").length ?? 0;
  const pendingWorkProducts = workProducts?.filter((w) => w.fileType !== "").length ?? 0;
  const reportsGenerated = reports?.length ?? 0;
  const totalResults = results?.length ?? 0;
  const activeAssessments = assessments?.filter((a) => a.status === "Active").length ?? 0;

  const isLoading = loadingAssessments || loadingWorkProducts || loadingReports || loadingResults;

  return (
    <div className="page-enter space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-1 font-body">Overview of your assessment activities</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Total Assessments"
          value={totalAssessments}
          icon={ClipboardList}
          description="All assessments created"
          color="spice-gradient"
          isLoading={loadingAssessments}
        />
        <StatCard
          title="Completed"
          value={completedAssessments}
          icon={CheckCircle2}
          description="Assessments fully completed"
          color="bg-emerald-500"
          isLoading={loadingAssessments}
        />
        <StatCard
          title="Active Assessments"
          value={activeAssessments}
          icon={Clock}
          description="Currently in progress"
          color="bg-blue-500"
          isLoading={loadingAssessments}
        />
        <StatCard
          title="Work Products"
          value={pendingWorkProducts}
          icon={Upload}
          description="Files uploaded"
          color="bg-violet-500"
          isLoading={loadingWorkProducts}
        />
        <StatCard
          title="Assessment Results"
          value={totalResults}
          icon={TrendingUp}
          description="Results recorded"
          color="bg-amber-500"
          isLoading={loadingResults}
        />
        <StatCard
          title="Reports Generated"
          value={reportsGenerated}
          icon={FileText}
          description="Reports available for download"
          color="bg-rose-500"
          isLoading={loadingReports}
        />
      </div>

      {/* Recent Assessments */}
      <div>
        <h2 className="text-lg font-semibold font-heading text-foreground mb-4">Recent Assessments</h2>
        {loadingAssessments ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : assessments && assessments.length > 0 ? (
          <div className="space-y-3">
            {assessments.slice(0, 5).map((assessment) => (
              <Card key={String(assessment.id)} className="border-border/60 hover:border-accent/40 transition-colors">
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <p className="font-medium font-heading text-foreground text-sm">{assessment.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 font-body line-clamp-1">{assessment.description}</p>
                  </div>
                  <Badge
                    variant={assessment.status === "Completed" ? "default" : assessment.status === "Active" ? "secondary" : "outline"}
                    className={
                      assessment.status === "Completed"
                        ? "bg-emerald-100 text-emerald-700 border-emerald-200"
                        : assessment.status === "Active"
                        ? "bg-blue-100 text-blue-700 border-blue-200"
                        : "bg-amber-100 text-amber-700 border-amber-200"
                    }
                  >
                    {assessment.status}
                  </Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed border-border/60">
            <CardContent className="flex flex-col items-center justify-center py-12">
              <ClipboardList className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground text-sm font-body">No assessments yet. Create one in Assessment Info.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
