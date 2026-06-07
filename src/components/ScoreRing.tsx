"use client";

export default function ScoreRing({
  score,
  size = 120,
}: {
  score: number;
  size?: number;
}) {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score)) / 100;
  const color = score >= 85 ? "var(--good)" : score >= 50 ? "var(--warn)" : "var(--bad)";
  return (
    <div className="ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--line)" strokeWidth="10" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - pct)}
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="val" style={{ color, fontSize: size * 0.25 }}>
        {Math.round(score)}
      </div>
    </div>
  );
}
