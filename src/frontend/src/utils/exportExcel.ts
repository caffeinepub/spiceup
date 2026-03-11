/**
 * exportExcel.ts
 * Excel (.xlsx) export for Q-Insight assessment reports using SheetJS (xlsx).
 * Uses window.XLSX (CDN-loaded) to avoid bundler dependency issues.
 */

import type { ReportData } from "./reportData";

// CDN-loaded XLSX global
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getXLSX = (): any => {
  return (window as any).XLSX;
};

// ─── Helpers ─────────────────────────────────────────────────────

function makeCell(value: string | number | null | undefined): any {
  const v = value ?? "";
  return { t: typeof v === "number" ? "n" : "s", v };
}

// SheetJS cell address helper
function addr(col: number, row: number): string {
  const XLSX = getXLSX();
  const colName = XLSX.utils.encode_col(col);
  return `${colName}${row + 1}`;
}

function buildExecutiveSummarySheet(data: ReportData): any {
  const ws: any = {};
  let row = 0;

  // ── Header ──
  ws[addr(0, row)] = makeCell("Q-Insight Assessment Report");
  ws[addr(1, row)] = makeCell(data.assessmentName);
  row++;
  ws[addr(0, row)] = makeCell("Generated");
  ws[addr(1, row)] = makeCell(data.generatedAt);
  row += 2;

  // ── Assessment Info ──
  ws[addr(0, row)] = makeCell("ASSESSMENT INFORMATION");
  row++;

  const info = data.info;
  const infoFields: Array<[string, string]> = [
    ["Project Name", info?.projectName ?? ""],
    ["Start Date", info?.startDate ?? ""],
    ["End Date", info?.endDate ?? ""],
    ["Lead Assessor", info?.leadAssessor ?? ""],
    ["Co-Assessor", info?.coAssessor ?? ""],
    ["Assessed Party", info?.assessedParty ?? ""],
    ["Assessed Site", info?.assessedSite ?? ""],
    ["Assessor Body", info?.assessorBody ?? ""],
    ["Sponsor", info?.sponsor ?? ""],
    ["Unit / Department", info?.unitDepartment ?? ""],
    ["PAM Version", info?.pamVersion ?? ""],
    ["VDA Version", info?.vdaVersion ?? ""],
    ["Assessment Class", info?.assessmentClass ?? ""],
    ["Target Capability Level", info?.targetCapabilityLevel ?? ""],
    ["Functional Safety Level", info?.functionalSafetyLevel ?? ""],
    ["Cybersecurity Level", info?.cybersecurityLevel ?? ""],
    ["Project Scope", info?.projectScope ?? ""],
    ["Additional Remarks", info?.additionalRemarks ?? ""],
    ["SW Dev Contact", info?.projectContactSWDev ?? ""],
    ["SW Quality Contact", info?.projectContactSWQuality ?? ""],
  ];

  for (const [label, value] of infoFields) {
    ws[addr(0, row)] = makeCell(label);
    ws[addr(1, row)] = makeCell(value);
    row++;
  }

  row += 2;

  // ── Scope ──
  ws[addr(0, row)] = makeCell("SCOPE — PROCESSES IN ASSESSMENT");
  row++;
  ws[addr(0, row)] = makeCell("Process ID");
  ws[addr(1, row)] = makeCell("Process Name");
  ws[addr(2, row)] = makeCell("Target Level");
  row++;

  for (const proc of data.processesInScope) {
    ws[addr(0, row)] = makeCell(proc.id);
    ws[addr(1, row)] = makeCell(proc.name);
    ws[addr(2, row)] = makeCell(`Level ${proc.targetLevel}`);
    row++;
  }

  row += 2;

  // ── Results Matrix ──
  ws[addr(0, row)] = makeCell("RESULTS MATRIX");
  row++;

  // Header
  const matrixHeaders = [
    "Process",
    "Target",
    "PA1.1",
    "PA2.1",
    "PA2.2",
    "PA3.1",
    "PA3.2",
    "Capability Level",
  ];
  matrixHeaders.forEach((h, col) => {
    ws[addr(col, row)] = makeCell(h);
  });
  row++;

  // Data rows
  for (const proc of data.processes) {
    ws[addr(0, row)] = makeCell(`${proc.id} – ${proc.label}`);
    ws[addr(1, row)] = makeCell(`Level ${proc.targetLevel}`);
    ws[addr(2, row)] = makeCell(
      proc.targetLevel >= 1 ? (proc.paRatings["PA1.1"] ?? "—") : "—",
    );
    ws[addr(3, row)] = makeCell(
      proc.targetLevel >= 2 ? (proc.paRatings["PA2.1"] ?? "—") : "N/A",
    );
    ws[addr(4, row)] = makeCell(
      proc.targetLevel >= 2 ? (proc.paRatings["PA2.2"] ?? "—") : "N/A",
    );
    ws[addr(5, row)] = makeCell(
      proc.targetLevel >= 3 ? (proc.paRatings["PA3.1"] ?? "—") : "N/A",
    );
    ws[addr(6, row)] = makeCell(
      proc.targetLevel >= 3 ? (proc.paRatings["PA3.2"] ?? "—") : "N/A",
    );
    ws[addr(7, row)] = makeCell(
      proc.capabilityLevel !== null ? proc.capabilityLevel : "—",
    );
    row++;
  }

  const XLSX = getXLSX();

  // Set column widths
  ws["!cols"] = [
    { wch: 40 }, // Process
    { wch: 10 }, // Target
    { wch: 10 }, // PA1.1
    { wch: 10 }, // PA2.1
    { wch: 10 }, // PA2.2
    { wch: 10 }, // PA3.1
    { wch: 10 }, // PA3.2
    { wch: 18 }, // CL
  ];

  // Set sheet range
  ws["!ref"] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: 7, r: row - 1 },
  });

  return ws;
}

function buildProcessSheet(proc: ReportData["processes"][0]): any {
  const ws: any = {};
  let row = 0;

  // Header info
  ws[addr(0, row)] = makeCell("Process");
  ws[addr(1, row)] = makeCell(`${proc.id} – ${proc.label}`);
  row++;
  ws[addr(0, row)] = makeCell("Target Level");
  ws[addr(1, row)] = makeCell(`Level ${proc.targetLevel}`);
  row++;
  ws[addr(0, row)] = makeCell("Capability Level");
  ws[addr(1, row)] = makeCell(
    proc.capabilityLevel !== null ? proc.capabilityLevel : "—",
  );
  row += 2;

  // PA Ratings overview
  ws[addr(0, row)] = makeCell("PA OVERALL RATINGS");
  row++;
  const paIds = ["PA1.1"];
  if (proc.targetLevel >= 2) paIds.push("PA2.1", "PA2.2");
  if (proc.targetLevel >= 3) paIds.push("PA3.1", "PA3.2");

  paIds.forEach((paId, col) => {
    ws[addr(col, row)] = makeCell(paId);
  });
  row++;
  paIds.forEach((paId, col) => {
    ws[addr(col, row)] = makeCell(proc.paRatings[paId] ?? "—");
  });
  row += 2;

  // BP Table
  if (proc.bpDetails.length > 0) {
    ws[addr(0, row)] = makeCell("BASE PRACTICES (PA 1.1)");
    row++;
    const bpHeaders = [
      "Practice ID",
      "Title",
      "Rating",
      "Strengths",
      "Weaknesses",
      "Evidence",
    ];
    bpHeaders.forEach((h, col) => {
      ws[addr(col, row)] = makeCell(h);
    });
    row++;

    for (const bp of proc.bpDetails) {
      const evidenceSummary = bp.evidence.map((e) => e.description).join("; ");
      ws[addr(0, row)] = makeCell(bp.id);
      ws[addr(1, row)] = makeCell(bp.title);
      ws[addr(2, row)] = makeCell(bp.rating ?? "—");
      ws[addr(3, row)] = makeCell(bp.strengths || "");
      ws[addr(4, row)] = makeCell(bp.weaknesses || "");
      ws[addr(5, row)] = makeCell(evidenceSummary || "");
      row++;
    }
    row += 1;
  }

  // GP groups
  for (const group of proc.gpGroups) {
    ws[addr(0, row)] = makeCell(group.paName.toUpperCase());
    row++;
    const gpHeaders = [
      "Practice ID",
      "Title",
      "Rating",
      "Strengths",
      "Weaknesses",
      "Evidence",
    ];
    gpHeaders.forEach((h, col) => {
      ws[addr(col, row)] = makeCell(h);
    });
    row++;

    for (const gp of group.practices) {
      const evidenceSummary = gp.evidence.map((e) => e.description).join("; ");
      ws[addr(0, row)] = makeCell(gp.id);
      ws[addr(1, row)] = makeCell(gp.title);
      ws[addr(2, row)] = makeCell(gp.rating ?? "—");
      ws[addr(3, row)] = makeCell(gp.strengths || "");
      ws[addr(4, row)] = makeCell(gp.weaknesses || "");
      ws[addr(5, row)] = makeCell(evidenceSummary || "");
      row++;
    }
    row += 1;
  }

  // Evidence detail table
  const allPractices = [
    ...proc.bpDetails,
    ...proc.gpGroups.flatMap((g) => g.practices),
  ];
  const evidenceRows = allPractices.flatMap((p) =>
    p.evidence.map((e) => ({ practiceId: p.id, ...e })),
  );

  if (evidenceRows.length > 0) {
    ws[addr(0, row)] = makeCell("WORK PRODUCTS INSPECTED");
    row++;
    ["Practice", "Description", "Link", "Version"].forEach((h, col) => {
      ws[addr(col, row)] = makeCell(h);
    });
    row++;

    for (const e of evidenceRows) {
      ws[addr(0, row)] = makeCell(e.practiceId);
      ws[addr(1, row)] = makeCell(e.description);
      ws[addr(2, row)] = makeCell(e.link);
      ws[addr(3, row)] = makeCell(e.version);
      row++;
    }
  }

  const XLSX = getXLSX();

  ws["!cols"] = [
    { wch: 22 }, // ID
    { wch: 55 }, // Title / Description
    { wch: 10 }, // Rating
    { wch: 50 }, // Strengths
    { wch: 50 }, // Weaknesses
    { wch: 50 }, // Evidence
  ];

  ws["!ref"] = XLSX.utils.encode_range({
    s: { c: 0, r: 0 },
    e: { c: 5, r: row - 1 },
  });

  return ws;
}

// ─── Main Export Function ────────────────────────────────────────

export function exportToExcel(data: ReportData): void {
  const XLSX = getXLSX();
  if (!XLSX) {
    alert("Excel export library not loaded. Please try again.");
    return;
  }

  const wb = XLSX.utils.book_new();

  // Sheet 1: Executive Summary
  const execSheet = buildExecutiveSummarySheet(data);
  XLSX.utils.book_append_sheet(wb, execSheet, "Executive Summary");

  // Per-process sheets
  for (const proc of data.processes) {
    const sheet = buildProcessSheet(proc);
    // Excel sheet names max 31 chars, no special chars
    const sheetName = proc.id.replace(/[\\/*?[\]:]/g, "").slice(0, 31);
    XLSX.utils.book_append_sheet(wb, sheet, sheetName);
  }

  const fileName = `QInsight-${data.assessmentName.replace(/[^a-z0-9]/gi, "_")}-Report.xlsx`;
  XLSX.writeFile(wb, fileName);
}
