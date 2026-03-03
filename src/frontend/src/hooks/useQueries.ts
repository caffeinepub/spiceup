import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import type {
  Assessment,
  TargetProfile,
  AssessmentPlan,
  WorkProduct,
  AssessmentResult,
  Report,
} from "../backend.d";

// ─── Assessments ──────────────────────────────────────────────

export function useGetAllAssessments() {
  const { actor, isFetching } = useActor();
  return useQuery<Assessment[]>({
    queryKey: ["assessments"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAssessments();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAssessment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      name,
      description,
      status,
    }: {
      name: string;
      description: string;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createAssessment(name, description, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useUpdateAssessment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      name,
      description,
      status,
    }: {
      id: bigint;
      name: string;
      description: string;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateAssessment(id, name, description, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useDeleteAssessment() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteAssessment(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

// ─── Target Profiles ──────────────────────────────────────────

export function useGetAllTargetProfiles() {
  const { actor, isFetching } = useActor();
  return useQuery<TargetProfile[]>({
    queryKey: ["targetProfiles"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllTargetProfiles();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateTargetProfile() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      name,
      criteria,
      skillLevel,
    }: {
      assessmentId: bigint;
      name: string;
      criteria: string;
      skillLevel: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createTargetProfile(assessmentId, name, criteria, skillLevel);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["targetProfiles"] });
    },
  });
}

// ─── Assessment Plans ─────────────────────────────────────────

export function useGetAllAssessmentPlans() {
  const { actor, isFetching } = useActor();
  return useQuery<AssessmentPlan[]>({
    queryKey: ["assessmentPlans"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAssessmentPlans();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAssessmentPlan() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      planDetails,
      scheduledDate,
      status,
    }: {
      assessmentId: bigint;
      planDetails: string;
      scheduledDate: bigint;
      status: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createAssessmentPlan(assessmentId, planDetails, scheduledDate, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessmentPlans"] });
    },
  });
}

// ─── Work Products ────────────────────────────────────────────

export function useGetAllWorkProducts() {
  const { actor, isFetching } = useActor();
  return useQuery<WorkProduct[]>({
    queryKey: ["workProducts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllWorkProducts();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddWorkProduct() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      name,
      fileType,
      notes,
    }: {
      assessmentId: bigint;
      name: string;
      fileType: string;
      notes: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addWorkProduct(assessmentId, name, fileType, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workProducts"] });
    },
  });
}

// ─── Assessment Results ───────────────────────────────────────

export function useGetAllAssessmentResults() {
  const { actor, isFetching } = useActor();
  return useQuery<AssessmentResult[]>({
    queryKey: ["assessmentResults"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllAssessmentResults();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddAssessmentResult() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      score,
      findings,
      recommendations,
    }: {
      assessmentId: bigint;
      score: bigint;
      findings: string;
      recommendations: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.addAssessmentResult(assessmentId, score, findings, recommendations);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessmentResults"] });
    },
  });
}

// ─── Reports ──────────────────────────────────────────────────

export function useGetAllReports() {
  const { actor, isFetching } = useActor();
  return useQuery<Report[]>({
    queryKey: ["reports"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllReports();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGenerateReport() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      reportContent,
    }: {
      assessmentId: bigint;
      reportContent: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.generateReport(assessmentId, reportContent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
