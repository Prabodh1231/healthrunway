"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Plus, Trash2, Wand2, Pill } from "lucide-react";
import { CONDITIONS, INSURANCE, type Condition, type Household, type InsuranceType, type Member } from "@/lib/types";
import { COVER, DEMO_HOUSEHOLD, fmt } from "@/lib/risk";
import { cabinetTotals, useCabinet, useHousehold } from "@/lib/store";

const EMPTY: Household = {
  location: "urban",
  hospitalPreference: "private",
  members: [{ id: "m1", label: "Me", age: 35, conditions: [] }],
  monthlyIncome: 0,
  savings: 0,
  insurance: { type: "none", sumInsured: 0 },
  monthlyMedicineSpend: 0,
  monthlyOtherHealthSpend: 0,
};

const STEPS = ["Family", "Money", "Health cover", "Regular costs"];

export default function CheckPage() {
  const router = useRouter();
  const [saved, setSaved, ready] = useHousehold();
  const [cabinet] = useCabinet();
  const [draft, setDraft] = useState<Household | null>(null);
  const [step, setStep] = useState(0);

  if (!ready) return <div className="mx-auto max-w-3xl px-4 py-16 text-muted">Loading…</div>;
  const h = draft ?? saved ?? EMPTY;
  const set = (patch: Partial<Household>) => setDraft({ ...h, ...patch });
  const setMember = (id: string, patch: Partial<Member>) =>
    set({ members: h.members.map((m) => (m.id === id ? { ...m, ...patch } : m)) });

  const cabinetMonthly = cabinetTotals(cabinet).brandMonthly;
  const canNext = step !== 1 || h.monthlyIncome > 0;

  function finish(household: Household) {
    setSaved(household);
    router.push("/dashboard");
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Family risk check</h1>
          <p className="mt-1 text-muted">About two minutes. Everything stays on this device.</p>
        </div>
        <button className="btn btn-ghost text-sm" onClick={() => finish(DEMO_HOUSEHOLD)}>
          <Wand2 size={16} /> Use a demo family
        </button>
      </div>

      <ol className="mt-8 grid grid-cols-4 gap-2" aria-label="Progress">
        {STEPS.map((s, i) => (
          <li key={s}>
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              className="w-full text-left"
              aria-current={i === step ? "step" : undefined}
            >
              <div className={`h-1.5 rounded-full ${i <= step ? "bg-brand" : "bg-line"}`} />
              <div className={`mt-2 text-xs font-medium sm:text-sm ${i === step ? "text-foreground" : "text-muted"}`}>
                {s}
              </div>
            </button>
          </li>
        ))}
      </ol>

      <div className="card mt-6 p-5 sm:p-7">
        {step === 0 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Who is in your household?</h2>
              <p className="mt-1 text-sm text-muted">
                Add everyone whose health costs come out of the same family budget.
              </p>
            </div>
            <Segmented
              label="Where do you live?"
              value={h.location}
              options={[
                ["urban", "City / town"],
                ["rural", "Village"],
              ]}
              onChange={(location) => set({ location })}
            />
            <div className="space-y-4">
              {h.members.map((m) => (
                <div key={m.id} className="rounded-xl border border-line p-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="label" htmlFor={`label-${m.id}`}>
                        Name or relation
                      </label>
                      <input
                        id={`label-${m.id}`}
                        className="input"
                        value={m.label}
                        onChange={(e) => setMember(m.id, { label: e.target.value })}
                      />
                    </div>
                    <div className="w-24">
                      <label className="label" htmlFor={`age-${m.id}`}>
                        Age
                      </label>
                      <input
                        id={`age-${m.id}`}
                        className="input tabular"
                        type="number"
                        min={0}
                        max={110}
                        value={m.age}
                        onChange={(e) => setMember(m.id, { age: clampInt(e.target.value, 0, 110) })}
                      />
                    </div>
                    {h.members.length > 1 && (
                      <button
                        className="mt-6 self-start rounded-lg p-2 text-muted hover:bg-red-50 hover:text-red-600"
                        aria-label={`Remove ${m.label}`}
                        onClick={() => set({ members: h.members.filter((x) => x.id !== m.id) })}
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  <div className="mt-3">
                    <span className="label">Long-term conditions</span>
                    <div className="flex flex-wrap gap-2">
                      {(Object.keys(CONDITIONS) as Condition[]).map((c) => {
                        const on = m.conditions.includes(c);
                        return (
                          <button
                            key={c}
                            type="button"
                            aria-pressed={on}
                            onClick={() =>
                              setMember(m.id, {
                                conditions: on ? m.conditions.filter((x) => x !== c) : [...m.conditions, c],
                              })
                            }
                            className={`rounded-full border px-3 py-1 text-sm ${
                              on
                                ? "border-brand bg-brand-soft font-medium text-brand-strong"
                                : "border-line text-muted hover:border-brand"
                            }`}
                          >
                            {CONDITIONS[c]}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
              <button
                className="btn btn-ghost w-full"
                onClick={() =>
                  set({
                    members: [...h.members, { id: crypto.randomUUID(), label: "", age: 30, conditions: [] }],
                  })
                }
              >
                <Plus size={16} /> Add family member
              </button>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Money coming in, money set aside</h2>
              <p className="mt-1 text-sm text-muted">Rough numbers are fine.</p>
            </div>
            <Rupee
              id="income"
              label="Total household income per month"
              hint="All earning members, after tax."
              value={h.monthlyIncome}
              onChange={(monthlyIncome) => set({ monthlyIncome })}
            />
            <Rupee
              id="savings"
              label="Savings you could use in an emergency"
              hint="Cash, bank savings, FDs you could break. Leave out gold or land you would not sell."
              value={h.savings}
              onChange={(savings) => set({ savings })}
            />
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Health insurance and treatment</h2>
              <p className="mt-1 text-sm text-muted">Pick the main cover your family has.</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {(Object.keys(INSURANCE) as InsuranceType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={h.insurance.type === t}
                  onClick={() => set({ insurance: { type: t, sumInsured: COVER[t].defaultLimit } })}
                  className={`rounded-xl border p-3 text-left text-sm ${
                    h.insurance.type === t ? "border-brand bg-brand-soft font-semibold" : "border-line hover:border-brand"
                  }`}
                >
                  {INSURANCE[t]}
                </button>
              ))}
            </div>
            {h.insurance.type !== "none" && (
              <Rupee
                id="cover"
                label="Cover amount per year (sum insured)"
                hint={h.insurance.type === "pmjay" ? "PM-JAY covers up to ₹5,00,000 per family per year." : undefined}
                value={h.insurance.sumInsured}
                onChange={(sumInsured) => set({ insurance: { ...h.insurance, sumInsured } })}
              />
            )}
            <Segmented
              label="If someone needs to be admitted, where would you most likely go?"
              value={h.hospitalPreference}
              options={[
                ["private", "Private hospital"],
                ["public", "Government hospital"],
              ]}
              onChange={(hospitalPreference) => set({ hospitalPreference })}
            />
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold">Regular health costs</h2>
              <p className="mt-1 text-sm text-muted">What the family spends in a normal month.</p>
            </div>
            <Rupee
              id="meds"
              label="Medicines per month"
              value={h.monthlyMedicineSpend}
              onChange={(monthlyMedicineSpend) => set({ monthlyMedicineSpend })}
            />
            {cabinetMonthly > 0 ? (
              <button
                className="btn btn-ghost w-full text-sm"
                onClick={() => set({ monthlyMedicineSpend: Math.round(cabinetMonthly) })}
              >
                <Pill size={16} /> Use my medicine list: ₹{fmt(cabinetMonthly)} a month
              </button>
            ) : (
              <p className="text-sm text-muted">
                Not sure? Add your medicines in{" "}
                <Link href="/medicines" className="font-medium text-brand underline">
                  Medicine savings
                </Link>{" "}
                to get an exact figure.
              </p>
            )}
            <Rupee
              id="other"
              label="Doctor visits, tests and scans per month"
              value={h.monthlyOtherHealthSpend}
              onChange={(monthlyOtherHealthSpend) => set({ monthlyOtherHealthSpend })}
            />
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <button className="btn btn-ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            <ArrowLeft size={16} /> Back
          </button>
          {step < STEPS.length - 1 ? (
            <button className="btn btn-primary" disabled={!canNext} onClick={() => setStep(step + 1)}>
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button className="btn btn-primary" onClick={() => finish(h)}>
              See my risk <ArrowRight size={16} />
            </button>
          )}
        </div>
        {!canNext && <p className="mt-3 text-right text-sm text-muted">Enter your monthly income to continue.</p>}
      </div>
    </div>
  );
}

function clampInt(v: string, min: number, max: number) {
  const n = Math.round(Number(v.replace(/[^\d]/g, "")) || 0);
  return Math.max(min, Math.min(max, n));
}

function Rupee(props: { id: string; label: string; hint?: string; value: number; onChange: (n: number) => void }) {
  return (
    <div>
      <label className="label" htmlFor={props.id}>
        {props.label}
      </label>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">₹</span>
        <input
          id={props.id}
          className="input tabular pl-7"
          inputMode="numeric"
          value={props.value ? props.value.toLocaleString("en-IN") : ""}
          placeholder="0"
          onChange={(e) => props.onChange(clampInt(e.target.value, 0, 1_000_000_000))}
        />
      </div>
      {props.hint && <p className="mt-1.5 text-xs text-muted">{props.hint}</p>}
    </div>
  );
}

function Segmented<T extends string>(props: {
  label: string;
  value: T;
  options: [T, string][];
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <span className="label">{props.label}</span>
      <div className="inline-flex rounded-xl border border-line bg-background p-1">
        {props.options.map(([v, text]) => (
          <button
            key={v}
            type="button"
            aria-pressed={props.value === v}
            onClick={() => props.onChange(v)}
            className={`rounded-lg px-4 py-1.5 text-sm font-medium ${
              props.value === v ? "bg-surface text-foreground shadow-sm" : "text-muted"
            }`}
          >
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}
