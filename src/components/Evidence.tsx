"use client";
import type { Case } from "@/lib/types";

function Json({ data }: { data: unknown }) {
  return <pre className="json">{JSON.stringify(data, null, 2)}</pre>;
}

/** Expandable evidence chain — every object ACER reasoned over. */
export default function Evidence({ c }: { c: Case }) {
  const items: { key: string; label: string; data: unknown }[] = [
    { key: "intent_contract", label: "Intent contract (locked)", data: c.intent },
    { key: "payment_token", label: "Single-use payment token", data: c.payment_token },
    { key: "agent_registry", label: "Agent registration", data: c.agent },
    { key: "transaction", label: "Transaction (what the agent did)", data: c.transaction },
  ];
  return (
    <div>
      {items.map((it) => (
        <details className="accordion" key={it.key}>
          <summary>
            <span>{it.label}</span>
            <span className="badge b-neutral mono">{it.key}</span>
          </summary>
          <div className="body">
            <Json data={it.data} />
          </div>
        </details>
      ))}
    </div>
  );
}
