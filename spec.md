# Q-Insight

## Current State

- **Practice multi-select** in Add/Edit Finding dialog: Search input exists but shows ALL BPs/GPs immediately when the dialog opens. No minimum character threshold is enforced.
- **Add Entry button**: Already present at all node levels (BP, GP, PA, main process). No change needed here.
- **Global Strengths/Weaknesses in GenerateReport**: Free-text entry only. No ability to import findings from Perform Assessment. Both lists are `string[]`.
- **PPT Global Strengths/Weaknesses slides**: Render from `data.globalStrengths` / `data.globalWeaknesses` as plain `string[]`.

## Requested Changes (Diff)

### Add
- **Finding picker in GenerateReport**: Next to each Global Strengths list and Global Weaknesses list, add a picker button (e.g., "+ Import from Assessment"). Clicking it opens a dropdown/modal listing only Strength-type findings (for Strengths section) or Weakness-type findings (for Weaknesses section). Suggestions are excluded. When selected, the finding's plain text (stripped of rich text tokens) is added to the list as a string entry. PPT export renders these alongside manually typed entries.

### Modify
- **Practice search — minimum character threshold**: Change `filteredPractices` logic so that when `practiceSearch.trim().length < 2`, the result is an empty array (nothing shown). Results only appear after 2+ characters are typed. The placeholder text should be "Search Practices" (capital P).
- **PPT Global Strengths/Weaknesses**: No type change needed — imported findings are stored as plain strings in `globalStrengths`/`globalWeaknesses` arrays, so PPT rendering is unchanged.

### Remove
- Nothing removed.

## Implementation Plan

1. **PerformAssessment.tsx — Practice search threshold**
   - Change `filteredPractices` computation: if `practiceSearch.trim().length < 2`, return `[]` (empty array, no results shown)
   - Update placeholder to `"Search Practices"`
   - Add a small hint text below the search input: "Type at least 2 characters to search"

2. **GenerateReport.tsx — Finding picker**
   - Load all findings for the current assessment from the backend (already available via `useQueries` hooks — `swEntries` or equivalent)
   - Filter Strength-type findings for the Strengths picker; Weakness-type for the Weaknesses picker
   - Add an "Import from Assessment" button/icon next to each section's Add button
   - Clicking it shows a dropdown list of available findings (display: plain text version of `f.text`, stripping `**`, `*`, `•`, `[[ev:ID:Name]]` tokens)
   - Selecting a finding appends its plain text to the respective `globalStrengths` or `globalWeaknesses` array
   - The entry is immediately visible in the list and marked dirty (triggers autosave)
   - Deduplicate: if the finding text is already in the list, do not add it again

3. **exportPpt.ts — No changes needed**
   - Imported findings are stored as plain strings in the same `string[]` arrays — PPT rendering is unchanged.
