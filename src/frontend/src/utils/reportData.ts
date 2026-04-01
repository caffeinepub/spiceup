/**
 * reportData.ts
 * Shared data assembly for all report export formats.
 */

import {
  BASE_PRACTICES,
  LEVEL2_ATTRIBUTES,
  LEVEL3_ATTRIBUTES,
  PROCESS_GROUPS,
} from "@/data/aspiceData";
import type {
  AssessmentDay,
  AssessmentInfoData,
  PracticeRating,
  ProcessGroupConfig,
} from "../backend.d";

// ─── Types ──────────────────────────────────────────────────────

export type Rating = "N" | "P" | "L" | "F";

export interface EvidenceEntry {
  description: string;
  link: string;
  version: string;
}

export interface PracticeDetail {
  id: string;
  title: string;
  rating: Rating | null;
  strengths: string; // newline-separated plain text
  weaknesses: string; // newline-separated plain text
  suggestions: string; // newline-separated plain text (from swEntries type=observation)
  evidence: EvidenceEntry[];
}

export interface PAGroup {
  paId: string;
  paName: string;
  practices: PracticeDetail[];
}

export interface FindingItem {
  id: string;
  type: "strength" | "weakness" | "suggestion";
  text: string;
  practiceRefs: string[]; // short labels e.g. ["BP1", "BP3"]
}

export interface ReportProcess {
  id: string;
  label: string;
  targetLevel: number;
  capabilityLevel: number | null;
  paRatings: Record<string, Rating | null>;
  bpDetails: PracticeDetail[];
  gpGroups: PAGroup[];
  findingsList: FindingItem[];
}

export interface ScheduleSession {
  process: string;
  timeFrom: string;
  timeTo: string;
  attendees: string;
}

export interface ScheduleDay {
  date: string;
  dayNumber: number;
  sessions: ScheduleSession[];
}

export interface ReportData {
  assessmentName: string;
  info: AssessmentInfoData | null;
  processesInScope: Array<{ id: string; name: string; targetLevel: number }>;
  processes: ReportProcess[];
  schedule: ScheduleDay[];
  generatedAt: string;
  globalStrengths: string[];
  globalWeaknesses: string[];
  evidenceMap: Record<string, { name: string; link: string; version: string }>;
}

// ─── HTML Stripper ───────────────────────────────────────────────

export function stripHtml(html: string): string {
  if (!html) return "";
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ─── Evidence Parser ─────────────────────────────────────────────

function parseEvidence(raw: string): EvidenceEntry[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    // New format: { workProducts: [...], swEntries: [...] }
    const items = parsed.workProducts ?? (Array.isArray(parsed) ? parsed : []);
    return items.map((item: Record<string, unknown>) => ({
      description: String(item.description ?? item.name ?? ""),
      link: String(item.link ?? ""),
      version: String(item.version ?? ""),
    }));
  } catch {
    if (raw.trim()) {
      return [{ description: raw.trim(), link: "", version: "" }];
    }
  }
  return [];
}

// ─── Suggestions Parser ──────────────────────────────────────────

function parseSuggestions(rawWPI: string): string {
  if (!rawWPI) return "";
  try {
    const parsed = JSON.parse(rawWPI);
    const swEntries = parsed.swEntries;
    if (Array.isArray(swEntries)) {
      return swEntries
        .filter(
          (e: { type?: string }) =>
            e.type === "observation" || e.type === "suggestion",
        )
        .map((e: { text?: string }) => stripHtml(String(e.text ?? "")).trim())
        .filter((t: string) => t.length > 0)
        .join("\n");
    }
  } catch {
    // ignore
  }
  return "";
}

// ─── Practice label shortener ─────────────────────────────────────

function shortPracticeLabel(nodeKey: string): string {
  // nodeKey format: processId_level_practiceId e.g. MAN.3_1_MAN.3.BP1
  const parts = nodeKey.split("_");
  if (parts.length < 3) return nodeKey;
  const pid = parts[0]; // e.g. MAN.3
  const fullPracticeId = parts.slice(2).join("_"); // e.g. MAN.3.BP1
  const short = fullPracticeId.startsWith(`${pid}.`)
    ? fullPracticeId.slice(pid.length + 1)
    : fullPracticeId;
  return short; // e.g. BP1, GP2.1.1
}

// ─── Capability Level Calculator ────────────────────────────────

function computeCapabilityLevel(
  targetLevel: number,
  paRatings: Record<string, Rating | null>,
): number | null {
  const get = (paId: string): Rating | null => paRatings[paId] ?? null;

  if (targetLevel === 1) {
    const pa11 = get("PA1.1");
    if (pa11 === null) return null;
    return pa11 === "L" || pa11 === "F" ? 1 : 0;
  }

  if (targetLevel === 2) {
    const pa11 = get("PA1.1");
    const pa21 = get("PA2.1");
    const pa22 = get("PA2.2");
    if (pa11 === null) return null;
    if (
      pa11 === "F" &&
      (pa21 === "L" || pa21 === "F") &&
      (pa22 === "L" || pa22 === "F")
    )
      return 2;
    if (pa11 === "L" || pa11 === "F") return 1;
    return 0;
  }

  if (targetLevel === 3) {
    const pa11 = get("PA1.1");
    const pa21 = get("PA2.1");
    const pa22 = get("PA2.2");
    const pa31 = get("PA3.1");
    const pa32 = get("PA3.2");
    if (pa11 === null) return null;
    if (
      pa11 === "F" &&
      pa21 === "F" &&
      pa22 === "F" &&
      (pa31 === "L" || pa31 === "F") &&
      (pa32 === "L" || pa32 === "F")
    )
      return 3;
    if (
      pa11 === "F" &&
      (pa21 === "L" || pa21 === "F") &&
      (pa22 === "L" || pa22 === "F")
    )
      return 2;
    if (pa11 === "L" || pa11 === "F") return 1;
    return 0;
  }

  return null;
}

// ─── Main Data Builder ───────────────────────────────────────────

export function buildReportData(
  assessmentName: string,
  info: AssessmentInfoData | null,
  config: ProcessGroupConfig | null,
  ratings: PracticeRating[],
  days: AssessmentDay[],
  globalStrengths: string[] = [],
  globalWeaknesses: string[] = [],
  evidenceMap: Record<
    string,
    { name: string; link: string; version: string }
  > = {},
): ReportData {
  const generatedAt = new Date().toLocaleString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  let enabledGroups: string[] = [];
  let processLevels: Record<string, string> = {};

  if (config) {
    try {
      enabledGroups = JSON.parse(config.enabledGroups) as string[];
    } catch {
      enabledGroups = [];
    }
    try {
      processLevels = JSON.parse(config.processLevels) as Record<
        string,
        string
      >;
    } catch {
      processLevels = {};
    }
  }

  const ratingMap: Record<string, Record<string, PracticeRating>> = {};
  for (const r of ratings) {
    if (!ratingMap[r.processId]) ratingMap[r.processId] = {};
    ratingMap[r.processId][r.practiceId] = r;
  }

  const processesInScope: Array<{
    id: string;
    name: string;
    targetLevel: number;
  }> = [];
  for (const group of PROCESS_GROUPS) {
    if (!enabledGroups.includes(group.id)) continue;
    for (const proc of group.processes) {
      const levelStr = processLevels[proc.id];
      if (levelStr === "NA" || levelStr === undefined) continue;
      const targetLevel = Number.parseInt(levelStr ?? "2", 10);
      processesInScope.push({ id: proc.id, name: proc.name, targetLevel });
    }
  }

  const processes: ReportProcess[] = [];

  for (const { id: procId, name: procLabel, targetLevel } of processesInScope) {
    const procRatings = ratingMap[procId] ?? {};
    const allProcRatings = ratings.filter((r) => r.processId === procId);

    const getRating = (practiceId: string): Rating | null => {
      const r = procRatings[practiceId];
      if (r?.rating && ["N", "P", "L", "F"].includes(r.rating)) {
        return r.rating as Rating;
      }
      return null;
    };

    const getPracticeDetail = (
      practiceId: string,
      title: string,
    ): PracticeDetail => {
      const r = procRatings[practiceId];
      return {
        id: practiceId,
        title,
        rating: getRating(practiceId),
        strengths: stripHtml(r?.strengths ?? ""),
        weaknesses: stripHtml(r?.weaknesses ?? ""),
        suggestions: parseSuggestions(r?.workProductsInspected ?? ""),
        evidence: parseEvidence(r?.workProductsInspected ?? ""),
      };
    };

    const bps = BASE_PRACTICES[procId] ?? [];
    const bpDetails: PracticeDetail[] = bps.map((bp) =>
      getPracticeDetail(bp.id, bp.title),
    );

    const gpGroups: PAGroup[] = [];

    if (targetLevel >= 2) {
      for (const pa of LEVEL2_ATTRIBUTES) {
        gpGroups.push({
          paId: pa.id,
          paName: pa.name,
          practices: pa.practices.map((gp) =>
            getPracticeDetail(gp.id, gp.title),
          ),
        });
      }
    }

    if (targetLevel >= 3) {
      for (const pa of LEVEL3_ATTRIBUTES) {
        gpGroups.push({
          paId: pa.id,
          paName: pa.name,
          practices: pa.practices.map((gp) =>
            getPracticeDetail(gp.id, gp.title),
          ),
        });
      }
    }

    const paIds = ["PA1.1"];
    if (targetLevel >= 2) paIds.push("PA2.1", "PA2.2");
    if (targetLevel >= 3) paIds.push("PA3.1", "PA3.2");

    const paRatings: Record<string, Rating | null> = {};
    for (const paId of paIds) {
      const r = allProcRatings.find(
        (pr) => Number(pr.level) === 5 && pr.practiceId === paId,
      );
      const val =
        r?.rating && ["N", "P", "L", "F"].includes(r.rating)
          ? (r.rating as Rating)
          : null;
      paRatings[paId] = val;
    }

    const capabilityLevel = computeCapabilityLevel(targetLevel, paRatings);

    // ─── Build findingsList ─────────────────────────────────────
    const seenIds = new Set<string>();
    const findingsList: FindingItem[] = [];

    for (const r of allProcRatings) {
      if (!r.workProductsInspected) continue;
      try {
        const parsed = JSON.parse(r.workProductsInspected) as {
          swEntries?: Array<{
            id?: string;
            type?: string;
            text?: string;
            practiceIds?: string[];
          }>;
        };
        const entries = parsed.swEntries ?? [];
        for (const e of entries) {
          if (!e.id || seenIds.has(e.id)) continue;
          seenIds.add(e.id);
          const type: "strength" | "weakness" | "suggestion" =
            e.type === "strength"
              ? "strength"
              : e.type === "weakness"
                ? "weakness"
                : "suggestion";
          const text = stripHtml(String(e.text ?? "")).trim();
          if (!text) continue;
          const practiceRefs: string[] = (e.practiceIds ?? []).map(
            (nodeKey: string) => shortPracticeLabel(nodeKey),
          );
          findingsList.push({ id: e.id, type, text, practiceRefs });
        }
      } catch {
        // ignore
      }
    }

    processes.push({
      id: procId,
      label: procLabel,
      targetLevel,
      capabilityLevel,
      paRatings,
      bpDetails,
      gpGroups,
      findingsList,
    });
  }

  const schedule: ScheduleDay[] = days.map((day) => {
    let sessions: ScheduleSession[] = [];
    try {
      const parsed = JSON.parse(day.sessions);
      if (Array.isArray(parsed)) {
        sessions = parsed.map((s: Record<string, string>) => ({
          process: String(s.process ?? s.name ?? ""),
          timeFrom: String(s.timeFrom ?? s.startTime ?? ""),
          timeTo: String(s.timeTo ?? s.endTime ?? ""),
          attendees: String(s.attendees ?? ""),
        }));
      }
    } catch {
      sessions = [];
    }
    return {
      date: day.date,
      dayNumber: Number(day.dayNumber),
      sessions,
    };
  });

  schedule.sort((a, b) => a.dayNumber - b.dayNumber);

  return {
    assessmentName,
    info,
    processesInScope,
    processes,
    schedule,
    generatedAt,
    globalStrengths,
    globalWeaknesses,
    evidenceMap,
  };
}
