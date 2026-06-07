/**
 * Deterministic PII redaction gate (Stage 0).
 *
 * Runs BEFORE any text is sent to the LLM. Original values are vaulted in a
 * token map and never transmitted externally. This is a prototype-grade
 * regex/heuristic layer; production would add a proper NER pass.
 */
export interface RedactionResult {
  redacted: string;
  vault: Record<string, string>; // token -> original
  count: number;
}

const PATTERNS: { label: string; re: RegExp }[] = [
  { label: "CARD", re: /\b(?:\d[ -]*?){13,16}\b/g },
  { label: "SSN", re: /\b\d{3}-\d{2}-\d{4}\b/g },
  { label: "EMAIL", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g },
  { label: "PHONE", re: /\b(?:\+?1[ -.]?)?\(?\d{3}\)?[ -.]?\d{3}[ -.]?\d{4}\b/g },
];

export function redact(text: string): RedactionResult {
  let redacted = text;
  const vault: Record<string, string> = {};
  let n = 0;
  for (const { label, re } of PATTERNS) {
    redacted = redacted.replace(re, (match) => {
      const token = `[${label}_${n++}]`;
      vault[token] = match;
      return token;
    });
  }
  return { redacted, vault, count: n };
}
