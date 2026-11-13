# HealthRunway

**Medical-shock early warning for Indian households, plus a generic-medicine savings finder.**

Built for DSH Hacks V2 (AI x Healthcare).

## The problem

In India, families pay for most hospital stays and medicines out of their own pocket. According to NSS 2017-18, a
private hospital stay cost about ₹38,800 in cities, roughly 7 times the cost of a government one. Health spending
above 10% of household income is *catastrophic* by the WHO definition (SDG 3.8.2). It pushes families into debt,
into selling assets, or into skipping treatment. Most families don't see this coming until the bill arrives.

## What HealthRunway does

1. **Two-minute risk check.** Covers family members, ages, long-term conditions, income, savings and insurance.
2. **Early-warning report.**
   - **Health runway:** the month in which the family's expected health spending crosses the WHO 10%-of-income line.
   - **Hospital shock test:** what a major hospital stay would cost, how much insurance and savings cover, and the
     unpaid gap.
   - **Risk score (0–100)** with the factors that drive it.
   - **What-if toggles:** switch to generics, get ₹5 lakh cover, or save 10% of income. The score and runway update
     live.
   - **Next steps** tied to real schemes: PM-JAY, Ayushman Vay Vandana for anyone aged 70+, and Jan Aushadhi.
3. **Medicine savings finder.**
   - Search a brand, or **photograph a prescription**. AI reads names and Indian dosing shorthand (1-0-1, BD, HS).
   - Each medicine is matched to the **Jan Aushadhi generic with the same salts and strengths**, comparing
     price per tablet.
   - Flags regular vs extended-release differences, and warns where brand switches need a doctor (thyroxine,
     anti-epileptics).
   - The medicine list feeds straight back into the risk check.
4. **AI explanation in English or Hindi.** It only restates the computed numbers and gives no medical advice.

Everything a family enters stays in their browser (localStorage). There are no accounts and no server copy.

## Where AI is used, and where it isn't

| Job | How |
|---|---|
| Read prescription photos | Claude (vision + structured output, Zod schema) → list of medicines, strengths and doses per day |
| Explain the report | Claude writes a short, prioritised plan from the computed facts, in English or Hindi |
| Prices, matching, risk score | **Not AI.** Deterministic code over public data, so every number can be traced |

Without an API key, both AI features fall back: the sample prescription is shown pre-read, and the plan uses a
rule-based summary. The demo always works.

## Data

| Data | Source |
|---|---|
| 96 Jan Aushadhi generics for long-term conditions, with MRP | PMBJP "Product & MRP List", janaushadhi.gov.in (Nov 2026) → `data/janaushadhi_selected.tsv` |
| ~22,600 branded listings with composition and price | [Indian Medicine Dataset](https://github.com/junioralive/Indian-Medicine-Dataset) (MIT) |
| Hospital stay costs | MoSPI NSS 75th round, *Key Indicators of Social Consumption in India: Health* (2017-18) |
| Catastrophic spending thresholds | WHO / World Bank, SDG indicator 3.8.2 |

`scripts/build_medicines.py` normalises salt names (e.g. *Metformin Hydrochloride* = *Metformin*,
*Thyroxine Sodium* = *Levothyroxine*), matches on exact ingredients and strengths, and picks the same release type
where available. It writes `src/data/medicines.json`.

All modelling assumptions are listed on the in-app **How it works** page.

## Run it

```bash
npm install
cp .env.example .env.local   # add ANTHROPIC_API_KEY to enable the AI features
npm run dev                  # http://localhost:3000
```

To rebuild the medicine data:

1. Download `indian_medicine_data.csv` from the dataset repo into `data/raw/`.
2. Run:

   ```bash
   python scripts/build_medicines.py
   ```

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS 4, lucide icons. Charts are hand-built SVG.
- Anthropic TypeScript SDK (`claude-opus-5-5`), structured outputs with Zod, server-side refusal fallback.
- Python 3 for the data pipeline (standard library only).

## Limitations and next steps

- Hospitalisation probabilities by age and condition are stated assumptions. The next step is to calibrate them
  against NSS age tables and PM-JAY claims.
- The brand dataset lists at most two ingredients, so brand names that mark three-drug combinations are excluded.
  Combination matches tell the user to check the strip.
- Jan Aushadhi coverage is limited to about 96 common chronic-care products for now. The pipeline can take the full
  2,400-product list.
- Possible additions: a Kendra locator, monthly spend logging for a real (not projected) early warning, and more
  Indian languages.

HealthRunway is financial planning support, not medical advice.
