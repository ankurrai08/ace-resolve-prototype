"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import ScoreRing from "@/components/ScoreRing";
import FieldTable from "@/components/FieldTable";
import type { Agent, Case, IntentContract, PaymentToken } from "@/lib/types";

const NAMES = ["Sarah Chen", "Marcus Reed", "Priya Nair", "David Okafor", "Elena Rossi", "James Whitfield"];
const INSTRUCTIONS = [
  "Book two tickets to the jazz festival on Saturday the 14th, aisle seats, under $400 total, only on Ticketmaster.",
  "Order a 65-inch OLED TV, no more than $1,200, from Best Buy, delivered this week.",
  "Get my weekly grocery run from Whole Foods, keep it under $150, no seafood.",
  "Book a one-night stay near downtown Austin for the 20th, under $250, refundable rate only.",
  "Buy running shoes, men's size 11, under $130, from Nike only.",
  "Reserve a table for 4 and pre-pay the deposit, max $80, at any Italian restaurant downtown.",
];

type Actual = {
  merchant: string;
  amount: number;
  date: string;
  quantity: number;
  item: string;
  seat_pref: string;
};

function rand<T>(a: T[]): T {
  return a[Math.floor(Math.random() * a.length)];
}

export default function CardMemberApp() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [step, setStep] = useState<"build" | "locked" | "result">("build");

  const [cardName, setCardName] = useState("Sarah Chen");
  const [instruction, setInstruction] = useState(INSTRUCTIONS[0]);
  const [agentId, setAgentId] = useState("agt_concierge");

  const [intent, setIntent] = useState<IntentContract | null>(null);
  const [token, setToken] = useState<PaymentToken | null>(null);
  const [notes, setNotes] = useState("");

  const [actual, setActual] = useState<Actual>({
    merchant: "",
    amount: 0,
    date: "",
    quantity: 1,
    item: "",
    seat_pref: "",
  });

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents || []));
  }, []);

  function surprise() {
    setCardName(rand(NAMES));
    setInstruction(rand(INSTRUCTIONS));
    setAgentId(rand(["agt_concierge", "agt_shopwise", "agt_unverified"]));
  }

  async function lockIntent() {
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_name: cardName, instruction }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "failed to lock intent");
      setIntent(d.intent);
      setToken(d.token);
      setNotes(d.notes || "");
      // prefill "what the agent did" from the locked intent (a near-match by default)
      const c = d.intent.constraints;
      setActual({
        merchant: (c.merchants && c.merchants[0]) || "",
        amount: c.budget_total || 0,
        date: c.date_window || "",
        quantity: c.quantity || 1,
        item: c.item || "",
        seat_pref: c.seat_pref || "",
      });
      setStep("locked");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  async function runAnalysis() {
    if (!intent) return;
    setBusy(true);
    setErr("");
    try {
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent_id: intent.intent_id, agent_id: agentId, actual }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "analysis failed");
      setCaseData(d.case);
      setStep("result");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "error");
    } finally {
      setBusy(false);
    }
  }

  async function act(action: string, reason?: string) {
    if (!caseData) return;
    const r = await fetch(`/api/cases/${caseData.case_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, actor: "card_member" }),
    });
    const d = await r.json();
    if (r.ok) setCaseData(d.case);
  }

  function reset() {
    setStep("build");
    setIntent(null);
    setToken(null);
    setCaseData(null);
    setErr("");
  }

  // quick "introduce a mistake" mutators for variety
  function mutate(kind: string) {
    setActual((a) => {
      const n = { ...a };
      if (kind === "overbudget") n.amount = Math.round((a.amount || 100) * 1.18 + 20);
      if (kind === "date") n.date = (a.date || "the 14th") + " (next day)";
      if (kind === "merchant") n.merchant = "StubHub";
      if (kind === "qty") n.quantity = (a.quantity || 1) + 1;
      if (kind === "bigticket") n.amount = 1850;
      return n;
    });
  }

  return (
    <>
      <TopBar />
      <main className="wrap section" style={{ maxWidth: 880 }}>
        <p className="eyebrow">Amex app · Agentic commerce</p>
        <h2 className="head">Delegate a purchase to your agent</h2>
        <p className="sub">
          Set up a delegation, let the agent buy, and see ACER decide — live —
          whether the agent honored your intent. Nothing here is scripted: GPT
          scores whatever you enter.
        </p>

        {err ? (
          <div className="panel" style={{ marginTop: 18, borderColor: "var(--bad)", color: "var(--bad)" }}>
            {err}
          </div>
        ) : null}

        {/* STEP 1 — build the intent */}
        {step === "build" && (
          <div className="card fade" style={{ marginTop: 20 }}>
            <div className="row between center" style={{ marginBottom: 14 }}>
              <h3>1 · Your delegation instruction</h3>
              <button className="btn ghost sm" onClick={surprise}>🎲 Surprise me</button>
            </div>
            <div className="field">
              <label className="fld">Card Member</label>
              <input className="in" value={cardName} onChange={(e) => setCardName(e.target.value)} />
            </div>
            <div className="field">
              <label className="fld">Tell your agent what to buy (natural language)</label>
              <textarea className="in" value={instruction} onChange={(e) => setInstruction(e.target.value)} />
              <div className="row" style={{ flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                {INSTRUCTIONS.slice(0, 4).map((x, i) => (
                  <button key={i} className="chip" style={{ cursor: "pointer", fontWeight: 500 }} onClick={() => setInstruction(x)}>
                    {x.slice(0, 38)}…
                  </button>
                ))}
              </div>
            </div>
            <div className="field">
              <label className="fld">Delegate to agent</label>
              <select className="in" value={agentId} onChange={(e) => setAgentId(e.target.value)}>
                {agents.map((a) => (
                  <option key={a.agent_id} value={a.agent_id}>
                    {a.name} — {a.status}
                  </option>
                ))}
              </select>
            </div>
            <button className="btn primary" onClick={lockIntent} disabled={busy}>
              {busy ? <><span className="spinner" /> Locking intent…</> : "🔒 Lock intent & delegate"}
            </button>
          </div>
        )}

        {/* STEP 2 — intent locked, simulate the agent purchase */}
        {step === "locked" && intent && token && (
          <>
            <div className="card accent fade" style={{ marginTop: 20 }}>
              <div className="row between center">
                <h3>Intent contract — locked ✓</h3>
                <span className="badge b-info mono">{intent.proof_of_intent_token}</span>
              </div>
              {notes ? <div className="small muted" style={{ marginTop: 6 }}>{notes}</div> : null}
              <div style={{ marginTop: 14 }}>
                {Object.entries(intent.constraints)
                  .filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
                  .map(([k, v]) => (
                    <div className="kv" key={k}>
                      <span className="k">{k.replace(/_/g, " ")}</span>
                      <span className="v">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
                    </div>
                  ))}
              </div>
              <div className="kv">
                <span className="k">single-use payment token</span>
                <span className="v mono">{token.token_id} · cap {token.spend_cap ?? "—"}</span>
              </div>
            </div>

            <div className="card fade" style={{ marginTop: 16 }}>
              <div className="row between center" style={{ marginBottom: 12 }}>
                <h3>2 · What the agent actually bought</h3>
                <div className="row" style={{ gap: 6 }}>
                  <button className="btn outline sm" onClick={() => mutate("overbudget")}>+ over budget</button>
                  <button className="btn outline sm" onClick={() => mutate("date")}>+ wrong date</button>
                  <button className="btn outline sm" onClick={() => mutate("merchant")}>+ wrong merchant</button>
                  <button className="btn outline sm" onClick={() => mutate("bigticket")}>+ big ticket</button>
                </div>
              </div>
              <p className="small muted" style={{ marginTop: 0 }}>
                Pre-filled from the intent. Edit any field to make the agent slip up — ACER scores it live.
              </p>
              <div className="grid2c" style={{ marginTop: 6 }}>
                <div className="field">
                  <label className="fld">Merchant</label>
                  <input className="in" value={actual.merchant} onChange={(e) => setActual({ ...actual, merchant: e.target.value })} />
                </div>
                <div className="field">
                  <label className="fld">Amount (USD)</label>
                  <input className="in" type="number" value={actual.amount} onChange={(e) => setActual({ ...actual, amount: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label className="fld">Date</label>
                  <input className="in" value={actual.date} onChange={(e) => setActual({ ...actual, date: e.target.value })} />
                </div>
                <div className="field">
                  <label className="fld">Quantity</label>
                  <input className="in" type="number" value={actual.quantity} onChange={(e) => setActual({ ...actual, quantity: Number(e.target.value) })} />
                </div>
                <div className="field">
                  <label className="fld">Item</label>
                  <input className="in" value={actual.item} onChange={(e) => setActual({ ...actual, item: e.target.value })} />
                </div>
                <div className="field">
                  <label className="fld">Seat / variant pref</label>
                  <input className="in" value={actual.seat_pref} onChange={(e) => setActual({ ...actual, seat_pref: e.target.value })} />
                </div>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button className="btn primary" onClick={runAnalysis} disabled={busy}>
                  {busy ? <><span className="spinner" /> ACER is reading the evidence…</> : "Agent completes purchase → run ACER"}
                </button>
                <button className="btn outline" onClick={reset}>Start over</button>
              </div>
            </div>
          </>
        )}

        {/* STEP 3 — ACER verdict */}
        {step === "result" && caseData && (
          <div className="fade" style={{ marginTop: 20 }}>
            <VerdictCard c={caseData} onAct={act} onReset={reset} />
          </div>
        )}
      </main>
    </>
  );
}

function routeBadge(route: string) {
  if (route === "self_serve") return <span className="badge b-good">Self-service</span>;
  if (route === "route") return <span className="badge b-warn">Smart routing</span>;
  return <span className="badge b-bad">Escalated to a colleague</span>;
}

function VerdictCard({
  c,
  onAct,
  onReset,
}: {
  c: Case;
  onAct: (a: string, r?: string) => void;
  onReset: () => void;
}) {
  const resolved = c.status === "self_served" || c.status === "resolved";
  return (
    <>
      <div className="card accent">
        <div className="row between center">
          <p className="eyebrow" style={{ margin: 0 }}>You tapped “I didn&apos;t expect this”</p>
          {routeBadge(c.routing.route)}
        </div>
        <div className="row" style={{ gap: 22, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
          <ScoreRing score={c.fidelity.score} />
          <div style={{ flex: "1 1 320px" }}>
            <div className="divtag">Intent fidelity</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--deep)", marginTop: 6, lineHeight: 1.3 }}>
              {c.fidelity.verdict}
            </div>
            <div className="small muted" style={{ marginTop: 8 }}>
              Confidence {Math.round(c.fidelity.confidence * 100)}% · agent “{c.agent.name}” ({c.agent.status})
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>What your agent did vs. what you approved</h3>
        <div style={{ marginTop: 12, overflowX: "auto" }}>
          <FieldTable fields={c.fidelity.per_field} />
        </div>
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3>Recommended resolution</h3>
        <div style={{ fontSize: 16, fontWeight: 700, color: "var(--deep)", marginTop: 8 }}>{c.routing.remedy}</div>
        <div className="small muted" style={{ marginTop: 6 }}>{c.routing.rationale}</div>
        <div className="small muted" style={{ marginTop: 6, fontStyle: "italic" }}>{c.routing.reason}</div>

        {resolved ? (
          <div className="panel" style={{ marginTop: 16, borderColor: "var(--good)", background: "#f1faf5" }}>
            <span className="badge b-good">Resolved</span>{" "}
            <span className="small">Handled in-app. A confirmation is on its way — no call needed.</span>
          </div>
        ) : (
          <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap" }}>
            {c.routing.route === "self_serve" && (
              <button className="btn primary" onClick={() => onAct("self_serve")}>
                ✓ Make it right — resolve in app
              </button>
            )}
            {c.routing.route === "route" && (
              <button className="btn deep" onClick={() => onAct("self_serve")}>
                ✓ File under Agent Purchase Protection
              </button>
            )}
            {c.routing.route === "colleague_assist" ? (
              <>
                <span className="small muted" style={{ alignSelf: "center" }}>
                  This one needs a specialist — we&apos;ve prepared your case.
                </span>
                <Link href="/isp" className="btn deep">See it in the ISP →</Link>
              </>
            ) : (
              <button className="btn outline" onClick={() => onAct("escalate")}>Talk to someone</button>
            )}
          </div>
        )}
      </div>

      <div className="row" style={{ marginTop: 16, gap: 10 }}>
        <button className="btn outline" onClick={onReset}>Run another scenario</button>
        <Link href="/isp" className="btn ghost">Open ISP queue</Link>
      </div>
    </>
  );
}
