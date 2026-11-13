import { LEVEL_META, type RiskLevel } from "@/lib/risk";

export const TONE: Record<RiskLevel, { text: string; bg: string; stroke: string; ring: string }> = {
  protected: { text: "text-emerald-700", bg: "bg-emerald-50", stroke: "#059669", ring: "ring-emerald-200" },
  watch: { text: "text-amber-700", bg: "bg-amber-50", stroke: "#d97706", ring: "ring-amber-200" },
  "at-risk": { text: "text-orange-700", bg: "bg-orange-50", stroke: "#ea580c", ring: "ring-orange-200" },
  critical: { text: "text-red-700", bg: "bg-red-50", stroke: "#dc2626", ring: "ring-red-200" },
};

/** Half-circle gauge, 0-100. */
export function RiskGauge({ score, level }: { score: number; level: RiskLevel }) {
  const r = 80;
  const circumference = Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  const tone = TONE[level];
  return (
    <div className="relative mx-auto w-full max-w-[240px]">
      <svg viewBox="0 0 200 115" className="w-full" role="img" aria-label={`Risk score ${score} out of 100`}>
        <path d="M 20 100 A 80 80 0 0 1 180 100" fill="none" stroke="#e3e7e1" strokeWidth="16" strokeLinecap="round" />
        <path
          d="M 20 100 A 80 80 0 0 1 180 100"
          fill="none"
          stroke={tone.stroke}
          strokeWidth="16"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          style={{ transition: "stroke-dasharray 600ms ease" }}
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 text-center">
        <div className="tabular text-5xl font-semibold tracking-tight">{score}</div>
        <div className={`text-sm font-semibold ${tone.text}`}>{LEVEL_META[level].label}</div>
      </div>
    </div>
  );
}
