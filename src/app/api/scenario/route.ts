import { NextResponse } from "next/server";
import { IntentService, TokenService } from "@/lib/ace";
import { getLLM } from "@/lib/llm/openai";
import { PROMPT_VERSION } from "@/lib/llm/provider";
import { audit } from "@/lib/audit";
import { redact } from "@/lib/redact";
import { id } from "@/lib/id";

/**
 * Lock a delegation intent: GPT extracts the natural-language instruction into a
 * structured, cryptographically-locked intent contract, then ACE issues a
 * single-use payment token carrying its boundaries.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const card_name: string = (body.card_name || "").trim() || "Card Member";
    const instruction: string = (body.instruction || "").trim();
    if (!instruction) {
      return NextResponse.json({ error: "instruction is required" }, { status: 400 });
    }

    const MODEL_FAST = process.env.ACER_MODEL_FAST || "gpt-4o-mini";
    const { count: piiCount } = redact(instruction);

    const llm = getLLM();
    const extraction = await llm.extractIntent(instruction);

    const card_id = id("card");
    const intent = IntentService.create({
      card_id,
      card_name,
      raw_text: instruction,
      constraints: extraction.constraints,
    });
    const token = TokenService.issue(intent);

    audit({
      step: "stage1_intent_lock",
      actor: "acer",
      model: MODEL_FAST,
      prompt_version: PROMPT_VERSION,
      payload: {
        intent_id: intent.intent_id,
        pii_redacted_count: piiCount,
        constraints: intent.constraints,
        notes: extraction.notes,
        proof_of_intent_token: intent.proof_of_intent_token,
        payment_token_id: token.token_id,
      },
    });

    return NextResponse.json({ intent, token, notes: extraction.notes });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
