"""Build src/data/medicines.json from the two source datasets.

Inputs
  data/janaushadhi_selected.tsv   Jan Aushadhi (PMBJP) products and MRPs, transcribed from
                                  janaushadhi.gov.in "Product & MRP List" (Nov 2026)
  data/raw/indian_medicine_data.csv
                                  Branded medicine prices and compositions
                                  (github.com/junioralive/Indian-Medicine-Dataset, MIT)

Output
  src/data/medicines.json         generics + matching brands, keyed by normalised composition

Run:  python -I scripts/build_medicines.py
"""

import csv
import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
JA_PATH = ROOT / "data" / "janaushadhi_selected.tsv"
BRAND_PATH = ROOT / "data" / "raw" / "indian_medicine_data.csv"
OUT_PATH = ROOT / "src" / "data" / "medicines.json"

# Canonical ingredient -> spellings seen in either dataset. Order matters: longer / more
# specific spellings are checked first so "s-amlodipine" never collapses into "amlodipine".
SYNONYMS = {
    "s-amlodipine": ["s (-) amlodipine", "s(-) amlodipine", "s(-)amlodipine", "s- amlodipine", "s-amlodipine", "levamlodipine"],
    "metoprolol succinate": ["metoprolol succinate"],
    "levothyroxine": ["levo-thyroxine sodium", "levothyroxine sodium", "thyroxine sodium", "levo-thyroxine", "levothyroxine", "thyroxine"],
    "metformin": ["metformin hydrochloride", "metformin hydrchloride", "metformin"],
    "glimepiride": ["glimepiride", "glimipride"],
    "gliclazide": ["gliclazide"],
    "sitagliptin": ["sitagliptin phosphate", "sitagliptin"],
    "vildagliptin": ["vildagliptin"],
    "teneligliptin": ["teneligliptin"],
    "linagliptin": ["linagliptin"],
    "dapagliflozin": ["dapagliflozin"],
    "empagliflozin": ["empagliflozin"],
    "voglibose": ["voglibose"],
    "amlodipine": ["amlodipine besilate", "amlodipine besylate", "amlodipine"],
    "telmisartan": ["telmisartan"],
    "losartan": ["losartan potassium", "losartan"],
    "olmesartan": ["olmesartan medoxomil", "olmesartan"],
    "hydrochlorothiazide": ["hydrochlorothiazide"],
    "chlorthalidone": ["chlorthalidone", "chlortalidone"],
    "atenolol": ["atenolol"],
    "bisoprolol": ["bisoprolol fumarate", "bisoprolol"],
    "cilnidipine": ["cilnidipine"],
    "atorvastatin": ["atorvastatin"],
    "rosuvastatin": ["rosuvastatin"],
    "clopidogrel": ["clopidogrel"],
    "aspirin": ["aspirin"],
    "pantoprazole": ["pantoprazole"],
    "montelukast": ["montelukast sodium", "montelukast"],
    "levocetirizine": ["levocetirizine dihydrochloride", "levocetirizine"],
    "levetiracetam": ["levetiracetam"],
    "phenytoin": ["phenytoin sodium", "phenytoin"],
}
SPELLINGS = sorted(((s, canon) for canon, ss in SYNONYMS.items() for s in ss), key=lambda x: -len(x[0]))

# Medicines where a brand switch should only happen with the prescriber's involvement.
SWITCH_CAUTION = {
    "levothyroxine": "Narrow therapeutic index: small dose differences matter. Switch brands only with your doctor's advice and a follow-up TSH test.",
    "phenytoin": "Narrow therapeutic index anti-epileptic. Do not switch brands without your neurologist.",
    "levetiracetam": "Anti-epileptic. Brand switches should be supervised by your doctor.",
}

# The brand dataset keeps at most two ingredients, so three-drug combinations look like
# two-drug ones. Drop brands whose names mark them as triple combinations.
TRIPLE_COMBO_RE = re.compile(r"\b(trio|triple|tri|gold|amh|3d)\b|\d+(?:\.\d+)?/\d+(?:\.\d+)?/\d+", re.I)

MODIFIED_RELEASE_RE = re.compile(r"sustained|prolonged|extended|modified|\bsr\b|\ber\b|\bxr\b|\bpr\b|\bmr\b|\bxl\b|\bcr\b", re.I)
STRENGTH_RE = re.compile(r"(\d+(?:\.\d+)?)\s*(mg|mcg)", re.I)


def canon_ingredient(text):
    t = text.lower()
    for spelling, canon in SPELLINGS:
        if spelling in t:
            return canon
    return None


def to_mg(value, unit):
    v = float(value)
    return round(v / 1000, 4) if unit.lower() == "mcg" else round(v, 4)


def fmt_mg(mg):
    if mg < 1:
        return f"{round(mg * 1000, 2):g}mcg"
    return f"{mg:g}mg"


def make_key(parts):
    return " + ".join(f"{name} {fmt_mg(mg)}" for name, mg in sorted(parts))


def parse_ja_name(name):
    """'Metformin ... 500mg and Glimepiride 2mg Tablets IP' -> [('glimepiride', 2.0), ('metformin', 500.0)]"""
    chunks = re.split(r",|\band\b|&|\+", name, flags=re.I)
    parts = []
    for chunk in chunks:
        ing = canon_ingredient(chunk)
        m = STRENGTH_RE.search(chunk)
        if ing and m:
            parts.append((ing, to_mg(*m.groups())))
        elif ing or m:
            return None  # ingredient without strength (or vice versa) -> needs a human look
    return parts or None


def parse_brand_composition(c1, c2):
    parts = []
    for comp in (c1, c2):
        comp = (comp or "").strip()
        if not comp:
            continue
        for piece in comp.split(" , ") if " , " in comp else [comp]:
            m = re.match(r"\s*(.+?)\s*\((\d+(?:\.\d+)?)\s*(mg|mcg)\)\s*$", piece, re.I)
            if not m:
                return None
            ing = canon_ingredient(m.group(1))
            if not ing:
                return None
            parts.append((ing, to_mg(m.group(2), m.group(3))))
    return parts or None


def pack_units(label):
    m = re.match(r"\s*(?:strip|bottle|box|pack|tube)\s+of\s+(\d+)\s+(tablet|capsule)", label or "", re.I)
    return int(m.group(1)) if m else None


def main():
    generics = []
    with open(JA_PATH, encoding="utf-8") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            mrp = float(row["mrp"])
            units = int(row["unit_size"])
            parts = parse_ja_name(row["generic_name"])
            if not parts or mrp <= 0:
                print("skip JA:", row["generic_name"], file=sys.stderr)
                continue
            ingredients = sorted({p[0] for p in parts})
            caution = next((SWITCH_CAUTION[i] for i in ingredients if i in SWITCH_CAUTION), None)
            generics.append({
                "code": int(row["drug_code"]),
                "name": row["generic_name"],
                "units": units,
                "mrp": mrp,
                "perUnit": round(mrp / units, 3),
                "key": make_key(parts),
                "modifiedRelease": bool(MODIFIED_RELEASE_RE.search(row["generic_name"])),
                "group": row["group"],
                "caution": caution,
            })

    # A composition can have several JA variants (e.g. immediate vs extended release).
    by_key = defaultdict(list)
    for g in sorted(generics, key=lambda g: g["perUnit"]):
        by_key[g["key"]].append(g)
    print(f"generics: {len(generics)} rows -> {len(by_key)} unique compositions", file=sys.stderr)

    def pick_generic(key, brand_mr):
        """Same release type if JA has it, else the cheapest variant flagged as a release mismatch."""
        variants = by_key[key]
        same = [g for g in variants if g["modifiedRelease"] == brand_mr]
        return (same[0], False) if same else (variants[0], True)

    brands = []
    per_key_prices = defaultdict(list)
    with open(BRAND_PATH, encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("Is_discontinued", "").upper() == "TRUE" or row.get("type") != "allopathy":
                continue
            if TRIPLE_COMBO_RE.search(row["name"]):
                continue
            parts = parse_brand_composition(row.get("short_composition1"), row.get("short_composition2"))
            if not parts:
                continue
            key = make_key(parts)
            if key not in by_key:
                continue
            units = pack_units(row.get("pack_size_label"))
            try:
                price = float(row["price(₹)"])
            except (KeyError, ValueError):
                continue
            if not units or price <= 0:
                continue
            per_unit = round(price / units, 3)
            brand_mr = bool(MODIFIED_RELEASE_RE.search(row["name"]))
            generic, mismatch = pick_generic(key, brand_mr)
            # Compact field names: this list is ~20k rows and only read server-side.
            brands.append({
                "n": re.sub(r"\s+", " ", row["name"]).strip(),
                "m": re.sub(r"\s+", " ", row["manufacturer_name"]).strip(),
                "p": price,
                "u": units,
                "g": generic["code"],
                **({"x": 1} if mismatch else {}),
            })
            per_key_prices[generic["code"]].append(per_unit)

    keys_out = []
    for g in sorted(generics, key=lambda g: g["key"]):
        prices = per_key_prices.get(g["code"], [])
        keys_out.append({
            **g,
            "brandCount": len(prices),
            "brandMedianPerUnit": round(statistics.median(prices), 3) if prices else None,
        })

    OUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    out = {
        "sources": {
            "generics": "Jan Aushadhi (PMBJP) Product & MRP List, janaushadhi.gov.in, retrieved 14 Nov 2026",
            "brands": "Indian Medicine Dataset (github.com/junioralive/Indian-Medicine-Dataset, MIT licence)",
        },
        "generics": keys_out,
        "brands": sorted(brands, key=lambda b: b["n"].lower()),
    }
    OUT_PATH.write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"brands matched: {len(brands)}; wrote {OUT_PATH} ({OUT_PATH.stat().st_size // 1024} KB)", file=sys.stderr)
    for k in keys_out:
        if not k["brandCount"]:
            print("  no brands for:", k["key"], "MR" if k["modifiedRelease"] else "", file=sys.stderr)


if __name__ == "__main__":
    main()
