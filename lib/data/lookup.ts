/**
 * Unified company lookup across:
 *   1. Five hand-crafted demo anchors (rich data, deterministic ScoreCards)
 *   2. ~7,000 real UK companies from the Payment Practices Reporting register
 *
 * The score page calls this; whichever source matches first wins.
 */
import {
  DEMO_COMPANIES,
  findDemoCompany,
  findDemoCompanyById,
  searchDemoCompanies,
  type DemoCompany,
} from "@/lib/demo/companies";
import {
  findPprCompany,
  searchPprCompanies,
  inferSectorFromName,
  formatCompanyName,
  type PprCompanyRecord,
} from "@/lib/data/ppr";
import {
  type ScoreCard,
  type ScoreInput,
  tierFor,
} from "@/lib/scoring/schema";
import {
  buildScoreInputFromCompaniesHouse,
  chSearch,
  sectorHintFromSic,
  type ChProfile,
} from "@/lib/data/companies-house";

/** Quick risk-tier prediction without a full ScoreCard. Used for autocomplete. */
function quickTier(p: PprCompanyRecord): {
  tier: ScoreCard["tier"];
  score: number;
} {
  const ppr = p.payment_practices[0];
  if (!ppr) return { tier: "medium", score: 30 };

  let score = 30;
  if (ppr.pct_paid_late > 60) score += 35;
  else if (ppr.pct_paid_late > 40) score += 25;
  else if (ppr.pct_paid_late > 25) score += 12;
  else if (ppr.pct_paid_late > 15) score += 4;
  else score -= 8;

  if (ppr.avg_days_to_pay > 90) score += 18;
  else if (ppr.avg_days_to_pay > 70) score += 10;
  else if (ppr.avg_days_to_pay > 50) score += 4;

  if (p.payment_practices[1]) {
    const trend = ppr.pct_paid_late - p.payment_practices[1].pct_paid_late;
    if (trend > 12) score += 10;
    else if (trend > 6) score += 5;
    else if (trend < -8) score -= 4;
  }

  score = Math.max(5, Math.min(95, score));
  return { tier: tierFor(score), score };
}

export type SuggestionItem = {
  name: string;
  number: string;
  sector: string;
  slug: string;
  score: number;
  tier: ScoreCard["tier"];
  source: "demo" | "ppr" | "companies-house";
};

/**
 * Search across the three layers, in order:
 *
 *   1. Demo anchors (instant, 5 entries)
 *   2. PPR register (instant, in-memory, 7,162 entries)
 *   3. Live Companies House register (network call, only when (1+2) is sparse)
 *
 * The CH call only fires when local hits are below half the requested
 * limit, so common searches (Tesco, Barclays etc.) don't burn an API
 * call. Long-tail queries that aren't reportable to PPR — small SMEs,
 * non-VAT-registered traders — fall through to CH and still resolve
 * to a real company.
 */
export async function searchCompanies(
  query: string,
  limit = 8,
): Promise<SuggestionItem[]> {
  const q = query.trim();
  if (!q) return [];

  const demoHits = searchDemoCompanies(q, Math.min(limit, 6)).map<SuggestionItem>(
    (c) => ({
      name: c.name,
      number: c.number,
      sector: c.sector,
      slug: c.slug,
      score: c.card.score,
      tier: c.card.tier,
      source: "demo",
    }),
  );

  const remaining = Math.max(0, limit - demoHits.length);
  const pprHits = remaining
    ? searchPprCompanies(q, remaining + 4).map<SuggestionItem>((p) => {
        const { tier, score } = quickTier(p);
        return {
          name: formatCompanyName(p.name),
          number: p.number,
          sector: inferSectorFromName(p.name),
          slug: p.slug,
          score,
          tier,
          source: "ppr",
        };
      })
    : [];

  const seen = new Set(demoHits.map((d) => d.number));
  const dedupedPpr = pprHits.filter((p) => !seen.has(p.number));
  dedupedPpr.forEach((p) => seen.add(p.number));
  const localHits = [...demoHits, ...dedupedPpr];

  // Live Companies House top-up. Fires only when local layer can't fill
  // the response — saves API calls for common queries while still
  // resolving long-tail SMEs that don't appear in PPR. Numbers we've
  // already returned from demo / PPR are filtered out so the same
  // company never appears twice in the autocomplete list.
  const stillNeed = limit - localHits.length;
  if (stillNeed > 0 && q.length >= 3) {
    const chResults = await chSearch(q, Math.min(stillNeed + 2, 5));
    const chHits: SuggestionItem[] = chResults
      .filter((r) => !seen.has(r.company_number))
      .map((r) => ({
        name: formatCompanyName(r.title),
        number: r.company_number,
        sector: r.company_type === "plc"
          ? "Public limited company"
          : r.company_type === "llp"
            ? "Limited liability partnership"
            : "Limited company",
        slug: `${formatCompanyName(r.title).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}-${r.company_number}`,
        // No PPR data → unknown payment behaviour. Default to medium with a
        // moderate score; the score page will compute a real tier from the
        // full profile + heuristic.
        score: 35,
        tier: "medium" as const,
        source: "companies-house" as const,
      }));
    localHits.push(...chHits);
  }

  return localHits.slice(0, limit);
}

/* ---------- score-page resolver ---------- */

export type ResolvedCompany =
  | {
      kind: "demo";
      demo: DemoCompany;
    }
  | {
      kind: "ppr";
      ppr: PprCompanyRecord;
      sector: string;
      input: ScoreInput;
    }
  | {
      kind: "companies-house";
      profile: ChProfile;
      sector: string;
      input: ScoreInput;
    };

/** Build a synthetic ScoreInput from a real PPR record. */
export function buildPprScoreInput(p: PprCompanyRecord): ScoreInput {
  // Best-effort defaults for everything we don't have from PPR alone.
  // The fallback heuristic is heavily PPR-weighted, so this still produces
  // a meaningful score.
  const incorporatedYearGuess = Math.max(
    1900,
    Math.min(
      2024,
      // Companies House numbers usually correlate loosely to incorporation era.
      // Lower number → older company. We bucket roughly.
      Number(p.number.slice(0, 2)) < 50 ? 1985 : 2000,
    ),
  );

  return {
    company: {
      name: formatCompanyName(p.name),
      number: p.number,
      sic_codes: [],
      incorporated_on: `${incorporatedYearGuess}-01-01`,
      status: "active",
      accounts: { next_due: null, overdue: false, last_made_up_to: null },
    },
    payment_practices: p.payment_practices.slice(0, 2).map((q) => ({
      period_start: q.period_start,
      period_end: q.period_end,
      avg_days_to_pay: q.avg_days_to_pay,
      pct_paid_within_30: q.pct_paid_within_30,
      pct_paid_31_to_60: q.pct_paid_31_to_60,
      pct_paid_over_60: q.pct_paid_over_60,
      pct_paid_late: q.pct_paid_late,
    })),
    officers: [],
    charges: [],
    network: {
      director_churn_12m: 0,
      cfo_changed_recently: false,
      disqualified_in_network: 0,
      insolvent_neighbours: 0,
      phoenix_pattern_score: 0,
      psc_changes_12m: 0,
      confirmation_statement_overdue: false,
    },
  };
}

/**
 * Resolve any company identifier to a renderable record. Tries each
 * source in order — demo, PPR, then live Companies House — and returns
 * the first hit. Async because the CH lookup is a network call.
 *
 * Companies House is reached via slug *or* via raw 8-character company
 * number; the score-page route accepts both.
 */
export async function resolveCompany(
  idOrSlug: string,
): Promise<ResolvedCompany | null> {
  const demo = findDemoCompanyById(idOrSlug) ?? findDemoCompany(idOrSlug);
  if (demo) return { kind: "demo", demo };

  const ppr = findPprCompany(idOrSlug);
  if (ppr) {
    return {
      kind: "ppr",
      ppr,
      sector: inferSectorFromName(ppr.name),
      input: buildPprScoreInput(ppr),
    };
  }

  // Companies House fallback. Pull a possible company number from the
  // tail of a slug like `tesco-plc-00445790` or treat the input as a
  // raw number directly.
  const numberCandidate = idOrSlug.match(/[A-Z0-9]{6,10}$/i)?.[0];
  if (numberCandidate) {
    const input = await buildScoreInputFromCompaniesHouse(numberCandidate);
    if (input) {
      // Refetch the profile from the cache for the discriminated-union
      // narrow on the consumer side.
      const profile = {
        company_name: input.company.name,
        company_number: input.company.number,
        company_status: input.company.status,
        date_of_creation: input.company.incorporated_on,
        type: "ltd",
        sic_codes: input.company.sic_codes,
      } as ChProfile;
      return {
        kind: "companies-house",
        profile,
        sector: sectorHintFromSic(input.company.sic_codes),
        input,
      };
    }
  }

  return null;
}

export const totalCompanyCount =
  DEMO_COMPANIES.length +
  // imported lazily below to avoid bundling at the top
  // (we'll just expose the number via PPR_COMPANIES.length where used)
  0;
