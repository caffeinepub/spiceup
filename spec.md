# Infineon ASPICE Assessment Tool

## Current State
Full-stack ASPICE assessment app with: Dashboard, Assessment Info, Define Target Profile, Assessment Planning, Upload Work Products, Perform Assessment, View Results, Generate Report. Backend is Motoko with stable storage.

## Requested Changes (Diff)

### Add
- Global rating color system: F (green, 86-100), L (yellow-green, 51-85), P (yellow, 16-50), N (dark red, 0-15), NA (gray) — applied everywhere ratings appear (badges, table cells, charts, perform assessment buttons)
- Assessment Info: Lead Assessor ID field and up to 3 Co-Assessors each with name + INTACS ID fields (dynamic add/remove up to 3)
- Assessment Info: "Application Parameters" as its own separate card section (move checkboxes out of Project Information)
- Assessment Planning: Session Name field added to each session row (one line display: Session Name | Process | Notes)
- View Results: Complete redesign — cross-process summary table with Process Areas as rows, and PA1.1 (all BPs), PA2.1 (all GPs), PA2.2 (all GPs), PA3.1 (all GPs), PA3.2 (all GPs) as column groups; each cell shows the rating with the defined color code

### Modify
- Assessment Info: Remove "Assessor Body" field (field + state + backend still stores it but hide from UI)
- Assessment Info: Remove "Target Profile" field from Standards & Classification section — there is no such field currently but ensure "Target Capability Level" is kept (it stays)
- Define Target Profile: Remove the process count text "(X processes)" from each group header
- Define Target Profile: Remove the disabled group hint text "This group is disabled and will be excluded from Planning and Perform Assessment."
- Define Target Profile: Change from single-column stacked list to 2-column grid layout so all process groups are visible at once; each group card has toggle + collapsible process list below it
- Assessment Planning: Session rows display all info (Session Name, Process, Notes) in a single compact line
- App.tsx: Remove "Upload Work Products" from navigation items entirely
- View Results: Replace the existing per-process collapsible table with a single cross-process matrix table

### Remove
- Upload Work Products navigation item from sidebar
- Assessor Body field from Assessment Info UI
- Process count "(X processes)" text from Define Target Profile
- Disabled group hint text in Define Target Profile

## Implementation Plan
1. Define ASPICE_RATING_COLORS constant with hex codes and Tailwind classes matching the image legend (F=green #22c55e, L=#a3e635 lime/yellow-green, P=yellow #eab308, N=dark red #991b1b, NA=gray)
2. AssessmentInfo.tsx: Remove assessorBody field UI; add Lead Assessor ID input; replace single coAssessor with dynamic list of up to 3 co-assessors (each with name + ID); move Application Parameters checkboxes into separate FormSection card
3. DefineTargetProfile.tsx: Remove process count span; remove disabled hint paragraph; switch PROCESS_GROUPS map to 2-column CSS grid; each group is a card with toggle in header and collapsible process rows
4. AssessmentPlanning.tsx: Add sessionName field to SessionData interface; add Session Name input to each session row; display in one compact line: [#] [Session Name] [Process dropdown] [Notes] [×]
5. App.tsx: Remove "work-products" nav item and its Upload Work Products case from renderPage
6. ViewResults.tsx: Redesign results section — build cross-process matrix table where rows = processes, columns = PA1.1 BPs + PA2.1 GPs + PA2.2 GPs + PA3.1 GPs + PA3.2 GPs; each cell is a colored rating badge using the ASPICE color scheme; keep charts but apply consistent colors
7. Apply ASPICE rating colors globally: N/P/L/F/NA color scheme from the image used in all RatingBadge components, rating selector buttons in Perform Assessment, chart fill colors, and View Results cells
