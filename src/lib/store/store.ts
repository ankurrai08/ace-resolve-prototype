import type {
  Agent,
  AuditEntry,
  Case,
  IntentContract,
  PaymentToken,
  Transaction,
} from "@/lib/types";

/**
 * In-memory store behind a single interface.
 *
 * For the prototype this is a process-global singleton (survives within a warm
 * serverless instance and across requests in `next dev`). To make state durable
 * across all serverless invocations in production, swap the maps below for
 * Vercel KV / Upstash Redis — the surface (get/put/list) stays identical.
 */
export interface Store {
  agents: Map<string, Agent>;
  intents: Map<string, IntentContract>;
  tokens: Map<string, PaymentToken>;
  transactions: Map<string, Transaction>;
  cases: Map<string, Case>;
  audit: AuditEntry[];
}

declare global {
  // eslint-disable-next-line no-var
  var __ACER_STORE__: Store | undefined;
}

function seedAgents(s: Store) {
  const agents: Agent[] = [
    {
      agent_id: "agt_concierge",
      name: "Concierge AI",
      status: "verified",
      capabilities: ["shopping", "travel", "tickets"],
      registered_at: "2026-03-01T00:00:00Z",
    },
    {
      agent_id: "agt_shopwise",
      name: "ShopWise Assistant",
      status: "verified",
      capabilities: ["retail", "groceries"],
      registered_at: "2026-04-10T00:00:00Z",
    },
    {
      agent_id: "agt_unverified",
      name: "QuickBuy Bot",
      status: "unverified",
      capabilities: ["retail"],
      registered_at: "2026-05-20T00:00:00Z",
    },
  ];
  agents.forEach((a) => s.agents.set(a.agent_id, a));
}

export function getStore(): Store {
  if (!globalThis.__ACER_STORE__) {
    const s: Store = {
      agents: new Map(),
      intents: new Map(),
      tokens: new Map(),
      transactions: new Map(),
      cases: new Map(),
      audit: [],
    };
    seedAgents(s);
    globalThis.__ACER_STORE__ = s;
  }
  return globalThis.__ACER_STORE__;
}
