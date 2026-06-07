"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type {
  ActualPurchase,
  Agent,
  Case,
  IntentContract,
  PaymentToken,
} from "@/lib/types";

type Behavior = "faithful" | "slips" | "rogue";
type Stage = "await_intent" | "busy" | "await_review" | "decided" | "resolved" | "escalated";

type Card =
  | { kind: "intent"; intent: IntentContract; token: PaymentToken; notes: string }
  | { kind: "receipt"; purchase: ActualPurchase }
  | { kind: "verdict"; c: Case }
  | { kind: "escalated"; c: Case };

type Msg = { id: string; role: "assistant" | "user"; text?: string; card?: Card };

const EXAMPLES = [
  "Book two tickets to the jazz festival on Saturday the 14th, aisle seats, under $400 total, only on Ticketmaster.",
  "Order a 65-inch OLED TV, no more than $1,200, from Best Buy, delivered this week.",
  "Get my weekly grocery run from Whole Foods, keep it under $150, no seafood.",
  "Buy men's running shoes size 11, under $130, from Nike only.",
];

let _id = 0;
const nid = () => `m${_id++}`;

export default function AssistantChat() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState("agt_concierge");
  const [behavior, setBehavior] = useState<Behavior>("slips");
  const [name, setName] = useState("Sarah Chen");

  const [msgs, setMsgs] = useState<Msg[]>([
    {
      id: nid(),
      role: "assistant",
      text:
        "Hi Sarah 👋 I'm your shopping agent. Tell me what you'd like me to buy — I'll stay within whatever budget and rules you give me, and pay securely with your American Express card.",
    },
  ]);
  const [stage, setStage] = useState<Stage>("await_intent");
  const [typing, setTyping] = useState(false);
  const [input, setInput] = useState("");

  const intentRef = useRef<IntentContract | null>(null);
  const actualRef = useRef<ActualPurchase | null>(null);
  const caseRef = useRef<Case | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/agents").then((r) => r.json()).then((d) => setAgents(d.agents || []));
  }, []);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs, typing]);

  const add = (m: Omit<Msg, "id">) => setMsgs((p) => [...p, { id: nid(), ...m }]);
  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  async function startDelegation(instruction: string) {
    add({ role: "user", text: instruction });
    setStage("busy");
    setTyping(true);
    try {
      // 1. lock the intent
      const r = await fetch("/api/scenario", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ card_name: name, instruction }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      intentRef.current = d.intent;
      setTyping(false);
      add({
        role: "assistant",
        text: "Got it. I've locked this as your purchase intent with American Express — here are the limits I'll shop within:",
      });
      add({ role: "assistant", card: { kind: "intent", intent: d.intent, token: d.token, notes: d.notes } });

      // 2. agent shops (LLM-simulated, steered by behavior knob)
      await sleep(500);
      setTyping(true);
      const pr = await fetch("/api/agent-purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent_id: d.intent.intent_id, behavior }),
      });
      const pd = await pr.json();
      if (!pr.ok) throw new Error(pd.error);
      actualRef.current = pd.purchase;
      setTyping(false);
      add({ role: "assistant", text: pd.purchase.agent_message || "All done — here's your confirmation:" });
      add({ role: "assistant", card: { kind: "receipt", purchase: pd.purchase } });
      add({ role: "assistant", text: "Does this look right?" });
      setStage("await_review");
    } catch (e) {
      setTyping(false);
      add({ role: "assistant", text: `⚠️ ${e instanceof Error ? e.message : "Something went wrong"}` });
      setStage("await_intent");
    }
  }

  async function dispute(userText?: string) {
    add({ role: "user", text: userText || "Wait — that's not what I asked for." });
    setStage("busy");
    setTyping(true);
    try {
      await sleep(300);
      add({
        role: "assistant",
        text: "Let me check this purchase against your locked intent with American Express…",
      });
      const r = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          intent_id: intentRef.current?.intent_id,
          agent_id: agentId,
          actual: actualRef.current,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error);
      const c: Case = d.case;
      caseRef.current = c;
      setTyping(false);
      add({ role: "assistant", card: { kind: "verdict", c } });

      if (c.routing.route === "colleague_assist") {
        add({
          role: "assistant",
          text:
            "This one needs a person. I've securely packaged the evidence — your intent, the token, and the transaction — and handed your case to an American Express Care Professional. They'll pick it up with the full picture already in front of them.",
        });
        add({ role: "assistant", card: { kind: "escalated", c } });
        setStage("escalated");
      } else {
        setStage("decided");
      }
    } catch (e) {
      setTyping(false);
      add({ role: "assistant", text: `⚠️ ${e instanceof Error ? e.message : "error"}` });
      setStage("await_review");
    }
  }

  async function resolve() {
    const c = caseRef.current;
    if (!c) return;
    setStage("busy");
    await fetch(`/api/cases/${c.case_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "self_serve", actor: "card_member" }),
    });
    add({
      role: "assistant",
      text:
        c.routing.route === "route"
          ? "Done ✅ I've filed this under Amex Agent Purchase Protection on your behalf. You'll see the adjustment shortly — no call needed."
          : "Done ✅ Sorted it out right here — the adjustment is on its way. No need to contact American Express.",
    });
    setStage("resolved");
  }

  async function escalateManually() {
    const c = caseRef.current;
    if (!c) return;
    await fetch(`/api/cases/${c.case_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "escalate", actor: "card_member" }),
    });
    add({ role: "user", text: "I'd rather talk to a person." });
    add({
      role: "assistant",
      text:
        "Of course. I've handed your case — with all the evidence attached — to an American Express Care Professional. You can track it in the Amex servicing portal.",
    });
    setStage("escalated");
  }

  function newChat() {
    _id = 0;
    intentRef.current = null;
    actualRef.current = null;
    caseRef.current = null;
    setMsgs([
      {
        id: nid(),
        role: "assistant",
        text: `Hi ${name.split(" ")[0]} 👋 What would you like me to buy?`,
      },
    ]);
    setStage("await_intent");
  }

  function onSend() {
    const t = input.trim();
    if (!t || stage === "busy") return;
    setInput("");
    if (stage === "await_intent") startDelegation(t);
    else if (stage === "await_review") dispute(t);
    else add({ role: "user", text: t });
  }

  return (
    <>
      {/* Neutral 3rd-party assistant chrome (NOT the Amex app) */}
      <div className="assistant-head">
        <div className="wrap inner">
          <div className="aibrand">
            <span className="ai-logo">◇</span>
            <span className="ai-name">
              Concierge AI
              <span>Your personal shopping assistant</span>
            </span>
          </div>
          <div className="row center" style={{ gap: 10, flexWrap: "wrap" }}>
            <input className="in" style={{ width: 130, padding: "8px 11px" }} value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" />
            <select className="in" style={{ width: 200, padding: "8px 11px" }} value={agentId} onChange={(e) => setAgentId(e.target.value)}>
              {agents.map((a) => (
                <option key={a.agent_id} value={a.agent_id}>
                  {a.name} · {a.status === "verified" ? "Amex-registered" : "unregistered"}
                </option>
              ))}
            </select>
            <div className="seg" role="group" aria-label="Agent behavior">
              {(["faithful", "slips", "rogue"] as Behavior[]).map((b) => (
                <button key={b} className={behavior === b ? "on" : ""} onClick={() => setBehavior(b)}>
                  {b === "faithful" ? "Faithful" : b === "slips" ? "Slips up" : "Goes rogue"}
                </button>
              ))}
            </div>
            <button className="btn outline sm" onClick={newChat}>New chat</button>
            <Link href="/isp" className="btn ghost sm">Amex ISP ↗</Link>
          </div>
        </div>
      </div>

      <div className="chat">
        <div className="msgs" ref={scrollRef}>
          {msgs.map((m) => (
            <Bubble key={m.id} m={m} />
          ))}
          {typing && (
            <div className="msg assistant">
              <span className="avatar ai">◇</span>
              <div className="bubble">
                <span className="typing"><i /><i /><i /></span>
              </div>
            </div>
          )}

          {/* contextual action zone */}
          {stage === "await_review" && !typing && (
            <div className="msg assistant">
              <span className="avatar ai" style={{ visibility: "hidden" }}>◇</span>
              <div className="qr">
                <button onClick={() => { add({ role: "user", text: "Looks good 👍" }); add({ role: "assistant", text: "Great — enjoy! 🎉 Anything else I can grab for you?" }); setStage("await_intent"); }}>Looks good 👍</button>
                <button onClick={() => dispute()}>Something&apos;s off</button>
              </div>
            </div>
          )}
          {stage === "decided" && caseRef.current && !typing && (
            <div className="msg assistant">
              <span className="avatar ai" style={{ visibility: "hidden" }}>◇</span>
              <div className="qr">
                <button onClick={resolve}>
                  {caseRef.current.routing.route === "route" ? "✓ File under Amex Protection" : "✓ Make it right — resolve now"}
                </button>
                <button onClick={escalateManually} style={{ borderColor: "var(--line)", color: "var(--muted)" }}>Talk to a person instead</button>
              </div>
            </div>
          )}
          {(stage === "resolved" || stage === "escalated") && (
            <div className="msg assistant">
              <span className="avatar ai" style={{ visibility: "hidden" }}>◇</span>
              <div className="qr">
                {stage === "escalated" && <Link href="/isp" className="btn deep sm">Track in Amex ISP →</Link>}
                <button onClick={newChat}>Start a new request</button>
              </div>
            </div>
          )}
        </div>

        {/* composer */}
        <div className="composer">
          {stage === "await_intent" && msgs.length <= 1 && (
            <div className="examples">
              {EXAMPLES.map((x, i) => (
                <button key={i} onClick={() => startDelegation(x)}>{x.slice(0, 46)}…</button>
              ))}
            </div>
          )}
          <div className="box">
            <textarea
              rows={1}
              value={input}
              placeholder={stage === "await_intent" ? "Tell Concierge AI what to buy…" : stage === "await_review" ? "Reply, or tell me what's wrong…" : "Type a message…"}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); } }}
              disabled={stage === "busy"}
            />
            <button className="btn primary" onClick={onSend} disabled={stage === "busy" || !input.trim()}>Send</button>
          </div>
        </div>
      </div>
    </>
  );
}

function Bubble({ m }: { m: Msg }) {
  return (
    <div className={"msg " + m.role}>
      <span className={"avatar " + (m.role === "assistant" ? "ai" : "me")}>{m.role === "assistant" ? "◇" : "S"}</span>
      <div className={"bubble" + (m.card ? " wide" : "")}>
        {m.text}
        {m.card ? <CardView card={m.card} /> : null}
      </div>
    </div>
  );
}

function routePill(route: string) {
  if (route === "self_serve") return <span className="badge b-good">Resolved in chat</span>;
  if (route === "route") return <span className="badge b-warn">Amex Protection</span>;
  return <span className="badge b-bad">Sent to an Amex specialist</span>;
}

function CardView({ card }: { card: Card }) {
  if (card.kind === "intent") {
    const c = card.intent.constraints;
    return (
      <div className="ecard">
        <div className="top">
          <span>Intent locked</span>
          <span className="amex-verify"><span className="m">AMEX</span> Proof-of-Intent</span>
        </div>
        <div className="in2">
          {Object.entries(c)
            .filter(([, v]) => v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0))
            .map(([k, v]) => (
              <div className="kv" key={k}>
                <span className="k">{k.replace(/_/g, " ")}</span>
                <span className="v">{Array.isArray(v) ? v.join(", ") : String(v)}</span>
              </div>
            ))}
          <div className="kv">
            <span className="k">single-use token</span>
            <span className="v mono">{card.token.token_id}</span>
          </div>
        </div>
      </div>
    );
  }
  if (card.kind === "receipt") {
    const p = card.purchase;
    return (
      <div className="ecard">
        <div className="top"><span>Order confirmation</span><span className="mono">{p.merchant}</span></div>
        <div className="in2">
          <div className="kv"><span className="k">item</span><span className="v">{p.item}</span></div>
          <div className="kv"><span className="k">amount</span><span className="v">{p.currency || "USD"} {p.amount}</span></div>
          {p.date ? <div className="kv"><span className="k">date</span><span className="v">{p.date}</span></div> : null}
          {p.quantity ? <div className="kv"><span className="k">quantity</span><span className="v">{p.quantity}</span></div> : null}
          {p.seat_pref ? <div className="kv"><span className="k">seat / variant</span><span className="v">{p.seat_pref}</span></div> : null}
        </div>
      </div>
    );
  }
  if (card.kind === "verdict") {
    const c = card.c;
    const issues = c.fidelity.per_field.filter((f) => f.status !== "match");
    const honored = c.fidelity.per_field.filter((f) => f.status === "match");
    return (
      <div className="ecard">
        <div className="top">
          <span className="amex-verify"><span className="m">AMEX</span> Checked with American Express</span>
          {routePill(c.routing.route)}
        </div>
        <div className="in2">
          <div style={{ fontSize: 15.5, fontWeight: 700, color: "var(--deep)", lineHeight: 1.45 }}>
            {c.fidelity.verdict}
          </div>

          <div style={{ marginTop: 12 }}>
            {issues.map((f, i) => (
              <div key={"i" + i} className="fline">
                <span className={"fico " + f.status}>{f.status === "mismatch" ? "✕" : "!"}</span>
                <div>
                  <b style={{ textTransform: "capitalize" }}>{f.field}</b>{" "}
                  <span className="muted">— you asked for <b style={{ color: "var(--deep)" }}>{f.expected}</b>, but it went with <b style={{ color: "var(--bad)" }}>{f.actual}</b>.</span>
                  {f.note ? <div className="small muted" style={{ marginTop: 2 }}>{f.note}</div> : null}
                </div>
              </div>
            ))}
            {honored.map((f, i) => (
              <div key={"h" + i} className="fline">
                <span className="fico match">✓</span>
                <div>
                  <b style={{ textTransform: "capitalize" }}>{f.field}</b>{" "}
                  <span className="muted">— just as you asked{f.actual ? ` (${f.actual})` : ""}.</span>
                </div>
              </div>
            ))}
          </div>

          <div className="panel" style={{ marginTop: 14, background: "#fff", borderColor: "var(--t3)" }}>
            <div className="amex-verify" style={{ marginBottom: 4 }}>What I can do for you</div>
            <div style={{ fontWeight: 700, color: "var(--deep)" }}>{c.routing.remedy}</div>
          </div>
        </div>
      </div>
    );
  }
  // escalated
  const c = card.c;
  return (
    <div className="ecard">
      <div className="top"><span className="amex-verify"><span className="m">AMEX</span> Case handed to servicing</span><span className="mono">{c.case_id}</span></div>
      <div className="in2">
        <div className="kv"><span className="k">case</span><span className="v mono">{c.case_id}</span></div>
        <div className="kv"><span className="k">status</span><span className="v">Escalated to a Care Professional</span></div>
        <div className="kv"><span className="k">evidence attached</span><span className="v">intent · token · agent · transaction</span></div>
      </div>
    </div>
  );
}
