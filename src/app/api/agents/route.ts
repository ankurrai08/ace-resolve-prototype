import { NextResponse } from "next/server";
import { AgentRegistry } from "@/lib/ace";

export async function GET() {
  return NextResponse.json({ agents: AgentRegistry.list() });
}
