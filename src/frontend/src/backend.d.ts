import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface AssessmentPlan {
    id: bigint;
    status: string;
    scheduledDate: Time;
    planDetails: string;
    assessmentId: bigint;
}
export type Time = bigint;
export interface Assessment {
    id: bigint;
    status: string;
    name: string;
    createdAt: Time;
    description: string;
}
export interface AssessmentResult {
    id: bigint;
    completedAt: Time;
    recommendations: string;
    score: bigint;
    findings: string;
    assessmentId: bigint;
}
export interface TargetProfile {
    id: bigint;
    name: string;
    criteria: string;
    skillLevel: string;
    assessmentId: bigint;
}
export interface Report {
    id: bigint;
    generatedAt: Time;
    reportContent: string;
    assessmentId: bigint;
}
export interface WorkProduct {
    id: bigint;
    name: string;
    fileType: string;
    notes: string;
    assessmentId: bigint;
    uploadedAt: Time;
}
export interface backendInterface {
    addAssessmentResult(assessmentId: bigint, score: bigint, findings: string, recommendations: string): Promise<bigint>;
    addWorkProduct(assessmentId: bigint, name: string, fileType: string, notes: string): Promise<bigint>;
    createAssessment(name: string, description: string, status: string): Promise<bigint>;
    createAssessmentPlan(assessmentId: bigint, planDetails: string, scheduledDate: Time, status: string): Promise<bigint>;
    createTargetProfile(assessmentId: bigint, name: string, criteria: string, skillLevel: string): Promise<bigint>;
    deleteAssessment(id: bigint): Promise<void>;
    generateReport(assessmentId: bigint, reportContent: string): Promise<bigint>;
    getAllAssessmentPlans(): Promise<Array<AssessmentPlan>>;
    getAllAssessmentResults(): Promise<Array<AssessmentResult>>;
    getAllAssessments(): Promise<Array<Assessment>>;
    getAllReports(): Promise<Array<Report>>;
    getAllTargetProfiles(): Promise<Array<TargetProfile>>;
    getAllWorkProducts(): Promise<Array<WorkProduct>>;
    getAssessment(id: bigint): Promise<Assessment>;
    getAssessmentPlan(id: bigint): Promise<AssessmentPlan>;
    getAssessmentResult(id: bigint): Promise<AssessmentResult>;
    getReport(id: bigint): Promise<Report>;
    getTargetProfile(id: bigint): Promise<TargetProfile>;
    getWorkProduct(id: bigint): Promise<WorkProduct>;
    updateAssessment(id: bigint, name: string, description: string, status: string): Promise<void>;
}
