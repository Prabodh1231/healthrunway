import Link from "next/link";
import { ArrowRight, Activity, Pill, ShieldAlert, Sparkles } from "lucide-react";

const FACTS = [
  {
    value: "₹26,475",
    text: "Average spent on one hospital stay in urban India, before medical inflation.",
    source: "NSS 75th round, 2017-18",
  },
  {
    value: "7×",
    text: "How much more a private hospital stay costs than a government one.",
    source: "NSS 75th round, 2017-18",
  },
  {
    value: "50–90%",
    text: "Cheaper: Jan Aushadhi generics compared with branded medicines.",
    source: "PMBJP, Govt. of India",
  },
];

const STEPS = [
  {
    icon: Activity,
    title: "Two-minute risk check",
    text: "Tell us who is in your family, your income, savings and cover. Nothing leaves your browser.",
  },
  {
    icon: ShieldAlert,
    title: "See your early warning",
    text: "Your health runway shows the month health costs cross the WHO catastrophic-spending line, and how a hospital bill would hit.",
  },
  {
    icon: Pill,
    title: "Cut costs today",
    text: "Snap a prescription. We find the same medicine at Jan Aushadhi prices and show how much longer your runway gets.",
  },
];

export default function Home() {
  return (
    <div>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-12 sm:pt-20">
        <div className="max-w-3xl">
          <p className="mb-4 inline-flex items-center gap-2 rounded-full bg-brand-soft px-3 py-1 text-sm font-medium text-brand-strong">
            <Sparkles size={14} /> Medical-shock early warning for families
          </p>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight sm:text-6xl">
            Know if one hospital bill could break your family&apos;s budget, before it happens.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted">
            In India, most hospital and medicine costs are paid from the family&apos;s own pocket. HealthRunway
            measures how close your household is to a health-spending crisis and shows the cheapest ways to step back
            from the edge.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/check" className="btn btn-primary">
              Check my family&apos;s risk <ArrowRight size={18} />
            </Link>
            <Link href="/medicines" className="btn btn-ghost">
              <Pill size={18} /> Find cheaper medicines
            </Link>
          </div>
        </div>

        <div className="mt-14 grid gap-4 sm:grid-cols-3">
          {FACTS.map((f) => (
            <div key={f.value} className="card p-5">
              <div className="text-3xl font-semibold tracking-tight text-brand-strong">{f.value}</div>
              <p className="mt-2 text-sm leading-relaxed">{f.text}</p>
              <p className="mt-3 text-xs text-muted">{f.source}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-4 py-14">
          <h2 className="text-2xl font-semibold tracking-tight">How it works</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s, i) => (
              <div key={s.title}>
                <div className="flex items-center gap-3">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                    <s.icon size={20} />
                  </span>
                  <span className="text-sm font-semibold text-muted">Step {i + 1}</span>
                </div>
                <h3 className="mt-4 text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-14">
        <div className="card flex flex-col items-start justify-between gap-6 p-8 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">Built on public data, explained in plain words</h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              The risk model uses the WHO definition of catastrophic health spending and India&apos;s national health
              survey costs. Medicine prices come from the official Jan Aushadhi MRP list. AI reads prescriptions and
              explains your results in English or Hindi. It never sets prices or gives medical advice.
            </p>
          </div>
          <Link href="/how-it-works" className="btn btn-ghost shrink-0">
            See the method <ArrowRight size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
