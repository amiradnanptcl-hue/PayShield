/**
 * Ingest the UK Payment Practices Reporting (PPR) CSV.
 *
 * Source: https://check-payment-practices.service.gov.uk/export/
 * Reads:  ../2026-04-25-1118-prompt-payments.csv (~97 MB)
 * Writes: ./lib/data/ppr-companies.json (compact, ships to client)
 *
 * Strategy:
 *  - Stream-parse the CSV with Papa Parse.
 *  - Group rows by `Company number`.
 *  - Keep only the latest 2 reporting periods per company (sorted by End date).
 *  - Filter to companies whose most recent period_end is within the last
 *    36 months — recency is what makes a score meaningful.
 *  - Emit one compact record per company.
 */
import fs from "node:fs";
import path from "node:path";
import Papa from "papaparse";

type Row = Record<string, string>;

type RawPeriod = {
  filing_date: string;
  period_start: string;
  period_end: string;
  avg_days_to_pay: number;
  pct_paid_within_30: number;
  pct_paid_31_to_60: number;
  pct_paid_over_60: number;
  pct_paid_late: number;
  shortest_terms: number | null;
  longest_terms: number | null;
  e_invoicing: boolean;
};

type CompanyOut = {
  number: string;
  name: string;
  slug: string;
  latest_filing: string;
  payment_practices: RawPeriod[];
};

const CSV_PATH = path.resolve(
  process.cwd(),
  "..",
  "2026-04-25-1118-prompt-payments.csv",
);
const OUT_PATH = path.resolve(
  process.cwd(),
  "lib",
  "data",
  "ppr-companies.json",
);
const RECENCY_CUTOFF_MS = Date.UTC(2023, 0, 1); // keep filings ending on/after 2023-01-01

function toNumber(v: string | undefined): number | null {
  if (v == null || v === "") return null;
  const cleaned = v.replace(/[, ]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function toBool(v: string | undefined): boolean {
  return v === "True" || v === "true" || v === "1";
}

function slugify(name: string, number: string): string {
  const base = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return `${base}-${number.toLowerCase()}`;
}

function parseRow(r: Row): RawPeriod | null {
  const periodEnd = r["End date"];
  const periodStart = r["Start date"];
  if (!periodEnd || !periodStart) return null;

  const avg = toNumber(r["Average time to pay"]);
  if (avg == null) return null; // no headline metric → skip

  const within30 = toNumber(r["% Invoices paid within 30 days"]) ?? 0;
  const between = toNumber(r["% Invoices paid between 31 and 60 days"]) ?? 0;
  const over60 = toNumber(r["% Invoices paid later than 60 days"]) ?? 0;
  const late = toNumber(r["% Invoices not paid within agreed terms"]) ?? 0;

  return {
    filing_date: r["Filing date"] ?? "",
    period_start: periodStart,
    period_end: periodEnd,
    avg_days_to_pay: Math.round(avg),
    pct_paid_within_30: Math.round(within30),
    pct_paid_31_to_60: Math.round(between),
    pct_paid_over_60: Math.round(over60),
    pct_paid_late: Math.round(late),
    shortest_terms: toNumber(r["Shortest (or only) standard payment period"]),
    longest_terms: toNumber(r["Longest standard payment period"]),
    e_invoicing: toBool(r["E-Invoicing offered"]),
  };
}

async function main() {
  const t0 = Date.now();
  console.log(`Reading ${CSV_PATH} (~${(fs.statSync(CSV_PATH).size / 1e6).toFixed(0)} MB)…`);

  const raw = fs.readFileSync(CSV_PATH, "utf8");
  console.log(`Loaded ${(raw.length / 1e6).toFixed(0)} MB of text in ${Date.now() - t0}ms.`);

  const parsed = Papa.parse<Row>(raw, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });

  console.log(`Parsed ${parsed.data.length.toLocaleString()} rows in ${Date.now() - t0}ms.`);
  if (parsed.errors.length) {
    console.warn(`Papa Parse reported ${parsed.errors.length} non-fatal issues; continuing.`);
  }

  // Aggregate per company
  const byNumber = new Map<
    string,
    { name: string; periods: RawPeriod[] }
  >();

  for (const row of parsed.data) {
    const number = (row["Company number"] ?? "").trim();
    const name = (row["Company"] ?? "").trim();
    if (!number || !name) continue;

    const period = parseRow(row);
    if (!period) continue;

    const endMs = Date.parse(period.period_end);
    if (!Number.isFinite(endMs)) continue;

    const bucket = byNumber.get(number) ?? { name, periods: [] };
    bucket.name = name; // most recent name wins (rare renames)
    bucket.periods.push(period);
    byNumber.set(number, bucket);
  }

  console.log(`Aggregated into ${byNumber.size.toLocaleString()} companies.`);

  const out: CompanyOut[] = [];
  for (const [number, { name, periods }] of byNumber) {
    periods.sort(
      (a, b) => Date.parse(b.period_end) - Date.parse(a.period_end),
    );
    const latest = periods[0];
    if (!latest) continue;
    if (Date.parse(latest.period_end) < RECENCY_CUTOFF_MS) continue;

    out.push({
      number,
      name,
      slug: slugify(name, number),
      latest_filing: latest.filing_date,
      payment_practices: periods.slice(0, 2),
    });
  }

  // Sort: most recent filings first (so the search shows fresh ones first)
  out.sort((a, b) => Date.parse(b.latest_filing) - Date.parse(a.latest_filing));

  fs.mkdirSync(path.dirname(OUT_PATH), { recursive: true });
  fs.writeFileSync(OUT_PATH, JSON.stringify(out));
  const sizeMb = (fs.statSync(OUT_PATH).size / 1e6).toFixed(2);

  console.log(
    `Wrote ${out.length.toLocaleString()} companies to ${OUT_PATH} (${sizeMb} MB) in ${Date.now() - t0}ms.`,
  );

  // Sample
  console.log("\nFirst 5 companies (most recent filings):");
  for (const c of out.slice(0, 5)) {
    console.log(
      `  ${c.number}  ${c.name.padEnd(50).slice(0, 50)}  avg ${c.payment_practices[0].avg_days_to_pay}d  late ${c.payment_practices[0].pct_paid_late}%`,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
