import Link from "next/link";
import TopBar from "@/components/TopBar";

export default function Home() {
  return (
    <>
      <TopBar />
      <main>
        {/* Hero */}
        <section className="surface-dark" style={{ padding: "70px 0 80px" }}>
          <div className="wrap">
            <p className="eyebrow" style={{ color: "#7fb6ee" }}>
              ACE Resolve · ACER
            </p>
            <h1 className="title" style={{ maxWidth: "16ch" }}>
              Did the agent honor the Card Member&apos;s intent?
            </h1>
            <p className="sub" style={{ maxWidth: "54ch", color: "#b8cdec" }}>
              A customer delegates a purchase inside a third-party AI assistant.
              The agent buys on Amex rails — and slips up. ACER reads the whole
              story — intent, cart, token, agent, transaction — scores intent
              fidelity with GPT, and resolves it right inside the chat, escalating
              to an Amex Care Professional only when a human is needed.
            </p>
            <div className="row" style={{ marginTop: 28, flexWrap: "wrap" }}>
              <Link href="/app" className="btn primary">
                Open the agent chat →
              </Link>
              <Link href="/isp" className="btn outline" style={{ background: "transparent", color: "#fff", borderColor: "rgba(140,180,235,.4)" }}>
                Open the ISP (colleague) desktop
              </Link>
            </div>
            <div className="row" style={{ marginTop: 30, flexWrap: "wrap", gap: 10 }}>
              {["Intent", "Cart", "Token", "Agent", "Txn"].map((s) => (
                <span key={s} className="chip" style={{ background: "rgba(255,255,255,.06)", borderColor: "rgba(140,180,235,.3)", color: "#dce8fa" }}>
                  <span className="dot" />
                  {s}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* The shift */}
        <section className="section">
          <div className="wrap">
            <p className="eyebrow">The paradigm shift</p>
            <h2 className="head">
              Servicing was built for one question. Agentic commerce asks a new one.
            </h2>
            <div className="grid2c" style={{ marginTop: 22, gap: 18 }}>
              <div className="card" style={{ opacity: 0.8 }}>
                <div className="divtag" style={{ marginBottom: 10 }}>Today</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--muted)", lineHeight: 1.2 }}>
                  &ldquo;Did the <u>Card Member</u> make this charge?&rdquo;
                </div>
                <div className="small muted" style={{ marginTop: 14, fontWeight: 600 }}>
                  Transaction-based judgement
                </div>
              </div>
              <div className="card accent">
                <div className="divtag" style={{ marginBottom: 10, color: "var(--bright)" }}>ACE era</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "var(--deep)", lineHeight: 1.2 }}>
                  &ldquo;Did the <u style={{ textDecorationColor: "var(--bright)" }}>agent</u> faithfully execute the Card Member&apos;s{" "}
                  <span style={{ color: "var(--bright)" }}>intent</span>?&rdquo;
                </div>
                <div className="small" style={{ marginTop: 14, fontWeight: 700, color: "var(--bright)" }}>
                  Intent-based judgement
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="wrap">
            <p className="eyebrow">How GenAI enables it</p>
            <h2 className="head">One reasoning layer reads the whole story</h2>
            <div className="wrapcards" style={{ marginTop: 22 }}>
              {[
                { n: "1", t: "Reads approved intent", d: "Budget, items, merchants, dates the CM pre-authorized — cryptographically locked." },
                { n: "2", t: "Compares what the agent bought", d: "Cart, single-use token, and the posted transaction." },
                { n: "3", t: "Scores intent fidelity", d: "A field-by-field match / mismatch judgement in plain language." },
                { n: "4", t: "Routes the next step", d: "Self-serve, smart routing, or a pre-built case for a colleague." },
              ].map((s) => (
                <div key={s.n} className="card flat" style={{ flex: "1 1 230px", minWidth: 220 }}>
                  <div style={{ width: 36, height: 36, borderRadius: 10, background: "var(--bright)", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, marginBottom: 12 }}>
                    {s.n}
                  </div>
                  <h3>{s.t}</h3>
                  <div className="small muted" style={{ marginTop: 6, lineHeight: 1.5 }}>{s.d}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
