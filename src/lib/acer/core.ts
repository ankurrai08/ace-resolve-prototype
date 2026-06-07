import { TokenService, TxnLedger, IntentService } from "@/lib/ace";
import { getLLM } from "@/lib/llm/openai";
import { PROMPT_VERSION } from "@/lib/llm/provider";
import { audit } from "@/lib/audit";
import { getStore } from "@/lib/store/store";
import { id } from "@/lib/id";
import { redact } from "@/lib/redact";
import type {
  ActualPurchase,
  Agent,
  Case,
  Fidelity,
  IntentContract,
  PaymentToken,
  Routing,
} from "@/lib/types";

const HIGH_VALUE_USD = 1500;
const CONFIDENCE_FLOOR = 0.6;
const MODEL_MAIN = process.env.ACER_MODEL_MAIN || "gpt-4o";

/** Deterministic, explainable routing on top of the model's fidelity read. */
function decideRoute(
  fidelity: Fidelity,
  agent: Agent,
  txnAmount: number
): Pick<Routing, "route" | "reason" | "guardrails_triggered"> {
  const guardrails: string[] = [];
  if (agent.status !== "verified")
    guardrails.push(`agent_${agent.status}`);
  if (fidelity.confidence < CONFIDENCE_FLOOR)
    guardrails.push("low_confidence");
  if (txnAmount > HIGH_VALUE_USD) guardrails.push("high_value");

  const merchantMismatch = fidelity.per_field.some(
    (f) => /merchant/i.test(f.field) && f.status === "mismatch"
  );

  if (guardrails.length > 0) {
    return {
      route: "colleague_assist",
      reason: `Forced escalation — guardrail(s) triggered: ${guardrails.join(", ")}.`,
      guardrails_triggered: guardrails,
    };
  }
  if (merchantMismatch) {
    return {
      route: "route",
      reason:
        "Agent transacted outside the approved merchant. Auto-routed to the disputes / Agent Purchase Protection queue.",
      guardrails_triggered: [],
    };
  }
  if (fidelity.score >= 85) {
    return {
      route: "self_serve",
      reason: "Agent honored the Card Member's intent. No action required.",
      guardrails_triggered: [],
    };
  }
  if (fidelity.score >= 50) {
    return {
      route: "self_serve",
      reason:
        "Clear, bounded mismatch on a trusted merchant. Card Member can resolve in-app.",
      guardrails_triggered: [],
    };
  }
  return {
    route: "colleague_assist",
    reason: "Low intent fidelity — needs human review.",
    guardrails_triggered: [],
  };
}

export async function runACER(
  intent: IntentContract,
  token: PaymentToken,
  agent: Agent,
  actual: ActualPurchase
): Promise<Case> {
  const llm = getLLM();
  const caseId = id("case");

  // Stage 0 — assemble evidence + verify the proof-of-intent token + PII gate.
  const tokenValid = IntentService.verify(intent);
  const { count: piiCount } = redact(intent.raw_text);
  const txn = TxnLedger.post(token, actual);
  audit({
    case_id: caseId,
    step: "stage0_assemble_redact",
    actor: "acer",
    payload: {
      proof_of_intent_valid: tokenValid,
      pii_redacted_count: piiCount,
      evidence: ["intent_contract", "payment_token", "transaction", "agent_registry"],
    },
  });

  // Stage 2 — intent-fidelity scoring (Stage 1 extraction already happened at lock time).
  const fidelity = await llm.scoreFidelity(intent.constraints, txn);
  audit({
    case_id: caseId,
    step: "stage2_fidelity",
    actor: "acer",
    model: MODEL_MAIN,
    prompt_version: PROMPT_VERSION,
    payload: fidelity,
  });

  // Stage 3 — routing (deterministic guardrails) + grounded remedy.
  const base = decideRoute(fidelity, agent, txn.amount);
  let remedy: string | undefined;
  let rationale: string | undefined;
  if (!(base.route === "self_serve" && fidelity.score >= 85)) {
    const rec = await llm.recommend({
      raw_intent: intent.raw_text,
      constraints: intent.constraints,
      actual: txn,
      fidelity,
      agent_status: agent.status,
    });
    remedy = rec.remedy;
    rationale = rec.rationale;
  } else {
    remedy = "No action needed — the agent honored your intent.";
    rationale = "All checked fields matched the approved intent.";
  }
  const routing: Routing = { ...base, remedy, rationale };
  audit({
    case_id: caseId,
    step: "stage3_route",
    actor: "acer",
    model: MODEL_MAIN,
    prompt_version: PROMPT_VERSION,
    payload: routing,
  });

  const now = new Date().toISOString();
  const c: Case = {
    case_id: caseId,
    created_at: now,
    card_id: intent.card_id,
    card_name: intent.card_name,
    agent,
    intent,
    payment_token: token,
    transaction: txn,
    fidelity,
    routing,
    status: routing.route === "colleague_assist" ? "escalated" : "open",
    decisions: [
      {
        id: id("dec"),
        ts: now,
        actor: "acer",
        action: "recommend",
        route: routing.route,
        reason: routing.reason,
      },
    ],
  };
  getStore().cases.set(caseId, c);
  audit({ case_id: caseId, step: "case_created", actor: "acer", payload: { status: c.status } });
  return c;
}
