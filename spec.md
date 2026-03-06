# Infineon ASPICE Assessment Tool — Authentication & Authorization

## Current State

- No login system. App opens directly to the Dashboard.
- All assessments are visible to anyone who opens the app.
- All backend functions accept any caller with no ownership or role checks.
- Assessment records have no owner field.
- AppContext holds: currentAssessmentId, currentAssessmentTitle, activePage, navigateTo.
- Session is persisted via localStorage (page, assessment ID/title).
- Backend: Motoko canister with Assessment, AssessmentInfoData, ProcessGroupConfig, AssessmentDay, PracticeRating stable maps.

## Requested Changes (Diff)

### Add

**Backend**
- `User` type: `{ id: Nat; username: Text; passwordHash: Text; role: Text; createdAt: Time }` (role = "admin" | "user")
- `Session` type: `{ token: Text; userId: Nat; username: Text; role: Text; expiresAt: Time }`
- `AssessmentAccess` type: `{ assessmentId: Nat; grantedToUsername: Text; grantedByUserId: Nat }` — for shared access records
- Stable maps: `userEntries`, `sessionEntries`, `accessEntries`
- Seed logic in `postupgrade` and actor init: if no user with username "admin" exists, create one with passwordHash of "admin" and role "admin"
- `Assessment` type gains `ownerUserId: Nat` and `createdBy: Text` fields
- Migration: on postupgrade, any existing assessments with no owner get ownerUserId = admin's userId
- Auth API:
  - `register(username, password) -> { ok: Nat } | { err: Text }` — creates user with role "user"; fails if username taken
  - `login(username, password) -> { ok: { token: Text; username: Text; role: Text } } | { err: Text }` — validates credentials, creates session token (UUID-like from hash+time), 30-day expiry
  - `logout(token) -> ()` — deletes session
  - `getSession(token) -> { ok: { userId: Nat; username: Text; role: Text } } | { err: Text }` — validates token not expired
  - `changePassword(token, oldPassword, newPassword) -> { ok: () } | { err: Text }`
- Access sharing API:
  - `grantAccess(token, assessmentId, targetUsername) -> { ok: () } | { err: Text }` — only owner can grant; validates targetUsername exists
  - `revokeAccess(token, assessmentId, targetUsername) -> { ok: () } | { err: Text }` — only owner can revoke
  - `getAssessmentAccessList(token, assessmentId) -> { ok: [Text] } | { err: Text }` — returns list of usernames who have access
- Authorization enforcement on all existing write functions: validate session token, check ownership or shared access or admin role
- `getAllAssessments(token)` returns only assessments owned by or shared with the calling user (admin sees all)
- `createAssessment(token, name)` sets ownerUserId and createdBy from session
- `Assessment` type gains `createdBy: Text` field visible to frontend

**Frontend**
- `AuthContext` with: `currentUser: { userId, username, role } | null`, `sessionToken: string | null`, `login()`, `logout()`, `isAdmin: boolean`
- Session token persisted in localStorage (`infineon_session_token`) for persistent login
- On app load: call `getSession(token)` to restore auth state; if invalid/expired show login page
- `LoginPage` component: username + password fields, login button, link to signup
- `SignupPage` component: username + password + confirm password fields, submit, link back to login
- `UserProfileMenu` dropdown in top-right header: shows username + role badge, "Change Password" option, "Logout" option
- `ChangePasswordDialog` modal: old password, new password, confirm new password fields
- `ManageAccessDialog` modal (inside Dashboard or AssessmentInfo): input to grant access by username, list of current grantees with revoke buttons
- All backend calls pass `sessionToken` as first argument
- Assessments list in Dashboard shows `createdBy` column (admin view shows all, user sees own + shared)
- Route guard: if no valid session, always show login page regardless of stored page

### Modify

- `Assessment` type: add `ownerUserId: Nat` and `createdBy: Text`
- All backend write functions: add `token: Text` as first param, validate session, check authorization
- `getAllAssessments`: add `token: Text` param, filter by ownership + shared access (admin bypasses)
- `createAssessment`: add `token: Text` param, set owner from session
- `AppContext`: integrate with `AuthContext` for session-aware state
- `useQueries.ts`: all hooks pass `sessionToken` to backend calls
- `AssessmentHeaderBar`: add `UserProfileMenu` component in the right side
- Dashboard: "Manage Access" button per assessment row (only owner can see it); show `createdBy` column

### Remove

- Nothing removed from existing functionality.

## Implementation Plan

1. **Backend (Motoko)**:
   - Add User, Session, AssessmentAccess types and stable maps
   - Add password hashing (SHA256-based using Text concatenation salt trick since no crypto lib — use a deterministic hash combining username+password+salt constant)
   - Implement register, login, logout, getSession, changePassword
   - Implement grantAccess, revokeAccess, getAssessmentAccessList
   - Add ownerUserId + createdBy to Assessment type
   - Enforce auth on all existing write functions and getAllAssessments
   - Migration: seed admin user, reassign orphaned assessments to admin
   - Full preupgrade/postupgrade for all new stable maps

2. **Frontend**:
   - Create `AuthContext.tsx` with token persistence and session restore on load
   - Create `LoginPage.tsx` and `SignupPage.tsx`
   - Create `UserProfileMenu.tsx` with profile dropdown and change password dialog
   - Create `ManageAccessDialog.tsx` for sharing/revoking access per assessment
   - Wrap app in `AuthProvider`; show login page if no valid session
   - Update all `useQueries.ts` hooks to pass token
   - Update `AppContext` to clear on logout
   - Update Dashboard to show createdBy, manage access button
   - Update AssessmentHeaderBar to include UserProfileMenu
