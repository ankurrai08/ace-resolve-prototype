import OpenAI from "openai";
import { redact } from "@/lib/redact";
import type {
  ActualPurchase,
  Fidelity,
  IntentConstraints,
} from "@/lib/types";
import type {
  IntentExtraction,
  LLMProvider,
  RecommendInput,
  Recommendation,
} from "./provider";

const MODEL_MAIN = process.env.ACER_MODEL_MAIN || "gpt-4o";
const MODEL_FAST = process.env.ACER_MODEL_FAST || "gpt-4o-mini";

let _client: OpenAI | null = null;
function client(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

async function jsonCall<T>(
  model: string,
  system: string,
  user: string
): Promise<T> {
  const res = await client().chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  const content = res.choices[0]?.message?.content || "{}";
  return JSON.parse(content) as T;
}

export class OpenAIProvider implements LLMProvider {
  async extractIntent(rawText: string): Promise<IntentExtraction> {
    // PII gate before the text ever reaches the model.
    const { redacted } = redact(rawText);
    const system = `You are ACER's intent-extraction stage for Amex Agentic Commerce.
Convert a Card Member's natural-language delegation instruction into a structured,
checkable "intent contract". Only extract what is stated or clearly implied. Use
null for anything not specified. Return STRICT JSON:
{
  "constraints": {
    "budget_total": number|null,        // total spend cap implied by the instruction
    "currency": string|null,            // e.g. "USD"
    "merchants": string[]|null,         // merchants the CM restricted to
    "item": string|null,                // what to buy
    "quantity": number|null,
    "date_window": string|null,         // e.g. "Saturday the 14th" or "next week"
    "seat_pref": string|null,           // e.g. "aisle seats"
    "conditions": string[]|null         // any other explicit conditions
  },
  "notes": string                       // one short line on anything ambiguous
}`;
    return jsonCall<IntentExtraction>(
      MODEL_FAST,
      system,
      `Card Member instruction:\n"""${redacted}"""`
    );
  }

  async scoreFidelity(
    constraints: IntentConstraints,
    actual: ActualPurchase
  ): Promise<Fidelity> {
    const system = `You are ACER's intent-fidelity stage for Amex Agentic Commerce.
A registered AI agent purchased on a Card Member's behalf. Compare the APPROVED
INTENT (cryptographically locked constraints) against the ACTUAL PURCHASE the
agent made, field by field. Judge whether the agent honored the Card Member's
intent. Be precise and fair: an agent may have reasonable latitude where the
instruction was vague, but budget and explicit merchant/date constraints are hard.

Score each relevant field as "match", "partial", or "mismatch". Ground every
judgement in a specific evidence object: use evidence_ref values from this set:
"intent_contract", "payment_token", "transaction", "cart".

Return STRICT JSON:
{
  "score": number,            // 0-100 overall intent-fidelity
  "confidence": number,       // 0-1 how confident you are in this assessment
  "verdict": string,          // 1-2 sentences in plain language a Card Member understands
  "per_field": [
    { "field": string, "expected": string, "actual": string,
      "status": "match"|"partial"|"mismatch", "note": string, "evidence_ref": string }
  ]
}`;
    const user = `APPROVED INTENT (constraints):
${JSON.stringify(constraints, null, 2)}

ACTUAL PURCHASE (transaction):
${JSON.stringify(actual, null, 2)}`;
    return jsonCall<Fidelity>(MODEL_MAIN, system, user);
  }

  async recommend(input: RecommendInput): Promise<Recommendation> {
    const system = `You are ACER's resolution stage for Amex servicing. Given the
intent, what the agent actually did, and the fidelity assessment, recommend a
SPECIFIC, bounded remedy a Card Member or a Customer Care Professional could act
on. Stay within plausible servicing playbooks (partial credit to honor a budget,
rebook within intent, representment/dispute under Amex Agent Purchase Protection,
or no action if it was a true match). Never invent ledger movements. Return STRICT JSON:
{
  "remedy": string,     // the concrete recommended action
  "rationale": string   // 1-2 sentences grounding it in the evidence
}`;
    const user = `Raw intent: "${input.raw_intent}"
Constraints: ${JSON.stringify(input.constraints)}
Actual purchase: ${JSON.stringify(input.actual)}
Agent registration status: ${input.agent_status}
Fidelity: score=${input.fidelity.score}, confidence=${input.fidelity.confidence}
Verdict: ${input.fidelity.verdict}`;
    return jsonCall<Recommendation>(MODEL_MAIN, system, user);
  }
}

export function getLLM(): LLMProvider {
  return new OpenAIProvider();
}
