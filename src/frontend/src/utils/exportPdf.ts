/**
 * exportPdf.ts
 * PDF export for Q-Insight assessment reports using jsPDF + jspdf-autotable.
 * Uses window.jspdf (CDN-loaded) to avoid bundler dependency issues.
 */

import type { ReportData } from "./reportData";

// CDN-loaded jsPDF globals
const getJsPDF = (): any =>
  (window as any).jspdf?.jsPDF ?? (window as any).jsPDF;
const getAutoTable = (): any =>
  (window as any).jspdf?.autoTable ?? (window as any).autoTable;

// ─── Color constants ─────────────────────────────────────────────

const COLORS = {
  navy: [15, 31, 61] as [number, number, number],
  navyLight: [30, 58, 113] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  lightGray: [245, 247, 250] as [number, number, number],
  midGray: [200, 206, 216] as [number, number, number],
  darkGray: [80, 90, 105] as [number, number, number],
  textDark: [30, 35, 45] as [number, number, number],
  amber: [245, 158, 11] as [number, number, number],
  amberLight: [255, 251, 235] as [number, number, number],
};

const RATING_COLORS: Record<
  string,
  { bg: [number, number, number]; text: [number, number, number] }
> = {
  F: { bg: [0, 176, 79], text: [0, 0, 0] },
  L: { bg: [146, 208, 80], text: [0, 0, 0] },
  P: { bg: [255, 255, 0], text: [0, 0, 0] },
  N: { bg: [153, 0, 0], text: [255, 255, 255] },
  NA: { bg: [156, 163, 175], text: [255, 255, 255] },
};

function ratingCell(rating: string | null): any {
  if (!rating || !RATING_COLORS[rating]) {
    return {
      content: "—",
      styles: {
        fillColor: [240, 240, 240],
        textColor: [150, 150, 150],
        fontStyle: "bold",
      },
    };
  }
  const c = RATING_COLORS[rating];
  return {
    content: rating,
    styles: { fillColor: c.bg, textColor: c.text, fontStyle: "bold" },
  };
}

function addFooter(
  doc: any,
  pageNum: number,
  totalPages: number,
  generatedAt: string,
) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, h - 12, w, 12, "F");
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.white);
  doc.setFont("helvetica", "normal");
  doc.text("Q-Insight  |  For Smarter Assessments", 14, h - 4.5);
  doc.text(`Generated: ${generatedAt}`, w / 2, h - 4.5, { align: "center" });
  doc.text(`Page ${pageNum} / ${totalPages}`, w - 14, h - 4.5, {
    align: "right",
  });
}

// ─── Page 1: Cover ───────────────────────────────────────────────

function addCoverPage(doc: any, data: ReportData) {
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();

  // Navy background block (top 40%)
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, w, h * 0.44, "F");

  // Decorative accent line
  doc.setFillColor(...COLORS.amber);
  doc.rect(0, h * 0.44, w, 2.5, "F");

  // Light bottom area
  doc.setFillColor(...COLORS.lightGray);
  doc.rect(0, h * 0.44 + 2.5, w, h - (h * 0.44 + 2.5), "F");

  // Q-Insight brand
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.amber);
  doc.text("Q-INSIGHT", 14, 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  doc.text("For Smarter Assessments", 14, 27);

  // Assessment name (big)
  doc.setFont("helvetica", "bold");
  doc.setFontSize(26);
  doc.setTextColor(...COLORS.white);
  const nameLines = doc.splitTextToSize(data.assessmentName, w - 28);
  doc.text(nameLines, 14, 55);

  // Subtitle
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(180, 200, 220);
  doc.text("Assessment Report", 14, 55 + nameLines.length * 10 + 6);

  // Info block below divider
  const infoY = h * 0.44 + 20;
  const info = data.info;
  const leftCol = 14;
  const rightCol = w / 2 + 5;
  const lineH = 11;

  const leftFields = [
    ["Project", info?.projectName ?? "—"],
    ["Start Date", info?.startDate ?? "—"],
    ["End Date", info?.endDate ?? "—"],
    ["Lead Assessor", info?.leadAssessor ?? "—"],
    ["Co-Assessor", info?.coAssessor ?? "—"],
  ];

  const rightFields = [
    ["Assessed Party", info?.assessedParty ?? "—"],
    ["Assessed Site", info?.assessedSite ?? "—"],
    ["Assessor Body", info?.assessorBody ?? "—"],
    ["Sponsor", info?.sponsor ?? "—"],
    ["PAM Version", info?.pamVersion ?? "—"],
  ];

  leftFields.forEach(([label, value], i) => {
    const y = infoY + i * lineH;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(label, leftCol, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    doc.text(String(value), leftCol + 32, y);
  });

  rightFields.forEach(([label, value], i) => {
    const y = infoY + i * lineH;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.darkGray);
    doc.text(label, rightCol, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    doc.text(String(value), rightCol + 32, y);
  });

  // Scope summary
  const scopeY = infoY + leftFields.length * lineH + 10;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.darkGray);
  doc.text("Processes in Scope", leftCol, scopeY);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...COLORS.textDark);
  doc.text(`${data.processesInScope.length} processes`, leftCol + 40, scopeY);

  doc.setFont("helvetica", "bold");
  doc.text("Generated", rightCol, scopeY);
  doc.setFont("helvetica", "normal");
  doc.text(data.generatedAt, rightCol + 32, scopeY);

  // Remarks / project scope
  if (info?.projectScope) {
    const remarkY = scopeY + 14;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.darkGray);
    doc.text("Project Scope", leftCol, remarkY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.textDark);
    const remarksWrapped = doc.splitTextToSize(info.projectScope, w - 28);
    doc.text(remarksWrapped.slice(0, 3), leftCol, remarkY + 7);
  }
}

// ─── Page 2: Executive Summary / Results Matrix ──────────────────

function addResultsPage(doc: any, data: ReportData) {
  const autoTable = getAutoTable();
  doc.addPage();
  const w = doc.internal.pageSize.getWidth();

  // Page header
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, w, 22, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.white);
  doc.text("Executive Summary — Assessment Results", 14, 14);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(180, 200, 220);
  doc.text(data.assessmentName, w - 14, 14, { align: "right" });

  // Rating legend
  let legendX = 14;
  const legendY = 30;
  const ratingLabels: Array<[string, string]> = [
    ["F", "Fully (86–100%)"],
    ["L", "Largely (51–85%)"],
    ["P", "Partially (16–50%)"],
    ["N", "Not Achieved (0–15%)"],
  ];
  doc.setFontSize(7.5);
  for (const [r, label] of ratingLabels) {
    const c = RATING_COLORS[r];
    doc.setFillColor(...c.bg);
    doc.rect(legendX, legendY - 4, 6, 5, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...c.text);
    doc.text(r, legendX + 1.5, legendY);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...COLORS.darkGray);
    doc.text(label, legendX + 8, legendY);
    legendX += 50;
  }

  // Build table data
  const head = [
    ["Process", "Target", "PA1.1", "PA2.1", "PA2.2", "PA3.1", "PA3.2", "CL"],
  ];
  const body = data.processes.map((proc) => {
    const paCell = (paId: string, minLevel: number) => {
      if (proc.targetLevel < minLevel)
        return {
          content: "—",
          styles: {
            fillColor: [230, 230, 230] as [number, number, number],
            textColor: [180, 180, 180] as [number, number, number],
            fontStyle: "bold" as const,
          },
        };
      return ratingCell(proc.paRatings[paId] ?? null);
    };

    const clCell = () => {
      const cl = proc.capabilityLevel;
      if (cl === null)
        return {
          content: "—",
          styles: {
            fillColor: COLORS.amberLight,
            textColor: COLORS.darkGray as [number, number, number],
            fontStyle: "bold" as const,
          },
        };
      return {
        content: String(cl),
        styles: {
          fillColor: COLORS.amber,
          textColor: COLORS.white,
          fontStyle: "bold" as const,
        },
      };
    };

    return [
      {
        content: `${proc.id}\n${proc.label}`,
        styles: { fontStyle: "bold" as const, fontSize: 7 },
      },
      {
        content: `L${proc.targetLevel}`,
        styles: {
          fontStyle: "normal" as const,
          textColor: COLORS.darkGray as [number, number, number],
        },
      },
      paCell("PA1.1", 1),
      paCell("PA2.1", 2),
      paCell("PA2.2", 2),
      paCell("PA3.1", 3),
      paCell("PA3.2", 3),
      clCell(),
    ];
  });

  autoTable(doc, {
    head,
    body,
    startY: 38,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      valign: "middle",
      halign: "center",
    },
    headStyles: {
      fillColor: COLORS.navyLight,
      textColor: COLORS.white,
      fontStyle: "bold",
      halign: "center",
    },
    columnStyles: {
      0: { halign: "left", cellWidth: 55 },
      1: { cellWidth: 14 },
      2: { cellWidth: 16 },
      3: { cellWidth: 16 },
      4: { cellWidth: 16 },
      5: { cellWidth: 16 },
      6: { cellWidth: 16 },
      7: { cellWidth: 16 },
    },
    alternateRowStyles: {
      fillColor: [248, 249, 252] as [number, number, number],
    },
  });
}

// ─── Pages 3+: Per-Process Detail ────────────────────────────────

function addProcessPage(
  doc: any,
  proc: ReportData["processes"][0],
  assessmentName: string,
) {
  const autoTable = getAutoTable();
  doc.addPage();
  const w = doc.internal.pageSize.getWidth();

  // Process header
  doc.setFillColor(...COLORS.navy);
  doc.rect(0, 0, w, 25, "F");
  doc.setFillColor(...COLORS.amber);
  doc.rect(0, 25, w, 1.5, "F");

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(...COLORS.white);
  doc.text(`${proc.id} – ${proc.label}`, 14, 13);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(180, 200, 220);
  const clText =
    proc.capabilityLevel !== null ? `CL: ${proc.capabilityLevel}` : "CL: —";
  doc.text(
    `Target Level: L${proc.targetLevel}   |   ${clText}   |   ${assessmentName}`,
    14,
    21,
  );

  let currentY = 32;

  // PA Ratings summary row
  const paIds = ["PA1.1"];
  if (proc.targetLevel >= 2) paIds.push("PA2.1", "PA2.2");
  if (proc.targetLevel >= 3) paIds.push("PA3.1", "PA3.2");

  const paSummaryHead = [paIds];
  const paSummaryBody = [
    paIds.map((paId) => ratingCell(proc.paRatings[paId] ?? null)),
  ];

  autoTable(doc, {
    head: paSummaryHead,
    body: paSummaryBody,
    startY: currentY,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 3,
      halign: "center",
      fontStyle: "bold",
    },
    headStyles: {
      fillColor: COLORS.navyLight,
      textColor: COLORS.white,
      fontStyle: "bold",
    },
    tableWidth: "auto",
  });

  currentY = doc.lastAutoTable.finalY + 6;

  // BP Ratings table
  if (proc.bpDetails.length > 0) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.navy);
    doc.text("Base Practices (PA 1.1)", 14, currentY);
    currentY += 3;

    autoTable(doc, {
      head: [["Practice ID", "Title", "Rating", "Strengths", "Weaknesses"]],
      body: proc.bpDetails.map((bp) => [
        bp.id,
        bp.title,
        ratingCell(bp.rating),
        bp.strengths || "—",
        bp.weaknesses || "—",
      ]),
      startY: currentY,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, valign: "top" },
      headStyles: {
        fillColor: [51, 78, 121] as [number, number, number],
        textColor: COLORS.white,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: 50 },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
      },
      alternateRowStyles: {
        fillColor: [248, 249, 252] as [number, number, number],
      },
    });

    currentY = doc.lastAutoTable.finalY + 6;
  }

  // GP groups
  for (const group of proc.gpGroups) {
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.navy);
    doc.text(group.paName, 14, currentY);
    currentY += 3;

    autoTable(doc, {
      head: [["Practice ID", "Title", "Rating", "Strengths", "Weaknesses"]],
      body: group.practices.map((gp) => [
        gp.id,
        gp.title,
        ratingCell(gp.rating),
        gp.strengths || "—",
        gp.weaknesses || "—",
      ]),
      startY: currentY,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2, valign: "top" },
      headStyles: {
        fillColor: [51, 78, 121] as [number, number, number],
        textColor: COLORS.white,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: 50 },
        2: { cellWidth: 14, halign: "center" },
        3: { cellWidth: 45 },
        4: { cellWidth: 45 },
      },
      alternateRowStyles: {
        fillColor: [248, 249, 252] as [number, number, number],
      },
    });

    currentY = doc.lastAutoTable.finalY + 6;
  }

  // Evidence table (all BPs + GPs combined)
  const allPractices = [
    ...proc.bpDetails,
    ...proc.gpGroups.flatMap((g) => g.practices),
  ];
  const evidenceRows = allPractices.flatMap((p) =>
    p.evidence.map((e) => [p.id, e.description, e.link, e.version]),
  );

  if (evidenceRows.length > 0) {
    if (currentY > doc.internal.pageSize.getHeight() - 40) {
      doc.addPage();
      currentY = 18;
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.navy);
    doc.text("Work Products Inspected", 14, currentY);
    currentY += 3;

    autoTable(doc, {
      head: [["Practice", "Description", "Link", "Version"]],
      body: evidenceRows,
      startY: currentY,
      margin: { left: 14, right: 14 },
      styles: { fontSize: 7, cellPadding: 2 },
      headStyles: {
        fillColor: [51, 78, 121] as [number, number, number],
        textColor: COLORS.white,
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 22, fontStyle: "bold" },
        1: { cellWidth: 80 },
        2: { cellWidth: 50 },
        3: { cellWidth: 24 },
      },
      alternateRowStyles: {
        fillColor: [248, 249, 252] as [number, number, number],
      },
    });
  }
}

// ─── Main Export Function ────────────────────────────────────────

export function exportToPdf(data: ReportData): void {
  const JsPDF = getJsPDF();
  if (!JsPDF) {
    alert("PDF export library not loaded. Please try again.");
    return;
  }

  const doc = new JsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  // Cover
  addCoverPage(doc, data);

  // Results matrix
  addResultsPage(doc, data);

  // Per-process pages
  for (const proc of data.processes) {
    addProcessPage(doc, proc, data.assessmentName);
  }

  // Add footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addFooter(doc, i, totalPages, data.generatedAt);
  }

  // Download
  const fileName = `QInsight-${data.assessmentName.replace(/[^a-z0-9]/gi, "_")}-Report.pdf`;
  doc.save(fileName);
}
