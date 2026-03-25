# Q-Insight

## Current State
The Add/Edit Finding dialog has a custom `RichTextEditor` with Bold, Italic, Bullet toolbar buttons. Evidence linking is done via a separate popover (chain icon) on the finding row, which stores `referencedEvidenceIds` as badges below the description in the table. `renderRichText` parses `**bold**`, `*italic*`, and `• bullet` markdown but has no inline link support. PPT export strips all markdown via `stripHtml()` and ignores `referencedEvidenceIds`.

## Requested Changes (Diff)

### Add
- Evidence link button in `RichTextEditor` toolbar (alongside Bold, Italic, Bullet)
- Clicking the evidence link button opens a picker/popover listing all project evidence items by name; selecting one inserts an inline evidence reference token into the text: `[[ev:ID:Name]]`
- `renderRichText` parses `[[ev:ID:Name]]` tokens and renders them as clickable blue link spans
- Clicking an inline evidence link opens a small preview modal showing Evidence Name, Link (clickable URL), and Version
- PPT export: convert `[[ev:ID:Name]]` tokens to `[Name]` plain text; preserve **bold** and *italic* markers as pptxgenjs bold/italic runs

### Modify
- `RichTextEditor` component: add a 4th toolbar button (Link/Evidence icon) that opens the evidence picker
- `renderRichText`: add parsing for `[[ev:ID:Name]]` tokens → render as `<button>` styled as a blue link
- `collectFindings` in exportPpt: replace `stripHtml` with a function that converts markdown+evidence tokens to pptxgenjs text run arrays (bold, italic, plain, `[Name]` for evidence refs)
- Add/Edit Finding dialog: remove the separate "Referenced Evidence" checklist section
- Findings table row: remove the `EvidenceLinkPopover` chain icon and evidence badge renders

### Remove
- `EvidenceLinkPopover` component (chain icon on table row)
- `referencedEvidenceIds` badge rendering below description in table
- "Referenced Evidence" checklist section in the Add/Edit Finding dialog

## Implementation Plan
1. Add evidence link token format `[[ev:ID:Name]]` — update `RichTextEditor` to accept `projectEvidence` prop and add a 4th toolbar button that opens a small Popover listing all evidence; clicking an item inserts `[[ev:ID:Name]]` at cursor
2. Update `renderRichText` to parse `[[ev:ID:Name]]` tokens and render as clickable inline link spans
3. Add `EvidencePreviewModal` — small dialog showing name, clickable URL link, and version for a given evidence item
4. Wire `renderRichText` link clicks to open `EvidencePreviewModal` (pass state up via callback)
5. Remove `EvidenceLinkPopover` component, remove badge rendering from findings table, remove checklist from Add/Edit dialog
6. Update PPT export: replace `stripHtml` with a rich-text-to-pptx converter that outputs pptxgenjs text run arrays with bold/italic and `[Name]` for evidence tokens
