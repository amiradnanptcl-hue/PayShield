import { type NextRequest, NextResponse } from "next/server";
import { searchCompanies } from "@/lib/data/lookup";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q") ?? "";
  const start = Date.now();

  try {
    // searchCompanies is async — it may make a network call to the
    // Companies House register when the local layer can't satisfy the
    // requested limit. The CH client has an 8-second timeout and 15-min
    // memory cache so this rarely blocks for long.
    const results = await searchCompanies(q, 8);
    const duration = Date.now() - start;

    if (duration > 1500) {
      console.warn(
        `[search] slow query "${q}" took ${duration}ms (${results.length} hits)`,
      );
    }

    return NextResponse.json({ results });
  } catch (err) {
    console.error(
      `[search] failed for query "${q}" after ${Date.now() - start}ms`,
      err,
    );
    // Return an empty result set rather than 500 — autocomplete should
    // never blow up the user's typing experience.
    return NextResponse.json({ results: [] }, { status: 200 });
  }
}
