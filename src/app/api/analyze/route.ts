import { NextResponse } from "next/server";
import { AgentRegistry, IntentService, TokenService } from "@/lib/ace";
import { getStore } from "@/lib/store/store";
import { runACER } from "@/lib/acer/core";
import type { ActualPurchase } from "@/lib/types";

/** Run the ACER reasoning loop over a locked intent + what the agent actually did. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const intent_id: string = body.intent_id;
    const agent_id: string = body.agent_id || "agt_concierge";
    const actual: ActualPurchase = body.actual;

    const intent = IntentService.get(intent_id);
    if (!intent) return NextResponse.json({ error: "unknown intent_id" }, { status: 404 });
    const agent = AgentRegistry.get(agent_id);
    if (!agent) return NextResponse.json({ error: "unknown agent_id" }, { status: 404 });
    if (!actual || typeof actual.amount !== "number" || !actual.merchant) {
      return NextResponse.json({ error: "actual.merchant and actual.amount are required" }, { status: 400 });
    }

    // find the token issued for this intent
    const token = [...getStore().tokens.values()].find((t) => t.intent_id === intent_id)
      || TokenService.issue(intent);

    const c = await runACER(intent, token, agent, actual);
    return NextResponse.json({ case: c });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
