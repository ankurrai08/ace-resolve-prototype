import { NextResponse } from "next/server";
import { allAudit } from "@/lib/audit";

export async function GET() {
  return NextResponse.json({ audit: allAudit() });
}
