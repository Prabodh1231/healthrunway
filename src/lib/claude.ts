import "server-only";
import Anthropic from "@anthropic-ai/sdk";

export const MODEL = "claude-opus-5-5";

// Server-side refusal fallback: if the model declines, the API reruns the request on a
// fallback model inside the same call.
export const FALLBACK_BETA = "server-side-fallback-2026-07-01";

let client: Anthropic | null = null;

/** Null when no credentials are configured, so routes can return a friendly 503. */
export function getClaude(): Anthropic | null {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) return null;
  client ??= new Anthropic();
  return client;
}

export function aiErrorResponse(error: unknown) {
  if (error instanceof Anthropic.AuthenticationError) {
    return Response.json({ error: "The AI key is invalid. Check ANTHROPIC_API_KEY." }, { status: 503 });
  }
  if (error instanceof Anthropic.RateLimitError) {
    return Response.json({ error: "The AI service is busy. Try again in a minute." }, { status: 429 });
  }
  if (error instanceof Anthropic.BadRequestError) {
    return Response.json({ error: "The AI could not process this input." }, { status: 400 });
  }
  if (error instanceof Anthropic.APIError) {
    return Response.json({ error: `AI service error (${error.status}).` }, { status: 502 });
  }
  console.error(error);
  return Response.json({ error: "Something went wrong." }, { status: 500 });
}
