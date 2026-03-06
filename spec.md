# Infineon ASPICE Assessment Tool

## Current State

The app has a full authentication system (login, signup, roles: admin/user) stored in localStorage. The `authStorage.ts` utility manages users, sessions, ownership records, and assessment sharing. The `UserProfileMenu` component in the top-right header gives access to Change Password and Logout. There is no admin-specific user management UI currently.

The backend (Motoko) handles assessments, ratings, planning, and target profiles — all stored as stable variables. There are no audit log structures in the backend or frontend.

---

## Requested Changes (Diff)

### Add

1. **Admin: User Management Panel**
   - A new page/view accessible only by admin, reachable from the profile dropdown as "Manage Users"
   - User list table showing: Username, Role, Registration Date, Number of Assessments, Last Active, Status (Active/Suspended)
   - Per-user action menu with:
     - Deactivate / Reactivate (suspend/unsuspend)
     - Delete user (with confirmation dialog)
     - Promote to Admin / Demote to User
     - View Assessments (navigates to a filtered list of that user's assessments)
   - Admin cannot deactivate/delete/demote their own account

2. **Admin: Audit / Activity Log Panel**
   - A new page/view accessible only by admin, reachable from the profile dropdown as "Activity Log"
   - Logs the following events (with timestamp, actor username, and description):
     - User registered
     - User logged in
     - Assessment created
     - Assessment deleted
     - Assessment saved (major saves: assessment info, scope, schedule, ratings)
     - User granted/revoked access to an assessment
     - Admin actions: user deactivated, reactivated, deleted, promoted, demoted
   - Displayed in reverse-chronological order
   - Filterable by: all events / user / assessment events / admin actions

3. **`authStorage.ts` additions**
   - `suspendUser(adminToken, targetUserId)` — sets `suspended: true` on user record
   - `unsuspendUser(adminToken, targetUserId)` — sets `suspended: false`
   - `deleteUserById(adminToken, targetUserId)` — removes user and clears their sessions/ownership/access
   - `promoteUser(adminToken, targetUserId)` — sets role to "admin"
   - `demoteUser(adminToken, targetUserId)` — sets role to "user"
   - `getAllUsers()` — returns all users (admin only)
   - `getLastActive(userId)` — returns last login timestamp stored per-user
   - Blocked login for suspended users: `loginUser` should check `suspended` flag and return an error
   - `StoredUser` type gains: `suspended?: boolean`, `lastActive?: number`

4. **`auditLog.ts` new utility**
   - `logAuditEvent(type, actorUsername, description, metadata?)` — appends to `infineon_audit_log` in localStorage
   - `getAuditLog()` — returns all events sorted newest-first
   - `clearAuditLog()` — admin-only clear (optional)
   - Event shape: `{ id, timestamp, type, actorUsername, description }`

5. **Audit event wiring**
   - Call `logAuditEvent` from:
     - `registerUser` → "user_registered"
     - `loginUser` → "user_login"
     - `createAssessment` (Dashboard) → "assessment_created"
     - `deleteAssessment` (Dashboard) → "assessment_deleted"
     - `grantAssessmentAccess` / `revokeAssessmentAccess` → "access_granted" / "access_revoked"
     - Admin user management actions → "admin_action"

### Modify

- **`UserProfileMenu.tsx`**: Add two new dropdown items for admin only — "Manage Users" and "Activity Log" — that navigate to the respective admin pages
- **`loginUser` in `authStorage.ts`**: Check `suspended` flag; if true, return `{ err: "Account is suspended. Contact your administrator." }`; also update `lastActive` timestamp on successful login
- **`App.tsx`**: Register two new routes — `"admin-users"` and `"admin-audit"` — accessible only when `isAdmin` is true; add to `renderPage` switch

### Remove

- Nothing removed

---

## Implementation Plan

1. **`auditLog.ts`** — Create new utility with `logAuditEvent`, `getAuditLog`, event types
2. **`authStorage.ts`** — Add `suspended`/`lastActive` fields to `StoredUser`; add `suspendUser`, `unsuspendUser`, `deleteUserById`, `promoteUser`, `demoteUser`, `getAllUsers`, `getLastActive`; update `loginUser` to check suspension and update lastActive; wire `logAuditEvent` into register and login
3. **`authStorage.ts` wiring for assessments** — Wire `logAuditEvent` into `createAssessment`, `deleteAssessment`, `grantAssessmentAccess`, `revokeAssessmentAccess`
4. **`AdminUsersPage.tsx`** — New component: table of all users with columns (Username, Role badge, Registration Date, # Assessments, Last Active, Status), per-row action dropdown (Deactivate/Reactivate, Promote/Demote, View Assessments, Delete with confirm dialog)
5. **`AdminAuditPage.tsx`** — New component: audit log list with timestamp, actor, description; filter tabs (All / Users / Assessments / Admin Actions)
6. **`UserProfileMenu.tsx`** — Add admin-only menu items "Manage Users" and "Activity Log"
7. **`App.tsx`** — Add routes for `admin-users` and `admin-audit`; protect with `isAdmin` guard
