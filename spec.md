# Q-Insight

## Current State
- Findings (`SwEntry`) have `referencedEvidenceIds?: string[]` stored as JSON in `workProductsInspected`
- Evidence linking is only available inside the Add/Edit finding dialog as a checklist
- Evidence panel fetches all project evidence via `getProjectEvidenceForAssessment` (already project-level)
- `ProjectEvidence` already has `processId` field for process association
- Add Evidence dialog already has a Process dropdown
- No backend data model changes needed

## Requested Changes (Diff)

### Add
- A chain/link icon button on each finding row (visible at all times, alongside edit/delete)
- Clicking the link icon opens an inline popover/panel listing all project evidence items with checkboxes
- User can toggle evidence references directly from the finding row without opening the full edit dialog
- Changes auto-save (persist to backend) after linking/unlinking evidence
- Selected evidence items appear as small badges on the finding row showing evidence name

### Modify
- Finding rows: add Link icon button in Actions column next to edit/delete
- Referenced evidence badges on finding row should show evidence name (not just ID)
- Ensure evidence panel always shows ALL project evidence regardless of selected process node (already done but verify)

### Remove
- Nothing removed

## Implementation Plan
1. Add `Link` icon import from lucide-react in PerformAssessment.tsx
2. Create `EvidenceLinkPopover` component: a Popover with a checklist of all project evidence items, showing current `referencedEvidenceIds` for the finding, with save-on-close behavior
3. Add the link icon button to finding table rows in BP/GP section, PA section, and Process section
4. Wire the popover to update `referencedEvidenceIds` on the finding and trigger autosave
5. Update evidence badge rendering on finding rows to show evidence name instead of ID
6. Validate and deploy
