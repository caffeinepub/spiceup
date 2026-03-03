# Infineon ASPICE Assessment Tool

## Current State
The Perform Assessment page displays BP and GP practice cards via `PracticeCard` in `PerformAssessment.tsx`. Each card shows the full `text` field from `aspiceData.ts`, which currently contains both the main requirement text and all numbered Notes concatenated together (e.g. "...software requirements.\n\nNote 1: ...\nNote 2: ..."). There is no way to hide/show notes, and there is no "Evidences Checked" section per BP.

## Requested Changes (Diff)

### Add
- **Notes toggle per practice card**: A collapsible "Notes" section at the bottom of each `PracticeCard`. Hidden by default, revealed when the user clicks a "Notes" button/link. Notes should be visually distinct (e.g. lighter background, italic text, note numbers preserved).
- **Evidences Checked section per BP (Level 1 only)**: A new multi-entry field below Strengths/Weaknesses/Work Products on every Level 1 Base Practice card, allowing the assessor to add one or more evidence items (text entries). Each evidence entry should be addable ("+Add Evidence") and removable (×). This is specific to BP cards (`showWorkProducts=true`), not GPs.
- Update `PracticeState` interface to include an `evidences: string[]` field.
- Wire evidences into save/load logic (stored as JSON string in `workProductsInspected` field or as a new field – use a new top-level `evidences` field in state serialized to the existing `workProductsInspected` column via JSON, keeping backward compat).

### Modify
- **`aspiceData.ts`**: Split the `text` field into two parts for every BP and GP:
  - `text`: main requirement text only (no Note lines)
  - `notes`: array of note strings (each note as a plain string without the "Note N:" prefix, but preserve the note number in display)
  - Update `BasePractice` and `GenericPractice` interfaces to add `notes?: string[]`.
- **`PracticeCard`**: 
  - Render only `text` (main body) in the description area.
  - Add a "Notes" toggle button below the description. Clicking it expands/collapses the notes list. Each note displayed as "Note N: <text>".
  - Add "Evidences Checked" section when `showWorkProducts` is true (Level 1 BPs).
- **`PracticeState`**: Add `evidences: string[]`.
- **Save logic** (`saveProcessRatings`): Serialize `evidences` array alongside existing fields. Store as JSON in `workProductsInspected` to avoid backend schema change, or handle gracefully.
- **Load logic**: Deserialize evidences from saved data.

### Remove
- Notes text from the inline `text` field of all BP/GP entries in `aspiceData.ts` (moved to `notes` array).

## Implementation Plan
1. Update `BasePractice` and `GenericPractice` interfaces in `aspiceData.ts` to add `notes?: string[]`.
2. Refactor all BP and GP entries in `aspiceData.ts`: strip Note lines from `text`, populate `notes` array for each entry that has notes.
3. Update `PracticeState` to include `evidences: string[]`.
4. Update `defaultPracticeState()` to include `evidences: []`.
5. Update `PracticeCard` props to accept `notes` and `showEvidences` (or derive from `showWorkProducts`).
6. In `PracticeCard`, add a local `notesOpen` state toggle with a "Notes" button. Render notes in a collapsible panel.
7. In `PracticeCard`, add the Evidences Checked section (when `showWorkProducts` is true): a list of text inputs with remove buttons, and an "+ Add Evidence" button below.
8. Update save/load serialization to handle `evidences` field (serialize to/from `workProductsInspected` as JSON object `{ workProducts: string, evidences: string[] }`).
9. Validate, typecheck, and build.
