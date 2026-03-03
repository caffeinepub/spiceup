import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAppContext } from "@/context/AppContext";
import {
  BASE_PRACTICES,
  type BasePractice,
  type GenericPractice,
  LEVEL2_ATTRIBUTES,
  LEVEL3_ATTRIBUTES,
  PROCESS_GROUPS,
} from "@/data/aspiceData";
import {
  useGetAllAssessments,
  useGetAllPracticeRatingsForAssessment,
  useGetProcessGroupConfig,
  useSavePracticeRating,
  useUpdateAssessmentStep,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { LayoutDashboard, Loader2, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import type { PracticeRating } from "../backend.d";

type Rating = "N" | "P" | "L" | "F" | "";

interface PracticeState {
  rating: Rating;
  strengths: string;
  weaknesses: string;
  workProductsInspected: string;
}

// key: `${processId}_${level}_${practiceId}`
type RatingsMap = Record<string, PracticeState>;

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

const RATING_OPTIONS: { value: Rating; label: string; activeClass: string }[] =
  [
    {
      value: "N",
      label: "N",
      activeClass: "bg-red-500 text-white border-red-500",
    },
    {
      value: "P",
      label: "P",
      activeClass: "bg-orange-500 text-white border-orange-500",
    },
    {
      value: "L",
      label: "L",
      activeClass: "bg-blue-500 text-white border-blue-500",
    },
    {
      value: "F",
      label: "F",
      activeClass: "bg-emerald-500 text-white border-emerald-500",
    },
  ];

function RatingSelector({
  value,
  onChange,
  index,
}: {
  value: Rating;
  onChange: (v: Rating) => void;
  index: number;
}) {
  return (
    <div className="flex gap-1.5">
      {RATING_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(value === opt.value ? "" : opt.value)}
          className={cn(
            "w-9 h-9 rounded-lg text-sm font-bold font-heading border-2 transition-all",
            value === opt.value
              ? opt.activeClass
              : "bg-background border-border text-muted-foreground hover:bg-muted",
          )}
          data-ocid={`perform.practice_rating_button.${index}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PracticeCard({
  id,
  title,
  text,
  state,
  onChange,
  showWorkProducts,
  index,
}: {
  id: string;
  title: string;
  text: string;
  state: PracticeState;
  onChange: (patch: Partial<PracticeState>) => void;
  showWorkProducts: boolean;
  index: number;
}) {
  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="space-y-1">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-bold font-heading text-sm text-foreground">
                {id}
              </span>
              <span className="text-muted-foreground font-body text-sm ml-2">
                — {title}
              </span>
            </div>
            <RatingSelector
              value={state.rating}
              onChange={(v) => onChange({ rating: v })}
              index={index}
            />
          </div>
          <p className="text-xs text-muted-foreground font-body leading-relaxed">
            {text}
          </p>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Strengths
            </Label>
            <Textarea
              value={state.strengths}
              onChange={(e) => onChange({ strengths: e.target.value })}
              placeholder="Document strengths observed..."
              rows={3}
              className="font-body text-sm resize-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Weaknesses
            </Label>
            <Textarea
              value={state.weaknesses}
              onChange={(e) => onChange({ weaknesses: e.target.value })}
              placeholder="Document weaknesses observed..."
              rows={3}
              className="font-body text-sm resize-none"
            />
          </div>
        </div>
        {showWorkProducts && (
          <div className="space-y-1.5">
            <Label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Work Products Inspected
            </Label>
            <Input
              value={state.workProductsInspected}
              onChange={(e) =>
                onChange({ workProductsInspected: e.target.value })
              }
              placeholder="List work products inspected..."
              className="font-body text-sm"
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function buildEnabledProcesses(
  config: { enabledGroups: string; processLevels: string } | null,
): Array<{ id: string; targetLevel: string }> {
  if (!config) return [];
  try {
    const enabledGroups = JSON.parse(config.enabledGroups) as string[];
    const processLevels = JSON.parse(config.processLevels) as Record<
      string,
      string
    >;
    const result: Array<{ id: string; targetLevel: string }> = [];
    for (const group of PROCESS_GROUPS) {
      if (enabledGroups.includes(group.id)) {
        for (const p of group.processes) {
          result.push({ id: p.id, targetLevel: processLevels[p.id] ?? "2" });
        }
      }
    }
    return result;
  } catch {
    return [];
  }
}

const defaultPracticeState = (): PracticeState => ({
  rating: "",
  strengths: "",
  weaknesses: "",
  workProductsInspected: "",
});

export function PerformAssessment() {
  const { currentAssessmentId, currentAssessmentTitle, navigateTo } =
    useAppContext();
  const { data: assessments } = useGetAllAssessments();
  const { data: processConfig, isLoading: loadingConfig } =
    useGetProcessGroupConfig(currentAssessmentId);
  const { data: savedRatings, isLoading: loadingRatings } =
    useGetAllPracticeRatingsForAssessment(currentAssessmentId);
  const savePracticeRating = useSavePracticeRating();
  const updateStepMutation = useUpdateAssessmentStep();

  const [selectedProcess, setSelectedProcess] = useState<string>("");
  const [activeTab, setActiveTab] = useState<Record<string, string>>({});
  const [ratings, setRatings] = useState<RatingsMap>({});
  const [isSaving, setIsSaving] = useState(false);

  const currentAssessment = assessments?.find(
    (a) => a.id === currentAssessmentId,
  );
  const enabledProcesses = buildEnabledProcesses(processConfig ?? null);

  // Set default selected process
  const firstProcessId = enabledProcesses[0]?.id;
  useEffect(() => {
    if (firstProcessId && !selectedProcess) {
      setSelectedProcess(firstProcessId);
    }
  }, [firstProcessId, selectedProcess]);

  // Populate ratings from backend data
  useEffect(() => {
    if (savedRatings && savedRatings.length > 0) {
      const map: RatingsMap = {};
      for (const r of savedRatings as PracticeRating[]) {
        const key = `${r.processId}_${Number(r.level)}_${r.practiceId}`;
        map[key] = {
          rating: r.rating as Rating,
          strengths: r.strengths,
          weaknesses: r.weaknesses,
          workProductsInspected: r.workProductsInspected,
        };
      }
      setRatings((prev) => ({ ...map, ...prev }));
    }
  }, [savedRatings]);

  function getRatingKey(processId: string, level: number, practiceId: string) {
    return `${processId}_${level}_${practiceId}`;
  }

  function getPracticeState(
    processId: string,
    level: number,
    practiceId: string,
  ): PracticeState {
    return (
      ratings[getRatingKey(processId, level, practiceId)] ??
      defaultPracticeState()
    );
  }

  function updatePracticeState(
    processId: string,
    level: number,
    practiceId: string,
    patch: Partial<PracticeState>,
  ) {
    const key = getRatingKey(processId, level, practiceId);
    setRatings((prev) => ({
      ...prev,
      [key]: { ...(prev[key] ?? defaultPracticeState()), ...patch },
    }));
  }

  const saveProcessRatings = useCallback(
    async (processId: string, currentRatings: RatingsMap) => {
      if (!currentAssessmentId) return;
      const processInfo = enabledProcesses.find((p) => p.id === processId);
      if (!processInfo) return;

      const getState = (
        pid: string,
        lvl: number,
        practiceId: string,
      ): PracticeState =>
        currentRatings[`${pid}_${lvl}_${practiceId}`] ?? defaultPracticeState();

      const targetLevel =
        processInfo.targetLevel === "NA"
          ? 0
          : Number.parseInt(processInfo.targetLevel, 10);
      const savePromises: Promise<unknown>[] = [];

      // Level 1: Base Practices
      if (targetLevel >= 1) {
        const bps = BASE_PRACTICES[processId] ?? [];
        for (const bp of bps) {
          const state = getState(processId, 1, bp.id);
          if (state.rating) {
            savePromises.push(
              savePracticeRating.mutateAsync({
                assessmentId: currentAssessmentId,
                processId,
                level: BigInt(1),
                practiceId: bp.id,
                rating: state.rating,
                strengths: state.strengths,
                weaknesses: state.weaknesses,
                workProductsInspected: state.workProductsInspected,
              }),
            );
          }
        }
      }

      // Level 2: Generic Practices
      if (targetLevel >= 2) {
        for (const attr of LEVEL2_ATTRIBUTES) {
          for (const gp of attr.practices) {
            const state = getState(processId, 2, gp.id);
            if (state.rating) {
              savePromises.push(
                savePracticeRating.mutateAsync({
                  assessmentId: currentAssessmentId,
                  processId,
                  level: BigInt(2),
                  practiceId: gp.id,
                  rating: state.rating,
                  strengths: state.strengths,
                  weaknesses: state.weaknesses,
                  workProductsInspected: "",
                }),
              );
            }
          }
        }
      }

      // Level 3: Generic Practices
      if (targetLevel >= 3) {
        for (const attr of LEVEL3_ATTRIBUTES) {
          for (const gp of attr.practices) {
            const state = getState(processId, 3, gp.id);
            if (state.rating) {
              savePromises.push(
                savePracticeRating.mutateAsync({
                  assessmentId: currentAssessmentId,
                  processId,
                  level: BigInt(3),
                  practiceId: gp.id,
                  rating: state.rating,
                  strengths: state.strengths,
                  weaknesses: state.weaknesses,
                  workProductsInspected: "",
                }),
              );
            }
          }
        }
      }

      await Promise.all(savePromises);
    },
    [currentAssessmentId, enabledProcesses, savePracticeRating],
  );

  async function handleSaveProcess() {
    if (!selectedProcess) return;
    setIsSaving(true);
    try {
      await saveProcessRatings(selectedProcess, ratings);
      toast.success(`Ratings saved for ${selectedProcess}`);
    } catch {
      toast.error("Failed to save ratings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAll() {
    setIsSaving(true);
    try {
      await Promise.all(
        enabledProcesses.map((p) => saveProcessRatings(p.id, ratings)),
      );
      toast.success("All ratings saved");
    } catch {
      toast.error("Failed to save some ratings");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSaveAndContinue() {
    if (!currentAssessmentId) return;
    await handleSaveAll();
    await updateStepMutation.mutateAsync({
      id: currentAssessmentId,
      step: "results",
    });
    toast.success("Navigating to View Results");
    navigateTo("results");
  }

  if (!currentAssessmentId) {
    return (
      <div className="page-enter flex flex-col items-center justify-center py-20 text-center space-y-4">
        <LayoutDashboard className="h-12 w-12 text-muted-foreground/40" />
        <div>
          <p className="text-lg font-semibold font-heading text-foreground">
            No Assessment Selected
          </p>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Please select or create an assessment from the Dashboard.
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

  const isLoading = loadingConfig || loadingRatings;

  if (isLoading) {
    return (
      <div className="page-enter space-y-4">
        <Skeleton className="h-12 w-64" />
        <div className="flex gap-4">
          <Skeleton className="h-screen/2 w-48" />
          <Skeleton className="flex-1 h-96" />
        </div>
      </div>
    );
  }

  const selectedProcessInfo = enabledProcesses.find(
    (p) => p.id === selectedProcess,
  );
  const targetLevel = selectedProcessInfo
    ? selectedProcessInfo.targetLevel === "NA"
      ? 0
      : Number.parseInt(selectedProcessInfo.targetLevel, 10)
    : 0;

  const availableLevels = Array.from({ length: targetLevel }, (_, i) => i + 1);

  const currentTab = activeTab[selectedProcess] ?? String(targetLevel);

  function setTab(tab: string) {
    setActiveTab((prev) => ({ ...prev, [selectedProcess]: tab }));
  }

  let globalPracticeIndex = 0;

  return (
    <div className="page-enter space-y-4">
      {/* Page Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs text-muted-foreground font-body mb-1 uppercase tracking-wide">
            Current Assessment
          </p>
          <h1 className="text-2xl font-bold font-heading text-foreground">
            {currentAssessmentTitle}
          </h1>
          <p className="text-muted-foreground text-sm mt-1 font-body">
            Perform Assessment
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentAssessment && (
            <StatusBadge status={currentAssessment.status} />
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleSaveAll}
            disabled={isSaving}
            className="gap-1.5"
            data-ocid="perform.save_button"
          >
            {isSaving ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            Save All
          </Button>
        </div>
      </div>

      {enabledProcesses.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-muted-foreground font-body text-sm">
              No processes enabled. Go to Define Target Profile to enable
              process groups.
            </p>
            <Button
              className="mt-4 spice-gradient text-white border-0"
              onClick={() => navigateTo("target-profile")}
            >
              Define Target Profile
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="flex gap-4 min-h-[600px]">
          {/* Left Process Navigation */}
          <div className="w-48 shrink-0">
            <Card className="border-border/60 sticky top-0">
              <CardHeader className="pb-2 pt-3 px-3">
                <CardTitle className="text-xs font-heading uppercase tracking-wide text-muted-foreground">
                  Processes
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1.5">
                <div className="space-y-0.5">
                  {enabledProcesses.map((process, index) => (
                    <button
                      key={process.id}
                      type="button"
                      onClick={() => setSelectedProcess(process.id)}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-md text-sm font-body transition-all",
                        selectedProcess === process.id
                          ? "bg-accent/10 text-accent font-medium"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground",
                      )}
                      data-ocid={`perform.process_nav_item.${index + 1}`}
                    >
                      <span className="font-medium">{process.id}</span>
                      <span
                        className={cn(
                          "ml-1.5 text-xs px-1 rounded",
                          process.targetLevel === "NA"
                            ? "bg-gray-100 text-gray-500"
                            : "bg-muted text-muted-foreground",
                        )}
                      >
                        {process.targetLevel === "NA"
                          ? "NA"
                          : `L${process.targetLevel}`}
                      </span>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel */}
          <div className="flex-1 min-w-0 space-y-4">
            {selectedProcessInfo ? (
              <>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold font-heading text-foreground">
                      {selectedProcess}
                    </h2>
                    <p className="text-sm text-muted-foreground font-body">
                      Target Level: {selectedProcessInfo.targetLevel}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleSaveProcess}
                    disabled={isSaving}
                    className="gap-1.5"
                  >
                    {isSaving ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Save className="h-3.5 w-3.5" />
                    )}
                    Save {selectedProcess}
                  </Button>
                </div>

                {selectedProcessInfo.targetLevel === "NA" ? (
                  <Card className="border-border/60">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground font-body text-sm">
                        Process excluded from assessment (Target Level: NA)
                      </p>
                    </CardContent>
                  </Card>
                ) : availableLevels.length === 0 ? (
                  <Card className="border-border/60">
                    <CardContent className="py-12 text-center">
                      <p className="text-muted-foreground font-body text-sm">
                        No levels configured for this process.
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="border-border/60">
                    <Tabs
                      value={
                        availableLevels.includes(Number.parseInt(currentTab))
                          ? currentTab
                          : String(availableLevels[availableLevels.length - 1])
                      }
                      onValueChange={setTab}
                    >
                      <CardHeader className="pb-0">
                        <TabsList
                          className="w-full grid"
                          style={{
                            gridTemplateColumns: `repeat(${availableLevels.length}, 1fr)`,
                          }}
                        >
                          {availableLevels.map((lvl, i) => (
                            <TabsTrigger
                              key={lvl}
                              value={String(lvl)}
                              className="font-body"
                              data-ocid={`perform.level_tab.${i + 1}`}
                            >
                              Level {lvl}
                            </TabsTrigger>
                          ))}
                        </TabsList>
                      </CardHeader>

                      {/* Level 1 Tab - Base Practices ONLY */}
                      {availableLevels.includes(1) && (
                        <TabsContent value="1" className="m-0">
                          <CardContent className="pt-4">
                            <div className="space-y-3">
                              <div className="flex items-center gap-2 mb-4">
                                <div className="h-1 w-4 rounded-full spice-gradient" />
                                <p className="text-xs font-semibold font-heading text-muted-foreground uppercase tracking-wide">
                                  Base Practices
                                </p>
                              </div>
                              {(BASE_PRACTICES[selectedProcess] ?? []).length >
                              0 ? (
                                (
                                  BASE_PRACTICES[
                                    selectedProcess
                                  ] as BasePractice[]
                                ).map((bp) => {
                                  globalPracticeIndex++;
                                  const idx = globalPracticeIndex;
                                  return (
                                    <PracticeCard
                                      key={bp.id}
                                      id={bp.id}
                                      title={bp.title}
                                      text={bp.text}
                                      state={getPracticeState(
                                        selectedProcess,
                                        1,
                                        bp.id,
                                      )}
                                      onChange={(patch) =>
                                        updatePracticeState(
                                          selectedProcess,
                                          1,
                                          bp.id,
                                          patch,
                                        )
                                      }
                                      showWorkProducts={true}
                                      index={idx}
                                    />
                                  );
                                })
                              ) : (
                                <Card className="border-border/40 bg-muted/30">
                                  <CardContent className="py-6 text-center">
                                    <p className="text-muted-foreground font-body text-sm">
                                      Base Practices for {selectedProcess} —
                                      Assessment criteria will be displayed
                                      here.
                                    </p>
                                  </CardContent>
                                </Card>
                              )}
                            </div>
                          </CardContent>
                        </TabsContent>
                      )}

                      {/* Level 2 Tab - Generic Practices ONLY */}
                      {availableLevels.includes(2) && (
                        <TabsContent value="2" className="m-0">
                          <CardContent className="pt-4">
                            <div className="space-y-6">
                              {LEVEL2_ATTRIBUTES.map((attr) => (
                                <div key={attr.id} className="space-y-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="h-1 w-4 rounded-full bg-blue-500" />
                                      <p className="text-xs font-semibold font-heading text-muted-foreground uppercase tracking-wide">
                                        {attr.name}
                                      </p>
                                    </div>
                                    <Separator className="mb-3" />
                                  </div>
                                  {attr.practices.map((gp: GenericPractice) => {
                                    globalPracticeIndex++;
                                    const idx = globalPracticeIndex;
                                    return (
                                      <PracticeCard
                                        key={gp.id}
                                        id={gp.id}
                                        title={gp.title}
                                        text={gp.text}
                                        state={getPracticeState(
                                          selectedProcess,
                                          2,
                                          gp.id,
                                        )}
                                        onChange={(patch) =>
                                          updatePracticeState(
                                            selectedProcess,
                                            2,
                                            gp.id,
                                            patch,
                                          )
                                        }
                                        showWorkProducts={false}
                                        index={idx}
                                      />
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </TabsContent>
                      )}

                      {/* Level 3 Tab - Generic Practices ONLY */}
                      {availableLevels.includes(3) && (
                        <TabsContent value="3" className="m-0">
                          <CardContent className="pt-4">
                            <div className="space-y-6">
                              {LEVEL3_ATTRIBUTES.map((attr) => (
                                <div key={attr.id} className="space-y-3">
                                  <div>
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="h-1 w-4 rounded-full bg-violet-500" />
                                      <p className="text-xs font-semibold font-heading text-muted-foreground uppercase tracking-wide">
                                        {attr.name}
                                      </p>
                                    </div>
                                    <Separator className="mb-3" />
                                  </div>
                                  {attr.practices.map((gp: GenericPractice) => {
                                    globalPracticeIndex++;
                                    const idx = globalPracticeIndex;
                                    return (
                                      <PracticeCard
                                        key={gp.id}
                                        id={gp.id}
                                        title={gp.title}
                                        text={gp.text}
                                        state={getPracticeState(
                                          selectedProcess,
                                          3,
                                          gp.id,
                                        )}
                                        onChange={(patch) =>
                                          updatePracticeState(
                                            selectedProcess,
                                            3,
                                            gp.id,
                                            patch,
                                          )
                                        }
                                        showWorkProducts={false}
                                        index={idx}
                                      />
                                    );
                                  })}
                                </div>
                              ))}
                            </div>
                          </CardContent>
                        </TabsContent>
                      )}
                    </Tabs>
                  </Card>
                )}
              </>
            ) : (
              <Card className="border-dashed border-border/60">
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground font-body text-sm">
                    Select a process from the left panel to begin rating.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Save and Continue */}
            <div className="flex items-center gap-3 pt-2 pb-6">
              <Button
                onClick={handleSaveAndContinue}
                disabled={isSaving}
                className="spice-gradient text-white border-0"
                data-ocid="perform.save_continue_button"
              >
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save and Continue to Results →
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
