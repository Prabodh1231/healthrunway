import { z } from "zod";
import { betaZodOutputFormat } from "@anthropic-ai/sdk/helpers/beta/zod";
import { aiErrorResponse, FALLBACK_BETA, getClaude, MODEL } from "@/lib/claude";
import { bestMatch } from "@/lib/medicines";

export const maxDuration = 60;

const MAX_BYTES = 5 * 1024 * 1024;
const MEDIA_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"] as const;
type MediaType = (typeof MEDIA_TYPES)[number];

const PrescriptionSchema = z.object({
  is_prescription: z.boolean(),
  medicines: z.array(
    z.object({
      name_as_written: z.string(),
      name: z.string(),
      strength: z.string(),
      doses_per_day: z.number(),
      frequency_as_written: z.string(),
      confidence: z.enum(["high", "medium", "low"]),
    }),
  ),
  notes: z.string(),
});

const INSTRUCTIONS = `You read Indian doctors' prescriptions (printed or handwritten) and list the medicines on them.

For each medicine:
- name_as_written: exactly what is written, including "Tab"/"Cap" if present.
- name: your best reading of the brand or generic name, without "Tab"/"Cap" (e.g. "Telma 40", "Glycomet GP 1", "Metformin").
- strength: the strength if written (e.g. "500mg", "40 mg", "50mcg"), else "".
- doses_per_day: decode Indian shorthand. 1-0-1 = 2, 1-1-1 = 3, 0-0-1 = 1, OD = 1, BD/BID = 2, TDS/TID = 3, QID = 4, HS = 1, SOS = 0. Use 1 if unclear.
- frequency_as_written: the dosing text as written (e.g. "1-0-1 x 30 days").
- confidence: how sure you are of the name.

Only list medicines. Skip patient details, diagnoses, tests and advice. Never guess a medicine that is not there.
If the image is not a prescription, set is_prescription to false and return an empty list.
Use notes for anything a pharmacist should double-check (illegible words, unusual doses), in one or two sentences.`;

export async function POST(request: Request) {
  const claude = getClaude();
  if (!claude) {
    return Response.json(
      { error: "Prescription reading needs an Anthropic API key on the server. Try the sample prescription instead." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const file = form?.get("image");
  if (!(file instanceof File)) return Response.json({ error: "Upload an image of the prescription." }, { status: 400 });
  if (file.size > MAX_BYTES) return Response.json({ error: "Image is larger than 5 MB." }, { status: 400 });
  if (!MEDIA_TYPES.includes(file.type as MediaType)) {
    return Response.json({ error: "Use a JPG, PNG or WebP photo." }, { status: 400 });
  }
  const data = Buffer.from(await file.arrayBuffer()).toString("base64");

  try {
    const response = await claude.beta.messages.parse({
      model: MODEL,
      max_tokens: 8000,
      betas: [FALLBACK_BETA],
      fallbacks: "default",
      output_config: { effort: "medium", format: betaZodOutputFormat(PrescriptionSchema) },
      system: INSTRUCTIONS,
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: file.type as MediaType, data } },
            { type: "text", text: "List the medicines on this prescription." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return Response.json({ error: "Could not read this image. Try a clearer, well-lit photo." }, { status: 422 });
    }

    const parsed = response.parsed_output;
    const items = parsed.medicines.map((m) => ({ ...m, match: bestMatch(m.name, m.strength) }));
    return Response.json({ isPrescription: parsed.is_prescription, notes: parsed.notes, items });
  } catch (error) {
    return aiErrorResponse(error);
  }
}
