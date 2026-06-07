"use client";
import { useEffect, useState } from "react";
import TopBar from "@/components/TopBar";
import type { AuditEntry } from "@/lib/types";

export default function Admin() {
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [shadow, setShadow] = useState(false);

  async function load() {
    const r = await fetch("/api/audit");
    const d = await r.json();
    setAudit(d.audit || []);
  }
  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <TopBar />
      <main className="wrap section" style={{ maxWidth: 1000 }}>
        <div className="row between center" style={{ flexWrap: "wrap", gap: 12 }}>
          <div>
            <p className="eyebrow">Governance</p>
            <h2 className="head">Append-only audit log</h2>
            <p className="sub">Every assembly, redaction, GPT call (with model + prompt version), score, routing decision and human action — immutable.</p>
          </div>
          <div className="col" style={{ gap: 8, alignItems: "flex-end" }}>
            <label className="row center" style={{ gap: 8, fontWeight: 700, fontSize: 13 }}>
              <input type="checkbox" checked={shadow} onChange={(e) => setShadow(e.target.checked)} />
              Shadow mode {shadow ? <span className="badge b-warn">recommend-only</span> : <span className="badge b-good">live</span>}
            </label>
            <button className="btn ghost sm" onClick={load}>↻ Refresh</button>
          </div>
        </div>

        <div className="card" style={{ marginTop: 18, padding: 0 }}>
          {audit.length === 0 ? (
            <div style={{ padding: 24 }}><span className="muted">No activity yet. Run a scenario in the Card Member app.</span></div>
          ) : (
            <div style={{ padding: 8 }}>
              {audit.map((a) => (
                <details className="accordion" key={a.id}>
                  <summary>
                    <span>
                      <span className="mono small muted">{new Date(a.ts).toLocaleTimeString()}</span>{" "}
                      <b>{a.step}</b>{" "}
                      <span className="badge b-neutral">{a.actor}</span>
                      {a.model ? <span className="badge b-info mono" style={{ marginLeft: 6 }}>{a.model}</span> : null}
                    </span>
                    <span className="mono small muted">{a.case_id || "—"}</span>
                  </summary>
                  <div className="body">
                    <pre className="json">{JSON.stringify(a.payload, null, 2)}</pre>
                  </div>
                </details>
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  );
}
