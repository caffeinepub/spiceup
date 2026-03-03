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
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, CalendarDays, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGetAllAssessmentPlans,
  useCreateAssessmentPlan,
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

const planStatusColors: Record<string, string> = {
  Active: "bg-blue-100 text-blue-700 border-blue-200",
  Completed: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Pending: "bg-amber-100 text-amber-700 border-amber-200",
  Scheduled: "bg-violet-100 text-violet-700 border-violet-200",
};

export function AssessmentPlanning() {
  const { data: plans, isLoading } = useGetAllAssessmentPlans();
  const { data: assessments } = useGetAllAssessments();
  const createMutation = useCreateAssessmentPlan();

  const [showForm, setShowForm] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [planDetails, setPlanDetails] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [status, setStatus] = useState("Scheduled");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assessmentId) {
      toast.error("Please select an assessment");
      return;
    }
    if (!planDetails.trim()) {
      toast.error("Plan details are required");
      return;
    }
    const dateMs = scheduledDate ? new Date(scheduledDate).getTime() : Date.now();
    const dateNano = BigInt(dateMs) * BigInt(1_000_000);
    try {
      await createMutation.mutateAsync({
        assessmentId: BigInt(assessmentId),
        planDetails: planDetails.trim(),
        scheduledDate: dateNano,
        status,
      });
      toast.success("Assessment plan created");
      setPlanDetails("");
      setScheduledDate("");
      setAssessmentId("");
      setStatus("Scheduled");
      setShowForm(false);
    } catch {
      toast.error("Failed to create plan");
    }
  }

  function getAssessmentName(id: bigint) {
    return assessments?.find((a) => a.id === id)?.name ?? `Assessment #${String(id)}`;
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Assessment Planning</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Schedule and organize assessment activities</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="spice-gradient text-white border-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          New Plan
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Create Assessment Plan</CardTitle>
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
                  <Label>Scheduled Date</Label>
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e) => setScheduledDate(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Plan Details</Label>
                <Textarea
                  value={planDetails}
                  onChange={(e) => setPlanDetails(e.target.value)}
                  placeholder="Describe the assessment plan, milestones, and activities..."
                  rows={4}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Scheduled">Scheduled</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                    <SelectItem value="Completed">Completed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending} className="spice-gradient text-white border-0">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Plan
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Plans List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-32 w-full rounded-xl" />)}
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="space-y-4">
          {plans.map((plan) => (
            <Card key={String(plan.id)} className="border-border/60 hover:border-accent/30 transition-colors">
              <CardContent className="py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold font-heading text-foreground text-sm">
                        {getAssessmentName(plan.assessmentId)}
                      </p>
                      <Badge
                        variant="outline"
                        className={planStatusColors[plan.status] ?? "bg-gray-100 text-gray-700"}
                      >
                        {plan.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-foreground/80 font-body mt-2">{plan.planDetails}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs shrink-0">
                    <CalendarDays className="h-3.5 w-3.5" />
                    <span className="font-body">{formatDate(plan.scheduledDate)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <CalendarDays className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-body text-sm">No plans created yet.</p>
            <p className="text-muted-foreground/60 font-body text-xs mt-1">Create plans to schedule assessments.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
