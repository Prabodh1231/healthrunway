import { assess, type Assessment, fmt } from "./risk";
import type { Household } from "./types";

export interface Action {
  id: string;
  title: string;
  detail: string;
  impact?: string;
  link?: { href: string; label: string; external?: boolean };
}

// PMBJP states Jan Aushadhi generics are 50-90% cheaper; without a medicine list we use the
// conservative end.
export const ESTIMATED_GENERIC_SAVING = 0.5;

// What-if: put 10% of monthly income into an emergency health fund for a year.
export const FUND_SHARE = 0.1;

export function genericSavingsMonthly(h: Household, cabinetSavings: number | null) {
  if (cabinetSavings !== null) return Math.min(cabinetSavings, h.monthlyMedicineSpend || cabinetSavings);
  return h.monthlyMedicineSpend * ESTIMATED_GENERIC_SAVING;
}

export function buildActions(h: Household, a: Assessment, cabinetSavings: number | null): Action[] {
  const actions: Action[] = [];
  const genericSave = genericSavingsMonthly(h, cabinetSavings);

  if (genericSave > 0) {
    actions.push({
      id: "generics",
      title: "Switch to Jan Aushadhi generics",
      detail:
        cabinetSavings !== null
          ? "Based on your medicine list: same salts and strengths, bought at a Jan Aushadhi Kendra."
          : "Estimated at 50% of your medicine bill (the government says 50–90%). Add your medicines for an exact figure.",
      impact: `Save about ₹${fmt(genericSave)} a month (₹${fmt(genericSave * 12)} a year)`,
      link: { href: "/medicines", label: cabinetSavings !== null ? "Review my medicines" : "Add my medicines" },
    });
  }

  const seventyPlus = h.members.filter((m) => m.age >= 70);
  if (seventyPlus.length && h.insurance.type !== "pmjay") {
    actions.push({
      id: "vayvandana",
      title: `Get an Ayushman Vay Vandana card for ${seventyPlus.map((m) => m.label || "your 70+ member").join(", ")}`,
      detail:
        "Since 2024, Ayushman Bharat PM-JAY covers every Indian aged 70 or above, whatever their income, for hospital care at empanelled hospitals.",
      impact: "Up to ₹5,00,000 of hospital cover a year",
      link: { href: "https://pmjay.gov.in", label: "PM-JAY official site", external: true },
    });
  }

  if (h.insurance.type === "none") {
    actions.push({
      id: "pmjay",
      title: "Check if your family qualifies for PM-JAY",
      detail:
        "Eligible families get free cashless hospital treatment at empanelled hospitals. If you don't qualify, a basic family floater policy is the next step.",
      impact: "Up to ₹5,00,000 cover per family per year",
      link: { href: "https://pmjay.gov.in", label: "Check eligibility", external: true },
    });
  } else if (h.insurance.sumInsured > 0 && h.insurance.sumInsured < a.shock.bill) {
    actions.push({
      id: "topup",
      title: "Raise your cover with a super top-up",
      detail: `Your cover of ₹${fmt(h.insurance.sumInsured)} is less than a major hospital bill (about ₹${fmt(a.shock.bill)}). Super top-up policies add cover above your existing limit at low cost.`,
    });
  }

  if (a.shock.gap > 0) {
    const monthly = h.monthlyIncome * FUND_SHARE;
    const yearsToClose = a.shock.gap / (monthly * 12);
    actions.push({
      id: "fund",
      title: "Start an emergency health fund",
      detail: `A major hospital stay would leave ₹${fmt(a.shock.gap)} unpaid. Families without a buffer often borrow at high interest or sell assets.`,
      impact:
        yearsToClose <= 1
          ? `Setting aside ₹${fmt(monthly)} a month (10% of income) closes the gap within a year`
          : `Setting aside ₹${fmt(monthly)} a month (10% of income) builds ₹${fmt(monthly * 12)} in a year`,
    });
  }

  if (h.monthlyOtherHealthSpend > 0 && h.hospitalPreference === "private") {
    actions.push({
      id: "public-diagnostics",
      title: "Use government facilities for routine tests",
      detail:
        "Many government hospitals and health centres offer free or low-cost blood tests and check-ups for long-term conditions.",
    });
  }

  return actions;
}

export interface Simulation {
  generics: boolean;
  cover: boolean;
  fund: boolean;
}

export function simulate(h: Household, a: Assessment, sim: Simulation, cabinetSavings: number | null) {
  const next: Household = structuredClone(h);
  if (sim.generics) next.monthlyMedicineSpend = Math.max(0, h.monthlyMedicineSpend - genericSavingsMonthly(h, cabinetSavings));
  if (sim.cover && (h.insurance.type === "none" || h.insurance.sumInsured < 500000)) {
    next.insurance = { type: h.insurance.type === "none" ? "pmjay" : h.insurance.type, sumInsured: 500000 };
  }
  if (sim.fund) next.savings = h.savings + Math.min(a.shock.gap, h.monthlyIncome * FUND_SHARE * 12);
  return assess(next);
}
