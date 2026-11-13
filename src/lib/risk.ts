import type { Condition, Household, InsuranceType } from "./types";

/**
 * HealthRunway risk model. Every number here is either from a cited source or a labelled
 * assumption, so the result can be explained line by line (see /how-it-works).
 */

// WHO / SDG 3.8.2: household health spending above 10% (or 25%) of income is "catastrophic".
export const CHE_LOW = 0.1;
export const CHE_HIGH = 0.25;

// NSS 75th round (2017-18), MoSPI: average medical expenditure per hospitalisation case in
// private hospitals, excluding childbirth. Private care costs ~7x government care.
const NSS_PRIVATE_CASE = { urban: 38822, rural: 27347 };
const PRIVATE_TO_PUBLIC = 7;
// Assumption: 7% a year medical inflation, 2017-18 -> 2026 (8.5 years) = x1.78.
const INFLATION_TO_2026 = Math.pow(1.07, 8.5);

// Assumption: annual chance a person is hospitalised, by age. Calibrate with NSS age tables.
const AGE_RATES: [number, number][] = [
  [14, 0.015],
  [44, 0.02],
  [59, 0.035],
  [69, 0.06],
  [200, 0.09],
];

// Assumption: extra annual hospitalisation chance and cost multiplier per long-term condition.
const CONDITION_RISK: Record<Condition, { addP: number; costX: number }> = {
  diabetes: { addP: 0.02, costX: 1.1 },
  hypertension: { addP: 0.015, costX: 1.1 },
  heart: { addP: 0.06, costX: 1.6 },
  kidney: { addP: 0.08, costX: 1.6 },
  respiratory: { addP: 0.03, costX: 1.1 },
  thyroid: { addP: 0.005, costX: 1.0 },
  cancer: { addP: 0.15, costX: 2.5 },
  other: { addP: 0.02, costX: 1.1 },
};

// Assumption: share of a hospital bill each type of cover actually pays (room-rent caps,
// consumables, medicines bought outside, and non-empanelled hospitals leave a gap).
export const COVER: Record<InsuranceType, { share: number; defaultLimit: number }> = {
  none: { share: 0, defaultLimit: 0 },
  pmjay: { share: 0.75, defaultLimit: 500000 },
  govt: { share: 0.8, defaultLimit: 500000 },
  employer: { share: 0.8, defaultLimit: 300000 },
  private: { share: 0.8, defaultLimit: 500000 },
};

// A "major" stay (surgery, cardiac event, ICU) is modelled as 3x an average case.
const MAJOR_CASE_MULTIPLIER = 3;

export type RiskLevel = "protected" | "watch" | "at-risk" | "critical";

export const LEVEL_META: Record<RiskLevel, { label: string; tone: string }> = {
  protected: { label: "Protected", tone: "emerald" },
  watch: { label: "Watch", tone: "amber" },
  "at-risk": { label: "At risk", tone: "orange" },
  critical: { label: "Critical", tone: "red" },
};

export interface Driver {
  label: string;
  points: number;
  detail: string;
}

export interface Assessment {
  annualIncome: number;
  typicalCaseCost: number;
  recurringMonthly: number;
  expectedHospitalMonthly: number;
  totalMonthly: number;
  annualSpend: number;
  cheRatio: number;
  runwayMonths: number;
  shock: { bill: number; insurancePays: number; youPay: number; fromSavings: number; gap: number };
  score: number;
  level: RiskLevel;
  drivers: Driver[];
  projection: number[];
  threshold10: number;
  threshold25: number;
}

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));

export function caseCost(h: Pick<Household, "location" | "hospitalPreference">) {
  const privateCost = NSS_PRIVATE_CASE[h.location] * INFLATION_TO_2026;
  return h.hospitalPreference === "private" ? privateCost : privateCost / PRIVATE_TO_PUBLIC;
}

function hospitalisationChance(age: number, conditions: Condition[]) {
  const base = AGE_RATES.find(([max]) => age <= max)![1];
  const extra = conditions.reduce((s, c) => s + CONDITION_RISK[c].addP, 0);
  return Math.min(0.6, base + extra);
}

function coverFor(h: Household) {
  const c = COVER[h.insurance.type];
  const limit = h.insurance.type === "none" ? 0 : h.insurance.sumInsured || c.defaultLimit;
  return { share: c.share, limit };
}

function insurerPays(bill: number, h: Household) {
  const { share, limit } = coverFor(h);
  return Math.min(bill * share, limit);
}

export function assess(h: Household): Assessment {
  const annualIncome = Math.max(1, h.monthlyIncome * 12);
  const typicalCaseCost = caseCost(h);

  // Expected out-of-pocket hospital cost per year, summed over members.
  let expectedHospitalAnnual = 0;
  let worstCostX = 1;
  for (const m of h.members) {
    const p = hospitalisationChance(m.age, m.conditions);
    const costX = Math.max(1, ...m.conditions.map((c) => CONDITION_RISK[c].costX));
    worstCostX = Math.max(worstCostX, costX);
    const bill = typicalCaseCost * costX;
    expectedHospitalAnnual += p * (bill - insurerPays(bill, h));
  }

  const recurringMonthly = h.monthlyMedicineSpend + h.monthlyOtherHealthSpend;
  const expectedHospitalMonthly = expectedHospitalAnnual / 12;
  const totalMonthly = recurringMonthly + expectedHospitalMonthly;
  const annualSpend = totalMonthly * 12;
  const cheRatio = annualSpend / annualIncome;
  const threshold10 = annualIncome * CHE_LOW;
  const threshold25 = annualIncome * CHE_HIGH;
  const runwayMonths = totalMonthly > 0 ? threshold10 / totalMonthly : Infinity;

  // Shock test: one major hospital stay for the most vulnerable member, today.
  const bill = typicalCaseCost * MAJOR_CASE_MULTIPLIER * worstCostX;
  const insurancePays = insurerPays(bill, h);
  const youPay = bill - insurancePays;
  const fromSavings = Math.min(Math.max(0, h.savings), youPay);
  const gap = youPay - fromSavings;

  // Score: spending pressure (45) + shock gap (35) + structural vulnerability (20).
  const drivers: Driver[] = [];
  const spendPts = Math.round(clamp01(cheRatio / CHE_HIGH) * 45);
  drivers.push({
    label: "Health spending vs income",
    points: spendPts,
    detail: `Expected health spending is ${(cheRatio * 100).toFixed(1)}% of income. Above 10% is catastrophic by the WHO definition.`,
  });
  const shockPts = Math.round(clamp01(gap / Math.max(1, 2 * h.monthlyIncome)) * 35);
  drivers.push({
    label: "Hospital shock gap",
    points: shockPts,
    detail:
      gap > 0
        ? `A major hospital stay would leave ₹${fmt(gap)} unpaid after insurance and savings, about ${(gap / Math.max(1, h.monthlyIncome)).toFixed(1)} months of income.`
        : "Insurance and savings could cover a major hospital stay.",
  });
  let vulnPts = 0;
  const vulnBits: string[] = [];
  if (h.insurance.type === "none") {
    vulnPts += 7;
    vulnBits.push("no health insurance");
  }
  if (h.members.some((m) => m.age >= 60)) {
    vulnPts += 4;
    vulnBits.push("a member aged 60+");
  }
  const chronicCount = h.members.reduce((s, m) => s + m.conditions.length, 0);
  if (chronicCount >= 2) {
    vulnPts += 4;
    vulnBits.push(`${chronicCount} long-term conditions`);
  }
  if (h.savings < h.monthlyIncome) {
    vulnPts += 5;
    vulnBits.push("less than one month of income saved");
  }
  drivers.push({
    label: "Household vulnerability",
    points: vulnPts,
    detail: vulnBits.length ? `Risk factors: ${vulnBits.join(", ")}.` : "No major structural risk factors.",
  });

  const score = Math.min(100, spendPts + shockPts + vulnPts);
  const level: RiskLevel = score >= 75 ? "critical" : score >= 50 ? "at-risk" : score >= 25 ? "watch" : "protected";
  const projection = Array.from({ length: 12 }, (_, i) => totalMonthly * (i + 1));

  return {
    annualIncome,
    typicalCaseCost,
    recurringMonthly,
    expectedHospitalMonthly,
    totalMonthly,
    annualSpend,
    cheRatio,
    runwayMonths,
    shock: { bill, insurancePays, youPay, fromSavings, gap },
    score,
    level,
    drivers: drivers.sort((a, b) => b.points - a.points),
    projection,
    threshold10,
    threshold25,
  };
}

export function fmt(n: number) {
  return Math.round(n).toLocaleString("en-IN");
}

export const DEMO_HOUSEHOLD: Household = {
  location: "urban",
  hospitalPreference: "private",
  members: [
    { id: "m1", label: "Me", age: 44, conditions: ["hypertension"] },
    { id: "m2", label: "Spouse", age: 41, conditions: [] },
    { id: "m3", label: "Mother", age: 71, conditions: ["diabetes", "hypertension"] },
    { id: "m4", label: "Son", age: 13, conditions: [] },
  ],
  monthlyIncome: 38000,
  savings: 45000,
  insurance: { type: "none", sumInsured: 0 },
  monthlyMedicineSpend: 2900,
  monthlyOtherHealthSpend: 900,
};
