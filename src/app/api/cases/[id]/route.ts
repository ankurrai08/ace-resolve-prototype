import { NextResponse } from "next/server";
import { getStore } from "@/lib/store/store";
import { auditForCase, audit } from "@/lib/audit";
import { id } from "@/lib/id";
import type { CaseStatus, Decision } from "@/lib/types";

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await ctx.params;
  const c = getStore().cases.get(caseId);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ case: c, audit: auditForCase(caseId) });
}

/**
 * Apply a human/CM action to a case.
 * actions: self_serve | escalate | approve | override | resolve
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id: caseId } = await ctx.params;
  const c = getStore().cases.get(caseId);
  if (!c) return NextResponse.json({ error: "not found" }, { status: 404 });

  const body = await req.json();
  const action: string = body.action;
  const reason: string | undefined = body.reason;
  const actor: Decision["actor"] = body.actor || "ccp";

  const map: Record<string, CaseStatus> = {
    self_serve: "self_served",
    escalate: "escalated",
    approve: "resolved",
    override: "resolved",
    resolve: "resolved",
  };
  const next = map[action];
  if (!next) return NextResponse.json({ error: "unknown action" }, { status: 400 });

  if (action === "override" && !reason) {
    return NextResponse.json({ error: "override requires a reason" }, { status: 400 });
  }

  c.status = next;
  const dec: Decision = {
    id: id("dec"),
    ts: new Date().toISOString(),
    actor,
    action,
    reason,
  };
  c.decisions.push(dec);
  audit({ case_id: caseId, step: `human_${action}`, actor, payload: { reason, status: next } });

  return NextResponse.json({ case: c });
}
