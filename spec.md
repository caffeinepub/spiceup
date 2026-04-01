# Q-Insight

## Current State
PPT Assessment Information slide is missing: Project Scope, Application Parameters (Model Based Dev, Agile, Dev External), Additional Remarks. Evidence refs in findings show as plain text, not hyperlinks.

## Requested Changes (Diff)

### Add
- Project Scope, Application Parameters, Additional Remarks to PPT Assessment Info slide
- evidenceMap in ReportData for hyperlink rendering in findings slides

### Modify
- addAssessmentInfoSlide: add all missing fields from Assessment Info page
- ReportData interface: add evidenceMap field
- buildReportData: accept evidenceMap param
- richTextToPptRuns: render [[ev:id:name]] as hyperlinks using evidence URL
- GenerateReport.tsx: fetch project evidence, build map, pass to buildReportData

### Remove
- Nothing

## Implementation Plan
1. Update ReportData interface (evidenceMap)
2. Update buildReportData to accept/pass evidenceMap
3. Update GenerateReport.tsx to fetch and pass evidence
4. Update richTextToPptRuns for hyperlinks
5. Update addAssessmentInfoSlide with Project Scope, App Parameters, Additional Remarks
