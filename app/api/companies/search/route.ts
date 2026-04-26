import { type NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/data/lookup";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";

  const results = searchCompanies(q, 8);

  return NextResponse.json({ results });
}
