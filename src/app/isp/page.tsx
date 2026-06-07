"use client";
import { useCallback, useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import ScoreRing from "@/components/ScoreRing";
import FieldTable from "@/components/FieldTable";
import Evidence from "@/components/Evidence";
import type { AuditEntry, Case } from "@/lib/types";

type Summary = {
  case_id: string;
  created_at: string;
  card_name: string;
  agent: string;
  agent_status: string;
  merchant: string;
  amount: number;
  currency: string;
  score: number;
  route: string;
  status: string;
};

const ROLES = [
  { id: "ccp", label: "CCP — Customer Care Professional" },
  { id: "risk_lead", label: "Risk Lead" },
];

function statusBadge(s: string) {
  const map: Record<string, string> = {
    open: "b-info",
    escalated: "b-bad",
    self_served: "b-good",
    resolved: "b-good",
  };
  return <span className={"badge " + (map[s] || "b-neutral")}>{s.replace("_", " ")}</span>;
}

export default function ISP() {
  const [role, setRole] = useState("ccp");
  const [filter, setFilter] = useState<"all" | "escalated">("all");
  const [list, setList] = useState<Summary[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [detail, setDetail] = useState<{ case: Case; audit: AuditEntry[] } | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [reason, setReason] = useState("");

  const loadList = useCallback(async () => {
    const q = filter === "escalated" ? "?status=escalated" : "";
    const r = await fetch("/api/cases" + q);
    const d = await r.json();
    setList(d.cases || []);
  }, [filter]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  async function open(id: string) {
    setSelected(id);
    setOverrideOpen(false);
    setReason("");
    const r = await fetch(`/api/cases/${id}`);
    const d = await r.json();
    setDetail(d);
  }

  async function act(action: string) {
    if (!detail) return;
    if (action === "override" && !reason.trim()) {
      setOverrideOpen(true);
      return;
    }
    const r = await fetch(`/api/cases/${detail.case.case_id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, reason, actor: role === "risk_lead" ? "ccp" : "ccp" }),
    });
    const d = await r.json();
    if (r.ok) {
      await open(detail.case.case_id);
      await loadList();
      setOverrideOpen(false);
      setReason("");
    }
  }

  const c = detail?.case;
  const canOverride = role === "risk_lead";

  return (
    <>
      <TopBar dark />
      <main className="surface-dark" style={{ minHeight: "calc(100vh - 62px)" }}>
        <div className="wrap section" style={{ maxWidth: 1240 }}>
          <div className="row between center" style={{ flexWrap: "wrap", gap: 12 }}>
            <div>
              <p className="eyebrow" style={{ color: "#7fb6ee" }}>Intuitive Servicing Portal</p>
              <h2 className="head">Agentic dispute queue</h2>
            </div>
            <div className="row center" style={{ gap: 10 }}>
              <select className="in" style={{ width: 280 }} value={role} onChange={(e) => setRole(e.target.value)}>
                {ROLES.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
              </select>
              <button className="btn ghost" onClick={loadList}>↻ Refresh</button>
            </div>
          </div>

          <div className="row" style={{ gap: 18, marginTop: 18, alignItems: "flex-start", flexWrap: "wrap" }}>
            {/* Queue */}
            <div style={{ flex: "1 1 320px", minWidth: 300 }}>
              <div className="row" style={{ gap: 6, marginBottom: 10 }}>
                {(["all", "escalated"] as const).map((f) => (
                  <button key={f} className={"btn sm " + (filter === f ? "primary" : "outline")} onClick={() => setFilter(f)}>
                    {f === "all" ? "All cases" : "Escalated"}
                  </button>
                ))}
              </div>
              {list.length === 0 ? (
                <div className="card"><span className="muted small">No cases yet. Generate one in the Card Member app, then escalate it.</span></div>
              ) : (
                <div className="col" style={{ gap: 10 }}>
                  {list.map((s) => (
                    <button
                      key={s.case_id}
                      className="card"
                      onClick={() => open(s.case_id)}
                      style={{ textAlign: "left", cursor: "pointer", padding: 16, border: selected === s.case_id ? "2px solid var(--bright)" : undefined }}
                    >
                      <div className="row between center">
                        <span style={{ fontWeight: 800 }}>{s.card_name}</span>
                        {statusBadge(s.status)}
                      </div>
                      <div className="small muted" style={{ marginTop: 4 }}>
                        {s.merchant} · ${s.amount} · {s.agent}
                      </div>
                      <div className="row between center" style={{ marginTop: 8 }}>
                        <span className="small">Fidelity <b style={{ color: s.score >= 85 ? "#7fe0b0" : s.score >= 50 ? "#ffcf7a" : "#ff9a9a" }}>{s.score}</b></span>
                        <span className="mono small muted">{s.case_id}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Detail */}
            <div style={{ flex: "2 1 560px", minWidth: 380 }}>
              {!c ? (
                <div className="card"><span className="muted">Select a case to see ACER&apos;s pre-built evidence, fidelity score, and recommendation.</span></div>
              ) : (
                <div className="col" style={{ gap: 16 }}>
                  {/* header */}
                  <div className="card">
                    <div className="row between center" style={{ flexWrap: "wrap", gap: 10 }}>
                      <div>
                        <h3>{c.card_name}</h3>
                        <div className="small muted" style={{ marginTop: 4 }}>
                          {c.transaction.merchant} · {c.transaction.currency} {c.transaction.amount} ·{" "}
                          agent “{c.agent.name}” <span className={"badge " + (c.agent.status === "verified" ? "b-good" : "b-bad")}>{c.agent.status}</span>
                        </div>
                      </div>
                      {statusBadge(c.status)}
                    </div>
                    <div className="row" style={{ gap: 20, marginTop: 16, alignItems: "center", flexWrap: "wrap" }}>
                      <ScoreRing score={c.fidelity.score} />
                      <div style={{ flex: "1 1 280px" }}>
                        <div className="divtag" style={{ color: "#9fc0ea" }}>Intent fidelity · {Math.round(c.fidelity.confidence * 100)}% confidence</div>
                        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 6, lineHeight: 1.35 }}>{c.fidelity.verdict}</div>
                        {c.routing.guardrails_triggered.length > 0 && (
                          <div style={{ marginTop: 8 }}>
                            {c.routing.guardrails_triggered.map((g) => (
                              <span key={g} className="badge b-bad mono" style={{ marginRight: 6 }}>{g}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* field-by-field */}
                  <div className="card">
                    <h3>Intent vs. actual</h3>
                    <div style={{ marginTop: 12, overflowX: "auto", background: "#fff", borderRadius: 12, padding: 12 }}>
                      <FieldTable fields={c.fidelity.per_field} />
                    </div>
                  </div>

                  {/* recommendation + actions */}
                  <div className="card">
                    <h3>ACER recommendation</h3>
                    <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{c.routing.remedy}</div>
                    <div className="small muted" style={{ marginTop: 6 }}>{c.routing.rationale}</div>
                    <div className="small muted" style={{ marginTop: 4, fontStyle: "italic" }}>{c.routing.reason}</div>

                    {c.status === "resolved" ? (
                      <div className="panel" style={{ marginTop: 14, background: "#f1faf5", borderColor: "var(--good)", color: "var(--deep)" }}>
                        <span className="badge b-good">Resolved</span> <span className="small">Decision logged to the audit trail.</span>
                      </div>
                    ) : (
                      <>
                        <div className="row" style={{ gap: 10, marginTop: 16, flexWrap: "wrap" }}>
                          <button className="btn primary" onClick={() => act("approve")}>Approve recommendation</button>
                          <button className="btn outline" style={{ background: "transparent", color: "#fff", borderColor: "rgba(140,180,235,.4)" }} onClick={() => setOverrideOpen((v) => !v)} disabled={!canOverride}>
                            Override{!canOverride ? " (Risk Lead only)" : ""}
                          </button>
                          <button className="btn danger" onClick={() => act("escalate")}>Escalate further</button>
                        </div>
                        {overrideOpen && canOverride && (
                          <div style={{ marginTop: 12 }}>
                            <label className="fld" style={{ color: "#9fc0ea" }}>Override reason (required, logged)</label>
                            <textarea className="in" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you overriding ACER's recommendation?" />
                            <button className="btn deep" style={{ marginTop: 8 }} onClick={() => act("override")}>Submit override</button>
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* evidence */}
                  <div className="card">
                    <h3 style={{ marginBottom: 12 }}>Evidence chain</h3>
                    <Evidence c={c} />
                  </div>

                  {/* audit */}
                  <details className="card">
                    <summary style={{ cursor: "pointer", fontWeight: 800, listStyle: "none" }}>Audit trail ({detail?.audit.length || 0} entries)</summary>
                    <div style={{ marginTop: 12 }}>
                      {detail?.audit.map((a) => (
                        <div key={a.id} className="kv" style={{ borderColor: "rgba(140,180,235,.2)" }}>
                          <span className="k" style={{ color: "#9fc0ea" }}>{a.step}{a.model ? ` · ${a.model}` : ""}{a.prompt_version ? ` · ${a.prompt_version}` : ""}</span>
                          <span className="v mono" style={{ color: "#cfe3f7" }}>{new Date(a.ts).toLocaleTimeString()}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
