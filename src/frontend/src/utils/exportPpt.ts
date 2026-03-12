/**
 * exportPpt.ts
 * PowerPoint (.pptx) export for Q-Insight assessment reports.
 * Slide order:
 *  1. Cover (assessment/project name + all assessors)
 *  2. Assessment Information (all info fields)
 *  3. Condensed Results Summary (process + CL + PA overall ratings)
 *  4. Full Results Matrix (all processes with PA ratings, autoPage)
 *  5. Global Strengths
 *  6. Global Weaknesses
 *  7+. Per-Process slides (findings by type, paginated — no summary box)
 */

import PptxGenJS from "pptxgenjs";
import type { ReportData } from "./reportData";

// ─── Theme ─────────────────────────────────────────────────────

const T = {
  navy: "0F1F3D",
  navyMid: "1E3A71",
  amber: "F59E0B",
  white: "FFFFFF",
  lightBg: "F5F7FA",
  darkText: "1E232D",
  midGray: "6B7280",
  lightGray: "E5E7EB",
  green: "166534",
  greenBg: "DCFCE7",
  red: "991B1B",
  redBg: "FEE2E2",
  blueBg: "DBEAFE",
  blueText: "1E40AF",
};

const RATING_COLORS: Record<string, { fill: string; text: string }> = {
  F: { fill: "00B04F", text: "000000" },
  L: { fill: "92D050", text: "000000" },
  P: { fill: "FFFF00", text: "000000" },
  N: { fill: "990000", text: "FFFFFF" },
};

function rc(rating: string | null | undefined): { fill: string; text: string } {
  if (!rating || !RATING_COLORS[rating])
    return { fill: "E5E7EB", text: "9CA3AF" };
  return RATING_COLORS[rating];
}

function slideHeader(
  pptx: PptxGenJS,
  slide: PptxGenJS.Slide,
  title: string,
  subtitle?: string,
) {
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: 0.82,
    fill: { color: T.navy },
  });
  slide.addText(title, {
    x: 0.25,
    y: 0.07,
    w: 8.5,
    h: 0.45,
    fontSize: 15,
    bold: true,
    color: T.white,
  });
  if (subtitle) {
    slide.addText(subtitle, {
      x: 0.25,
      y: 0.54,
      w: 9.0,
      h: 0.22,
      fontSize: 8,
      color: "B4C8DC",
    });
  }
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0.82,
    w: "100%",
    h: 0.04,
    fill: { color: T.amber },
  });
}

// ─── Slide 1: Cover ─────────────────────────────────────────────

function addCoverSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide();
  const info = data.info;

  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: "100%",
    h: "100%",
    fill: { color: T.navy },
  });
  slide.addShape(pptx.ShapeType.rect, {
    x: 0,
    y: 0,
    w: 0.18,
    h: "100%",
    fill: { color: T.amber },
  });

  slide.addText("Q-INSIGHT", {
    x: 7.2,
    y: 0.22,
    w: 2.8,
    h: 0.35,
    fontSize: 11,
    bold: true,
    color: T.amber,
    align: "right",
  });
  slide.addText("For Smarter Assessments", {
    x: 7.2,
    y: 0.58,
    w: 2.8,
    h: 0.22,
    fontSize: 7.5,
    color: "B4C8DC",
    align: "right",
  });

  const mainTitle = info?.projectName?.trim() || data.assessmentName;
  slide.addText(mainTitle, {
    x: 0.4,
    y: 1.3,
    w: 9.3,
    h: 1.4,
    fontSize: 30,
    bold: true,
    color: T.white,
    wrap: true,
  });

  slide.addText("Assessment Report", {
    x: 0.4,
    y: 2.8,
    w: 6,
    h: 0.4,
    fontSize: 12,
    color: "B4C8DC",
  });

  const assessorParts: string[] = [];
  if (info?.leadAssessor?.trim())
    assessorParts.push(`Lead: ${info.leadAssessor}`);
  if (info?.coAssessor?.trim())
    assessorParts.push(`Co-Assessor: ${info.coAssessor}`);
  if (info?.sponsor?.trim()) assessorParts.push(`Sponsor: ${info.sponsor}`);
  if (assessorParts.length > 0) {
    slide.addText(assessorParts.join("   |   "), {
      x: 0.4,
      y: 3.25,
      w: 9.3,
      h: 0.3,
      fontSize: 9,
      color: "92C5E8",
    });
  }

  slide.addShape(pptx.ShapeType.line, {
    x: 0.4,
    y: 3.65,
    w: 9.3,
    h: 0,
    line: { color: T.amber, width: 1.5 },
  });

  const leftItems: [string, string][] = [
    ["Project", info?.projectName ?? "—"],
    ["Assessment", data.assessmentName],
    ["Start Date", info?.startDate ?? "—"],
    ["End Date", info?.endDate ?? "—"],
    ["Lead Assessor", info?.leadAssessor ?? "—"],
  ];
  const rightItems: [string, string][] = [
    ["Assessed Party", info?.assessedParty ?? "—"],
    ["Site", info?.assessedSite ?? "—"],
    ["Assessor Body", info?.assessorBody ?? "—"],
    ["Co-Assessor", info?.coAssessor ?? "—"],
    ["Processes in Scope", String(data.processesInScope.length)],
  ];

  leftItems.forEach(([label, value], i) => {
    const y = 3.8 + i * 0.4;
    slide.addText(label, {
      x: 0.4,
      y,
      w: 1.5,
      h: 0.32,
      fontSize: 7.5,
      color: "B4C8DC",
      bold: true,
    });
    slide.addText(value || "—", {
      x: 1.95,
      y,
      w: 3.4,
      h: 0.32,
      fontSize: 8,
      color: T.white,
    });
  });
  rightItems.forEach(([label, value], i) => {
    const y = 3.8 + i * 0.4;
    slide.addText(label, {
      x: 5.5,
      y,
      w: 1.5,
      h: 0.32,
      fontSize: 7.5,
      color: "B4C8DC",
      bold: true,
    });
    slide.addText(value || "—", {
      x: 7.05,
      y,
      w: 3.0,
      h: 0.32,
      fontSize: 8,
      color: T.white,
    });
  });

  slide.addText(`Generated: ${data.generatedAt}`, {
    x: 0.4,
    y: 7.1,
    w: 9.3,
    h: 0.28,
    fontSize: 7,
    color: "5A7A9A",
    align: "center",
  });
}

// ─── Slide 2: Assessment Information ───────────────────────────

function addAssessmentInfoSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide();
  const info = data.info;
  slideHeader(pptx, slide, "Assessment Information", data.assessmentName);

  if (!info) {
    slide.addText("No assessment information available.", {
      x: 0.25,
      y: 1.0,
      w: 9.5,
      h: 0.5,
      fontSize: 10,
      color: T.midGray,
    });
    return;
  }

  const leftFields: [string, string][] = [
    ["Project Name", info.projectName],
    ["Assessed Party", info.assessedParty],
    ["Assessed Site", info.assessedSite],
    ["Unit / Department", info.unitDepartment],
    ["Start Date", info.startDate],
    ["End Date", info.endDate],
    ["Lead Assessor", info.leadAssessor],
    ["Co-Assessor", info.coAssessor],
    ["Sponsor", info.sponsor],
    ["Assessor Body", info.assessorBody],
  ];
  const rightFields: [string, string][] = [
    ["INTACS ID", info.intacsId],
    ["PAM Version", info.pamVersion],
    ["VDA Version", info.vdaVersion],
    ["Assessment Class", info.assessmentClass],
    ["Target CL", info.targetCapabilityLevel],
    ["Functional Safety", info.functionalSafetyLevel],
    ["Cybersecurity Level", info.cybersecurityLevel],
    ["Model-Based Dev", info.modelBasedDev ? "Yes" : "No"],
    ["Agile Environments", info.agileEnvironments ? "Yes" : "No"],
    ["Dev External", info.developmentExternal ? "Yes" : "No"],
  ];

  const startY = 0.95;
  const rowH = 0.38;

  leftFields.forEach(([label, value], i) => {
    const y = startY + i * rowH;
    const rowBg = i % 2 === 0 ? "F8F9FC" : T.white;
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.2,
      y,
      w: 4.6,
      h: rowH - 0.03,
      fill: { color: rowBg },
    });
    slide.addText(label, {
      x: 0.25,
      y: y + 0.04,
      w: 1.5,
      h: rowH - 0.1,
      fontSize: 8,
      color: T.midGray,
      bold: true,
    });
    slide.addText(value || "—", {
      x: 1.8,
      y: y + 0.04,
      w: 2.9,
      h: rowH - 0.1,
      fontSize: 8.5,
      color: T.darkText,
    });
  });

  rightFields.forEach(([label, value], i) => {
    const y = startY + i * rowH;
    const rowBg = i % 2 === 0 ? "F8F9FC" : T.white;
    slide.addShape(pptx.ShapeType.rect, {
      x: 5.1,
      y,
      w: 4.7,
      h: rowH - 0.03,
      fill: { color: rowBg },
    });
    slide.addText(label, {
      x: 5.15,
      y: y + 0.04,
      w: 1.6,
      h: rowH - 0.1,
      fontSize: 8,
      color: T.midGray,
      bold: true,
    });
    slide.addText(value || "—", {
      x: 6.8,
      y: y + 0.04,
      w: 2.9,
      h: rowH - 0.1,
      fontSize: 8.5,
      color: T.darkText,
    });
  });

  if (info.projectScope) {
    const y = startY + leftFields.length * rowH;
    slide.addText("Project Scope:", {
      x: 0.25,
      y,
      w: 1.5,
      h: 0.28,
      fontSize: 8,
      color: T.midGray,
      bold: true,
    });
    slide.addText(info.projectScope, {
      x: 0.25,
      y: y + 0.28,
      w: 9.5,
      h: 0.55,
      fontSize: 8,
      color: T.darkText,
      wrap: true,
    });
  }

  if (info.additionalRemarks) {
    const y = startY + leftFields.length * rowH + (info.projectScope ? 0.9 : 0);
    slide.addText("Remarks:", {
      x: 0.25,
      y,
      w: 1.5,
      h: 0.28,
      fontSize: 8,
      color: T.midGray,
      bold: true,
    });
    slide.addText(info.additionalRemarks, {
      x: 0.25,
      y: y + 0.28,
      w: 9.5,
      h: 0.45,
      fontSize: 8,
      color: T.darkText,
      wrap: true,
    });
  }
}

// ─── Slide 3: Condensed Results Summary ────────────────────────

function addCondensedResultsSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide();
  slideHeader(
    pptx,
    slide,
    "Assessment Results Summary",
    `${data.processesInScope.length} processes in scope`,
  );

  const legendItems: [string, string, string][] = [
    ["F", "Fully (86–100%)", "00B04F"],
    ["L", "Largely (51–85%)", "92D050"],
    ["P", "Partially (16–50%)", "FFFF00"],
    ["N", "Not Achieved (0–15%)", "990000"],
  ];
  legendItems.forEach(([code, label, color], i) => {
    const x = 0.25 + i * 2.38;
    slide.addShape(pptx.ShapeType.rect, {
      x,
      y: 0.92,
      w: 0.22,
      h: 0.18,
      fill: { color },
    });
    slide.addText(`${code} = ${label}`, {
      x: x + 0.27,
      y: 0.92,
      w: 2.0,
      h: 0.18,
      fontSize: 7,
      color: T.darkText,
    });
  });

  const tableData: any[] = [];
  const hdOpts = (text: string, bg = T.navyMid) => ({
    text,
    options: {
      bold: true,
      fill: { color: bg },
      color: T.white,
      fontSize: 8,
      align: "center" as const,
    },
  });

  tableData.push([
    hdOpts("Process", T.navy),
    hdOpts("Target"),
    hdOpts("PA 1.1"),
    hdOpts("PA 2.1"),
    hdOpts("PA 2.2"),
    hdOpts("PA 3.1"),
    hdOpts("PA 3.2"),
    hdOpts("CL", "D97706"),
  ]);

  for (const proc of data.processes) {
    const rowBg = tableData.length % 2 === 0 ? "F8F9FC" : T.white;
    const mkPA = (paId: string, minLvl: number) => {
      if (proc.targetLevel < minLvl)
        return {
          text: "—",
          options: {
            fill: { color: "E5E7EB" },
            color: "9CA3AF",
            fontSize: 8,
            align: "center" as const,
          },
        };
      const r = proc.paRatings[paId] ?? null;
      const c = rc(r);
      return {
        text: r ?? "—",
        options: {
          fill: { color: c.fill },
          color: c.text,
          bold: !!r,
          fontSize: 8,
          align: "center" as const,
        },
      };
    };
    const cl = proc.capabilityLevel;
    tableData.push([
      {
        text: `${proc.id}\n${proc.label}`,
        options: {
          fill: { color: rowBg },
          color: T.darkText,
          bold: true,
          fontSize: 7.5,
        },
      },
      {
        text: `L${proc.targetLevel}`,
        options: {
          fill: { color: rowBg },
          color: T.midGray,
          fontSize: 8,
          align: "center" as const,
        },
      },
      mkPA("PA1.1", 1),
      mkPA("PA2.1", 2),
      mkPA("PA2.2", 2),
      mkPA("PA3.1", 3),
      mkPA("PA3.2", 3),
      cl === null
        ? {
            text: "—",
            options: {
              fill: { color: "FEF3C7" },
              color: "9CA3AF",
              fontSize: 8,
              align: "center" as const,
            },
          }
        : {
            text: String(cl),
            options: {
              fill: { color: "F59E0B" },
              color: T.white,
              bold: true,
              fontSize: 9,
              align: "center" as const,
            },
          },
    ]);
  }

  slide.addTable(tableData, {
    x: 0.2,
    y: 1.18,
    w: 9.6,
    h: 5.7,
    colW: [3.0, 0.55, 0.75, 0.75, 0.75, 0.75, 0.75, 0.6],
    border: { type: "solid", color: "D1D5DB", pt: 0.5 },
    autoPage: true,
    fontSize: 8,
  });
}

// ─── Slide 4: Full Results Matrix ───────────────────────────────

function addFullMatrixSlide(pptx: PptxGenJS, data: ReportData) {
  if (data.processes.length === 0) return;
  const slide = pptx.addSlide();
  slideHeader(
    pptx,
    slide,
    "Full Results Matrix",
    "All practices with individual ratings",
  );

  const tableData: any[] = [];
  const hdr = (text: string, bg = T.navyMid, color = T.white, fs = 7) => ({
    text,
    options: {
      bold: true,
      fill: { color: bg },
      color,
      fontSize: fs,
      align: "center" as const,
    },
  });

  tableData.push([
    hdr("Process", T.navy, T.white, 8),
    hdr("Level", T.navy),
    hdr("Practice ID", T.navy),
    hdr("Practice Title", T.navy),
    hdr("Rating", T.navy),
  ]);

  for (const proc of data.processes) {
    tableData.push([
      {
        text: `${proc.id} – ${proc.label}`,
        options: {
          bold: true,
          fill: { color: T.navyMid },
          color: T.white,
          fontSize: 8,
          colspan: 5,
        },
      },
      { text: "", options: {} },
      { text: "", options: {} },
      { text: "", options: {} },
      { text: "", options: {} },
    ]);

    const pa11 = proc.paRatings["PA1.1"];
    const cPA11 = rc(pa11);
    tableData.push([
      {
        text: "PA 1.1",
        options: {
          bold: true,
          fill: { color: "E0E7FF" },
          color: "3730A3",
          fontSize: 7,
          colspan: 3,
        },
      },
      { text: "", options: {} },
      { text: "", options: {} },
      {
        text: "Overall",
        options: {
          fill: { color: "E0E7FF" },
          color: "3730A3",
          fontSize: 7,
          align: "right" as const,
        },
      },
      {
        text: pa11 ?? "—",
        options: {
          fill: { color: cPA11.fill },
          color: cPA11.text,
          bold: !!pa11,
          fontSize: 8,
          align: "center" as const,
        },
      },
    ]);

    for (const bp of proc.bpDetails) {
      const c = rc(bp.rating);
      const rowBg = tableData.length % 2 === 0 ? "F8F9FC" : T.white;
      tableData.push([
        { text: "", options: { fill: { color: rowBg } } },
        {
          text: "BP",
          options: {
            fill: { color: rowBg },
            color: T.midGray,
            fontSize: 7,
            align: "center" as const,
          },
        },
        {
          text: bp.id,
          options: {
            fill: { color: rowBg },
            color: T.darkText,
            bold: true,
            fontSize: 7,
          },
        },
        {
          text: bp.title.length > 60 ? `${bp.title.slice(0, 57)}...` : bp.title,
          options: { fill: { color: rowBg }, color: T.darkText, fontSize: 7 },
        },
        {
          text: bp.rating ?? "—",
          options: {
            fill: { color: bp.rating ? c.fill : "E5E7EB" },
            color: bp.rating ? c.text : "9CA3AF",
            bold: !!bp.rating,
            fontSize: 8,
            align: "center" as const,
          },
        },
      ]);
    }

    for (const gpGroup of proc.gpGroups) {
      const paId = gpGroup.paId;
      const paRating = proc.paRatings[paId];
      const cPA = rc(paRating);
      tableData.push([
        {
          text: `${paId} – ${gpGroup.paName}`,
          options: {
            bold: true,
            fill: { color: "E0E7FF" },
            color: "3730A3",
            fontSize: 7,
            colspan: 3,
          },
        },
        { text: "", options: {} },
        { text: "", options: {} },
        {
          text: "Overall",
          options: {
            fill: { color: "E0E7FF" },
            color: "3730A3",
            fontSize: 7,
            align: "right" as const,
          },
        },
        {
          text: paRating ?? "—",
          options: {
            fill: { color: cPA.fill },
            color: cPA.text,
            bold: !!paRating,
            fontSize: 8,
            align: "center" as const,
          },
        },
      ]);
      for (const gp of gpGroup.practices) {
        const c = rc(gp.rating);
        const rowBg = tableData.length % 2 === 0 ? "F8F9FC" : T.white;
        tableData.push([
          { text: "", options: { fill: { color: rowBg } } },
          {
            text: "GP",
            options: {
              fill: { color: rowBg },
              color: T.midGray,
              fontSize: 7,
              align: "center" as const,
            },
          },
          {
            text: gp.id,
            options: {
              fill: { color: rowBg },
              color: T.darkText,
              bold: true,
              fontSize: 7,
            },
          },
          {
            text:
              gp.title.length > 60 ? `${gp.title.slice(0, 57)}...` : gp.title,
            options: { fill: { color: rowBg }, color: T.darkText, fontSize: 7 },
          },
          {
            text: gp.rating ?? "—",
            options: {
              fill: { color: gp.rating ? c.fill : "E5E7EB" },
              color: gp.rating ? c.text : "9CA3AF",
              bold: !!gp.rating,
              fontSize: 8,
              align: "center" as const,
            },
          },
        ]);
      }
    }
  }

  slide.addTable(tableData, {
    x: 0.2,
    y: 0.95,
    w: 9.6,
    h: 6.5,
    colW: [2.0, 0.5, 1.4, 4.7, 0.7],
    border: { type: "solid", color: "D1D5DB", pt: 0.5 },
    autoPage: true,
    fontSize: 7,
  });
}

// ─── Slide 5: Global Strengths ──────────────────────────────────

function addGlobalStrengthsSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide();
  slideHeader(pptx, slide, "Global Strengths", data.assessmentName);

  const items = data.globalStrengths.filter((s) => s.trim());
  if (items.length === 0) {
    slide.addText("No global strengths recorded.", {
      x: 0.25,
      y: 1.1,
      w: 9.5,
      h: 0.4,
      fontSize: 10,
      color: T.midGray,
      italic: true,
    });
    return;
  }

  items.forEach((item, i) => {
    const y = 1.05 + i * 0.46;
    slide.addText(`${i + 1}.  ${item}`, {
      x: 0.3,
      y,
      w: 9.4,
      h: 0.38,
      fontSize: 9.5,
      color: T.darkText,
      wrap: true,
      valign: "middle",
    });
  });
}

// ─── Slide 6: Global Weaknesses ────────────────────────────────

function addGlobalWeaknessesSlide(pptx: PptxGenJS, data: ReportData) {
  const slide = pptx.addSlide();
  slideHeader(pptx, slide, "Global Weaknesses", data.assessmentName);

  const items = data.globalWeaknesses.filter((s) => s.trim());
  if (items.length === 0) {
    slide.addText("No global weaknesses recorded.", {
      x: 0.25,
      y: 1.1,
      w: 9.5,
      h: 0.4,
      fontSize: 10,
      color: T.midGray,
      italic: true,
    });
    return;
  }

  items.forEach((item, i) => {
    const y = 1.05 + i * 0.46;
    slide.addText(`${i + 1}.  ${item}`, {
      x: 0.3,
      y,
      w: 9.4,
      h: 0.38,
      fontSize: 9.5,
      color: T.darkText,
      wrap: true,
      valign: "middle",
    });
  });
}

// ─── Slides 7+: Per-Process ─────────────────────────────────────

interface FindingItem {
  text: string;
  ref: string;
  type: "strength" | "weakness" | "suggestion";
}

function collectFindings(proc: ReportData["processes"][0]): FindingItem[] {
  const items: FindingItem[] = [];
  const allPractices = [
    ...proc.bpDetails,
    ...proc.gpGroups.flatMap((g) => g.practices),
  ];
  for (const p of allPractices) {
    if (p.strengths) {
      for (const raw of p.strengths.split("\n")) {
        const text = raw.trim();
        if (text) items.push({ text, ref: p.id, type: "strength" });
      }
    }
    if (p.weaknesses) {
      for (const raw of p.weaknesses.split("\n")) {
        const text = raw.trim();
        if (text) items.push({ text, ref: p.id, type: "weakness" });
      }
    }
    if (p.suggestions) {
      for (const raw of p.suggestions.split("\n")) {
        const text = raw.trim();
        if (text) items.push({ text, ref: p.id, type: "suggestion" });
      }
    }
  }
  return items;
}

function addProcessSlides(pptx: PptxGenJS, proc: ReportData["processes"][0]) {
  const allFindings = collectFindings(proc);

  const ITEMS_PER_PAGE = 16;
  const totalPages = Math.max(
    1,
    Math.ceil(allFindings.length / ITEMS_PER_PAGE),
  );

  for (let page = 0; page < totalPages; page++) {
    const slide = pptx.addSlide();
    const pageFindings = allFindings.slice(
      page * ITEMS_PER_PAGE,
      (page + 1) * ITEMS_PER_PAGE,
    );
    const pageTitle =
      totalPages > 1
        ? `${proc.id} \u2013 ${proc.label} (${page + 1}/${totalPages})`
        : `${proc.id} \u2013 ${proc.label}`;
    const subtitle = `Target: L${proc.targetLevel}   |   CL: ${
      proc.capabilityLevel !== null ? proc.capabilityLevel : "—"
    }`;

    slideHeader(pptx, slide, pageTitle, subtitle);

    const findX = 0.2;
    const findW = 9.6;
    let findY = 0.92;

    const pageStrengths = pageFindings.filter((f) => f.type === "strength");
    const pageWeaknesses = pageFindings.filter((f) => f.type === "weakness");
    const pageSuggestions = pageFindings.filter((f) => f.type === "suggestion");

    if (allFindings.length === 0) {
      slide.addText("No findings recorded for this process.", {
        x: findX,
        y: findY + 0.3,
        w: findW,
        h: 0.4,
        fontSize: 9,
        color: T.midGray,
        italic: true,
      });
      continue;
    }

    function renderSection(sectionTitle: string, items: FindingItem[]) {
      if (items.length === 0) return;

      // Section heading — plain, bold, dark text
      slide.addText(sectionTitle, {
        x: findX,
        y: findY,
        w: findW,
        h: 0.28,
        fontSize: 10,
        bold: true,
        color: T.darkText,
      });
      findY += 0.32;

      for (const item of items) {
        const maxTextLen = 130;
        const displayText =
          item.text.length > maxTextLen
            ? `${item.text.slice(0, maxTextLen)}...`
            : item.text;
        const refText = `[${item.ref}]`;

        slide.addText(
          [
            {
              text: `\u2022  ${displayText}  `,
              options: { color: T.darkText },
            },
            { text: refText, options: { color: T.midGray, bold: true } },
          ],
          {
            x: findX + 0.15,
            y: findY,
            w: findW - 0.15,
            h: 0.32,
            fontSize: 9,
            wrap: true,
            valign: "middle",
          },
        );
        findY += 0.34;
      }
      findY += 0.12;
    }

    renderSection("Strengths", pageStrengths);
    renderSection("Weaknesses", pageWeaknesses);
    renderSection("Suggestions", pageSuggestions);
  }
}

// ─── Main Export ─────────────────────────────────────────────────

export async function exportToPpt(data: ReportData): Promise<void> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Q-Insight";
  pptx.company = "Q-Insight";
  pptx.subject = `Assessment Report: ${data.assessmentName}`;
  pptx.title = `Q-Insight — ${data.assessmentName}`;

  addCoverSlide(pptx, data);
  addAssessmentInfoSlide(pptx, data);
  addCondensedResultsSlide(pptx, data);
  addFullMatrixSlide(pptx, data);
  addGlobalStrengthsSlide(pptx, data);
  addGlobalWeaknessesSlide(pptx, data);

  for (const proc of data.processes) {
    addProcessSlides(pptx, proc);
  }

  const fileName = `QInsight-${data.assessmentName.replace(/[^a-z0-9]/gi, "_")}-Report.pptx`;
  await pptx.writeFile({ fileName });
}
