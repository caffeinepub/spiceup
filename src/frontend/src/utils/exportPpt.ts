/**
 * exportPpt.ts
 * PowerPoint (.pptx) export for Q-Insight assessment reports using pptxgenjs.
 * Uses window.PptxGenJS (CDN-loaded) to avoid bundler dependency issues.
 */

import type { ReportData } from "./reportData";

// CDN-loaded PptxGenJS global
const getPptx = (): any =>
  (window as any).PptxGenJS ?? (window as any).pptxgenjs;

// ─── Theme constants ─────────────────────────────────────────────

const THEME = {
  navy: "0F1F3D",
  navyLight: "1E3A71",
  white: "FFFFFF",
  amber: "F59E0B",
  lightBg: "F5F7FA",
  darkText: "1E232D",
  midGray: "6B7280",
  lightGray: "E5E7EB",
};

const RATING_COLORS: Record<string, { fill: string; color: string }> = {
  F: { fill: "00B04F", color: "000000" },
  L: { fill: "92D050", color: "000000" },
  P: { fill: "FFFF00", color: "000000" },
  N: { fill: "990000", color: "FFFFFF" },
  NA: { fill: "9CA3AF", color: "FFFFFF" },
};

function ratingColor(rating: string | null | undefined): {
  fill: string;
  color: string;
} {
  if (!rating || !RATING_COLORS[rating])
    return { fill: "E5E7EB", color: "9CA3AF" };
  return RATING_COLORS[rating];
}

// ─── Slide 1: Cover ───────────────────────────────────────────────

function addCoverSlide(pptx: any, data: ReportData) {
  const slide = pptx.addSlide();
  const info = data.info;

  // Full navy background
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: THEME.navy },
  });

  // Amber accent bar (left side)
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.15,
    h: "100%",
    fill: { color: THEME.amber },
  });

  // Q-Insight brand top right
  slide.addText("Q-INSIGHT", {
    x: 7.5,
    y: 0.25,
    w: 2.5,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: THEME.amber,
    align: "right",
  });
  slide.addText("For Smarter Assessments", {
    x: 7.5,
    y: 0.6,
    w: 2.5,
    h: 0.25,
    fontSize: 7.5,
    color: "B4C8DC",
    align: "right",
  });

  // Main title
  slide.addText(data.assessmentName, {
    x: 0.4,
    y: 1.4,
    w: 9.0,
    h: 1.4,
    fontSize: 32,
    bold: true,
    color: THEME.white,
    wrap: true,
  });

  // Subtitle
  slide.addText("Assessment Report", {
    x: 0.4,
    y: 2.9,
    w: 6,
    h: 0.4,
    fontSize: 13,
    color: "B4C8DC",
  });

  // Amber divider
  slide.addShape(pptx.ShapeType.line, {
    x: 0.4,
    y: 3.4,
    w: 9.2,
    h: 0,
    line: { color: THEME.amber, width: 1.5 },
  });

  // Info fields left column
  const leftItems: Array<[string, string]> = [
    ["Project", info?.projectName ?? "—"],
    ["Start Date", info?.startDate ?? "—"],
    ["End Date", info?.endDate ?? "—"],
    ["Lead Assessor", info?.leadAssessor ?? "—"],
    ["Co-Assessor", info?.coAssessor ?? "—"],
  ];

  const rightItems: Array<[string, string]> = [
    ["Assessed Party", info?.assessedParty ?? "—"],
    ["Site", info?.assessedSite ?? "—"],
    ["Assessor Body", info?.assessorBody ?? "—"],
    ["Sponsor", info?.sponsor ?? "—"],
    ["Processes in Scope", String(data.processesInScope.length)],
  ];

  leftItems.forEach(([label, value], i) => {
    const y = 3.6 + i * 0.42;
    slide.addText(label, {
      x: 0.4,
      y,
      w: 1.4,
      h: 0.35,
      fontSize: 8,
      color: "B4C8DC",
      bold: true,
    });
    slide.addText(value, {
      x: 1.85,
      y,
      w: 3.5,
      h: 0.35,
      fontSize: 8.5,
      color: THEME.white,
    });
  });

  rightItems.forEach(([label, value], i) => {
    const y = 3.6 + i * 0.42;
    slide.addText(label, {
      x: 5.2,
      y,
      w: 1.5,
      h: 0.35,
      fontSize: 8,
      color: "B4C8DC",
      bold: true,
    });
    slide.addText(value, {
      x: 6.75,
      y,
      w: 3.0,
      h: 0.35,
      fontSize: 8.5,
      color: THEME.white,
    });
  });

  // Generated date bottom
  slide.addText(`Generated: ${data.generatedAt}`, {
    x: 0.4,
    y: 6.9,
    w: 9.2,
    h: 0.3,
    fontSize: 7,
    color: "6B8AAA",
    align: "center",
  });
}

// ─── Slide 2: Results Matrix ──────────────────────────────────────

function addResultsSlide(pptx: any, data: ReportData) {
  const slide = pptx.addSlide();

  // Header bar
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.85,
    fill: { color: THEME.navy },
  });

  slide.addText("Executive Summary — Assessment Results", {
    x: 0.2,
    y: 0.08,
    w: 7,
    h: 0.45,
    fontSize: 15,
    bold: true,
    color: THEME.white,
  });

  slide.addText(data.assessmentName, {
    x: 7,
    y: 0.08,
    w: 2.8,
    h: 0.45,
    fontSize: 8,
    color: "B4C8DC",
    align: "right",
  });

  // Amber accent
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0.85,
    w: "100%",
    h: 0.05,
    fill: { color: THEME.amber },
  });

  // Legend
  const legendItems: Array<[string, string, string]> = [
    ["F", "Fully (86–100%)", "00B04F"],
    ["L", "Largely (51–85%)", "92D050"],
    ["P", "Partially (16–50%)", "FFFF00"],
    ["N", "Not Achieved", "990000"],
  ];

  legendItems.forEach(([code, label, color], i) => {
    const x = 0.2 + i * 2.4;
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: 0.95,
      w: 0.25,
      h: 0.2,
      fill: { color },
    });
    slide.addText(`${code} = ${label}`, {
      x: x + 0.3,
      y: 0.95,
      w: 2.0,
      h: 0.2,
      fontSize: 7,
      color: THEME.darkText,
    });
  });

  // Table
  const tableData: any[] = [];

  // Header row
  const headerRow: any[] = [
    {
      text: "Process",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 8,
      },
    },
    {
      text: "Target",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 8,
      },
    },
    {
      text: "PA1.1",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 8,
      },
    },
    {
      text: "PA2.1",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 8,
      },
    },
    {
      text: "PA2.2",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 8,
      },
    },
    {
      text: "PA3.1",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 8,
      },
    },
    {
      text: "PA3.2",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 8,
      },
    },
    {
      text: "CL",
      options: {
        bold: true,
        fill: { color: "F59E0B" },
        color: THEME.white,
        fontSize: 8,
      },
    },
  ];
  tableData.push(headerRow);

  const getPA = (
    proc: ReportData["processes"][0],
    paId: string,
    minLevel: number,
  ): any => {
    if (proc.targetLevel < minLevel) {
      return {
        text: "—",
        options: {
          fill: { color: "E5E7EB" },
          color: "9CA3AF",
          fontSize: 8,
          align: "center",
        },
      };
    }
    const rating = proc.paRatings[paId] ?? null;
    const c = ratingColor(rating);
    return {
      text: rating ?? "—",
      options: {
        fill: { color: c.fill },
        color: c.color,
        bold: !!rating,
        fontSize: 8,
        align: "center",
      },
    };
  };

  const getCL = (proc: ReportData["processes"][0]): any => {
    const cl = proc.capabilityLevel;
    if (cl === null)
      return {
        text: "—",
        options: {
          fill: { color: "FEF3C7" },
          color: "9CA3AF",
          fontSize: 8,
          align: "center",
        },
      };
    return {
      text: String(cl),
      options: {
        fill: { color: "F59E0B" },
        color: THEME.white,
        bold: true,
        fontSize: 9,
        align: "center",
      },
    };
  };

  for (const proc of data.processes) {
    const rowBg = tableData.length % 2 === 0 ? "F8F9FC" : THEME.white;
    const row: any[] = [
      {
        text: `${proc.id}\n${proc.label}`,
        options: {
          fill: { color: rowBg },
          color: THEME.darkText,
          bold: true,
          fontSize: 7.5,
        },
      },
      {
        text: `L${proc.targetLevel}`,
        options: {
          fill: { color: rowBg },
          color: THEME.midGray,
          fontSize: 8,
          align: "center",
        },
      },
      getPA(proc, "PA1.1", 1),
      getPA(proc, "PA2.1", 2),
      getPA(proc, "PA2.2", 2),
      getPA(proc, "PA3.1", 3),
      getPA(proc, "PA3.2", 3),
      getCL(proc),
    ];
    tableData.push(row);
  }

  slide.addTable(tableData, {
    x: 0.2,
    y: 1.22,
    w: 9.6,
    h: 5.3,
    colW: [2.8, 0.6, 0.8, 0.8, 0.8, 0.8, 0.8, 0.6],
    border: { type: "solid", color: "D1D5DB", pt: 0.5 },
    autoPage: true,
    fontSize: 8,
  });
}

// ─── Slides 3+: Per-Process ───────────────────────────────────────

function addProcessSlide(pptx: any, proc: ReportData["processes"][0]) {
  const slide = pptx.addSlide();

  // Header
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: 1.0,
    fill: { color: THEME.navy },
  });

  slide.addText(`${proc.id} – ${proc.label}`, {
    x: 0.2,
    y: 0.08,
    w: 8,
    h: 0.5,
    fontSize: 14,
    bold: true,
    color: THEME.white,
  });

  const clText =
    proc.capabilityLevel !== null ? `CL: ${proc.capabilityLevel}` : "CL: —";
  slide.addText(`Target: L${proc.targetLevel}   |   ${clText}`, {
    x: 0.2,
    y: 0.62,
    w: 6,
    h: 0.3,
    fontSize: 8.5,
    color: "B4C8DC",
  });

  // Amber accent
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 1.0,
    w: "100%",
    h: 0.05,
    fill: { color: THEME.amber },
  });

  // PA ratings row
  const paIds = ["PA1.1"];
  if (proc.targetLevel >= 2) paIds.push("PA2.1", "PA2.2");
  if (proc.targetLevel >= 3) paIds.push("PA3.1", "PA3.2");

  let paX = 0.2;
  const paBoxW = 1.4;
  for (const paId of paIds) {
    const rating = proc.paRatings[paId] ?? null;
    const c = ratingColor(rating);

    slide.addShape(pptx.ShapeType.rect, {
      x: paX,
      y: 1.1,
      w: paBoxW,
      h: 0.5,
      fill: { color: rating ? c.fill : "E5E7EB" },
      line: { color: "D1D5DB", width: 0.5 },
    });
    slide.addText(`${paId}\n${rating ?? "—"}`, {
      x: paX,
      y: 1.1,
      w: paBoxW,
      h: 0.5,
      fontSize: 8.5,
      bold: true,
      color: rating ? c.color : "9CA3AF",
      align: "center",
      valign: "middle",
    });
    paX += paBoxW + 0.1;
  }

  // Collect all strengths and weaknesses
  const allPractices = [
    ...proc.bpDetails,
    ...proc.gpGroups.flatMap((g) => g.practices),
  ];

  const allStrengths = allPractices
    .filter((p) => p.strengths)
    .map((p) => `[${p.id}] ${p.strengths}`)
    .join("\n");

  const allWeaknesses = allPractices
    .filter((p) => p.weaknesses)
    .map((p) => `[${p.id}] ${p.weaknesses}`)
    .join("\n");

  // Two-column layout: Ratings table | Key Findings
  const leftW = 5.6;
  const rightW = 3.8;
  const contentY = 1.7;

  // Left: Ratings table (BPs)
  slide.addText("Ratings Summary", {
    x: 0.2,
    y: contentY,
    w: leftW,
    h: 0.28,
    fontSize: 8.5,
    bold: true,
    color: THEME.navy,
  });

  const ratingTableData: any[] = [];
  ratingTableData.push([
    {
      text: "Practice",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 7,
      },
    },
    {
      text: "Title (abbreviated)",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 7,
      },
    },
    {
      text: "Rating",
      options: {
        bold: true,
        fill: { color: THEME.navyLight },
        color: THEME.white,
        fontSize: 7,
        align: "center",
      },
    },
  ]);

  // Show BPs
  for (const bp of proc.bpDetails) {
    const c = ratingColor(bp.rating);
    const rowBg = ratingTableData.length % 2 === 0 ? "F8F9FC" : THEME.white;
    ratingTableData.push([
      {
        text: bp.id,
        options: {
          fill: { color: rowBg },
          color: THEME.darkText,
          bold: true,
          fontSize: 6.5,
        },
      },
      {
        text: bp.title.length > 45 ? `${bp.title.slice(0, 42)}...` : bp.title,
        options: {
          fill: { color: rowBg },
          color: THEME.darkText,
          fontSize: 6.5,
        },
      },
      {
        text: bp.rating ?? "—",
        options: {
          fill: { color: bp.rating ? c.fill : "E5E7EB" },
          color: bp.rating ? c.color : "9CA3AF",
          bold: !!bp.rating,
          fontSize: 7,
          align: "center",
        },
      },
    ]);
  }

  // Show first GP group if any
  if (proc.gpGroups.length > 0) {
    const firstGroup = proc.gpGroups[0];
    ratingTableData.push([
      {
        text: firstGroup.paName,
        options: {
          fill: { color: THEME.navy },
          color: THEME.white,
          bold: true,
          fontSize: 6.5,
          colspan: 3,
        },
      },
      { text: "", options: {} },
      { text: "", options: {} },
    ]);
    for (const gp of firstGroup.practices.slice(0, 4)) {
      const c = ratingColor(gp.rating);
      const rowBg = ratingTableData.length % 2 === 0 ? "F8F9FC" : THEME.white;
      ratingTableData.push([
        {
          text: gp.id,
          options: {
            fill: { color: rowBg },
            color: THEME.darkText,
            bold: true,
            fontSize: 6.5,
          },
        },
        {
          text: gp.title.length > 45 ? `${gp.title.slice(0, 42)}...` : gp.title,
          options: {
            fill: { color: rowBg },
            color: THEME.darkText,
            fontSize: 6.5,
          },
        },
        {
          text: gp.rating ?? "—",
          options: {
            fill: { color: gp.rating ? c.fill : "E5E7EB" },
            color: gp.rating ? c.color : "9CA3AF",
            bold: !!gp.rating,
            fontSize: 7,
            align: "center",
          },
        },
      ]);
    }
  }

  slide.addTable(ratingTableData, {
    x: 0.2,
    y: contentY + 0.32,
    w: leftW,
    h: 4.5,
    colW: [1.3, 3.5, 0.8],
    border: { type: "solid", color: "D1D5DB", pt: 0.5 },
    fontSize: 7,
    autoPage: false,
  });

  // Right: Key Findings
  const findingsX = 0.2 + leftW + 0.15;

  slide.addText("Key Findings", {
    x: findingsX,
    y: contentY,
    w: rightW,
    h: 0.28,
    fontSize: 8.5,
    bold: true,
    color: THEME.navy,
  });

  // Strengths section
  slide.addShape(pptx.ShapeType.rect, {
    x: findingsX,
    y: contentY + 0.3,
    w: rightW,
    h: 0.25,
    fill: { color: "DCFCE7" },
  });
  slide.addText("✓  Strengths", {
    x: findingsX,
    y: contentY + 0.3,
    w: rightW,
    h: 0.25,
    fontSize: 7.5,
    bold: true,
    color: "166534",
  });

  const strengthsText = allStrengths || "No strengths recorded.";
  slide.addText(strengthsText.slice(0, 600), {
    x: findingsX,
    y: contentY + 0.58,
    w: rightW,
    h: 2.1,
    fontSize: 6.5,
    color: THEME.darkText,
    wrap: true,
    valign: "top",
    line: { color: "BBF7D0", width: 1 },
  });

  // Weaknesses section
  slide.addShape(pptx.ShapeType.rect, {
    x: findingsX,
    y: contentY + 2.78,
    w: rightW,
    h: 0.25,
    fill: { color: "FEE2E2" },
  });
  slide.addText("✗  Weaknesses", {
    x: findingsX,
    y: contentY + 2.78,
    w: rightW,
    h: 0.25,
    fontSize: 7.5,
    bold: true,
    color: "991B1B",
  });

  const weaknessesText = allWeaknesses || "No weaknesses recorded.";
  slide.addText(weaknessesText.slice(0, 600), {
    x: findingsX,
    y: contentY + 3.06,
    w: rightW,
    h: 2.0,
    fontSize: 6.5,
    color: THEME.darkText,
    wrap: true,
    valign: "top",
    line: { color: "FECACA", width: 1 },
  });
}

// ─── Main Export Function ────────────────────────────────────────

export function exportToPpt(data: ReportData): void {
  const PptxGenJSCtor = getPptx();
  if (!PptxGenJSCtor) {
    alert("PowerPoint export library not loaded. Please try again.");
    return;
  }

  const pptx = new PptxGenJSCtor();

  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Q-Insight";
  pptx.company = "Q-Insight";
  pptx.subject = `Assessment Report: ${data.assessmentName}`;
  pptx.title = `Q-Insight — ${data.assessmentName}`;

  // Slide 1: Cover
  addCoverSlide(pptx, data);

  // Slide 2: Results Matrix
  addResultsSlide(pptx, data);

  // Slide 3+: Per-process
  for (const proc of data.processes) {
    addProcessSlide(pptx, proc);
  }

  const fileName = `QInsight-${data.assessmentName.replace(/[^a-z0-9]/gi, "_")}-Report.pptx`;
  pptx.writeFile({ fileName });
}
