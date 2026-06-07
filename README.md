# ACE Resolve (ACER)

**Servicing intelligence for Amex Agentic Commerce.** When an AI agent buys on a
Card Member's behalf through Amex's Agentic Commerce Experiences (ACE), ACER reads
the whole evidence chain — **intent · cart · token · agent · transaction** — uses
GPT to score **intent fidelity** (did the agent honor what the Card Member asked
for?), and routes the right next step: **self-serve**, **smart routing**, or
**colleague-assisted** in the Intuitive Servicing Portal (ISP).

This is a **working prototype that models the product in production**, not a mockup
or extension. Two real, connected front-ends share one case store:

- **`/app` — third-party AI assistant (chat).** A ChatGPT/Claude-style assistant
  ("Concierge AI"), **not** the Amex app. The customer delegates a purchase in
  natural language; the agent locks the intent on Amex rails, autonomously shops
  (LLM-simulated), reports back, and — when the customer disputes — ACER runs
  **inside the chat** and resolves it. The journey only leaves the assistant when
  a human is needed.
- **`/isp` — Amex Colleague (CCP) desktop.** Escalated cases cross into Amex and
  land pre-built with the fidelity score, field-by-field comparison, full evidence
  chain, a grounded recommendation, and human Approve / Override / Escalate (RBAC).
- **`/admin` — Governance.** Append-only audit log (model + prompt version per
  step) and a shadow-mode toggle.

Nothing is hard-coded: the customer name, the natural-language intent, the agent
(registered vs. unregistered), and the agent's behavior (faithful / slips up /
goes rogue) are all driven from the UI, and **GPT computes the agent's purchase
and every verdict live** — no scripted outputs.

---

## Quick start

```bash
npm install
cp .env.example .env.local   # then add your OPENAI_API_KEY
npm run dev                  # http://localhost:3000
```

Open `/app`, set the agent's behavior to "Slips up", type a delegation (or tap an
example), let Concierge AI shop and report back, tap **"Something's off"** to run
ACER in-chat, then either resolve there or — for a tougher case (set behavior to
"Goes rogue" or pick the unregistered agent) — watch it escalate into `/isp`.

### Environment (`.env.local`)

| Var | Purpose |
|-----|---------|
| `OPENAI_API_KEY` | **Required.** Your OpenAI key. Never commit this. |
| `ACER_MODEL_MAIN` | Reasoning model (default `gpt-4o`). |
| `ACER_MODEL_FAST` | Intent-extraction model (default `gpt-4o-mini`). |
| `ACE_TOKEN_SECRET` | HMAC secret the mock ACE service uses to "lock" intent. |

---

## How it works

A four-stage reasoning loop wrapped in governance (`src/lib/acer/core.ts`):

0. **Assemble + redact** — pull the evidence chain, verify the Proof-of-Intent
   token, run a deterministic PII gate (`src/lib/redact.ts`) before any LLM call.
1. **Intent extraction** *(at lock time)* — GPT turns the natural-language
   instruction into a structured, checkable intent contract.
2. **Fidelity scoring** — GPT compares approved intent vs. the actual purchase
   field by field → `{score, confidence, verdict, per_field[]}`, every judgement
   grounded in a named evidence object.
3. **Routing** — deterministic, explainable guardrails decide the path:
   - unverified/revoked agent, confidence `< 0.6`, or amount `> $1,500` → **forced escalation**
   - off-merchant purchase → **smart routing** (disputes / Agent Purchase Protection)
   - clear, bounded, trusted-merchant mismatch → **self-serve**
   - low fidelity → **colleague assist**
   Then GPT proposes a bounded remedy + rationale.

Every step is written to an **append-only audit log** with the model and prompt
version used.

## Architecture

```
ACE sandbox (mock, real-shaped)        →  ACER core (GPT via LLMProvider)  →  /app  /isp  /admin
Agent Registry · Intent · Token · Txn     redact→extract→score→route          in-memory store + audit
```

- **Next.js (App Router) + TypeScript**, plain CSS design system ported from the
  ACER concept deck (Amex blue `#006fcf` / navy `#00175a`, Hanken Grotesk).
- **OpenAI** behind `LLMProvider` (`src/lib/llm/provider.ts`) — the seam where
  production swaps in an internally-approved/hosted model with no business-logic
  change.
- **In-memory store** (`src/lib/store/store.ts`) as a process-global singleton.
  Swap the maps for **Vercel KV / Upstash Redis** for durable, cross-instance
  state in production — the get/put/list surface is unchanged.
- **Mock ACE sandbox** (`src/lib/ace/index.ts`) issues Intent IDs,
  Proof-of-Intent tokens, single-use payment tokens, and agent registrations
  shaped like the published ACE Developer Kit spec. To go live, replace these
  implementations with an adapter over the real ACDK — callers don't change.

## Deploy to Vercel

1. Push this folder to a GitHub repo (the secret-bearing `.env.local` is gitignored).
2. Import the repo in Vercel.
3. Add `OPENAI_API_KEY` (and optionally the model/secret vars) as **Vercel
   Environment Variables**.
4. Deploy. `main` auto-deploys; PRs get preview URLs.

> For a multi-user/persistent demo on Vercel, add Vercel KV and back the store
> with it (the in-memory singleton is per-serverless-instance).

## Notes & honest limitations

- The ACE primitives are a **faithful local mock**, not the real (enterprise-gated)
  ACDK. Field names are reasonable approximations of the published spec.
- Remedies are **playbook-bounded recommendations** — no real money moves.
- RBAC is a lightweight in-app role switch for the demo, not real auth.
