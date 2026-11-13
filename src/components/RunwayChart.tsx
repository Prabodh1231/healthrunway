import { fmt } from "@/lib/risk";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * Cumulative expected health spending over the next 12 months against the WHO catastrophic
 * lines (10% and 25% of annual income). Optional `after` draws the what-if path.
 */
export function RunwayChart(props: { projection: number[]; after?: number[]; t10: number; t25: number }) {
  const { projection, after, t10, t25 } = props;
  const W = 640;
  const H = 240;
  const pad = { l: 8, r: 8, t: 14, b: 28 };
  const maxY = Math.max(t10 * 1.35, Math.min(t25 * 1.15, Math.max(...projection) * 1.08), Math.max(...projection) * 1.05);
  const y = (v: number) => pad.t + (1 - Math.min(v, maxY) / maxY) * (H - pad.t - pad.b);
  const slot = (W - pad.l - pad.r) / 12;
  const barW = slot * 0.62;
  const startMonth = new Date().getMonth() + 1;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Projected cumulative health spending">
      {projection.map((v, i) => {
        const x = pad.l + i * slot + (slot - barW) / 2;
        const color = v > t25 ? "#dc2626" : v > t10 ? "#f59e0b" : "#0b7a68";
        return (
          <g key={i}>
            <rect x={x} y={y(v)} width={barW} height={H - pad.b - y(v)} rx={4} fill={color} opacity={after ? 0.35 : 0.9}>
              <title>{`Month ${i + 1}: ₹${fmt(v)} spent so far`}</title>
            </rect>
            <text x={x + barW / 2} y={H - 9} textAnchor="middle" fontSize="11" fill="#5a6763">
              {MONTHS[(startMonth + i) % 12]}
            </text>
          </g>
        );
      })}
      {after && (
        <polyline
          fill="none"
          stroke="#0b7a68"
          strokeWidth="3"
          strokeLinejoin="round"
          points={after.map((v, i) => `${pad.l + i * slot + slot / 2},${y(v)}`).join(" ")}
        />
      )}
      {after?.map((v, i) => (
        <circle key={i} cx={pad.l + i * slot + slot / 2} cy={y(v)} r={3.5} fill="#0b7a68" />
      ))}
      {[
        { v: t10, label: "10% of income: catastrophic", color: "#d97706" },
        { v: t25, label: "25%: severe", color: "#dc2626" },
      ].map(
        (line) =>
          line.v <= maxY && (
            <g key={line.label}>
              <line x1={pad.l} x2={W - pad.r} y1={y(line.v)} y2={y(line.v)} stroke={line.color} strokeDasharray="6 5" strokeWidth="1.5" />
              <text
                x={pad.l + 4}
                y={y(line.v) - 6}
                fontSize="12"
                fontWeight="600"
                fill={line.color}
                stroke="#ffffff"
                strokeWidth="4"
                paintOrder="stroke"
              >
                {line.label} (₹{fmt(line.v)})
              </text>
            </g>
          ),
      )}
    </svg>
  );
}
