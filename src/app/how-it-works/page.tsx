import type { Metadata } from "next";
import { catalogueStats, SOURCES } from "@/lib/medicines";

export const metadata: Metadata = { title: "How it works · HealthRunway" };

const ASSUMPTIONS = [
  ["Chance of a hospital stay per person per year", "1.5% (0–14), 2% (15–44), 3.5% (45–59), 6% (60–69), 9% (70+), plus 0.5–15 points per long-term condition"],
  ["Cost of an average stay", "NSS 2017-18 private-hospital average (₹38,822 urban, ₹27,347 rural) × 1.78 for 7% a year medical inflation. Government hospitals: one seventh of that."],
  ["Cost multiplier for serious conditions", "Heart and kidney disease ×1.6, cancer ×2.5"],
  ["Major hospital stay (shock test)", "3 × an average stay, scaled for the most serious condition in the family"],
  ["Share of a bill insurance pays", "PM-JAY 75%, CGHS/ESI 80%, employer or private policy 80%, up to the sum insured"],
  ["Generic savings without a medicine list", "50% of the medicine bill, the low end of the government's 50–90% claim"],
];

export default function HowItWorks() {
  const stats = catalogueStats();
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">How HealthRunway calculates your risk</h1>
      <p className="mt-3 leading-relaxed text-muted">
        Every number on your report can be traced to a public source or a stated assumption. This page lists all of
        them.
      </p>

      <Section title="1. The catastrophic-spending line">
        The WHO and the UN Sustainable Development Goals (indicator 3.8.2) call household health spending{" "}
        <em>catastrophic</em> when it goes above 10% of household income or consumption, and severe above 25%. We
        estimate your expected monthly health spending and compare it with those lines.
      </Section>

      <Section title="2. Expected health spending">
        <p>
          <strong>Monthly expected spending</strong> = medicines + doctor visits and tests + expected hospital cost.
        </p>
        <p className="mt-2">
          <strong>Expected hospital cost</strong> = for each family member, chance of a hospital stay this year × the
          part of the bill insurance would not pay. We divide it by 12 to spread it across the year.
        </p>
      </Section>

      <Section title="3. Health runway">
        <strong>Runway (months)</strong> = 10% of annual income ÷ monthly expected spending. This is the month in
        which your cumulative health spending is expected to cross the catastrophic line. More than 12 months means you
        stay below it for the whole year.
      </Section>

      <Section title="4. Hospital shock test">
        We price one major hospital stay for the most vulnerable family member and split it into what insurance pays,
        what your emergency savings can cover, and the unpaid gap. The gap is the money families usually borrow or
        raise by selling assets.
      </Section>

      <Section title="5. Risk score (0–100)">
        <ul className="list-disc space-y-1 pl-5">
          <li>Up to 45 points: spending as a share of income (full points at 25%).</li>
          <li>Up to 35 points: the shock gap (full points at two months of income).</li>
          <li>
            Up to 20 points: no insurance (+7), a member aged 60+ (+4), two or more long-term conditions (+4), less
            than a month&apos;s income saved (+5).
          </li>
        </ul>
        <p className="mt-2">0–24 Protected · 25–49 Watch · 50–74 At risk · 75+ Critical.</p>
      </Section>

      <Section title="6. Modelling assumptions">
        <div className="overflow-hidden rounded-xl border border-line">
          <table className="w-full text-left text-sm">
            <tbody>
              {ASSUMPTIONS.map(([k, v]) => (
                <tr key={k} className="border-b border-line last:border-0">
                  <th className="w-2/5 bg-background p-3 align-top font-medium">{k}</th>
                  <td className="p-3 text-muted">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-2 text-sm">
          These are planning estimates, not insurance pricing. The next step would be to calibrate them against NSS
          age-specific hospitalisation tables and PM-JAY claims data.
        </p>
      </Section>

      <Section title="7. Medicine matching">
        <p>
          {stats.generics} Jan Aushadhi products for long-term conditions are matched to {stats.brands.toLocaleString("en-IN")} branded
          listings. A match needs the same active ingredients at the same strengths. We compare price per tablet, flag
          regular versus extended-release differences, and warn about medicines where brand switches need a doctor
          (thyroxine, anti-epileptics).
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>{SOURCES.generics}</li>
          <li>{SOURCES.brands}</li>
        </ul>
      </Section>

      <Section title="8. Where AI is used, and where it isn't">
        AI (Claude, by Anthropic) does two jobs: reading prescription photos into a list of medicines and doses, and
        writing a plain-language summary of your report in English or Hindi. All prices, scores and savings come from
        the data and formulas above, never from the AI. The AI is told not to give medical advice.
      </Section>

      <Section title="Sources">
        <ul className="list-disc space-y-1 pl-5">
          <li>MoSPI, NSS 75th round: Key Indicators of Social Consumption in India: Health (2017-18).</li>
          <li>WHO / World Bank, Tracking Universal Health Coverage: SDG indicator 3.8.2 (catastrophic health spending).</li>
          <li>Pharmaceuticals &amp; Medical Devices Bureau of India, PMBJP product and MRP list.</li>
          <li>National Health Authority, Ayushman Bharat PM-JAY (including 70+ coverage from 2024).</li>
        </ul>
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="mt-2 leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
