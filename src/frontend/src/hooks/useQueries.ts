import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  Assessment,
  AssessmentDay,
  AssessmentInfoData,
  PracticeRating,
  ProcessGroupConfig,
} from "../backend.d";
import { useActor } from "./useActor";

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
    mutationFn: async ({ name }: { name: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.createAssessment(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useMarkAssessmentCompleted() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Actor not available");
      return actor.markAssessmentCompleted(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useUpdateAssessmentStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: bigint; status: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateAssessmentStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

export function useUpdateAssessmentStep() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, step }: { id: bigint; step: string }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.updateAssessmentStep(id, step);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessments"] });
    },
  });
}

// ─── Assessment Info Data ─────────────────────────────────────

export function useGetAssessmentInfoData(assessmentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AssessmentInfoData | null>({
    queryKey: ["assessmentInfoData", assessmentId?.toString()],
    queryFn: async () => {
      if (!actor || assessmentId == null) return null;
      try {
        return await actor.getAssessmentInfoData(assessmentId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && assessmentId != null,
  });
}

export function useSaveAssessmentInfoData() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: AssessmentInfoData) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveAssessmentInfoData(data);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assessmentInfoData", variables.assessmentId.toString()],
      });
    },
  });
}

// ─── Process Group Config ─────────────────────────────────────

export function useGetProcessGroupConfig(assessmentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<ProcessGroupConfig | null>({
    queryKey: ["processGroupConfig", assessmentId?.toString()],
    queryFn: async () => {
      if (!actor || assessmentId == null) return null;
      try {
        return await actor.getProcessGroupConfig(assessmentId);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && assessmentId != null,
  });
}

export function useSaveProcessGroupConfig() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      enabledGroups,
      processLevels,
    }: {
      assessmentId: bigint;
      enabledGroups: string;
      processLevels: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveProcessGroupConfig(
        assessmentId,
        enabledGroups,
        processLevels,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["processGroupConfig", variables.assessmentId.toString()],
      });
    },
  });
}

// ─── Assessment Days (Planning) ───────────────────────────────

export function useGetAssessmentDays(assessmentId: bigint | null) {
  const { actor, isFetching } = useActor();
  return useQuery<AssessmentDay[]>({
    queryKey: ["assessmentDays", assessmentId?.toString()],
    queryFn: async () => {
      if (!actor || assessmentId == null) return [];
      try {
        return await actor.getAssessmentDays(assessmentId);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && assessmentId != null,
  });
}

export function useSaveAssessmentDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      dayNumber,
      date,
      timeFrom,
      timeTo,
      sessions,
    }: {
      assessmentId: bigint;
      dayNumber: bigint;
      date: string;
      timeFrom: string;
      timeTo: string;
      sessions: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.saveAssessmentDay(
        assessmentId,
        dayNumber,
        date,
        timeFrom,
        timeTo,
        sessions,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assessmentDays", variables.assessmentId.toString()],
      });
    },
  });
}

export function useDeleteAssessmentDay() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      assessmentId: _assessmentId,
    }: { id: bigint; assessmentId: bigint }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.deleteAssessmentDay(id);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["assessmentDays", variables.assessmentId.toString()],
      });
    },
  });
}

// ─── Practice Ratings (Perform Assessment) ────────────────────

export function useGetAllPracticeRatingsForAssessment(
  assessmentId: bigint | null,
) {
  const { actor, isFetching } = useActor();
  return useQuery<PracticeRating[]>({
    queryKey: ["practiceRatings", assessmentId?.toString()],
    queryFn: async () => {
      if (!actor || assessmentId == null) return [];
      try {
        return await actor.getAllPracticeRatingsForAssessment(assessmentId);
      } catch {
        return [];
      }
    },
    enabled: !!actor && !isFetching && assessmentId != null,
  });
}

export function useSavePracticeRating() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      assessmentId,
      processId,
      level,
      practiceId,
      rating,
      strengths,
      weaknesses,
      workProductsInspected,
    }: {
      assessmentId: bigint;
      processId: string;
      level: bigint;
      practiceId: string;
      rating: string;
      strengths: string;
      weaknesses: string;
      workProductsInspected: string;
    }) => {
      if (!actor) throw new Error("Actor not available");
      return actor.savePracticeRating(
        assessmentId,
        processId,
        level,
        practiceId,
        rating,
        strengths,
        weaknesses,
        workProductsInspected,
      );
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ["practiceRatings", variables.assessmentId.toString()],
      });
    },
  });
}

// ─── Work Products ────────────────────────────────────────────

export function useGetAllWorkProducts() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["workProducts"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await (actor as any).getAllWorkProducts?.()) ?? [];
      } catch {
        return [];
      }
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
      return (actor as any).addWorkProduct(assessmentId, name, fileType, notes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workProducts"] });
    },
  });
}

// ─── Assessment Results ───────────────────────────────────────

export function useGetAllAssessmentResults() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["assessmentResults"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await (actor as any).getAllAssessmentResults?.()) ?? [];
      } catch {
        return [];
      }
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
      return (actor as any).addAssessmentResult(
        assessmentId,
        score,
        findings,
        recommendations,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessmentResults"] });
    },
  });
}

// ─── Reports ──────────────────────────────────────────────────

export function useGetAllReports() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["reports"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        return (await (actor as any).getAllReports?.()) ?? [];
      } catch {
        return [];
      }
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
      return (actor as any).generateReport(assessmentId, reportContent);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
  });
}
