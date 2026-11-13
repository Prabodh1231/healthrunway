import { z } from "zod";
import { aiErrorResponse, FALLBACK_BETA, getClaude, MODEL } from "@/lib/claude";

export const maxDuration = 60;

const Body = z.object({
  language: z.enum(["en", "hi"]),
  facts: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).refine((f) => Object.keys(f).length <= 40),
  actions: z.array(z.string().max(300)).max(8),
});

const SYSTEM = `You explain a household's health-financial risk report to an Indian family in plain, warm language.

Rules:
- Use only the numbers and actions given. Do not invent figures, schemes, hospitals or prices.
- Never tell anyone to stop, start or change a medicine or dose. For generic switches, say to confirm with their doctor or pharmacist first.
- This is financial planning support, not medical advice.
- Format: one short opening sentence on where they stand, then 3 to 5 bullet points ("- ") of concrete next steps in priority order, each with the rupee impact when one is given. Under 170 words. No headings, no bold.
- Write amounts as ₹ with Indian digit grouping (₹1,20,000).`;

export async function POST(request: Request) {
  const claude = getClaude();
  if (!claude) return Response.json({ error: "AI explanations need an Anthropic API key on the server." }, { status: 503 });

  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid request." }, { status: 400 });
  const { language, facts, actions } = parsed.data;

  const prompt = [
    `Write the explanation in ${language === "hi" ? "simple Hindi (Devanagari script)" : "simple English"}.`,
    "",
    "<report>",
    ...Object.entries(facts).map(([k, v]) => `${k}: ${v}`),
    "</report>",
    "",
    "<suggested_actions>",
    ...actions.map((a) => `- ${a}`),
    "</suggested_actions>",
  ].join("\n");

  try {
    const response = await claude.beta.messages.create({
      model: MODEL,
      max_tokens: 4000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "low" },
      system: SYSTEM,
      messages: [{ role: "user", content: prompt }],
    });
    if (response.stop_reason === "refusal") {
      return Response.json({ error: "The AI could not write an explanation for this report." }, { status: 422 });
    }
    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    return Response.json({ text });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
