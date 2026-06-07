import { NextResponse } from "next/server";
import { getStore } from "@/lib/store/store";

/** List cases (newest first), optionally filtered by ?status= */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  let cases = [...getStore().cases.values()].sort((a, b) =>
    b.created_at.localeCompare(a.created_at)
  );
  if (status) cases = cases.filter((c) => c.status === status);
  return NextResponse.json({
    cases: cases.map((c) => ({
      case_id: c.case_id,
      created_at: c.created_at,
      card_name: c.card_name,
      agent: c.agent.name,
      agent_status: c.agent.status,
      merchant: c.transaction.merchant,
      amount: c.transaction.amount,
      currency: c.transaction.currency,
      score: c.fidelity.score,
      route: c.routing.route,
      status: c.status,
    })),
  });
}
