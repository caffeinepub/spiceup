// ─── Audit Log Utility ───────────────────────────────────────

export type AuditEventType =
  | "user_registered"
  | "user_login"
  | "assessment_created"
  | "assessment_deleted"
  | "access_granted"
  | "access_revoked"
  | "admin_action";

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  actorUsername: string;
  description: string;
  metadata?: Record<string, string>;
}

const AUDIT_LOG_KEY = "infineon_audit_log";
const MAX_LOG_SIZE = 1000; // cap to avoid unbounded localStorage growth

function loadLog(): AuditEvent[] {
  try {
    return JSON.parse(
      localStorage.getItem(AUDIT_LOG_KEY) ?? "[]",
    ) as AuditEvent[];
  } catch {
    return [];
  }
}

function saveLog(events: AuditEvent[]): void {
  localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(events));
}

export function logAuditEvent(
  type: AuditEventType,
  actorUsername: string,
  description: string,
  metadata?: Record<string, string>,
): void {
  const events = loadLog();
  const newEvent: AuditEvent = {
    id: `audit_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    timestamp: Date.now(),
    type,
    actorUsername,
    description,
    metadata,
  };
  // Prepend newest first, cap size
  const updated = [newEvent, ...events].slice(0, MAX_LOG_SIZE);
  saveLog(updated);
}

export function getAuditLog(): AuditEvent[] {
  return loadLog();
}

export function clearAuditLog(): void {
  localStorage.removeItem(AUDIT_LOG_KEY);
}
