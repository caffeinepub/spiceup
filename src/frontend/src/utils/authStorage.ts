import { logAuditEvent } from "./auditLog";

// ─── Types ────────────────────────────────────────────────────

export type UserRole = "admin" | "user";

export interface StoredUser {
  id: string;
  username: string;
  passwordHash: string;
  role: UserRole;
  createdAt: number;
  suspended?: boolean;
  lastActive?: number;
}

export interface StoredSession {
  token: string;
  userId: string;
  username: string;
  role: UserRole;
  expiresAt: number;
}

// ─── Storage Keys ────────────────────────────────────────────

const USERS_KEY = "infineon_users";
const SESSION_KEY = "infineon_session";
const SESSION_TOKEN_KEY = "infineon_session_token";
const OWNERSHIP_KEY = "infineon_assessment_ownership";
const ACCESS_KEY = "infineon_assessment_access";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

// ─── Hash ────────────────────────────────────────────────────

/**
 * FNV-1a–style deterministic hash (runs synchronously in the browser).
 * NOT cryptographically secure – fine for a trusted-team, localStorage-based system.
 */
export function hashPassword(username: string, password: string): string {
  const input = `${username}:${password}:infineon2024`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  // Extend to a longer hex string by hashing again with a second seed
  let hash2 = 0x5a4f_3b2c;
  for (let i = input.length - 1; i >= 0; i--) {
    hash2 ^= input.charCodeAt(i);
    hash2 = Math.imul(hash2, 0x01000193) >>> 0;
  }
  return (
    hash.toString(16).padStart(8, "0") + hash2.toString(16).padStart(8, "0")
  );
}

// ─── Internal helpers ─────────────────────────────────────────

export function getUsers(): StoredUser[] {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY) ?? "[]") as StoredUser[];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function getSession(token: string): StoredSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as StoredSession;
    if (session.token !== token) return null;
    if (Date.now() > session.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

function generateToken(userId: string): string {
  return `tok_${userId}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function requireAdminSession(token: string): StoredSession | null {
  const session = getSession(token);
  if (!session || session.role !== "admin") return null;
  return session;
}

// ─── Seed admin ───────────────────────────────────────────────

export function seedAdminUser(): void {
  const users = getUsers();
  const exists = users.some((u) => u.username === "admin");
  if (!exists) {
    const admin: StoredUser = {
      id: "admin",
      username: "admin",
      passwordHash: hashPassword("admin", "admin"),
      role: "admin",
      createdAt: Date.now(),
    };
    saveUsers([...users, admin]);
  }
}

// ─── Auth operations ──────────────────────────────────────────

export function registerUser(
  username: string,
  password: string,
): { ok: { id: string } } | { err: string } {
  if (!username || username.length < 3) {
    return { err: "Username must be at least 3 characters" };
  }
  if (!password || password.length < 4) {
    return { err: "Password must be at least 4 characters" };
  }
  const users = getUsers();
  if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
    return { err: "Username is already taken" };
  }
  const id = `user_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const newUser: StoredUser = {
    id,
    username,
    passwordHash: hashPassword(username, password),
    role: "user",
    createdAt: Date.now(),
    suspended: false,
    lastActive: Date.now(),
  };
  saveUsers([...users, newUser]);
  logAuditEvent("user_registered", username, `User "${username}" registered`);
  return { ok: { id } };
}

export function loginUser(
  username: string,
  password: string,
):
  | { ok: { token: string; username: string; role: UserRole; userId: string } }
  | { err: string } {
  const users = getUsers();
  const user = users.find(
    (u) => u.username.toLowerCase() === username.toLowerCase(),
  );
  if (!user) return { err: "Invalid username or password" };
  if (user.passwordHash !== hashPassword(user.username, password)) {
    return { err: "Invalid username or password" };
  }
  if (user.suspended) {
    return { err: "Account is suspended. Contact your administrator." };
  }
  const token = generateToken(user.id);
  const session: StoredSession = {
    token,
    userId: user.id,
    username: user.username,
    role: user.role,
    expiresAt: Date.now() + SESSION_TTL_MS,
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.setItem(SESSION_TOKEN_KEY, token);

  // Update lastActive
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) {
    users[idx] = { ...users[idx], lastActive: Date.now() };
    saveUsers(users);
  }

  logAuditEvent(
    "user_login",
    user.username,
    `User "${user.username}" logged in`,
  );
  return {
    ok: { token, username: user.username, role: user.role, userId: user.id },
  };
}

export function logoutUser(_token: string): void {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_TOKEN_KEY);
  localStorage.removeItem("infineon_activePage");
  localStorage.removeItem("infineon_currentAssessmentId");
  localStorage.removeItem("infineon_currentAssessmentTitle");
}

export function getSessionUser(
  token: string,
): { userId: string; username: string; role: UserRole } | null {
  const session = getSession(token);
  if (!session) return null;
  return {
    userId: session.userId,
    username: session.username,
    role: session.role,
  };
}

export function getSavedSessionToken(): string | null {
  return localStorage.getItem(SESSION_TOKEN_KEY);
}

export function changeUserPassword(
  token: string,
  oldPassword: string,
  newPassword: string,
): { ok: true } | { err: string } {
  const session = getSession(token);
  if (!session) return { err: "Not authenticated" };
  if (!newPassword || newPassword.length < 4) {
    return { err: "New password must be at least 4 characters" };
  }
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === session.userId);
  if (idx < 0) return { err: "User not found" };
  const user = users[idx];
  if (user.passwordHash !== hashPassword(user.username, oldPassword)) {
    return { err: "Old password is incorrect" };
  }
  users[idx] = {
    ...user,
    passwordHash: hashPassword(user.username, newPassword),
  };
  saveUsers(users);
  return { ok: true };
}

export function checkUsernameExists(username: string): boolean {
  const users = getUsers();
  return users.some((u) => u.username.toLowerCase() === username.toLowerCase());
}

// ─── Admin: User Management ───────────────────────────────────

export function getAllUsers(): StoredUser[] {
  return getUsers();
}

export function suspendUser(
  adminToken: string,
  targetUserId: string,
): { ok: true } | { err: string } {
  const session = requireAdminSession(adminToken);
  if (!session) return { err: "Unauthorized" };
  if (targetUserId === session.userId)
    return { err: "Cannot suspend your own account" };

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === targetUserId);
  if (idx < 0) return { err: "User not found" };

  users[idx] = { ...users[idx], suspended: true };
  saveUsers(users);
  logAuditEvent(
    "admin_action",
    session.username,
    `Admin "${session.username}" suspended user "${users[idx].username}"`,
    { targetUser: users[idx].username, action: "suspend" },
  );
  return { ok: true };
}

export function unsuspendUser(
  adminToken: string,
  targetUserId: string,
): { ok: true } | { err: string } {
  const session = requireAdminSession(adminToken);
  if (!session) return { err: "Unauthorized" };

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === targetUserId);
  if (idx < 0) return { err: "User not found" };

  users[idx] = { ...users[idx], suspended: false };
  saveUsers(users);
  logAuditEvent(
    "admin_action",
    session.username,
    `Admin "${session.username}" reactivated user "${users[idx].username}"`,
    { targetUser: users[idx].username, action: "unsuspend" },
  );
  return { ok: true };
}

export function deleteUserById(
  adminToken: string,
  targetUserId: string,
): { ok: true } | { err: string } {
  const session = requireAdminSession(adminToken);
  if (!session) return { err: "Unauthorized" };
  if (targetUserId === session.userId)
    return { err: "Cannot delete your own account" };

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === targetUserId);
  if (idx < 0) return { err: "User not found" };

  const targetUsername = users[idx].username;
  const updated = users.filter((u) => u.id !== targetUserId);
  saveUsers(updated);

  // Clean up ownership — reassign to admin
  const ownership = getOwnership();
  let ownershipChanged = false;
  for (const [assessmentId, record] of Object.entries(ownership)) {
    if (record.ownerUserId === targetUserId) {
      ownership[assessmentId] = {
        ownerUserId: "admin",
        createdBy: record.createdBy,
      };
      ownershipChanged = true;
    }
  }
  if (ownershipChanged) saveOwnership(ownership);

  // Remove from access lists
  const accessMap = getAccessMap();
  let accessChanged = false;
  for (const assessmentId of Object.keys(accessMap)) {
    const before = accessMap[assessmentId].length;
    accessMap[assessmentId] = accessMap[assessmentId].filter(
      (u) => u.toLowerCase() !== targetUsername.toLowerCase(),
    );
    if (accessMap[assessmentId].length !== before) accessChanged = true;
  }
  if (accessChanged) saveAccessMap(accessMap);

  logAuditEvent(
    "admin_action",
    session.username,
    `Admin "${session.username}" deleted user "${targetUsername}"`,
    { targetUser: targetUsername, action: "delete" },
  );
  return { ok: true };
}

export function promoteUser(
  adminToken: string,
  targetUserId: string,
): { ok: true } | { err: string } {
  const session = requireAdminSession(adminToken);
  if (!session) return { err: "Unauthorized" };

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === targetUserId);
  if (idx < 0) return { err: "User not found" };
  if (users[idx].role === "admin") return { err: "User is already an admin" };

  users[idx] = { ...users[idx], role: "admin" };
  saveUsers(users);
  logAuditEvent(
    "admin_action",
    session.username,
    `Admin "${session.username}" promoted "${users[idx].username}" to admin`,
    { targetUser: users[idx].username, action: "promote" },
  );
  return { ok: true };
}

export function demoteUser(
  adminToken: string,
  targetUserId: string,
): { ok: true } | { err: string } {
  const session = requireAdminSession(adminToken);
  if (!session) return { err: "Unauthorized" };
  if (targetUserId === session.userId)
    return { err: "Cannot demote your own account" };

  const users = getUsers();
  const idx = users.findIndex((u) => u.id === targetUserId);
  if (idx < 0) return { err: "User not found" };
  if (users[idx].role === "user")
    return { err: "User is already a regular user" };

  users[idx] = { ...users[idx], role: "user" };
  saveUsers(users);
  logAuditEvent(
    "admin_action",
    session.username,
    `Admin "${session.username}" demoted "${users[idx].username}" to user`,
    { targetUser: users[idx].username, action: "demote" },
  );
  return { ok: true };
}

// ─── Ownership ────────────────────────────────────────────────

type OwnershipRecord = Record<
  string,
  { ownerUserId: string; createdBy: string }
>;

function getOwnership(): OwnershipRecord {
  try {
    return JSON.parse(
      localStorage.getItem(OWNERSHIP_KEY) ?? "{}",
    ) as OwnershipRecord;
  } catch {
    return {};
  }
}

function saveOwnership(data: OwnershipRecord): void {
  localStorage.setItem(OWNERSHIP_KEY, JSON.stringify(data));
}

export function setAssessmentOwnership(
  assessmentId: string,
  ownerUserId: string,
  createdBy: string,
): void {
  const ownership = getOwnership();
  ownership[assessmentId] = { ownerUserId, createdBy };
  saveOwnership(ownership);
}

export function getAssessmentOwnership(
  assessmentId: string,
): { ownerUserId: string; createdBy: string } | null {
  const ownership = getOwnership();
  return ownership[assessmentId] ?? null;
}

export function migrateOrphanedAssessments(assessmentIds: string[]): void {
  const ownership = getOwnership();
  let changed = false;
  for (const id of assessmentIds) {
    if (!ownership[id]) {
      ownership[id] = { ownerUserId: "admin", createdBy: "admin" };
      changed = true;
    }
  }
  if (changed) saveOwnership(ownership);
}

export function getAssessmentCountForUser(userId: string): number {
  const ownership = getOwnership();
  return Object.values(ownership).filter((r) => r.ownerUserId === userId)
    .length;
}

export function getAssessmentIdsForUser(userId: string): string[] {
  const ownership = getOwnership();
  return Object.entries(ownership)
    .filter(([, r]) => r.ownerUserId === userId)
    .map(([id]) => id);
}

// ─── Access sharing ───────────────────────────────────────────

type AccessRecord = Record<string, string[]>; // assessmentId -> usernames[]

function getAccessMap(): AccessRecord {
  try {
    return JSON.parse(localStorage.getItem(ACCESS_KEY) ?? "{}") as AccessRecord;
  } catch {
    return {};
  }
}

function saveAccessMap(data: AccessRecord): void {
  localStorage.setItem(ACCESS_KEY, JSON.stringify(data));
}

export function grantAssessmentAccess(
  token: string,
  assessmentId: string,
  targetUsername: string,
  actorUsername?: string,
): { ok: true } | { err: string } {
  const session = getSession(token);
  if (!session) return { err: "Not authenticated" };

  // Verify requester is owner or admin
  const ownership = getAssessmentOwnership(assessmentId);
  if (
    session.role !== "admin" &&
    (!ownership || ownership.ownerUserId !== session.userId)
  ) {
    return { err: "You do not have permission to share this assessment" };
  }

  if (!checkUsernameExists(targetUsername)) {
    return { err: `User "${targetUsername}" does not exist` };
  }
  if (targetUsername.toLowerCase() === session.username.toLowerCase()) {
    return { err: "You cannot share an assessment with yourself" };
  }

  const map = getAccessMap();
  const list = map[assessmentId] ?? [];
  if (list.some((u) => u.toLowerCase() === targetUsername.toLowerCase())) {
    return { err: `"${targetUsername}" already has access` };
  }
  map[assessmentId] = [...list, targetUsername];
  saveAccessMap(map);

  logAuditEvent(
    "access_granted",
    actorUsername ?? session.username,
    `"${actorUsername ?? session.username}" granted access to assessment #${assessmentId} for "${targetUsername}"`,
    { assessmentId, targetUser: targetUsername },
  );
  return { ok: true };
}

export function revokeAssessmentAccess(
  token: string,
  assessmentId: string,
  targetUsername: string,
  actorUsername?: string,
): { ok: true } | { err: string } {
  const session = getSession(token);
  if (!session) return { err: "Not authenticated" };

  const ownership = getAssessmentOwnership(assessmentId);
  if (
    session.role !== "admin" &&
    (!ownership || ownership.ownerUserId !== session.userId)
  ) {
    return { err: "You do not have permission to revoke access" };
  }

  const map = getAccessMap();
  const list = map[assessmentId] ?? [];
  map[assessmentId] = list.filter(
    (u) => u.toLowerCase() !== targetUsername.toLowerCase(),
  );
  saveAccessMap(map);

  logAuditEvent(
    "access_revoked",
    actorUsername ?? session.username,
    `"${actorUsername ?? session.username}" revoked access to assessment #${assessmentId} from "${targetUsername}"`,
    { assessmentId, targetUser: targetUsername },
  );
  return { ok: true };
}

export function getAssessmentAccessList(
  _token: string,
  assessmentId: string,
): string[] {
  const map = getAccessMap();
  return map[assessmentId] ?? [];
}

export function canUserAccessAssessment(
  username: string,
  role: UserRole,
  userId: string,
  assessmentId: string,
): boolean {
  if (role === "admin") return true;
  const ownership = getAssessmentOwnership(assessmentId);
  if (ownership && ownership.ownerUserId === userId) return true;
  const map = getAccessMap();
  const list = map[assessmentId] ?? [];
  return list.some((u) => u.toLowerCase() === username.toLowerCase());
}
