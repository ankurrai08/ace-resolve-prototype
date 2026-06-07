// ---- ACE primitives (shaped like the published ACE Developer Kit spec) ----

export type AgentStatus = "verified" | "unverified" | "revoked";

export interface Agent {
  agent_id: string;
  name: string;
  status: AgentStatus;
  capabilities: string[];
  registered_at: string;
}

export interface IntentConstraints {
  budget_total?: number;
  currency?: string;
  merchants?: string[];
  item?: string;
  quantity?: number;
  date_window?: string;
  seat_pref?: string;
  conditions?: string[];
}

export interface IntentContract {
  intent_id: string;
  card_id: string;
  card_name: string;
  raw_text: string;
  constraints: IntentConstraints;
  proof_of_intent_token: string; // HMAC-signed in the mock => "cryptographically locked"
  locked_at: string;
}

export interface PaymentToken {
  token_id: string;
  intent_id: string;
  spend_cap?: number;
  currency?: string;
  allowed_merchants?: string[];
  single_use: boolean;
  expires_at: string;
}

export interface ActualPurchase {
  merchant: string;
  amount: number;
  currency?: string;
  date?: string;
  quantity?: number;
  item?: string;
  seat_pref?: string;
  line_items?: string[];
}

export interface Transaction extends ActualPurchase {
  txn_id: string;
  token_id: string;
  intent_id: string;
  posted_at: string;
}

// ---- ACER reasoning output ----

export type FieldStatus = "match" | "partial" | "mismatch";

export interface FieldVerdict {
  field: string;
  expected: string;
  actual: string;
  status: FieldStatus;
  note: string;
  evidence_ref: string; // which evidence object this judgement is grounded in
}

export interface Fidelity {
  score: number; // 0-100
  confidence: number; // 0-1
  verdict: string; // plain-language, customer-readable
  per_field: FieldVerdict[];
}

export type Route = "self_serve" | "route" | "colleague_assist";

export interface Routing {
  route: Route;
  reason: string;
  remedy?: string;
  rationale?: string;
  guardrails_triggered: string[];
}

export type CaseStatus = "open" | "self_served" | "escalated" | "resolved";

export interface Decision {
  id: string;
  ts: string;
  actor: "acer" | "ccp" | "card_member";
  action: string; // e.g. "recommend", "self_serve", "escalate", "approve", "override"
  reason?: string;
  route?: Route;
}

export interface Case {
  case_id: string;
  created_at: string;
  card_id: string;
  card_name: string;
  agent: Agent;
  intent: IntentContract;
  payment_token: PaymentToken;
  transaction: Transaction;
  fidelity: Fidelity;
  routing: Routing;
  status: CaseStatus;
  decisions: Decision[];
}

export interface AuditEntry {
  id: string;
  ts: string;
  case_id?: string;
  step: string;
  actor: string;
  model?: string;
  prompt_version?: string;
  payload: unknown;
}
