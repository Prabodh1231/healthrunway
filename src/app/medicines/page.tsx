"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, FileImage, Loader2, MapPin, Search, Trash2, ArrowRight, ScanText } from "lucide-react";
import type { CabinetItem, MedicineMatch } from "@/lib/types";
import { cabinetTotals, useCabinet, useHousehold } from "@/lib/store";
import { DEMO_HOUSEHOLD, fmt } from "@/lib/risk";
import { MatchCard } from "@/components/MatchCard";

interface ScanItem {
  name_as_written: string;
  name: string;
  strength: string;
  doses_per_day: number;
  frequency_as_written: string;
  confidence: "high" | "medium" | "low";
  match: MedicineMatch | null;
}

// Used when no API key is configured, so the demo always works.
const SAMPLE_SCAN: Omit<ScanItem, "match">[] = [
  { name_as_written: "Tab. Telma 40", name: "Telma 40", strength: "40mg", doses_per_day: 1, frequency_as_written: "1-0-0 x 30 days", confidence: "high" },
  { name_as_written: "Tab. Galvus Met 50/500", name: "Galvus Met 50mg/500mg", strength: "", doses_per_day: 2, frequency_as_written: "1-0-1 after food", confidence: "high" },
  { name_as_written: "Tab. Rosuvas 10", name: "Rosuvas 10 Tablet", strength: "10mg", doses_per_day: 1, frequency_as_written: "0-0-1", confidence: "high" },
  { name_as_written: "Tab. Thyronorm 50mcg", name: "Thyronorm 50mcg", strength: "", doses_per_day: 1, frequency_as_written: "empty stomach, morning", confidence: "high" },
  { name_as_written: "Tab. Pan 40", name: "PAN 40 Tablet", strength: "", doses_per_day: 1, frequency_as_written: "1-0-0 before breakfast", confidence: "medium" },
];

async function search(q: string): Promise<MedicineMatch[]> {
  const res = await fetch(`/api/medicines/search?q=${encodeURIComponent(q)}`);
  return res.ok ? (await res.json()).results : [];
}

const matchId = (m: MedicineMatch) => `${m.brand?.name ?? "generic"}|${m.generic.code}`;

export default function MedicinesPage() {
  const router = useRouter();
  const [cabinet, setCabinet, ready] = useCabinet();
  const [household, setHousehold] = useHousehold();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MedicineMatch[]>([]);
  const [searching, setSearching] = useState(false);
  const [scan, setScan] = useState<{ status: "idle" | "loading" | "done" | "error"; items?: ScanItem[]; notes?: string; error?: string; sample?: boolean }>({
    status: "idle",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    let cancelled = false;
    const t = setTimeout(async () => {
      setSearching(true);
      const r = await search(q);
      if (!cancelled) {
        setResults(r);
        setSearching(false);
      }
    }, 220);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query]);

  const inCabinet = new Set(cabinet.map((c) => matchId(c.match)));
  const add = (match: MedicineMatch, perDay = 1) =>
    setCabinet((prev) => (prev.some((c) => matchId(c.match) === matchId(match)) ? prev : [...prev, { id: crypto.randomUUID(), match, perDay }]));

  /** Returns false when the server has no AI key configured (HTTP 503). */
  async function uploadPrescription(file: File): Promise<boolean> {
    setScan({ status: "loading" });
    const form = new FormData();
    form.append("image", file);
    try {
      const res = await fetch("/api/prescription", { method: "POST", body: form });
      const body = await res.json();
      if (res.status === 503) {
        setScan({ status: "error", error: body.error });
        return false;
      }
      if (!res.ok) throw new Error(body.error ?? "Could not read the prescription.");
      if (!body.isPrescription) throw new Error("This doesn't look like a prescription. Try another photo.");
      setScan({ status: "done", items: body.items, notes: body.notes });
    } catch (e) {
      setScan({ status: "error", error: e instanceof Error ? e.message : "Something went wrong." });
    }
    return true;
  }

  // Sends the bundled sample image through the real AI scan; if the server has no AI key,
  // shows a pre-read version of the same prescription instead.
  async function loadSample() {
    setScan({ status: "loading" });
    const blob = await fetch("/sample-prescription.png").then((r) => r.blob());
    const usedAi = await uploadPrescription(new File([blob], "sample-prescription.png", { type: "image/png" }));
    if (usedAi) return;
    const items = await Promise.all(SAMPLE_SCAN.map(async (s) => ({ ...s, match: (await search(s.name))[0] ?? null })));
    setScan({ status: "done", items, sample: true, notes: "AI is not configured on this server, so this is a pre-read copy of the sample prescription." });
  }

  const totals = cabinetTotals(cabinet);
  const scanTotals = scan.items
    ? cabinetTotals(scan.items.filter((i) => i.match).map((i) => ({ id: i.name, match: i.match!, perDay: i.doses_per_day || 1 })))
    : null;

  function useInRiskCheck() {
    const base = household ?? { ...DEMO_HOUSEHOLD, members: DEMO_HOUSEHOLD.members.slice(0, 1) };
    setHousehold({ ...base, monthlyMedicineSpend: Math.round(totals.brandMonthly) });
    router.push(household ? "/dashboard" : "/check");
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
      <h1 className="text-3xl font-semibold tracking-tight">Medicine savings finder</h1>
      <p className="mt-1 max-w-2xl text-muted">
        Find the Jan Aushadhi generic with the same salt and strength as your branded medicine. Compare per-tablet
        prices and see what you save each month.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Prescription scan */}
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <ScanText size={18} className="text-brand" /> Scan a prescription
            </h2>
            <p className="mt-1 text-sm text-muted">
              Take a clear photo. AI reads the medicine names and doses, including shorthand like 1-0-1, then we match
              each one.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadPrescription(f);
                  e.target.value = "";
                }}
              />
              <button className="btn btn-primary" onClick={() => fileRef.current?.click()} disabled={scan.status === "loading"}>
                <Camera size={16} /> Upload photo
              </button>
              <button className="btn btn-ghost" onClick={loadSample} disabled={scan.status === "loading"}>
                <FileImage size={16} /> Try a sample
              </button>
            </div>
            <p className="mt-2 text-xs text-muted">
              Sample:{" "}
              <a href="/sample-prescription.png" target="_blank" className="underline">
                view the sample prescription
              </a>{" "}
              (a made-up document for testing).
            </p>

            {scan.status === "loading" && (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                <Loader2 size={16} className="animate-spin" /> Reading the prescription…
              </p>
            )}
            {scan.status === "error" && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800">{scan.error}</p>}
            {scan.status === "done" && scan.items && (
              <div className="mt-5">
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-emerald-50 p-4">
                  <div>
                    <div className="text-sm font-medium text-emerald-900">
                      Found {scan.items.length} medicines · {scan.items.filter((i) => i.match).length} with a Jan Aushadhi match
                    </div>
                    {scanTotals && scanTotals.savingsMonthly > 0 && (
                      <div className="tabular mt-0.5 text-lg font-semibold text-emerald-800">
                        Save ₹{fmt(scanTotals.savingsMonthly)} a month (₹{fmt(scanTotals.savingsMonthly * 12)} a year)
                      </div>
                    )}
                  </div>
                  <button
                    className="btn btn-primary py-2 text-sm"
                    onClick={() => scan.items!.forEach((i) => i.match && add(i.match, i.doses_per_day || 1))}
                  >
                    Add all to my list
                  </button>
                </div>
                {scan.notes && <p className="mt-2 text-xs text-muted">Note: {scan.notes}</p>}
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {scan.items.map((item, i) =>
                    item.match ? (
                      <MatchCard
                        key={i}
                        match={item.match}
                        added={inCabinet.has(matchId(item.match))}
                        onAdd={() => add(item.match!, item.doses_per_day || 1)}
                        heading={
                          <div className="mb-2 flex items-center justify-between gap-2 border-b border-line pb-2 text-xs text-muted">
                            <span className="truncate">
                              Read as “{item.name_as_written}” · {item.frequency_as_written}
                            </span>
                            <span className="shrink-0 font-medium">{item.doses_per_day}/day</span>
                          </div>
                        }
                      />
                    ) : (
                      <div key={i} className="card p-4 text-sm">
                        <div className="font-semibold">{item.name_as_written}</div>
                        <p className="mt-1 text-muted">
                          No Jan Aushadhi match in our list yet. Ask at the Kendra for the same salt.
                        </p>
                      </div>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Search */}
          <div className="card p-5">
            <h2 className="flex items-center gap-2 font-semibold">
              <Search size={18} className="text-brand" /> Search by name
            </h2>
            <div className="relative mt-3">
              <Search size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                className="input pl-10"
                placeholder="Brand or salt, e.g. Telma 40, Glycomet, atorvastatin"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search medicines"
              />
              {searching && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted" />}
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              {["Telma 40", "Galvus Met", "Januvia", "Rosuvas 10", "Montair 10", "Ecosprin"].map((s) => (
                <button key={s} className="rounded-full border border-line px-2.5 py-1 text-muted hover:border-brand hover:text-foreground" onClick={() => setQuery(s)}>
                  {s}
                </button>
              ))}
            </div>
            {query.trim().length >= 2 && (
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {results.map((m) => (
                  <MatchCard key={matchId(m) + m.brand?.price} match={m} added={inCabinet.has(matchId(m))} onAdd={() => add(m)} />
                ))}
                {!searching && !results.length && (
                  <p className="text-sm text-muted sm:col-span-2">
                    No match in our list yet. We cover common medicines for diabetes, blood pressure, cholesterol, heart,
                    thyroid, asthma, acidity and epilepsy.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Cabinet */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <h2 className="font-semibold">My medicine list</h2>
            {!ready || !cabinet.length ? (
              <p className="mt-2 text-sm text-muted">Add medicines from a scan or search to total up your savings.</p>
            ) : (
              <>
                <ul className="mt-3 divide-y divide-line">
                  {cabinet.map((c) => (
                    <CabinetRow
                      key={c.id}
                      item={c}
                      onChange={(perDay) => setCabinet((prev) => prev.map((x) => (x.id === c.id ? { ...x, perDay } : x)))}
                      onRemove={() => setCabinet((prev) => prev.filter((x) => x.id !== c.id))}
                    />
                  ))}
                </ul>
                <dl className="mt-4 space-y-1.5 border-t border-line pt-4 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted">Branded, per month</dt>
                    <dd className="tabular">₹{fmt(totals.brandMonthly)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted">Jan Aushadhi, per month</dt>
                    <dd className="tabular">₹{fmt(totals.genericMonthly)}</dd>
                  </div>
                  <div className="flex justify-between text-base font-semibold text-emerald-700">
                    <dt>You save</dt>
                    <dd className="tabular">₹{fmt(totals.savingsMonthly)}/mo</dd>
                  </div>
                  <div className="tabular text-right text-xs text-muted">₹{fmt(totals.savingsMonthly * 12)} a year</div>
                </dl>
                <button className="btn btn-primary mt-4 w-full text-sm" onClick={useInRiskCheck}>
                  Use in my risk check <ArrowRight size={15} />
                </button>
              </>
            )}
            <a
              href="https://janaushadhi.gov.in"
              target="_blank"
              rel="noreferrer"
              className="mt-4 flex items-center gap-2 rounded-xl border border-line p-3 text-sm hover:border-brand"
            >
              <MapPin size={16} className="text-brand" />
              <span>
                <span className="font-medium">Find a Jan Aushadhi Kendra</span>
                <span className="block text-xs text-muted">Official locator and Jan Aushadhi Sugam app</span>
              </span>
            </a>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Generics here have the same active ingredient and strength. Confirm with your doctor or pharmacist before
              switching, especially for thyroid, epilepsy or blood-thinning medicines.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function CabinetRow(props: { item: CabinetItem; onChange: (n: number) => void; onRemove: () => void }) {
  const { match, perDay } = props.item;
  const name = match.brand?.name ?? match.generic.key;
  return (
    <li className="flex items-center gap-2 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{name}</div>
        <div className="truncate text-xs text-muted">→ JA #{match.generic.code}</div>
      </div>
      <select
        className="rounded-lg border border-line bg-white px-1.5 py-1 text-sm"
        value={perDay}
        onChange={(e) => props.onChange(Number(e.target.value))}
        aria-label={`Doses per day for ${name}`}
      >
        {[0.5, 1, 2, 3, 4].map((n) => (
          <option key={n} value={n}>
            {n}/day
          </option>
        ))}
      </select>
      <button className="rounded-lg p-1.5 text-muted hover:bg-red-50 hover:text-red-600" onClick={props.onRemove} aria-label={`Remove ${name}`}>
        <Trash2 size={15} />
      </button>
    </li>
  );
}
