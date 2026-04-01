/**
 * exportPpt.ts
 * PowerPoint (.pptx) export — Infineon template design.
 *
 * pptxgenjs is loaded dynamically from CDN (not bundled) to avoid
 * requiring it in package.json.
 */

import type { ReportData } from "./reportData";

// ─── CDN loader ──────────────────────────────────────────────
async function loadPptxGenJS(): Promise<any> {
  if ((window as any).PptxGenJS) return (window as any).PptxGenJS;
  return new Promise((resolve, reject) => {
    const existing = document.getElementById("pptxgenjs-cdn");
    if (existing) {
      existing.addEventListener("load", () =>
        resolve((window as any).PptxGenJS),
      );
      return;
    }
    const script = document.createElement("script");
    script.id = "pptxgenjs-cdn";
    script.src =
      "https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js";
    script.onload = () => resolve((window as any).PptxGenJS);
    script.onerror = () =>
      reject(new Error("Failed to load pptxgenjs from CDN"));
    document.head.appendChild(script);
  });
}

// ─── Theme colours ────────────────────────────────────────────
const TEAL = "1A8C7A";
const TEAL_HDR = "2E8B7E";
const ROW_DARK = "B8CECA";
const ROW_LIGHT = "D8E8E6";
const WHITE = "FFFFFF";
const DARK_TEXT = "1A1A1A";
const GRAY_TEXT = "555555";
const FOOTER_C = "666666";
const FOOTER_BOLD = "222222";

const RATING_COLORS: Record<string, { fill: string; text: string }> = {
  F: { fill: "00B04F", text: "000000" },
  L: { fill: "92D050", text: "000000" },
  P: { fill: "FFFF00", text: "000000" },
  N: { fill: "990000", text: "FFFFFF" },
};
function rc(r?: string | null) {
  return r && RATING_COLORS[r]
    ? RATING_COLORS[r]
    : { fill: "F3F4F6", text: "9CA3AF" };
}

// ─── Image helpers ───────────────────────────────────────────
async function fetchBase64(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// ─── Shared helpers ──────────────────────────────────────────
function addLogo(
  slide: any,
  b64: string,
  x = 11.2,
  y = 0.1,
  w = 2.0,
  h = 0.65,
) {
  if (!b64) return;
  slide.addImage({ data: b64, x, y, w, h });
}

function addFooter(slide: any, dateStr: string, pageNum: number) {
  slide.addText(dateStr, {
    x: 0.25,
    y: 7.1,
    w: 1.5,
    h: 0.22,
    fontSize: 7,
    color: FOOTER_BOLD,
    fontFace: "Calibri",
  });
  slide.addText("restricted", {
    x: 1.85,
    y: 7.1,
    w: 1.1,
    h: 0.22,
    fontSize: 7,
    color: FOOTER_BOLD,
    bold: true,
    fontFace: "Calibri",
  });
  slide.addText(
    "Copyright \u00A9 Infineon Technologies AG 2024. All rights reserved.",
    {
      x: 3.2,
      y: 7.1,
      w: 7.5,
      h: 0.22,
      fontSize: 7,
      color: FOOTER_C,
      align: "center",
      fontFace: "Calibri",
    },
  );
  slide.addText(String(pageNum), {
    x: 12.5,
    y: 7.1,
    w: 0.65,
    h: 0.22,
    fontSize: 7,
    color: FOOTER_C,
    align: "right",
    fontFace: "Calibri",
  });
}

function addSlideTitle(slide: any, title: string) {
  slide.addText(title, {
    x: 0.35,
    y: 0.18,
    w: 10.6,
    h: 0.7,
    fontSize: 22,
    bold: true,
    color: TEAL,
    fontFace: "Calibri",
  });
}

// ─── Slide 1 — Cover ──────────────────────────────────────────
function addCoverSlide(
  pptx: any,
  data: ReportData,
  bgBase64: string,
  logoBase64: string,
) {
  const slide = pptx.addSlide();
  const info = data.info;

  if (bgBase64) {
    slide.addImage({ data: bgBase64, x: 0, y: 0, w: 13.33, h: 7.5 });
  } else {
    slide.addShape("rect", {
      x: 0,
      y: 0,
      w: 13.33,
      h: 4.0,
      fill: { color: "0A7B6E" },
    });
  }

  slide.addShape("rect", {
    x: 0,
    y: 4.0,
    w: 13.33,
    h: 3.5,
    fill: { color: WHITE },
  });

  const title = info?.projectName?.trim() || data.assessmentName;
  slide.addText(title, {
    x: 0.5,
    y: 4.1,
    w: 9.0,
    h: 0.9,
    fontSize: 30,
    bold: true,
    color: TEAL,
    fontFace: "Calibri",
    wrap: true,
  });

  const projId = info?.intacsId?.trim() || "";
  if (projId) {
    slide.addText(`Project ID: ${projId}`, {
      x: 0.5,
      y: 5.05,
      w: 8.5,
      h: 0.45,
      fontSize: 14,
      color: TEAL,
      fontFace: "Calibri",
    });
  }

  // Build co-assessor lines for cover
  const coverLines: string[] = [];
  if (info?.leadAssessor?.trim()) coverLines.push(info.leadAssessor.trim());
  try {
    const raw = JSON.parse(info?.coAssessor || "[]") as Array<{
      name?: string;
      id?: string;
    }>;
    if (Array.isArray(raw)) {
      for (const ca of raw) {
        const line = [
          ca.name?.trim() || "",
          ca.id?.trim() ? `| ${ca.id.trim()}` : "",
        ]
          .filter(Boolean)
          .join(" ");
        if (line) coverLines.push(line);
      }
    }
  } catch {
    // ignore
  }

  coverLines.forEach((line, i) => {
    slide.addText(line, {
      x: 0.5,
      y: 5.6 + i * 0.38,
      w: 8.0,
      h: 0.35,
      fontSize: 12,
      color: DARK_TEXT,
      fontFace: "Calibri",
    });
  });

  if (logoBase64) {
    slide.addImage({ data: logoBase64, x: 10.3, y: 5.8, w: 2.7, h: 0.95 });
  }

  slide.addText("restricted", {
    x: 5.5,
    y: 7.1,
    w: 2.3,
    h: 0.22,
    fontSize: 8,
    color: FOOTER_C,
    align: "center",
    fontFace: "Calibri",
  });
}

// ─── Slide 2 — Assessment Information ───────────────────────────
function addAssessmentInfoSlide(
  pptx: any,
  data: ReportData,
  logoBase64: string,
  pageNum: number,
) {
  const slide = pptx.addSlide();
  const info = data.info;

  addSlideTitle(slide, "Assessment Information");
  addLogo(slide, logoBase64);

  const dateStr = info?.startDate
    ? new Date(info.startDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  let timeline = "";
  if (info?.startDate && info?.endDate)
    timeline = `${info.startDate} \u2013 ${info.endDate}`;
  else if (info?.startDate) timeline = info.startDate;

  // Parse co-assessors from JSON
  let coAssessorLines: string[] = [];
  try {
    const raw = JSON.parse(info?.coAssessor || "[]") as Array<{
      name?: string;
      id?: string;
    }>;
    if (Array.isArray(raw)) {
      coAssessorLines = raw
        .filter((ca) => ca.name?.trim() || ca.id?.trim())
        .map(
          (ca) =>
            `${ca.name?.trim() || ""}${
              ca.id?.trim() ? ` | ${ca.id.trim()}` : ""
            }`,
        );
    }
  } catch {
    // ignore
  }

  // Lead assessor with ID
  const leadAssessorId = info?.assessorBody?.trim() || "";
  const leadAssessorDisplay = info?.leadAssessor?.trim()
    ? `${info.leadAssessor.trim()}${
        leadAssessorId ? ` | ${leadAssessorId}` : ""
      }`
    : "";

  const fields: [string, string][] = [
    ["Project Name", info?.projectName || ""],
    ["Project ID", info?.intacsId || ""],
    ["Assessment Timeline", timeline],
    ["Lead Assessor", leadAssessorDisplay],
    ...coAssessorLines.map((line, i): [string, string] => [
      i === 0 ? "Co-Assessors" : "",
      line,
    ]),
    ["PAM Version", info?.pamVersion || ""],
    ["VDA Version", info?.vdaVersion || ""],
    ["Target Capability Level", info?.targetCapabilityLevel || ""],
    ["Functional Safety Level", info?.functionalSafetyLevel || ""],
    ["Cybersecurity Level", info?.cybersecurityLevel || ""],
  ];

  let y = 1.1;
  for (const [label, value] of fields) {
    if (label === "") {
      // continuation co-assessor line — indent only, no label
      slide.addText(
        [
          { text: "    ", options: { color: DARK_TEXT } },
          { text: value || "", options: { color: DARK_TEXT, bold: false } },
        ],
        {
          x: 0.35,
          y,
          w: 12.0,
          h: 0.42,
          fontSize: 13,
          fontFace: "Calibri",
          valign: "middle",
        },
      );
    } else {
      slide.addText(
        [
          { text: "\u2013  ", options: { color: TEAL, bold: false } },
          { text: `${label}: `, options: { color: DARK_TEXT, bold: true } },
          { text: value || "", options: { color: DARK_TEXT, bold: false } },
        ],
        {
          x: 0.35,
          y,
          w: 12.0,
          h: 0.42,
          fontSize: 13,
          fontFace: "Calibri",
          valign: "middle",
        },
      );
    }
    y += 0.48;
  }

  addFooter(slide, dateStr, pageNum);
}

// ─── Slide 3 — Assessment Scope ───────────────────────────────
function addAssessmentScopeSlide(
  pptx: any,
  data: ReportData,
  logoBase64: string,
  pageNum: number,
) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, "Assessment Scope");
  addLogo(slide, logoBase64);

  const dateStr = data.info?.startDate || "";

  const hdr = (text: string, align = "left") => ({
    text,
    options: {
      bold: true,
      fill: { color: TEAL_HDR },
      color: WHITE,
      fontSize: 11,
      fontFace: "Calibri",
      align,
      valign: "middle",
    },
  });

  const tableData: any[] = [
    [hdr("Process ID"), hdr("Process Area"), hdr("Target Level", "center")],
  ];

  data.processesInScope.forEach((proc, i) => {
    const bg = i % 2 === 0 ? ROW_DARK : ROW_LIGHT;
    const cell = (text: string, align = "left") => ({
      text,
      options: {
        fill: { color: bg },
        color: DARK_TEXT,
        fontSize: 11,
        fontFace: "Calibri",
        align,
        valign: "middle",
      },
    });
    tableData.push([
      cell(proc.id),
      cell(proc.name),
      cell(`Level ${proc.targetLevel}`, "center"),
    ]);
  });

  slide.addTable(tableData, {
    x: 0.35,
    y: 1.1,
    w: 12.6,
    colW: [2.2, 8.4, 2.0],
    rowH: 0.42,
    border: { type: "solid", color: "555555", pt: 0.5 },
    fontSize: 11,
  });

  addFooter(slide, dateStr, pageNum);
}

// ─── Slide 4 — Assessment Results Summary ───────────────────────
function addAssessmentResultsSlide(
  pptx: any,
  data: ReportData,
  logoBase64: string,
  pageNum: number,
) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, "Assessment Results");
  addLogo(slide, logoBase64);

  const dateStr = data.info?.startDate || "";

  const hdr = (text: string, align = "center") => ({
    text,
    options: {
      bold: true,
      fill: { color: TEAL_HDR },
      color: WHITE,
      fontSize: 10,
      fontFace: "Calibri",
      align,
      valign: "middle",
    },
  });

  const tableData: any[] = [
    [
      hdr("Process Areas", "left"),
      hdr("Target\nlevel"),
      hdr("PA 1.1"),
      hdr("PA 2.1"),
      hdr("PA 2.2"),
      hdr("PA3.1"),
      hdr("PA3.2"),
      hdr("Achieved\nLevel"),
    ],
  ];

  for (const proc of data.processes) {
    const mkPA = (paId: string, minLvl: number) => {
      if (proc.targetLevel < minLvl) {
        return {
          text: "",
          options: { fill: { color: "F3F4F6" }, color: "D1D5DB", fontSize: 9 },
        };
      }
      const r = proc.paRatings[paId] ?? null;
      const c = rc(r);
      return {
        text: r ?? "",
        options: {
          fill: { color: c.fill },
          color: c.text,
          bold: !!r,
          fontSize: 10,
          align: "center",
          fontFace: "Calibri",
          valign: "middle",
        },
      };
    };
    const cl = proc.capabilityLevel;
    tableData.push([
      {
        text: `${proc.id} ${proc.label}`,
        options: {
          fill: { color: WHITE },
          color: DARK_TEXT,
          fontSize: 9,
          fontFace: "Calibri",
          valign: "middle",
        },
      },
      {
        text: `L${proc.targetLevel}`,
        options: {
          fill: { color: WHITE },
          color: DARK_TEXT,
          fontSize: 9,
          align: "center",
          fontFace: "Calibri",
          valign: "middle",
        },
      },
      mkPA("PA1.1", 1),
      mkPA("PA2.1", 2),
      mkPA("PA2.2", 2),
      mkPA("PA3.1", 3),
      mkPA("PA3.2", 3),
      cl === null
        ? {
            text: "",
            options: {
              fill: { color: WHITE },
              color: GRAY_TEXT,
              fontSize: 9,
              align: "center",
            },
          }
        : {
            text: String(cl),
            options: {
              fill: { color: WHITE },
              color: DARK_TEXT,
              bold: true,
              fontSize: 10,
              align: "center",
              fontFace: "Calibri",
              valign: "middle",
            },
          },
    ]);
  }

  slide.addTable(tableData, {
    x: 0.35,
    y: 1.1,
    w: 12.6,
    colW: [4.4, 0.9, 1.0, 1.0, 1.0, 1.0, 1.0, 1.4],
    rowH: 0.4,
    border: { type: "solid", color: "555555", pt: 0.5 },
    autoPage: true,
    fontSize: 9,
  });

  addFooter(slide, dateStr, pageNum);
}

// ─── Slide 5 — Full Results Matrix ──────────────────────────────
function addFullMatrixSlide(
  pptx: any,
  data: ReportData,
  logoBase64: string,
  pageNum: number,
) {
  if (data.processes.length === 0) return;
  const slide = pptx.addSlide();
  addSlideTitle(slide, "Full Results Matrix");
  addLogo(slide, logoBase64);

  const dateStr = data.info?.startDate || "";

  const hdr = (text: string, align = "center") => ({
    text,
    options: {
      bold: true,
      fill: { color: TEAL_HDR },
      color: WHITE,
      fontSize: 8,
      fontFace: "Calibri",
      align,
      valign: "middle",
    },
  });

  const tableData: any[] = [
    [hdr("Process", "left"), hdr("Practice ID"), hdr("Rating")],
  ];

  for (const proc of data.processes) {
    tableData.push([
      {
        text: `${proc.id} \u2013 ${proc.label}`,
        options: {
          bold: true,
          fill: { color: TEAL_HDR },
          color: WHITE,
          fontSize: 9,
          fontFace: "Calibri",
          colspan: 3,
          valign: "middle",
        },
      },
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
          fill: { color: "D6EAE7" },
          color: "1A7066",
          fontSize: 7,
          colspan: 2,
          fontFace: "Calibri",
          valign: "middle",
        },
      },
      { text: "", options: {} },
      {
        text: pa11 ?? "\u2014",
        options: {
          fill: { color: cPA11.fill },
          color: cPA11.text,
          bold: !!pa11,
          fontSize: 8,
          align: "center",
          fontFace: "Calibri",
        },
      },
    ]);

    for (const bp of proc.bpDetails) {
      const c = rc(bp.rating);
      const bg = tableData.length % 2 === 0 ? "F5F9F8" : WHITE;
      tableData.push([
        { text: "", options: { fill: { color: bg } } },
        {
          text: bp.id,
          options: {
            fill: { color: bg },
            color: DARK_TEXT,
            bold: true,
            fontSize: 7,
            fontFace: "Calibri",
          },
        },
        {
          text: bp.rating ?? "\u2014",
          options: {
            fill: { color: bp.rating ? c.fill : "F3F4F6" },
            color: bp.rating ? c.text : "9CA3AF",
            bold: !!bp.rating,
            fontSize: 8,
            align: "center",
            fontFace: "Calibri",
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
          text: `${paId} \u2013 ${gpGroup.paName}`,
          options: {
            bold: true,
            fill: { color: "D6EAE7" },
            color: "1A7066",
            fontSize: 7,
            colspan: 2,
            fontFace: "Calibri",
            valign: "middle",
          },
        },
        { text: "", options: {} },
        {
          text: paRating ?? "\u2014",
          options: {
            fill: { color: cPA.fill },
            color: cPA.text,
            bold: !!paRating,
            fontSize: 8,
            align: "center",
            fontFace: "Calibri",
          },
        },
      ]);
      for (const gp of gpGroup.practices) {
        const c = rc(gp.rating);
        const bg = tableData.length % 2 === 0 ? "F5F9F8" : WHITE;
        tableData.push([
          { text: "", options: { fill: { color: bg } } },
          {
            text: gp.id,
            options: {
              fill: { color: bg },
              color: DARK_TEXT,
              bold: true,
              fontSize: 7,
              fontFace: "Calibri",
            },
          },
          {
            text: gp.rating ?? "\u2014",
            options: {
              fill: { color: gp.rating ? c.fill : "F3F4F6" },
              color: gp.rating ? c.text : "9CA3AF",
              bold: !!gp.rating,
              fontSize: 8,
              align: "center",
              fontFace: "Calibri",
            },
          },
        ]);
      }
    }
  }

  slide.addTable(tableData, {
    x: 0.3,
    y: 1.05,
    w: 12.7,
    colW: [3.5, 7.8, 1.4],
    rowH: 0.3,
    border: { type: "solid", color: "D1D5DB", pt: 0.4 },
    autoPage: true,
    fontSize: 7,
  });

  addFooter(slide, dateStr, pageNum);
}

// ─── Slide 6 — Global Strengths ───────────────────────────────
function addGlobalStrengthsSlide(
  pptx: any,
  data: ReportData,
  logoBase64: string,
  pageNum: number,
) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, "Global Strengths");
  addLogo(slide, logoBase64);

  const dateStr = data.info?.startDate || "";
  const items = data.globalStrengths.filter((s) => s.trim());

  if (items.length === 0) {
    slide.addText("No global strengths recorded.", {
      x: 0.4,
      y: 1.2,
      w: 12.0,
      h: 0.4,
      fontSize: 11,
      color: GRAY_TEXT,
      italic: true,
      fontFace: "Calibri",
    });
  } else {
    let y = 1.15;
    for (const item of items) {
      slide.addText(
        [
          { text: "\u2013  ", options: { color: TEAL, bold: false } },
          { text: item, options: { color: DARK_TEXT } },
        ],
        {
          x: 0.35,
          y,
          w: 12.0,
          h: 0.42,
          fontSize: 13,
          fontFace: "Calibri",
          wrap: true,
          valign: "middle",
        },
      );
      y += 0.48;
    }
  }

  addFooter(slide, dateStr, pageNum);
}

// ─── Slide 7 — Global Weaknesses ──────────────────────────────
function addGlobalWeaknessesSlide(
  pptx: any,
  data: ReportData,
  logoBase64: string,
  pageNum: number,
) {
  const slide = pptx.addSlide();
  addSlideTitle(slide, "Global Weakness");
  addLogo(slide, logoBase64);

  const dateStr = data.info?.startDate || "";
  const items = data.globalWeaknesses.filter((s) => s.trim());

  if (items.length === 0) {
    slide.addText("No global weaknesses recorded.", {
      x: 0.4,
      y: 1.2,
      w: 12.0,
      h: 0.4,
      fontSize: 11,
      color: GRAY_TEXT,
      italic: true,
      fontFace: "Calibri",
    });
  } else {
    let y = 1.15;
    for (const item of items) {
      slide.addText(
        [
          { text: "\u2013  ", options: { color: TEAL, bold: false } },
          { text: item, options: { color: DARK_TEXT } },
        ],
        {
          x: 0.35,
          y,
          w: 12.0,
          h: 0.42,
          fontSize: 13,
          fontFace: "Calibri",
          wrap: true,
          valign: "middle",
        },
      );
      y += 0.48;
    }
  }

  addFooter(slide, dateStr, pageNum);
}

// ─── Slides 8+ — Per-Process ─────────────────────────────────────

interface FindingItem {
  text: string;
  ref: string;
  type: "strength" | "weakness" | "suggestion";
  practiceRefs?: string[];
  runs?: Array<{
    text: string;
    options?: { bold?: boolean; italic?: boolean };
  }>;
}

// ─── Rich-text to PPT text runs ────────────────────────────────
type PptRun = { text: string; options?: { bold?: boolean; italic?: boolean } };

function richTextToPptRuns(text: string): PptRun[] {
  const runs: PptRun[] = [];
  let remaining = text;
  while (remaining.length > 0) {
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    const italicMatch = remaining.match(/\*([^*]+?)\*/);
    const evMatch = remaining.match(/\[\[ev:([^:]+):([^\]]+)\]\]/);

    const boldIdx = boldMatch ? remaining.indexOf(boldMatch[0]) : -1;
    const italicIdx = italicMatch ? remaining.indexOf(italicMatch[0]) : -1;
    const evIdx = evMatch ? remaining.indexOf(evMatch[0]) : -1;

    const minIdx = [boldIdx, italicIdx, evIdx]
      .filter((i) => i !== -1)
      .reduce((a, b) => (a < b ? a : b), Number.POSITIVE_INFINITY);

    if (minIdx === Number.POSITIVE_INFINITY) {
      if (remaining) runs.push({ text: remaining });
      break;
    }
    if (evIdx !== -1 && evIdx === minIdx) {
      if (evIdx > 0) runs.push({ text: remaining.slice(0, evIdx) });
      runs.push({ text: `[${evMatch![2]}]` });
      remaining = remaining.slice(evIdx + evMatch![0].length);
    } else if (boldIdx !== -1 && boldIdx === minIdx) {
      if (boldIdx > 0) runs.push({ text: remaining.slice(0, boldIdx) });
      runs.push({ text: boldMatch![1], options: { bold: true } });
      remaining = remaining.slice(boldIdx + boldMatch![0].length);
    } else if (italicIdx !== -1) {
      if (italicIdx > 0) runs.push({ text: remaining.slice(0, italicIdx) });
      runs.push({ text: italicMatch![1], options: { italic: true } });
      remaining = remaining.slice(italicIdx + italicMatch![0].length);
    } else {
      runs.push({ text: remaining });
      break;
    }
  }
  return runs;
}

function collectFindings(proc: ReportData["processes"][0]): FindingItem[] {
  return (proc.findingsList ?? []).map((f) => ({
    text: f.text,
    ref: "",
    type: f.type,
    practiceRefs: f.practiceRefs,
    runs: richTextToPptRuns(f.text),
  }));
}

function addProcessSlides(
  pptx: any,
  proc: ReportData["processes"][0],
  logoBase64: string,
  dateStr: string,
  startPageNum: number,
): number {
  const allFindings = collectFindings(proc);
  const ITEMS_PER_PAGE = 15;
  const totalPages = Math.max(
    1,
    Math.ceil(allFindings.length / ITEMS_PER_PAGE),
  );
  let pageOffset = 0;

  for (let page = 0; page < totalPages; page++) {
    const slide = pptx.addSlide();
    const pageFindings = allFindings.slice(
      page * ITEMS_PER_PAGE,
      (page + 1) * ITEMS_PER_PAGE,
    );
    const pageTitle =
      totalPages > 1
        ? `${proc.id}: ${proc.label} (${page + 1}/${totalPages})`
        : `${proc.id}: ${proc.label}`;

    addSlideTitle(slide, pageTitle);
    addLogo(slide, logoBase64);

    const strengths = pageFindings.filter((f) => f.type === "strength");
    const weaknesses = pageFindings.filter((f) => f.type === "weakness");
    const suggestions = pageFindings.filter((f) => f.type === "suggestion");

    let y = 1.15;

    function renderSection(sectionLabel: string, items: FindingItem[]) {
      slide.addText(`${sectionLabel}:`, {
        x: 0.35,
        y,
        w: 12.0,
        h: 0.35,
        fontSize: 13,
        bold: true,
        color: DARK_TEXT,
        fontFace: "Calibri",
      });
      y += items.length === 0 ? 0.42 : 0.38;

      for (const item of items) {
        const textRuns: any[] = [
          { text: "\u2013  ", options: { color: TEAL, bold: false } },
        ];
        if (item.runs && item.runs.length > 0) {
          for (const run of item.runs) {
            textRuns.push({
              text: run.text,
              options: {
                color: DARK_TEXT,
                bold: run.options?.bold ?? false,
                italic: run.options?.italic ?? false,
              },
            });
          }
        } else {
          const displayText =
            item.text.length > 140
              ? `${item.text.slice(0, 137)}\u2026`
              : item.text;
          textRuns.push({
            text: displayText,
            options: { color: DARK_TEXT, bold: false },
          });
        }
        // Append BP/GP references at the end
        const refLabel =
          item.practiceRefs && item.practiceRefs.length > 0
            ? item.practiceRefs.join(", ")
            : item.ref;
        if (refLabel) {
          textRuns.push({
            text: `  [${refLabel}]`,
            options: { color: GRAY_TEXT, bold: false },
          });
        }
        slide.addText(textRuns, {
          x: 0.35,
          y,
          w: 12.0,
          h: 0.38,
          fontSize: 11,
          fontFace: "Calibri",
          wrap: true,
          valign: "middle",
        });
        y += 0.4;
      }
      y += 0.1;
    }

    if (allFindings.length === 0 && page === 0) {
      slide.addText("No findings recorded for this process.", {
        x: 0.35,
        y,
        w: 12.0,
        h: 0.4,
        fontSize: 11,
        color: GRAY_TEXT,
        italic: true,
        fontFace: "Calibri",
      });
    } else {
      renderSection("Strength", strengths);
      renderSection("Weakness", weaknesses);
      renderSection("Suggestions", suggestions);
    }

    addFooter(slide, dateStr, startPageNum + pageOffset);
    pageOffset++;
  }

  return pageOffset;
}

// ─── Main export ─────────────────────────────────────────────────
export async function exportToPpt(data: ReportData): Promise<void> {
  const PptxGenJS = await loadPptxGenJS();
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "Q-Insight";
  pptx.company = "Q-Insight";
  pptx.subject = `Assessment Report: ${data.assessmentName}`;
  pptx.title = data.assessmentName;

  const [bgBase64, logoBase64] = await Promise.all([
    fetchBase64("/assets/generated/cover-bg.dim_1280x960.jpg"),
    fetchBase64("/assets/uploads/Slide9-8.JPG"),
  ]);

  const dateStr = data.info?.startDate
    ? new Date(data.info.startDate).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });

  addCoverSlide(pptx, data, bgBase64, logoBase64);

  let pageNum = 2;
  addAssessmentInfoSlide(pptx, data, logoBase64, pageNum++);
  addAssessmentScopeSlide(pptx, data, logoBase64, pageNum++);
  addAssessmentResultsSlide(pptx, data, logoBase64, pageNum++);
  addFullMatrixSlide(pptx, data, logoBase64, pageNum++);
  addGlobalStrengthsSlide(pptx, data, logoBase64, pageNum++);
  addGlobalWeaknessesSlide(pptx, data, logoBase64, pageNum++);

  for (const proc of data.processes) {
    const pagesAdded = addProcessSlides(
      pptx,
      proc,
      logoBase64,
      dateStr,
      pageNum,
    );
    pageNum += pagesAdded;
  }

  const projectName = (data.info?.projectName || data.assessmentName)
    .replace(/[\/\\?%*:|"<>]/g, "-")
    .trim();
  const assessmentDate = data.info?.startDate
    ? new Date(data.info.startDate)
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .replace(/ /g, "-")
    : new Date()
        .toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        })
        .replace(/ /g, "-");
  const fileName = `${projectName}_ASPICE_v4.0 Assessment_${assessmentDate}_Readout.pptx`;

  await pptx.writeFile({ fileName });
}
