# Q-Insight

## Current State

Evidence items are embedded as JSON inside `PracticeRating.workProductsInspected` (per processId+level+practiceId combination). They have no independent IDs. Findings (SwEntries) are stored in the same JSON blob. The Evidence panel on Perform Assessment shows only items for the currently selected BP/GP/PA/process node. There is no way to reference evidence items from findings.

## Requested Changes (Diff)

### Add
- New `ProjectEvidence` backend type: `{ id: Nat, assessmentId: Nat, processId: Text, name: Text, link: Text, version: Text }`
- New stable map `projectEvidenceMap` for project-level evidence storage
- Backend functions: `addProjectEvidence`, `updateProjectEvidence`, `deleteProjectEvidence`, `getProjectEvidenceForAssessment`
- `referencedEvidenceIds` field to `SwEntry` (finding) stored in JSON
- Process dropdown in Add Evidence dialog (list of in-scope processes for the assessment)
- Multi-select evidence picker in Add/Edit Finding dialog (shows all project evidence items)
- Referenced evidence badges on each finding row in the Findings table
- Evidence panel always shows ALL project evidence regardless of selected process node

### Modify
- `EvidenceItem` gains a stable string `id` (uuid) for referencing
- Add Evidence dialog: add "Process" association field (dropdown)
- Add/Edit Finding dialog: add "Referenced Evidence" multi-select dropdown
- Evidence table: show evidence from entire project (not filtered by current node)
- Findings table: add column or inline display of referenced evidence items
- Evidence save/load: migrate from per-PracticeRating JSON blobs to new `projectEvidenceMap`

### Remove
- Evidence storage from `workProductsInspected` JSON (migrate to project-level map)
- Per-node evidence aggregation logic in ProcessOverviewView and PASummaryView

## Implementation Plan

1. **Backend**: Add `ProjectEvidence` type and stable map. Add CRUD functions. Keep `workProductsInspected` for findings only (remove workProducts from it). Update preupgrade/postupgrade.
2. **Frontend types**: Update `EvidenceItem` to include `id` and `processId`. Update `SwEntry` to include `referencedEvidenceIds: string[]`.
3. **Evidence loading**: Replace per-node evidence aggregation with single `getProjectEvidenceForAssessment` call. Store in a flat `projectEvidence` state array.
4. **Evidence table**: Always render from `projectEvidence` (all items), not from ratings map.
5. **Add Evidence dialog**: Add process dropdown. On submit, call `addProjectEvidence` directly.
6. **Add/Edit Finding dialog**: Add multi-select evidence picker populated from `projectEvidence`. Save selected IDs in `referencedEvidenceIds`.
7. **Findings table**: Show referenced evidence items as small badges/chips below the description or in a separate column.
8. **Data migration**: On load, if old `workProducts` exist in JSON blobs, migrate them to the new project evidence store.
