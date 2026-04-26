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
  source: "demo" | "ppr";
};

export function searchCompanies(query: string, limit = 8): SuggestionItem[] {
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

  // Dedupe by company number (a PPR-listed company that's also a demo anchor
  // — currently none — should only appear once).
  const seen = new Set(demoHits.map((d) => d.number));
  return [
    ...demoHits,
    ...pprHits.filter((p) => !seen.has(p.number)),
  ].slice(0, limit);
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

export function resolveCompany(idOrSlug: string): ResolvedCompany | null {
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
  return null;
}

export const totalCompanyCount =
  DEMO_COMPANIES.length +
  // imported lazily below to avoid bundling at the top
  // (we'll just expose the number via PPR_COMPANIES.length where used)
  0;
