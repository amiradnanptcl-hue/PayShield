/**
 * Companies House public-data API client.
 *
 * Docs:    https://developer-specs.company-information.service.gov.uk
 * Auth:    HTTP Basic — API key as username, empty password
 * Limit:   600 requests per 5 minutes (per key)
 *
 * The client is server-side only. It never runs in the browser, so the
 * API key is read from `process.env.COMPANIES_HOUSE_API_KEY` and never
 * leaves the Node runtime.
 *
 * If the key is missing, every function returns a safe empty value (null
 * or []) so the rest of the app falls back to the local PPR ingest +
 * heuristic scoring without throwing.
 *
 * Light in-memory cache with 15 minute TTL keeps us inside the rate
 * limit when the same company is viewed repeatedly during a session.
 */

import type { ScoreInput } from "../scoring/schema";

const BASE =
  process.env.COMPANIES_HOUSE_BASE ??
  "https://api.company-information.service.gov.uk";

const TTL_MS = 15 * 60 * 1000; // 15 minutes
const cache = new Map<string, { at: number; data: unknown }>();

function getKey(): string | null {
  return process.env.COMPANIES_HOUSE_API_KEY?.trim() || null;
}

/**
 * Issue a basic-auth request to Companies House. Returns parsed JSON or
 * null on any failure (404, 5xx, network, key-missing). The caller
 * always sees a clean nullable — the upstream UI never crashes if the
 * register is unreachable.
 */
async function chFetch<T>(path: string): Promise<T | null> {
  const key = getKey();
  if (!key) return null;

  // Cache hit?
  const cached = cache.get(path);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return cached.data as T;
  }

  // HTTP basic — `<api-key>:` (empty password)
  const auth = "Basic " + Buffer.from(`${key}:`).toString("base64");

  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Authorization: auth, Accept: "application/json" },
      // Vercel functions: short-circuit any hangs at 8s — the API is
      // usually <500ms but we don't want a stuck request to block the
      // page render.
      signal: AbortSignal.timeout(8_000),
      // We want fresh data on the score page; the in-memory map handles
      // hot caching and the Companies House register only updates on
      // filing events anyway.
      cache: "no-store",
    });

    if (!res.ok) {
      // 404 just means "not found" — common for invalid company numbers.
      // 401/403 means the key is wrong; 429 means we hit the rate limit.
      // All of these resolve to null so the caller can fall back.
      if (res.status !== 404) {
        console.warn(
          `[companies-house] ${res.status} ${res.statusText} on ${path}`,
        );
      }
      return null;
    }

    const data = (await res.json()) as T;
    cache.set(path, { at: Date.now(), data });
    return data;
  } catch (err) {
    console.warn(`[companies-house] fetch failed for ${path}`, err);
    return null;
  }
}

/* ────────────────────────────────────────────────────────────────────
 *  Typed responses
 *  Only the subset of fields PayShield consumes — kept small for clarity.
 * ──────────────────────────────────────────────────────────────────── */

export type ChSearchHit = {
  company_number: string;
  title: string;
  company_status: string;
  company_type: string;
  date_of_creation?: string;
  address_snippet?: string;
  description?: string;
};

type ChSearchResponse = {
  items: Array<{
    company_number: string;
    title: string;
    company_status: string;
    company_type: string;
    date_of_creation?: string;
    address_snippet?: string;
    description?: string;
  }>;
};

export type ChProfile = {
  company_name: string;
  company_number: string;
  company_status: string;
  date_of_creation: string;
  type: string;
  sic_codes?: string[];
  registered_office_address?: {
    address_line_1?: string;
    locality?: string;
    postal_code?: string;
  };
  accounts?: {
    overdue?: boolean;
    next_due?: string;
    last_accounts?: { made_up_to?: string };
  };
  confirmation_statement?: { overdue?: boolean };
  has_charges?: boolean;
};

type ChOfficersResponse = {
  total_results?: number;
  items: Array<{
    name: string;
    officer_role: string;
    appointed_on?: string;
    resigned_on?: string;
  }>;
};

type ChChargesResponse = {
  total_count?: number;
  items?: Array<{
    classification?: { description?: string };
    status?: string;
    delivered_on?: string;
  }>;
};

/* ────────────────────────────────────────────────────────────────────
 *  Public functions
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Search the live register. Returns up to `limit` matches by name or
 * number. Empty array if the key is missing or the call fails.
 */
export async function chSearch(
  query: string,
  limit = 5,
): Promise<ChSearchHit[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const path = `/search/companies?q=${encodeURIComponent(trimmed)}&items_per_page=${limit}`;
  const data = await chFetch<ChSearchResponse>(path);
  if (!data?.items) return [];

  return data.items.map((it) => ({
    company_number: it.company_number,
    title: it.title,
    company_status: it.company_status,
    company_type: it.company_type,
    date_of_creation: it.date_of_creation,
    address_snippet: it.address_snippet,
    description: it.description,
  }));
}

/** Fetch the full profile for a known company number. */
export async function chProfile(
  number: string,
): Promise<ChProfile | null> {
  const clean = number.trim().toUpperCase();
  if (!clean) return null;
  return await chFetch<ChProfile>(`/company/${clean}`);
}

/** Officers list — returns up to 100, the API default. */
export async function chOfficers(number: string) {
  const clean = number.trim().toUpperCase();
  if (!clean) return [];
  const data = await chFetch<ChOfficersResponse>(
    `/company/${clean}/officers?items_per_page=100`,
  );
  return data?.items ?? [];
}

/** Charges register. */
export async function chCharges(number: string) {
  const clean = number.trim().toUpperCase();
  if (!clean) return [];
  const data = await chFetch<ChChargesResponse>(
    `/company/${clean}/charges?items_per_page=50`,
  );
  return data?.items ?? [];
}

/* ────────────────────────────────────────────────────────────────────
 *  Adapters → ScoreInput
 *  Convert the raw Companies House shape into the typed `ScoreInput`
 *  the rest of PayShield consumes. PPR data is left empty — Companies
 *  House does not surface payment-practice filings; for those we'd
 *  need a separate ingest. The ML scorer will return null for these
 *  inputs, which routes the caller to the heuristic fallback.
 * ──────────────────────────────────────────────────────────────────── */

/**
 * Pull every dossier piece in parallel and build a `ScoreInput` ready
 * for the scoring pipeline. Returns null if the company number is
 * unknown to Companies House.
 */
export async function buildScoreInputFromCompaniesHouse(
  number: string,
): Promise<ScoreInput | null> {
  const profile = await chProfile(number);
  if (!profile) return null;

  // Officers + charges are best-effort — if they fail (rate limit,
  // private profile, etc.) we just go in with empty arrays.
  const [officersRaw, chargesRaw] = await Promise.all([
    chOfficers(number),
    chCharges(number),
  ]);

  // Compute network signals from the officer feed.
  const oneYearAgo = new Date(
    Date.now() - 365 * 24 * 3600 * 1000,
  ).toISOString();
  const directorChurn12m = officersRaw.filter((o) => {
    const apptInWindow = (o.appointed_on ?? "") > oneYearAgo;
    const resignedInWindow = (o.resigned_on ?? "") > oneYearAgo;
    return apptInWindow || resignedInWindow;
  }).length;

  const cfoChangedRecently = officersRaw.some((o) => {
    const isFinance =
      /chief financial|finance director|cfo|finance officer/i.test(o.officer_role) ||
      /cfo|finance/i.test(o.name);
    const recentChange =
      (o.appointed_on ?? "") > oneYearAgo ||
      (o.resigned_on ?? "") > oneYearAgo;
    return isFinance && recentChange;
  });

  const charges = (chargesRaw ?? []).map((c) => ({
    classification: c.classification?.description ?? "Unknown",
    status: (c.status ?? "outstanding").toLowerCase(),
    delivered_on: c.delivered_on ?? new Date().toISOString().slice(0, 10),
  }));

  const officers = officersRaw.slice(0, 20).map((o) => ({
    name: o.name,
    role: o.officer_role,
    appointed_on: o.appointed_on ?? "",
    resigned_on: o.resigned_on ?? null,
  }));

  // The status enum in our schema is constrained to four values; map.
  const status: ScoreInput["company"]["status"] =
    profile.company_status === "active"
      ? "active"
      : profile.company_status === "dissolved"
        ? "dissolved"
        : profile.company_status.includes("liquidation")
          ? "liquidation"
          : profile.company_status.includes("administration")
            ? "administration"
            : "active"; // fallback for "voluntary-arrangement", "receivership", etc.

  return {
    company: {
      name: profile.company_name,
      number: profile.company_number,
      sic_codes: profile.sic_codes ?? [],
      incorporated_on: profile.date_of_creation,
      status,
      accounts: {
        next_due: profile.accounts?.next_due ?? null,
        overdue: Boolean(profile.accounts?.overdue),
        last_made_up_to: profile.accounts?.last_accounts?.made_up_to ?? null,
      },
    },
    payment_practices: [], // CH does not expose PPR — heuristic fallback handles this
    officers,
    charges,
    network: {
      director_churn_12m: directorChurn12m,
      cfo_changed_recently: cfoChangedRecently,
      disqualified_in_network: 0, // would need /disqualified-officers cross-ref
      insolvent_neighbours: 0,
      phoenix_pattern_score: 0,
      psc_changes_12m: 0, // would need /persons-with-significant-control delta
      confirmation_statement_overdue: Boolean(
        profile.confirmation_statement?.overdue,
      ),
    },
  };
}

/** Tiny human-readable sector hint from the SIC code, for search results. */
export function sectorHintFromSic(sicCodes: string[] | undefined): string {
  const first = sicCodes?.[0];
  if (!first) return "Limited company";
  const major = parseInt(first.slice(0, 2), 10);
  if (major >= 41 && major <= 43) return "Construction";
  if (major === 47) return "Retail";
  if (major === 55 || major === 56) return "Hospitality";
  if (major >= 69 && major <= 74) return "Professional services";
  if (major >= 10 && major <= 33) return "Manufacturing";
  if (major >= 64 && major <= 66) return "Financial services";
  return "Limited company";
}
