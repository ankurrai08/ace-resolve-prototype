import { createHmac } from "crypto";
import { id } from "@/lib/id";
import { getStore } from "@/lib/store/store";
import type {
  Agent,
  ActualPurchase,
  IntentConstraints,
  IntentContract,
  PaymentToken,
  Transaction,
} from "@/lib/types";

/**
 * Faithful local sandbox for the Amex ACE Developer Kit primitives.
 * Each service is exported behind a small interface so the whole app is built
 * against production-shaped objects. To go live, replace these implementations
 * with an adapter over the real ACDK — callers do not change.
 *
 * Reference primitives: Agent Registration, Intent Intelligence (Intent ID +
 * Proof-of-Intent Token), Payment Credentials (single-use token with embedded
 * boundaries), and a transaction ledger on the closed-loop network.
 */

const SECRET = process.env.ACE_TOKEN_SECRET || "acer-dev-secret";

// ---- Agent Registry ----------------------------------------------------------
export const AgentRegistry = {
  list(): Agent[] {
    return [...getStore().agents.values()];
  },
  get(agentId: string): Agent | undefined {
    return getStore().agents.get(agentId);
  },
};

// ---- Intent Intelligence -----------------------------------------------------
/** Cryptographically "locks" the constraints the human gave the agent. */
function signProofOfIntent(intentId: string, constraints: IntentConstraints): string {
  const payload = JSON.stringify({ intentId, constraints });
  const sig = createHmac("sha256", SECRET).update(payload).digest("hex").slice(0, 32);
  return `poi_${sig}`;
}

export const IntentService = {
  create(opts: {
    card_id: string;
    card_name: string;
    raw_text: string;
    constraints: IntentConstraints;
  }): IntentContract {
    const intent_id = id("int");
    const contract: IntentContract = {
      intent_id,
      card_id: opts.card_id,
      card_name: opts.card_name,
      raw_text: opts.raw_text,
      constraints: opts.constraints,
      proof_of_intent_token: signProofOfIntent(intent_id, opts.constraints),
      locked_at: new Date().toISOString(),
    };
    getStore().intents.set(intent_id, contract);
    return contract;
  },
  get(intentId: string): IntentContract | undefined {
    return getStore().intents.get(intentId);
  },
  /** Verifies the proof-of-intent token has not been tampered with. */
  verify(contract: IntentContract): boolean {
    return (
      signProofOfIntent(contract.intent_id, contract.constraints) ===
      contract.proof_of_intent_token
    );
  },
};

// ---- Payment Credentials -----------------------------------------------------
export const TokenService = {
  issue(intent: IntentContract): PaymentToken {
    const token: PaymentToken = {
      token_id: id("tok"),
      intent_id: intent.intent_id,
      spend_cap: intent.constraints.budget_total,
      currency: intent.constraints.currency || "USD",
      allowed_merchants: intent.constraints.merchants,
      single_use: true,
      expires_at: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    };
    getStore().tokens.set(token.token_id, token);
    return token;
  },
  get(tokenId: string): PaymentToken | undefined {
    return getStore().tokens.get(tokenId);
  },
};

// ---- Transaction Ledger ------------------------------------------------------
export const TxnLedger = {
  post(token: PaymentToken, actual: ActualPurchase): Transaction {
    const txn: Transaction = {
      txn_id: id("txn"),
      token_id: token.token_id,
      intent_id: token.intent_id,
      posted_at: new Date().toISOString(),
      ...actual,
      currency: actual.currency || token.currency || "USD",
    };
    getStore().transactions.set(txn.txn_id, txn);
    return txn;
  },
  get(txnId: string): Transaction | undefined {
    return getStore().transactions.get(txnId);
  },
};
