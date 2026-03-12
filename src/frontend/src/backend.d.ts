import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface ProcessGroupConfig {
    enabledGroups: string;
    processLevels: string;
    assessmentId: bigint;
}
export interface AssessmentInfoData {
    unitDepartment: string;
    projectName: string;
    endDate: string;
    agileEnvironments: boolean;
    modelBasedDev: boolean;
    additionalRemarks: string;
    cybersecurityLevel: string;
    coAssessor: string;
    leadAssessor: string;
    projectContactSWQuality: string;
    sponsor: string;
    pamVersion: string;
    developmentExternal: boolean;
    projectContactSWDev: string;
    assessmentId: bigint;
    intacsId: string;
    functionalSafetyLevel: string;
    assessedParty: string;
    assessmentClass: string;
    projectScope: string;
    targetCapabilityLevel: string;
    assessedSite: string;
    assessorBody: string;
    startDate: string;
    vdaVersion: string;
}
export interface AssessmentDay {
    id: bigint;
    timeTo: string;
    date: string;
    dayNumber: bigint;
    sessions: string;
    assessmentId: bigint;
    timeFrom: string;
}
export type Time = bigint;
export interface Assessment {
    id: bigint;
    status: string;
    name: string;
    createdAt: Time;
    updatedAt: Time;
    currentStep: string;
}
export interface PracticeRating {
    id: bigint;
    weaknesses: string;
    strengths: string;
    workProductsInspected: string;
    level: bigint;
    rating: string;
    assessmentId: bigint;
    processId: string;
    practiceId: string;
}
export interface ReportGlobalInputs {
    assessmentId: bigint;
    globalStrengths: string;
    globalWeaknesses: string;
}
export interface backendInterface {
    createAssessment(name: string): Promise<bigint>;
    deleteAssessment(id: bigint): Promise<void>;
    deleteAssessmentDay(id: bigint): Promise<void>;
    getAllAssessments(): Promise<Array<Assessment>>;
    getAllPracticeRatingsForAssessment(assessmentId: bigint): Promise<Array<PracticeRating>>;
    getAssessment(id: bigint): Promise<Assessment>;
    getAssessmentDays(assessmentId: bigint): Promise<Array<AssessmentDay>>;
    getAssessmentInfoData(assessmentId: bigint): Promise<AssessmentInfoData>;
    getPracticeRatings(assessmentId: bigint, processId: string): Promise<Array<PracticeRating>>;
    getProcessGroupConfig(assessmentId: bigint): Promise<ProcessGroupConfig>;
    markAssessmentCompleted(id: bigint): Promise<void>;
    saveAssessmentDay(assessmentId: bigint, dayNumber: bigint, date: string, timeFrom: string, timeTo: string, sessions: string): Promise<bigint>;
    saveAssessmentInfoData(data: AssessmentInfoData): Promise<void>;
    savePracticeRating(assessmentId: bigint, processId: string, level: bigint, practiceId: string, rating: string, strengths: string, weaknesses: string, workProductsInspected: string): Promise<bigint>;
    saveProcessGroupConfig(assessmentId: bigint, enabledGroups: string, processLevels: string): Promise<void>;
    updateAssessmentStatus(id: bigint, status: string): Promise<void>;
    updateAssessmentStep(id: bigint, step: string): Promise<void>;
    saveReportGlobalInputs(assessmentId: bigint, globalStrengths: string, globalWeaknesses: string): Promise<void>;
    getReportGlobalInputs(assessmentId: bigint): Promise<ReportGlobalInputs>;
}
