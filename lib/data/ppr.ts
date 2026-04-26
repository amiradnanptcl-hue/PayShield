/**
 * Real UK PPR data layer.
 *
 * Generated from `scripts/ingest-ppr.ts` reading the official
 * https://check-payment-practices.service.gov.uk/export/ CSV.
 *
 * 7,000+ companies, last 2 reporting periods each, all with filings
 * within the last 36 months.
 */
import raw from "./ppr-companies.json";

export type PprPeriodCsv = {
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

export type PprCompanyRecord = {
  number: string;
  name: string;
  slug: string;
  latest_filing: string;
  payment_practices: PprPeriodCsv[];
};

export const PPR_COMPANIES: PprCompanyRecord[] =
  raw as unknown as PprCompanyRecord[];

/* ---------- lookup ---------- */

const bySlug = new Map<string, PprCompanyRecord>();
const byNumber = new Map<string, PprCompanyRecord>();
for (const c of PPR_COMPANIES) {
  bySlug.set(c.slug, c);
  byNumber.set(c.number, c);
}

export function findPprCompany(idOrSlug: string): PprCompanyRecord | null {
  const key = idOrSlug.trim();
  return bySlug.get(key) ?? byNumber.get(key) ?? null;
}

/* ---------- search ---------- */

/**
 * Naïve substring + prefix match. Good enough for hackathon demo:
 * with 7k companies and a single linear scan, p99 latency is < 5 ms.
 */
export function searchPprCompanies(
  query: string,
  limit = 10,
): PprCompanyRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const exact: PprCompanyRecord[] = [];
  const prefix: PprCompanyRecord[] = [];
  const contains: PprCompanyRecord[] = [];

  for (const c of PPR_COMPANIES) {
    const name = c.name.toLowerCase();
    const num = c.number.toLowerCase();

    if (name === q || num === q) {
      exact.push(c);
    } else if (name.startsWith(q) || num.startsWith(q)) {
      prefix.push(c);
    } else if (name.includes(q)) {
      contains.push(c);
    }
    if (exact.length + prefix.length + contains.length >= limit * 4) break;
  }

  // Within prefix matches, sort by recency of latest filing.
  prefix.sort(
    (a, b) => Date.parse(b.latest_filing) - Date.parse(a.latest_filing),
  );
  contains.sort(
    (a, b) => Date.parse(b.latest_filing) - Date.parse(a.latest_filing),
  );

  return [...exact, ...prefix, ...contains].slice(0, limit);
}

/* ---------- name formatting ---------- */

/**
 * Companies House publishes names in ALL CAPS. That looks shouty in editorial
 * typography, so we title-case for display. Common suffixes are normalised.
 *
 *  "ENTERTAINMENT MAGPIE LIMITED" -> "Entertainment Magpie Limited"
 *  "TESCO PLC"                    -> "Tesco PLC"
 *  "J SAINSBURY PLC"              -> "J Sainsbury PLC"
 */
const PRESERVE = new Set([
  "PLC", "LTD", "LLP", "LP", "UK", "USA", "NHS", "GB",
  "AG", "AB", "BV", "NV", "SA", "SAS", "SE", "GMBH", "KG",
  "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
]);
const LOWER = new Set([
  "and", "of", "the", "to", "for", "in", "at", "by", "on",
]);

export function formatCompanyName(raw: string): string {
  // If the name is already mixed-case, leave it alone.
  if (raw !== raw.toUpperCase()) return raw;

  // First normalise dotted suffix forms ("P.L.C.", "L.L.P.", "L.T.D.")
  // before tokenising — they confuse a word-by-word title caser.
  const name = raw
    .replace(/\bP\.L\.C\.?/gi, "PLC")
    .replace(/\bL\.L\.P\.?/gi, "LLP")
    .replace(/\bL\.T\.D\.?/gi, "LTD")
    .replace(/\(U\.K\.\)/gi, "(UK)")
    .replace(/\bU\.K\.?\b/gi, "UK");

  return name
    .toLowerCase()
    .split(/(\s+)/)
    .map((token, i) => {
      if (/^\s+$/.test(token)) return token;
      const upper = token.toUpperCase();
      if (PRESERVE.has(upper)) return upper;
      // "(uk)" -> "(UK)" etc.
      const innerUpper = upper.replace(/[()]/g, "");
      if (PRESERVE.has(innerUpper)) {
        return upper;
      }
      if (i > 0 && LOWER.has(token)) return token;
      // Capitalise hyphenated parts: "co-operative" -> "Co-operative"
      return token
        .split("-")
        .map((p) =>
          p.length > 0 ? p[0].toUpperCase() + p.slice(1) : p,
        )
        .join("-");
    })
    .join("")
    .replace(/\bMc([a-z])/g, (_, c: string) => `Mc${c.toUpperCase()}`)
    .replace(/\bO'([a-z])/g, (_, c: string) => `O'${c.toUpperCase()}`);
}

/* ---------- sector heuristic from name ---------- */

/**
 * PPR doesn't carry SIC codes, but for display we infer a loose sector
 * from common words in the company name. Used for the FactPill subtitle.
 */
export function inferSectorFromName(name: string): string {
  const n = name.toLowerCase();
  const map: [RegExp, string][] = [
    [/\b(construction|builders?|building|civils|joinery|plumb|electrical|roofing|brick|timber|steel|cement|concrete|scaffold)\b/, "Construction"],
    [/\b(engineering|engineers?|machin|mechanical|electric|automation|robotics)\b/, "Engineering"],
    [/\b(retail|stores?|shops?|supermarket|grocery|wholesale)\b/, "Retail"],
    [/\b(food|bakery|brewery|distill|drinks?|beverage|catering|restaurant)\b/, "Food & drink"],
    [/\b(holdings?|investments?|capital|partners?|equity|finance|financial)\b/, "Finance"],
    [/\b(bank|insurance|assurance|underwriters?)\b/, "Financial services"],
    [/\b(law|legal|solicitors?|barristers?)\b/, "Legal services"],
    [/\b(consult|advisory|accountants?|audit)\b/, "Professional services"],
    [/\b(software|technolog|systems?|digital|data|cyber|tech|IT services)\b/, "Technology"],
    [/\b(healthcare|medical|pharma|nhs|hospital|clinic|dental)\b/, "Healthcare"],
    [/\b(transport|logistics|haulage|freight|courier|shipping|rail)\b/, "Logistics & transport"],
    [/\b(property|estates?|homes?|housing|developments?|residential|rentals?)\b/, "Property & housing"],
    [/\b(energy|power|electric|gas|oil|petroleum|renewable|solar|wind)\b/, "Energy"],
    [/\b(motor|cars?|automotive|vehicles?|dealership)\b/, "Automotive"],
    [/\b(media|publishing|broadcast|advertising|marketing|communications?)\b/, "Media"],
    [/\b(education|university|school|college|academy|training)\b/, "Education"],
    [/\b(security|cleaning|facilities|maintenance|landscaping)\b/, "Facilities & services"],
    [/\b(textile|clothing|fashion|apparel|garment)\b/, "Textiles"],
    [/\b(plastics?|chemicals?|polymer|composites?)\b/, "Manufacturing"],
    [/\b(manufactur|production|works|industries|industrial)\b/, "Manufacturing"],
    [/\b(hotels?|leisure|hospitality|tourism|travel)\b/, "Hospitality"],
  ];
  for (const [re, label] of map) if (re.test(n)) return label;
  return "Limited company";
}
