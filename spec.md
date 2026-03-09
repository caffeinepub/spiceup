# Q-Insight

## Current State
- Full ASPICE assessment tool with login, roles (admin/user), dashboard, assessment info, scope, schedule, perform assessment, results matrix with CL column.
- GenerateReport page exists but is a placeholder — allows typing free-text report content and saving it to backend; exports only as .txt.
- The main header bar shows only the assessment selector + profile menu. The app subtitle ("For Smarter Assessments") appears only in the sidebar, not in the top bar.

## Requested Changes (Diff)

### Add
- **Subtitle in header bar**: Show "Q-Insight" + "For Smarter Assessments" at the left side of the top header bar (desktop only, already done).
- **PDF export**: A structured document that mirrors the PPT layout (Cover section, Executive Summary/Results Matrix, then one section per process with ratings and key findings).
- **Excel export**: Multi-sheet workbook — Sheet 1: Assessment Info + Scope + Results Matrix; then one sheet per process with BP/GP ratings, strengths, weaknesses, evidence.
- **PowerPoint export**: Multi-slide presentation — Slide 1: Cover (assessment name, dates, project, lead/co-assessors); Slide 2: Executive summary / Results matrix table; Slide 3+: One slide per assessed process (process ID, target level, PA ratings, key strengths, weaknesses).
- **Export libraries**: Install `jspdf`, `jspdf-autotable`, `xlsx` (SheetJS), `pptxgenjs` via pnpm.

### Modify
- **GenerateReport component**: Replace the free-text + backend-save approach with a self-contained export UI. User clicks "Export PDF", "Export Excel", or "Export PPT". All data is fetched from the same backend hooks already used by Perform Assessment and View Results (no backend changes needed). Export is generated client-side and downloaded immediately.

### Remove
- Free-text "Report Content" textarea form and the backend report save/list functionality from the UI (the backend hooks for `generateReport`/`getAllReports` can stay but the UI no longer uses them).

## Implementation Plan

1. Install `jspdf`, `jspdf-autotable`, `xlsx`, `pptxgenjs` as frontend dependencies.
2. Create `/src/utils/reportData.ts` — shared data-assembly logic that takes assessment info, scope config, ratings, and schedule and returns a normalized `ReportData` object (same shape used by all three exporters).
3. Create `/src/utils/exportPdf.ts` — uses jsPDF + autotable to produce the PDF: cover page, results matrix table, per-process detail sections.
4. Create `/src/utils/exportExcel.ts` — uses SheetJS to produce a multi-sheet workbook.
5. Create `/src/utils/exportPpt.ts` — uses pptxgenjs to produce the multi-slide PPTX.
6. Rewrite `GenerateReport.tsx` to:
   - Fetch all needed data (assessment info, scope config, practice ratings, schedule days) for the currently selected assessment.
   - Show three export buttons: Export PDF, Export Excel, Export PPT.
   - Show a loading/preview summary of what will be included (assessment name, # processes, date range).
   - Trigger the appropriate client-side export on button click.
7. Add ASPICE color hex values to export styling (F=#00b04f, L=#92d050, P=#ffff00, N=#990000).
