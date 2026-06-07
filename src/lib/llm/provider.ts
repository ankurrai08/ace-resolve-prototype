import type {
  ActualPurchase,
  Fidelity,
  IntentConstraints,
} from "@/lib/types";

export const PROMPT_VERSION = "acer-prompts-v1";

export interface IntentExtraction {
  constraints: IntentConstraints;
  notes: string;
}

export interface RecommendInput {
  raw_intent: string;
  constraints: IntentConstraints;
  actual: ActualPurchase;
  fidelity: Fidelity;
  agent_status: string;
}

export interface Recommendation {
  remedy: string;
  rationale: string;
}

/**
 * The seam where production swaps the public OpenAI calls for an internally
 * approved / hosted model. Business logic depends only on this interface.
 */
export interface LLMProvider {
  extractIntent(rawText: string): Promise<IntentExtraction>;
  scoreFidelity(
    constraints: IntentConstraints,
    actual: ActualPurchase
  ): Promise<Fidelity>;
  recommend(input: RecommendInput): Promise<Recommendation>;
}
