import { NextResponse } from "next/server";
import { IntentService } from "@/lib/ace";
import { getLLM } from "@/lib/llm/openai";
import { audit } from "@/lib/audit";
import type { AgentBehavior } from "@/lib/llm/provider";

/**
 * The autonomous agent "shops": given the locked intent, the LLM simulates what
 * the agent actually bought (steered by a behavior knob for demo variety). This
 * does NOT create a case — it just returns what the agent did, which the chat
 * then reports back. ACER only runs when the customer disputes.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const intent_id: string = body.intent_id;
    const behavior: AgentBehavior = body.behavior || "slips";
    const intent = IntentService.get(intent_id);
    if (!intent) return NextResponse.json({ error: "unknown intent_id" }, { status: 404 });

    const purchase = await getLLM().simulatePurchase(intent.constraints, behavior);
    audit({
      step: "agent_purchase_simulated",
      actor: "agent",
      payload: { intent_id, behavior, purchase },
    });
    return NextResponse.json({ purchase });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
