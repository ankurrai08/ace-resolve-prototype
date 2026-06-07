import { getStore } from "@/lib/store/store";
import { id } from "@/lib/id";
import type { AuditEntry } from "@/lib/types";

/** Append-only audit log. Nothing is ever mutated or deleted. */
export function audit(entry: Omit<AuditEntry, "id" | "ts">): AuditEntry {
  const e: AuditEntry = { id: id("aud"), ts: new Date().toISOString(), ...entry };
  getStore().audit.push(e);
  return e;
}

export function auditForCase(caseId: string): AuditEntry[] {
  return getStore().audit.filter((a) => a.case_id === caseId);
}

export function allAudit(): AuditEntry[] {
  return [...getStore().audit].reverse();
}
