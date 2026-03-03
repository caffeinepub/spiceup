# Infineon Smart Assessments

## Current State
The ViewResults page exists but shows a generic score-card layout (ScoreRing, findings/recommendations cards) based on a legacy `assessmentResults` backend table. It has no connection to the actual BP/GP ratings stored via `savePracticeRating`. The `useGetAllPracticeRatingsForAssessment` hook and `useGetProcessGroupConfig` hooks already exist and supply all required data.

## Requested Changes (Diff)

### Add
- Assessment selector dropdown at the top of View Results (selects which assessment to display results for; defaults to `currentAssessmentId` from context)
- Summary bar: counts of total BPs/GPs rated, and breakdown of N / P / L / F across all processes
- Results table:
  - Rows grouped by process (e.g. SWE.1, SWE.2, SUP.8, MAN.3) — only processes where target level is NOT "NA"
  - Sub-rows per BP/GP: practice ID, title, rating badge (N/P/L/F color-coded)
  - Rollup row per process: count and % of N / P / L / F across all rated practices in that process
- Stacked bar chart (using existing recharts/shadcn chart component) per process showing N / P / L / F counts
- Radar/spider chart showing one data point per process (% F — fully satisfied) for maturity overview
- Exclude processes with target level "NA" from all tables and charts
- Empty state when no assessment is selected or no ratings are found

### Modify
- Replace the existing ViewResults component entirely with the new implementation
- No backend changes needed — all data comes from existing `getAllPracticeRatingsForAssessment` and `getProcessGroupConfig` endpoints

### Remove
- Old ScoreRing component and score-card grid layout
- Dependency on `useGetAllAssessmentResults` (legacy result objects) in ViewResults

## Implementation Plan
1. Rewrite `ViewResults.tsx` to:
   a. Use `useGetAllAssessments` + `useGetProcessGroupConfig` + `useGetAllPracticeRatingsForAssessment` for data
   b. Build a `buildProcessResults` utility that, given config + ratings + aspiceData, produces per-process aggregates
   c. Render assessment selector, summary cards, results table with sub-rows and rollup rows, stacked bar chart, and radar chart
   d. Apply "NA" exclusion rule throughout
2. Use `recharts` (already bundled via shadcn chart.tsx) for both charts
3. Apply deterministic `data-ocid` markers on all interactive surfaces
