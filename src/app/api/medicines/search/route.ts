import type { NextRequest } from "next/server";
import { searchMedicines } from "@/lib/medicines";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.slice(0, 80) ?? "";
  return Response.json({ results: searchMedicines(q, 10) });
}
