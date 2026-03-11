import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import {
  useGetAllAssessments,
  useGetAssessmentInfoData,
  useSaveAssessmentInfoData,
  useUpdateAssessmentStep,
} from "@/hooks/useQueries";
import { AlertCircle, LayoutDashboard, Loader2, Plus, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AssessmentInfoData } from "../backend.d";

interface CoAssessorEntry {
  uid: string; // stable key for React lists
  name: string;
  id: string;
}

const defaultFormData = {
  startDate: "",
  endDate: "",
  sponsor: "",
  leadAssessor: "",
  leadAssessorId: "",
  assessedParty: "",
  assessedSite: "",
  unitDepartment: "",
  projectContactSWDev: "",
  projectContactSWQuality: "",
  projectName: "",
  projectScope: "",
  modelBasedDev: false,
  agileEnvironments: false,
  developmentExternal: false,
  pamVersion: "Automotive SPICE 4.0",
  vdaVersion: "VDA Guideline 2.0",
  assessmentClass: "",
  targetCapabilityLevel: "",
  functionalSafetyLevel: "",
  cybersecurityLevel: "",
  additionalRemarks: "",
};

type FormData = typeof defaultFormData;

function FormSection({
  title,
  children,
}: { title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-4">
        <CardTitle className="text-sm font-heading font-semibold text-foreground uppercase tracking-wide">
          {title}
        </CardTitle>
        <Separator />
      </CardHeader>
      <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {children}
      </CardContent>
    </Card>
  );
}

export function AssessmentInfo() {
  const { currentAssessmentId, navigateTo } = useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: infoData, isLoading } =
    useGetAssessmentInfoData(currentAssessmentId);
  const saveMutation = useSaveAssessmentInfoData();
  const updateStepMutation = useUpdateAssessmentStep();

  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [coAssessors, setCoAssessors] = useState<CoAssessorEntry[]>([]);

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );
  const isCompleted = currentAssessment?.status === "Completed";

  useEffect(() => {
    if (infoData) {
      // leadAssessorId stored in assessorBody field
      const leadAssessorId = infoData.assessorBody || "";
      // coAssessors stored as JSON in coAssessor field
      let parsedCoAssessors: CoAssessorEntry[] = [];
      try {
        const raw = JSON.parse(infoData.coAssessor || "[]");
        if (Array.isArray(raw)) {
          parsedCoAssessors = raw.map(
            (item: { name?: string; id?: string; uid?: string }, i) => ({
              uid: item.uid ?? `slot-${i}`,
              name: item.name ?? "",
              id: item.id ?? "",
            }),
          );
        }
      } catch {
        parsedCoAssessors = [];
      }
      setCoAssessors(parsedCoAssessors);
      setFormData({
        startDate: infoData.startDate || "",
        endDate: infoData.endDate || "",
        sponsor: infoData.sponsor || "",
        leadAssessor: infoData.leadAssessor || "",
        leadAssessorId,
        assessedParty: infoData.assessedParty || "",
        assessedSite: infoData.assessedSite || "",
        unitDepartment: infoData.unitDepartment || "",
        projectContactSWDev: infoData.projectContactSWDev || "",
        projectContactSWQuality: infoData.projectContactSWQuality || "",
        projectName: infoData.projectName || "",
        projectScope: infoData.projectScope || "",
        modelBasedDev: infoData.modelBasedDev || false,
        agileEnvironments: infoData.agileEnvironments || false,
        developmentExternal: infoData.developmentExternal || false,
        pamVersion: infoData.pamVersion || "Automotive SPICE 4.0",
        vdaVersion: infoData.vdaVersion || "VDA Guideline 2.0",
        assessmentClass: infoData.assessmentClass || "",
        targetCapabilityLevel: infoData.targetCapabilityLevel || "",
        functionalSafetyLevel: infoData.functionalSafetyLevel || "",
        cybersecurityLevel: infoData.cybersecurityLevel || "",
        additionalRemarks: infoData.additionalRemarks || "",
      });
    }
  }, [infoData]);

  function update(field: keyof FormData, value: string | boolean) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  function addCoAssessor() {
    if (coAssessors.length >= 3) return;
    setCoAssessors((prev) => [
      ...prev,
      { uid: `new-${Date.now()}`, name: "", id: "" },
    ]);
  }

  function updateCoAssessor(
    index: number,
    field: "name" | "id",
    value: string,
  ) {
    setCoAssessors((prev) =>
      prev.map((ca, i) => (i === index ? { ...ca, [field]: value } : ca)),
    );
  }

  function removeCoAssessor(index: number) {
    setCoAssessors((prev) => prev.filter((_, i) => i !== index));
  }

  function buildPayload(): AssessmentInfoData {
    return {
      assessmentId: currentAssessmentId!,
      startDate: formData.startDate,
      endDate: formData.endDate,
      sponsor: formData.sponsor,
      leadAssessor: formData.leadAssessor,
      // Store coAssessors JSON in coAssessor field (strip uid)
      coAssessor: JSON.stringify(
        coAssessors.map(({ name, id }) => ({ name, id })),
      ),
      intacsId: "",
      // Store leadAssessorId in assessorBody field (hidden from UI)
      assessorBody: formData.leadAssessorId,
      assessedParty: formData.assessedParty,
      assessedSite: formData.assessedSite,
      unitDepartment: formData.unitDepartment,
      projectContactSWDev: formData.projectContactSWDev,
      projectContactSWQuality: formData.projectContactSWQuality,
      projectName: formData.projectName,
      projectScope: formData.projectScope,
      modelBasedDev: formData.modelBasedDev,
      agileEnvironments: formData.agileEnvironments,
      developmentExternal: formData.developmentExternal,
      pamVersion: formData.pamVersion,
      vdaVersion: formData.vdaVersion,
      assessmentClass: formData.assessmentClass,
      targetCapabilityLevel: formData.targetCapabilityLevel,
      functionalSafetyLevel: formData.functionalSafetyLevel,
      cybersecurityLevel: formData.cybersecurityLevel,
      additionalRemarks: formData.additionalRemarks,
    };
  }

  async function handleSaveAndContinue() {
    if (!currentAssessmentId) return;
    try {
      await Promise.all([
        saveMutation.mutateAsync(buildPayload()),
        updateStepMutation.mutateAsync({
          id: currentAssessmentId,
          step: "assessment-info",
        }),
      ]);
      toast.success("Saved successfully");
    } catch {
      toast.error("Failed to save");
    }
  }

  const isSaving = saveMutation.isPending || updateStepMutation.isPending;

  if (!currentAssessmentId) {
    return (
      <div className="page-enter flex flex-col items-center justify-center py-20 text-center space-y-4">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold font-heading text-foreground">
            No Assessment Selected
          </p>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Please select or create an assessment from the Dashboard to
            continue.
          </p>
        </div>
        <Button
          onClick={() => navigateTo("dashboard")}
          className="spice-gradient text-white border-0 gap-2"
        >
          <LayoutDashboard className="h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    );
  }

  return (
    <div className="page-enter space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold font-heading text-foreground">
          Assessment Info
        </h1>
        <p className="text-muted-foreground text-sm mt-1 font-body">
          Configure the details for the current assessment
        </p>
      </div>

      {isCompleted && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm font-body text-amber-800">
            This assessment is marked as Completed. No further edits are
            allowed.
          </p>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Section 1: Assessment Timeline */}
          <FormSection title="Assessment Timeline">
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Assessment Start Date
              </Label>
              <Input
                type="date"
                value={formData.startDate}
                onChange={(e) => update("startDate", e.target.value)}
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.start_date_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Assessment End Date
              </Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => update("endDate", e.target.value)}
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.end_date_input"
              />
            </div>
          </FormSection>

          {/* Section 2: Assessment Team */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-heading font-semibold text-foreground uppercase tracking-wide">
                Assessment Team
              </CardTitle>
              <Separator />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-body font-medium">
                    Assessment Sponsor
                  </Label>
                  <Input
                    value={formData.sponsor}
                    onChange={(e) => update("sponsor", e.target.value)}
                    placeholder="Enter sponsor name"
                    className="font-body"
                    disabled={isCompleted}
                    data-ocid="assessment_info.sponsor_input"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="font-body font-medium">Lead Assessor</Label>
                  <Input
                    value={formData.leadAssessor}
                    onChange={(e) => update("leadAssessor", e.target.value)}
                    placeholder="Enter lead assessor name"
                    className="font-body"
                    disabled={isCompleted}
                    data-ocid="assessment_info.lead_assessor_input"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body font-medium">
                    Lead Assessor ID
                  </Label>
                  <Input
                    value={formData.leadAssessorId}
                    onChange={(e) => update("leadAssessorId", e.target.value)}
                    placeholder="Enter lead assessor ID"
                    className="font-body"
                    disabled={isCompleted}
                    data-ocid="assessment_info.lead_assessor_id_input"
                  />
                </div>
              </div>

              {/* Co-Assessors */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <Label className="font-body font-medium">Co-Assessors</Label>
                  {!isCompleted && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs gap-1"
                      onClick={addCoAssessor}
                      disabled={coAssessors.length >= 3}
                      data-ocid="assessment_info.add_co_assessor_button"
                    >
                      <Plus className="h-3 w-3" />
                      Add Co-Assessor
                    </Button>
                  )}
                </div>
                {coAssessors.length === 0 && (
                  <p className="text-xs text-muted-foreground font-body italic">
                    No co-assessors added. You can add up to 3.
                  </p>
                )}
                {coAssessors.map((ca, idx) => (
                  <div
                    key={ca.uid}
                    className="flex items-start gap-2 p-3 rounded-lg bg-muted/30 border border-border/40"
                    data-ocid={`assessment_info.co_assessor_item.${idx + 1}`}
                  >
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs font-body text-muted-foreground">
                          Co-Assessor {idx + 1} Name
                        </Label>
                        <Input
                          value={ca.name}
                          onChange={(e) =>
                            updateCoAssessor(idx, "name", e.target.value)
                          }
                          placeholder="Enter name"
                          className="font-body h-8 text-sm"
                          disabled={isCompleted}
                          data-ocid={`assessment_info.co_assessor_name_input.${idx + 1}`}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs font-body text-muted-foreground">
                          Co-Assessor {idx + 1} ID
                        </Label>
                        <Input
                          value={ca.id}
                          onChange={(e) =>
                            updateCoAssessor(idx, "id", e.target.value)
                          }
                          placeholder="Enter ID"
                          className="font-body h-8 text-sm"
                          disabled={isCompleted}
                          data-ocid={`assessment_info.co_assessor_id_input.${idx + 1}`}
                        />
                      </div>
                    </div>
                    {!isCompleted && (
                      <button
                        type="button"
                        onClick={() => removeCoAssessor(idx)}
                        className="mt-5 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        aria-label={`Remove co-assessor ${idx + 1}`}
                        data-ocid={`assessment_info.co_assessor_remove_button.${idx + 1}`}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Section 3: Organization Details */}
          <FormSection title="Organization Details">
            <div className="space-y-2">
              <Label className="font-body font-medium">Assessed Party</Label>
              <Input
                value={formData.assessedParty}
                onChange={(e) => update("assessedParty", e.target.value)}
                placeholder="Enter assessed party"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.assessed_party_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Assessed Site</Label>
              <Input
                value={formData.assessedSite}
                onChange={(e) => update("assessedSite", e.target.value)}
                placeholder="Enter assessed site"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.assessed_site_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Unit / Department</Label>
              <Input
                value={formData.unitDepartment}
                onChange={(e) => update("unitDepartment", e.target.value)}
                placeholder="Enter unit or department"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.unit_dept_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Project Contact (SW Development)
              </Label>
              <Input
                value={formData.projectContactSWDev}
                onChange={(e) => update("projectContactSWDev", e.target.value)}
                placeholder="Enter contact name"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.contact_sw_dev_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Project Contact (SW Quality)
              </Label>
              <Input
                value={formData.projectContactSWQuality}
                onChange={(e) =>
                  update("projectContactSWQuality", e.target.value)
                }
                placeholder="Enter contact name"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.contact_sw_quality_input"
              />
            </div>
          </FormSection>

          {/* Section 4: Project Information */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-heading font-semibold text-foreground uppercase tracking-wide">
                Project Information
              </CardTitle>
              <Separator />
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2 md:col-span-2">
                <Label className="font-body font-medium">Project Name</Label>
                <Input
                  value={formData.projectName}
                  onChange={(e) => update("projectName", e.target.value)}
                  placeholder="Enter project name"
                  className="font-body"
                  disabled={isCompleted}
                  data-ocid="assessment_info.project_name_input"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className="font-body font-medium">Project Scope</Label>
                <Textarea
                  value={formData.projectScope}
                  onChange={(e) => update("projectScope", e.target.value)}
                  placeholder="Describe the project scope..."
                  rows={4}
                  className="font-body"
                  disabled={isCompleted}
                  data-ocid="assessment_info.project_scope_textarea"
                />
              </div>
            </CardContent>
          </Card>

          {/* Section 4b: Application Parameters */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-heading font-semibold text-foreground uppercase tracking-wide">
                Application Parameters
              </CardTitle>
              <Separator />
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center gap-3">
                <Checkbox
                  id="model-based"
                  checked={formData.modelBasedDev}
                  onCheckedChange={(v) => update("modelBasedDev", !!v)}
                  disabled={isCompleted}
                  data-ocid="assessment_info.model_based_dev_checkbox"
                />
                <Label
                  htmlFor="model-based"
                  className="font-body text-sm cursor-pointer"
                >
                  Model Based Development
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="agile"
                  checked={formData.agileEnvironments}
                  onCheckedChange={(v) => update("agileEnvironments", !!v)}
                  disabled={isCompleted}
                  data-ocid="assessment_info.agile_environments_checkbox"
                />
                <Label
                  htmlFor="agile"
                  className="font-body text-sm cursor-pointer"
                >
                  Agile Environments
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <Checkbox
                  id="dev-external"
                  checked={formData.developmentExternal}
                  onCheckedChange={(v) => update("developmentExternal", !!v)}
                  disabled={isCompleted}
                  data-ocid="assessment_info.development_external_checkbox"
                />
                <Label
                  htmlFor="dev-external"
                  className="font-body text-sm cursor-pointer"
                >
                  Development External
                </Label>
              </div>
            </CardContent>
          </Card>

          {/* Section 5: Standards & Classification */}
          <FormSection title="Standards & Classification">
            <div className="space-y-2">
              <Label className="font-body font-medium">PAM Version</Label>
              <Select
                value={formData.pamVersion}
                onValueChange={(v) => update("pamVersion", v)}
                disabled={isCompleted}
              >
                <SelectTrigger
                  className="font-body"
                  data-ocid="assessment_info.pam_version_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Automotive SPICE 3.1">
                    Automotive SPICE 3.1
                  </SelectItem>
                  <SelectItem value="Automotive SPICE 4.0">
                    Automotive SPICE 4.0
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">VDA Version</Label>
              <Select
                value={formData.vdaVersion}
                onValueChange={(v) => update("vdaVersion", v)}
                disabled={isCompleted}
              >
                <SelectTrigger
                  className="font-body"
                  data-ocid="assessment_info.vda_version_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VDA Guideline 1.0">
                    VDA Guideline 1.0
                  </SelectItem>
                  <SelectItem value="VDA Guideline 2.0">
                    VDA Guideline 2.0
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Assessment Class</Label>
              <Input
                value={formData.assessmentClass}
                onChange={(e) => update("assessmentClass", e.target.value)}
                placeholder="e.g., Class 1, Class 2"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.assessment_class_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Target Capability Level
              </Label>
              <Input
                value={formData.targetCapabilityLevel}
                onChange={(e) =>
                  update("targetCapabilityLevel", e.target.value)
                }
                placeholder="e.g., Level 2"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.target_capability_level_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Functional Safety Level
              </Label>
              <Input
                value={formData.functionalSafetyLevel}
                onChange={(e) =>
                  update("functionalSafetyLevel", e.target.value)
                }
                placeholder="e.g., ASIL B"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.functional_safety_level_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Cybersecurity Level
              </Label>
              <Input
                value={formData.cybersecurityLevel}
                onChange={(e) => update("cybersecurityLevel", e.target.value)}
                placeholder="e.g., CAL 3"
                className="font-body"
                disabled={isCompleted}
                data-ocid="assessment_info.cybersecurity_level_input"
              />
            </div>
          </FormSection>

          {/* Section 6: Additional Information */}
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <CardTitle className="text-sm font-heading font-semibold text-foreground uppercase tracking-wide">
                Additional Information
              </CardTitle>
              <Separator />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label className="font-body font-medium">
                  Additional Remarks
                </Label>
                <Textarea
                  value={formData.additionalRemarks}
                  onChange={(e) => update("additionalRemarks", e.target.value)}
                  placeholder="Any additional remarks or notes..."
                  rows={4}
                  className="font-body"
                  disabled={isCompleted}
                  data-ocid="assessment_info.additional_remarks_textarea"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          {!isCompleted && (
            <div className="flex items-center gap-3 pt-2 pb-4">
              <Button
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="spice-gradient text-white border-0"
                data-ocid="assessment_info.save_button"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
