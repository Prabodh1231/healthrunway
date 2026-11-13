"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ExternalLink, Hospital, Pencil, TrendingUp, Wallet } from "lucide-react";
import { assess, fmt, LEVEL_META } from "@/lib/risk";
import { buildActions, simulate, type Simulation } from "@/lib/actions";
import { cabinetTotals, useCabinet, useHousehold } from "@/lib/store";
import { INSURANCE } from "@/lib/types";
import { RiskGauge, TONE } from "@/components/RiskGauge";
import { RunwayChart } from "@/components/RunwayChart";
import { AiExplainer } from "@/components/AiExplainer";

const runwayText = (m: number) => (m >= 12 ? "12+" : m.toFixed(1));

export default function Dashboard() {
  const [household, , ready] = useHousehold();
  const [cabinet] = useCabinet();
  const [sim, setSim] = useState<Simulation>({ generics: false, cover: false, fund: false });

  const cabinetSavings = cabinet.length ? cabinetTotals(cabinet).savingsMonthly : null;
  const a = useMemo(() => (household ? assess(household) : null), [household]);
  const actions = useMemo(
    () => (household && a ? buildActions(household, a, cabinetSavings) : []),
    [household, a, cabinetSavings],
  );
  const anySim = sim.generics || sim.cover || sim.fund;
  const after = useMemo(
    () => (household && a && anySim ? simulate(household, a, sim, cabinetSavings) : null),
    [household, a, sim, anySim, cabinetSavings],
  );

  if (!ready) return <div className="mx-auto max-w-6xl px-4 py-16 text-muted">Loading…</div>;
  if (!household || !a) {
    return (
      <div className="mx-auto max-w-xl px-4 py-20 text-center">
        <h1 className="text-2xl font-semibold">No risk check yet</h1>
        <p className="mt-2 text-muted">Answer a few questions about your family to see your early warning.</p>
        <Link href="/check" className="btn btn-primary mt-6">
          Start the risk check <ArrowRight size={16} />
        </Link>
      </div>
    );
  }

  const shown = after ?? a;
  const tone = TONE[shown.level];
  const crossesIn = a.runwayMonths < 12 ? Math.max(1, Math.ceil(a.runwayMonths)) : null;
  const shockParts = [
    { label: "Insurance pays", value: shown.shock.insurancePays, color: "#0b7a68" },
    { label: "From savings", value: shown.shock.fromSavings, color: "#7dd3c0" },
    { label: "Unpaid gap", value: shown.shock.gap, color: "#dc2626" },
  ];

  const facts = {
    risk_score: `${a.score}/100 (${LEVEL_META[a.level].label})`,
    family_members: household.members.map((m) => `${m.label || "member"} ${m.age}y${m.conditions.length ? ` (${m.conditions.join(", ")})` : ""}`).join("; "),
    monthly_income: `₹${fmt(household.monthlyIncome)}`,
    emergency_savings: `₹${fmt(household.savings)}`,
    insurance: INSURANCE[household.insurance.type],
    expected_health_spend_per_month: `₹${fmt(a.totalMonthly)}`,
    share_of_income: `${(a.cheRatio * 100).toFixed(1)}% (catastrophic above 10%)`,
    health_runway: a.runwayMonths >= 12 ? "stays under the 10% line all year" : `crosses the 10% line in month ${crossesIn}`,
    major_hospital_bill: `₹${fmt(a.shock.bill)}`,
    insurance_would_pay: `₹${fmt(a.shock.insurancePays)}`,
    unpaid_gap_after_savings: `₹${fmt(a.shock.gap)}`,
  };
  const actionLines = actions.map((x) => `${x.title}${x.impact ? `: ${x.impact}` : ""}`);
  const fallback = [
    `Your family's risk score is ${a.score}/100 (${LEVEL_META[a.level].label}).`,
    ...actionLines.map((l) => `- ${l}`),
  ].join("\n");

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted">Early-warning report</p>
          <h1 className="text-3xl font-semibold tracking-tight">Your family&apos;s health runway</h1>
        </div>
        <Link href="/check" className="btn btn-ghost text-sm">
          <Pencil size={15} /> Edit answers
        </Link>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Score */}
        <div className={`card p-6 ring-1 ${tone.ring}`}>
          <RiskGauge score={shown.score} level={shown.level} />
          {after && (
            <p className="mt-3 text-center text-sm text-muted">
              Was {a.score} ({LEVEL_META[a.level].label}) before your changes
            </p>
          )}
          <ul className="mt-5 space-y-3 border-t border-line pt-4">
            {shown.drivers.map((d) => (
              <li key={d.label}>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{d.label}</span>
                  <span className="tabular text-muted">+{d.points}</span>
                </div>
                <p className="mt-0.5 text-xs leading-relaxed text-muted">{d.detail}</p>
              </li>
            ))}
          </ul>
        </div>

        {/* Runway */}
        <div className="card p-6 lg:col-span-2">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
                <TrendingUp size={16} /> Health runway
              </h2>
              <div className="mt-1 flex items-baseline gap-2">
                <span className={`tabular text-5xl font-semibold tracking-tight ${tone.text}`}>
                  {runwayText(shown.runwayMonths)}
                </span>
                <span className="text-lg text-muted">months</span>
                {after && <span className="text-sm text-muted">(was {runwayText(a.runwayMonths)})</span>}
              </div>
              <p className="mt-1 max-w-md text-sm text-muted">
                {shown.runwayMonths >= 12
                  ? "At this rate your health spending stays under 10% of income for the whole year."
                  : `At this rate your family crosses the WHO catastrophic-spending line (10% of income) in month ${Math.max(1, Math.ceil(shown.runwayMonths))}.`}
              </p>
            </div>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <dt className="text-muted">Medicines + visits</dt>
              <dd className="tabular text-right font-medium">₹{fmt(shown.recurringMonthly)}/mo</dd>
              <dt className="text-muted">Expected hospital cost</dt>
              <dd className="tabular text-right font-medium">₹{fmt(shown.expectedHospitalMonthly)}/mo</dd>
              <dt className="text-muted">Share of income</dt>
              <dd className={`tabular text-right font-semibold ${tone.text}`}>{(shown.cheRatio * 100).toFixed(1)}%</dd>
            </dl>
          </div>
          <div className="mt-4">
            <RunwayChart projection={a.projection} after={after?.projection} t10={a.threshold10} t25={a.threshold25} />
          </div>
          <p className="mt-1 text-xs text-muted">
            Bars: expected health spending added up month by month.{after && " Line: with the changes you selected."}
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {/* Shock test */}
        <div className="card p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
            <Hospital size={16} /> Hospital shock test
          </h2>
          <p className="mt-2 text-sm">
            If a family member needed a <strong>major hospital stay tomorrow</strong> (surgery, heart event, ICU), the
            bill would be about
          </p>
          <div className="tabular mt-1 text-3xl font-semibold tracking-tight">₹{fmt(shown.shock.bill)}</div>
          <div className="mt-4 flex h-4 overflow-hidden rounded-full bg-line" aria-hidden>
            {shockParts.map((p) =>
              p.value > 0 ? (
                <div key={p.label} style={{ width: `${(p.value / shown.shock.bill) * 100}%`, background: p.color }} />
              ) : null,
            )}
          </div>
          <dl className="mt-4 space-y-2 text-sm">
            {shockParts.map((p) => (
              <div key={p.label} className="flex items-center justify-between">
                <dt className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: p.color }} />
                  {p.label}
                </dt>
                <dd className={`tabular font-medium ${p.label === "Unpaid gap" && p.value > 0 ? "text-red-700" : ""}`}>
                  ₹{fmt(p.value)}
                </dd>
              </div>
            ))}
          </dl>
          {shown.shock.gap > 0 && (
            <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">
              That gap is {(shown.shock.gap / Math.max(1, household.monthlyIncome)).toFixed(1)} months of income. It is
              the money a family usually has to borrow.
            </p>
          )}
        </div>

        {/* What-if */}
        <div className="card p-6 lg:col-span-2">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-muted">
            <Wallet size={16} /> What would change it?
          </h2>
          <p className="mt-1 text-sm text-muted">Turn on a step to see your score, runway and shock gap update.</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {(
              [
                ["generics", "Switch to generics", household.monthlyMedicineSpend > 0],
                ["cover", "₹5 lakh hospital cover", household.insurance.sumInsured < 500000],
                ["fund", "Save 10% of income for a year", a.shock.gap > 0],
              ] as const
            ).map(([key, label, enabled]) => (
              <button
                key={key}
                disabled={!enabled}
                onClick={() => setSim((s) => ({ ...s, [key]: !s[key] }))}
                aria-pressed={sim[key]}
                className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-left text-sm font-medium disabled:opacity-40 ${
                  sim[key] ? "border-brand bg-brand-soft text-brand-strong" : "border-line hover:border-brand"
                }`}
              >
                {label}
                <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${sim[key] ? "bg-brand" : "bg-line"}`}>
                  <span
                    className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${sim[key] ? "left-[18px]" : "left-0.5"}`}
                  />
                </span>
              </button>
            ))}
          </div>

          <h3 className="mt-6 text-sm font-semibold">Recommended next steps</h3>
          <ol className="mt-3 space-y-3">
            {actions.map((x, i) => (
              <li key={x.id} className="flex gap-3 rounded-xl border border-line p-4">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand-soft text-xs font-semibold text-brand-strong">
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <div className="font-medium">{x.title}</div>
                  <p className="mt-0.5 text-sm leading-relaxed text-muted">{x.detail}</p>
                  {x.impact && <p className="mt-1 text-sm font-semibold text-brand-strong">{x.impact}</p>}
                  {x.link &&
                    (x.link.external ? (
                      <a href={x.link.href} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand underline">
                        {x.link.label} <ExternalLink size={13} />
                      </a>
                    ) : (
                      <Link href={x.link.href} className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-brand underline">
                        {x.link.label} <ArrowRight size={13} />
                      </Link>
                    ))}
                </div>
              </li>
            ))}
            {!actions.length && <li className="text-sm text-muted">No urgent steps. Review again if anything changes.</li>}
          </ol>
        </div>
      </div>

      <div className="mt-4">
        <AiExplainer facts={facts} actions={actionLines} fallback={fallback} />
      </div>

      <p className="mt-6 text-xs leading-relaxed text-muted">
        Estimates use national averages and stated assumptions, not your medical records.{" "}
        <Link href="/how-it-works" className="underline">
          See how the numbers are calculated
        </Link>
        .
      </p>
    </div>
  );
}
