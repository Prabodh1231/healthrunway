export const CONDITIONS = {
  diabetes: "Diabetes",
  hypertension: "High blood pressure",
  heart: "Heart disease",
  kidney: "Kidney disease",
  respiratory: "Asthma / COPD",
  thyroid: "Thyroid",
  cancer: "Cancer",
  other: "Other long-term illness",
} as const;

export type Condition = keyof typeof CONDITIONS;

export interface Member {
  id: string;
  label: string;
  age: number;
  conditions: Condition[];
}

export const INSURANCE = {
  none: "No health insurance",
  pmjay: "Ayushman Bharat PM-JAY",
  govt: "CGHS / ESI / state scheme",
  employer: "Employer group cover",
  private: "Private health policy",
} as const;

export type InsuranceType = keyof typeof INSURANCE;

export interface Household {
  location: "urban" | "rural";
  hospitalPreference: "private" | "public";
  members: Member[];
  monthlyIncome: number;
  savings: number;
  insurance: { type: InsuranceType; sumInsured: number };
  monthlyMedicineSpend: number;
  monthlyOtherHealthSpend: number;
}

/** A generic medicine from the Jan Aushadhi list. */
export interface Generic {
  code: number;
  name: string;
  units: number;
  mrp: number;
  perUnit: number;
  key: string;
  modifiedRelease: boolean;
  group: string;
  caution: string | null;
  brandCount: number;
  brandMedianPerUnit: number | null;
}

/** One search hit: a branded product and its Jan Aushadhi equivalent. */
export interface MedicineMatch {
  brand: { name: string; maker: string; price: number; units: number; perUnit: number } | null;
  generic: Generic;
  releaseMismatch: boolean;
  savingsPct: number | null;
}

export interface CabinetItem {
  id: string;
  match: MedicineMatch;
  perDay: number;
}
