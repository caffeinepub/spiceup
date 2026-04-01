# Q-Insight

## Current State
- Assessment Info page has sections: Assessment Timeline, Assessment Team (with Sponsor + Lead Assessor on separate rows), Organization Details, Project Information (4th), Application Parameters, Standards & Classification (with Assessment Class), Additional Information
- Co-Assessors are displayed with Name and ID on separate input rows
- PPT Assessment Info slide lists: Project Name, Project ID, Assessed Project, Target Level, PAM Version, Timeline, Sponsor, Lead Assessor, Co-Assessors
- PPT Cover slide includes sponsor in the lines list
- PPT per-process findings show `[practiceId]` (e.g., `[MAN.3.BP1]`) at end of each finding bullet
- Findings with Practice multi-select store `practiceIds` as node keys in SwEntry, but PPT doesn't read them

## Requested Changes (Diff)

### Add
- `findingsList` field to `ReportProcess` in `reportData.ts`: deduplicated list of findings per process with `practiceRefs` (short labels like `["BP1", "BP3"]`) read from SwEntry `practiceIds` in `workProductsInspected`

### Modify
- **AssessmentInfo.tsx**: 
  - Reorder sections: Project Information FIRST, then Assessment Timeline, Assessment Team, Application Parameters, Standards & Classification, Additional Information
  - Remove the entire Organization Details section (Assessed Party, Assessed Site, Unit/Department, Project Contact SW Dev, Project Contact SW Quality)
  - Remove Assessment Sponsor field from Assessment Team
  - Remove Assessment Class field from Standards & Classification
  - Lead Assessor: display Name input + ID input side by side on ONE line (grid-cols-2)
  - Co-Assessors: each entry has Name + ID side by side on ONE line (grid-cols-2)
- **exportPpt.ts — Assessment Info slide**: Remove Sponsor and Assessed Project fields; reorder to put Project Name/ID first; show Lead Assessor as `Name | ID` on one line; show each co-assessor as `Name | ID` on its own line; parse co-assessors from JSON
- **exportPpt.ts — Cover slide**: Remove sponsor from the lines list
- **exportPpt.ts — collectFindings**: Use `proc.findingsList` to collect findings; append short practice refs as `[BP5, BP6]` (not full ID like `[MAN.3.BP1]`); if no practiceIds, fall back to the legacy `[practiceId]` format stripped to short label
- **reportData.ts**: Add `findingsList` building by scanning all `workProductsInspected` swEntries across all practices for the process, deduplicating by `id`, and converting `practiceIds` nodeKeys to short practice labels

### Remove
- Organization Details section from Assessment Info page
- Assessment Class field from Assessment Info page
- Assessment Sponsor field from Assessment Info page
- Sponsor from PPT Assessment Info slide and Cover slide

## Implementation Plan
1. Update `AssessmentInfo.tsx`: reorder sections, remove Organization Details + Sponsor + Assessment Class, put Lead Assessor Name+ID on one line, co-assessors each on one line
2. Update `reportData.ts`: add `FindingItem` interface with `practiceRefs: string[]`, add `findingsList: FindingItem[]` to `ReportProcess`, build it by parsing `workProductsInspected` swEntries per process, deduplicate by id, extract short labels from practiceIds nodeKeys
3. Update `exportPpt.ts`:
   a. Cover slide: remove sponsor line
   b. Assessment Info slide: remove Sponsor/Assessed Project, reorder, format Lead Assessor/Co-Assessors with Name | ID format
   c. `collectFindings`: rewrite to use `proc.findingsList`; format ref as `[BP1, BP3]` short labels
4. Validate
