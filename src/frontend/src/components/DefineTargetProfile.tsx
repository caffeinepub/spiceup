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
import { Plus, Target, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  useGetAllTargetProfiles,
  useCreateTargetProfile,
  useGetAllAssessments,
} from "@/hooks/useQueries";

const SKILL_LEVELS = ["Beginner", "Intermediate", "Advanced", "Expert"];

const skillLevelColors: Record<string, string> = {
  Beginner: "bg-green-100 text-green-700 border-green-200",
  Intermediate: "bg-blue-100 text-blue-700 border-blue-200",
  Advanced: "bg-purple-100 text-purple-700 border-purple-200",
  Expert: "bg-rose-100 text-rose-700 border-rose-200",
};

export function DefineTargetProfile() {
  const { data: profiles, isLoading } = useGetAllTargetProfiles();
  const { data: assessments } = useGetAllAssessments();
  const createMutation = useCreateTargetProfile();

  const [showForm, setShowForm] = useState(false);
  const [assessmentId, setAssessmentId] = useState("");
  const [name, setName] = useState("");
  const [criteria, setCriteria] = useState("");
  const [skillLevel, setSkillLevel] = useState("Intermediate");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!assessmentId) {
      toast.error("Please select an assessment");
      return;
    }
    if (!name.trim()) {
      toast.error("Profile name is required");
      return;
    }
    try {
      await createMutation.mutateAsync({
        assessmentId: BigInt(assessmentId),
        name: name.trim(),
        criteria: criteria.trim(),
        skillLevel,
      });
      toast.success("Target profile created");
      setName("");
      setCriteria("");
      setSkillLevel("Intermediate");
      setAssessmentId("");
      setShowForm(false);
    } catch {
      toast.error("Failed to create target profile");
    }
  }

  function getAssessmentName(id: bigint) {
    return assessments?.find((a) => a.id === id)?.name ?? `Assessment #${String(id)}`;
  }

  return (
    <div className="page-enter space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-heading text-foreground">Define Target Profile</h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">Set skill targets and criteria for assessments</p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="spice-gradient text-white border-0 gap-2"
        >
          <Plus className="h-4 w-4" />
          New Profile
        </Button>
      </div>

      {/* Create Form */}
      {showForm && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-heading">Create Target Profile</CardTitle>
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
                  <Label>Profile Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Senior Developer Profile"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Criteria</Label>
                <Textarea
                  value={criteria}
                  onChange={(e) => setCriteria(e.target.value)}
                  placeholder="Describe the criteria and competencies required..."
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label>Skill Level</Label>
                <Select value={skillLevel} onValueChange={setSkillLevel}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SKILL_LEVELS.map((level) => (
                      <SelectItem key={level} value={level}>{level}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={createMutation.isPending} className="spice-gradient text-white border-0">
                  {createMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Profile
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Profiles Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-40 rounded-xl" />)}
        </div>
      ) : profiles && profiles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map((profile) => (
            <Card key={String(profile.id)} className="border-border/60 hover:border-accent/30 transition-colors stat-card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base font-heading">{profile.name}</CardTitle>
                  <Badge
                    variant="outline"
                    className={skillLevelColors[profile.skillLevel] ?? "bg-gray-100 text-gray-700"}
                  >
                    {profile.skillLevel}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground font-body">
                  {getAssessmentName(profile.assessmentId)}
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-foreground/80 font-body line-clamp-3">
                  {profile.criteria || <span className="text-muted-foreground italic">No criteria defined</span>}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Target className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-body text-sm">No target profiles yet.</p>
            <p className="text-muted-foreground/60 font-body text-xs mt-1">Define profiles to set skill benchmarks.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
