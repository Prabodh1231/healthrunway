import "server-only";
import data from "@/data/medicines.json";
import type { Generic, MedicineMatch } from "./types";

type RawBrand = { n: string; m: string; p: number; u: number; g: number; x?: number };

const generics = data.generics as Generic[];
const brands = data.brands as RawBrand[];
const genericByCode = new Map(generics.map((g) => [g.code, g]));

export const SOURCES = data.sources;

// Lower-cased search text for each brand, built once per server instance.
const brandIndex = brands.map((b) => ({ b, text: b.n.toLowerCase() }));
const genericIndex = generics.map((g) => ({ g, text: `${g.name} ${g.key}`.toLowerCase() }));

function toMatch(b: RawBrand): MedicineMatch {
  const generic = genericByCode.get(b.g)!;
  const perUnit = b.p / b.u;
  return {
    brand: { name: b.n, maker: b.m, price: b.p, units: b.u, perUnit },
    generic,
    releaseMismatch: b.x === 1,
    savingsPct: perUnit > 0 ? Math.max(0, 1 - generic.perUnit / perUnit) : null,
  };
}

function genericOnly(g: Generic): MedicineMatch {
  return {
    brand: null,
    generic: g,
    releaseMismatch: false,
    savingsPct: g.brandMedianPerUnit ? Math.max(0, 1 - g.perUnit / g.brandMedianPerUnit) : null,
  };
}

const tokenize = (q: string) =>
  q
    .toLowerCase()
    .replace(/[^a-z0-9.\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

/** Brand-name search first, then generic/salt names. Deduplicates identical listings. */
export function searchMedicines(query: string, limit = 10): MedicineMatch[] {
  const tokens = tokenize(query);
  if (!tokens.length) return [];
  const first = tokens[0];

  const hits = brandIndex
    .filter(({ text }) => tokens.every((t) => text.includes(t)))
    .sort((a, b) => {
      const aw = a.text.startsWith(first) ? 0 : 1;
      const bw = b.text.startsWith(first) ? 0 : 1;
      return aw - bw || a.text.length - b.text.length;
    });

  const seen = new Set<string>();
  const out: MedicineMatch[] = [];
  for (const { b } of hits) {
    const id = `${b.n}|${b.p}|${b.u}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(toMatch(b));
    if (out.length >= limit) return out;
  }

  for (const { g, text } of genericIndex) {
    if (out.length >= limit) break;
    if (tokens.every((t) => text.includes(t))) out.push(genericOnly(g));
  }
  return out;
}

/** Best single match for a medicine name read off a prescription. */
export function bestMatch(name: string, strength?: string): MedicineMatch | null {
  const withStrength = strength ? searchMedicines(`${name} ${strength.replace(/\s+/g, "")}`, 1) : [];
  if (withStrength.length) return withStrength[0];
  const byName = searchMedicines(name, 1);
  if (byName.length) return byName[0];
  // Fall back to the first word (prescriptions often add "Tab", dosage notes, etc.).
  const head = tokenize(name).find((t) => t.length > 3 && !["tab", "tablet", "cap", "capsule"].includes(t));
  return head ? (searchMedicines(head, 1)[0] ?? null) : null;
}

export function catalogueStats() {
  return { generics: generics.length, brands: brands.length };
}
