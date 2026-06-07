"use client";
import type { FieldVerdict } from "@/lib/types";

export default function FieldTable({ fields }: { fields: FieldVerdict[] }) {
  return (
    <table className="t">
      <thead>
        <tr>
          <th>Field</th>
          <th>Approved intent</th>
          <th>What the agent did</th>
          <th>Verdict</th>
          <th>Evidence</th>
        </tr>
      </thead>
      <tbody>
        {fields.map((f, i) => (
          <tr key={i}>
            <td style={{ fontWeight: 700 }}>{f.field}</td>
            <td>{f.expected}</td>
            <td>{f.actual}</td>
            <td>
              <span className={"pill " + f.status}>{f.status}</span>
              {f.note ? (
                <div className="muted small" style={{ marginTop: 4 }}>
                  {f.note}
                </div>
              ) : null}
            </td>
            <td>
              <span className="badge b-neutral mono">{f.evidence_ref}</span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
