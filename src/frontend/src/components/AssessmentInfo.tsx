import { Badge } from "@/components/ui/badge";
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
import { LayoutDashboard, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { AssessmentInfoData } from "../backend.d";

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

const defaultFormData = {
  startDate: "",
  endDate: "",
  sponsor: "",
  leadAssessor: "",
  coAssessor: "",
  intacsId: "",
  assessorBody: "",
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
  const { currentAssessmentId, currentAssessmentTitle, navigateTo } =
    useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: infoData, isLoading } =
    useGetAssessmentInfoData(currentAssessmentId);
  const saveMutation = useSaveAssessmentInfoData();
  const updateStepMutation = useUpdateAssessmentStep();

  const [formData, setFormData] = useState<FormData>(defaultFormData);

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );

  useEffect(() => {
    if (infoData) {
      setFormData({
        startDate: infoData.startDate || "",
        endDate: infoData.endDate || "",
        sponsor: infoData.sponsor || "",
        leadAssessor: infoData.leadAssessor || "",
        coAssessor: infoData.coAssessor || "",
        intacsId: infoData.intacsId || "",
        assessorBody: infoData.assessorBody || "",
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

  function buildPayload(): AssessmentInfoData {
    return {
      assessmentId: currentAssessmentId!,
      ...formData,
    };
  }

  async function handleSaveDraft() {
    if (!currentAssessmentId) return;
    try {
      await Promise.all([
        saveMutation.mutateAsync(buildPayload()),
        updateStepMutation.mutateAsync({
          id: currentAssessmentId,
          step: "assessment-info",
        }),
      ]);
      toast.success("Draft saved successfully");
    } catch {
      toast.error("Failed to save draft");
    }
  }

  async function handleSaveAndContinue() {
    if (!currentAssessmentId) return;
    try {
      await Promise.all([
        saveMutation.mutateAsync(buildPayload()),
        updateStepMutation.mutateAsync({
          id: currentAssessmentId,
          step: "target-profile",
        }),
      ]);
      toast.success("Saved — navigating to Define Target Profile");
      navigateTo("target-profile");
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-body mb-1 uppercase tracking-wide">
            Current Assessment
          </p>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            {currentAssessmentTitle}
          </h1>
        </div>
        {currentAssessment && <StatusBadge status={currentAssessment.status} />}
      </div>

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
                data-ocid="assessment_info.end_date_input"
              />
            </div>
          </FormSection>

          {/* Section 2: Assessment Team */}
          <FormSection title="Assessment Team">
            <div className="space-y-2">
              <Label className="font-body font-medium">
                Assessment Sponsor
              </Label>
              <Input
                value={formData.sponsor}
                onChange={(e) => update("sponsor", e.target.value)}
                placeholder="Enter sponsor name"
                className="font-body"
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
                data-ocid="assessment_info.lead_assessor_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Co-Assessor</Label>
              <Input
                value={formData.coAssessor}
                onChange={(e) => update("coAssessor", e.target.value)}
                placeholder="Enter co-assessor name"
                className="font-body"
                data-ocid="assessment_info.co_assessor_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">INTACS ID</Label>
              <Input
                value={formData.intacsId}
                onChange={(e) => update("intacsId", e.target.value)}
                placeholder="Enter INTACS ID"
                className="font-body"
                data-ocid="assessment_info.intacs_id_input"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body font-medium">Assessor Body</Label>
              <Input
                value={formData.assessorBody}
                onChange={(e) => update("assessorBody", e.target.value)}
                placeholder="Enter assessor body"
                className="font-body"
                data-ocid="assessment_info.assessor_body_input"
              />
            </div>
          </FormSection>

          {/* Section 3: Organization Details */}
          <FormSection title="Organization Details">
            <div className="space-y-2">
              <Label className="font-body font-medium">Assessed Party</Label>
              <Input
                value={formData.assessedParty}
                onChange={(e) => update("assessedParty", e.target.value)}
                placeholder="Enter assessed party"
                className="font-body"
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label className="font-body font-medium">Project Name</Label>
                  <Input
                    value={formData.projectName}
                    onChange={(e) => update("projectName", e.target.value)}
                    placeholder="Enter project name"
                    className="font-body"
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
                    data-ocid="assessment_info.project_scope_textarea"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <p className="text-sm font-medium font-body text-foreground">
                  Application Parameters
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <Checkbox
                      id="model-based"
                      checked={formData.modelBasedDev}
                      onCheckedChange={(v) => update("modelBasedDev", !!v)}
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
                      onCheckedChange={(v) =>
                        update("developmentExternal", !!v)
                      }
                      data-ocid="assessment_info.development_external_checkbox"
                    />
                    <Label
                      htmlFor="dev-external"
                      className="font-body text-sm cursor-pointer"
                    >
                      Development External
                    </Label>
                  </div>
                </div>
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
                  data-ocid="assessment_info.additional_remarks_textarea"
                />
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex items-center gap-3 pt-2 pb-6">
            <Button
              variant="outline"
              onClick={handleSaveDraft}
              disabled={isSaving}
              data-ocid="assessment_info.save_draft_button"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
            <Button
              onClick={handleSaveAndContinue}
              disabled={isSaving}
              className="spice-gradient text-white border-0"
              data-ocid="assessment_info.save_continue_button"
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save and Continue →
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
