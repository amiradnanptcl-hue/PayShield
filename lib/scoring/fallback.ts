import {
  type ScoreCard,
  type ScoreInput,
  tierFor,
  type RecommendedAction,
} from "./schema";

/* ────────────────────────────────────────────────────────────────────
 *  Critical-status override (Risk Matrix v1.1, hard rule)
 *
 *  Some Companies House states tell us the legal entity has stopped
 *  trading, is under insolvency proceedings, or no longer exists. In
 *  those cases the entire scoring stack — ML model, heuristic, LLM —
 *  must short-circuit to a Critical-tier outcome with explicit "do not
 *  invoice" messaging. The matrix's normal score → action mapping
 *  doesn't apply: there's nobody to take a deposit from.
 *
 *  Both `mlScore()` and `fallbackScore()` call this first; if it
 *  returns a card, that card wins regardless of what the model or
 *  heuristic would have produced.
 * ──────────────────────────────────────────────────────────────────── */

const NON_TRADING_STATUSES: ReadonlySet<ScoreInput["company"]["status"]> = new Set([
  "dissolved",
  "removed",
  "liquidation",
  "administration",
  "receivership",
  "voluntary-arrangement",
  "insolvency-proceedings",
]);

export function criticalStatusOverride(input: ScoreInput): ScoreCard | null {
  const status = input.company.status;
  if (!NON_TRADING_STATUSES.has(status)) return null;

  const name = input.company.name;

  // Per-status copy. Each tells the user (1) the legal state, (2) why it
  // matters commercially, and (3) what to do next.
  const copy = {
    dissolved: {
      headline: `${name} is DISSOLVED at Companies House — do not invoice.`,
      signal: "Company dissolved",
      evidence: `${name} was struck off the Companies House register and no longer exists as a legal entity. Any invoice issued to a dissolved company is unenforceable; payment cannot be compelled.`,
      rationale:
        "DECLINE — company dissolved. The legal entity has been struck off the Companies House register and cannot be invoiced. If you're already exposed, contact the Treasury Solicitor (bona vacantia) about any pre-dissolution debt.",
    },
    removed: {
      headline: `${name} has been REMOVED from the Companies House register — do not invoice.`,
      signal: "Company removed from register",
      evidence: `${name} has been removed from the Companies House register. The entity is no longer recognised; invoicing is unenforceable.`,
      rationale:
        "DECLINE — company removed from register. Invoicing is unenforceable. Refuse the engagement.",
    },
    liquidation: {
      headline: `${name} is in LIQUIDATION — refuse the engagement.`,
      signal: "Company in liquidation",
      evidence: `${name} is under formal liquidation at Companies House. Assets are being realised by an Insolvency Practitioner; unsecured creditors typically recover pence-on-the-pound, if at all.`,
      rationale:
        "DECLINE — company in liquidation. New supplier invoices rank as unsecured claims with low recovery prospects. If you must engage, demand 100% upfront and confirm the Insolvency Practitioner authorises the spend.",
    },
    administration: {
      headline: `${name} is in ADMINISTRATION — high-risk engagement, refuse or 100% upfront.`,
      signal: "Company in administration",
      evidence: `${name} is in formal administration at Companies House. An administrator is in control; the company is operating under court protection while a rescue or sale is attempted.`,
      rationale:
        "DECLINE or take 100% upfront. Company is in administration — only the administrator can authorise new spending, and post-appointment supplier debts may be subordinated. Verify any commitment with the administrator's office.",
    },
    receivership: {
      headline: `${name} is in RECEIVERSHIP — refuse the engagement.`,
      signal: "Company in receivership",
      evidence: `${name} is under receivership. A receiver appointed by a secured creditor controls the company's assets; trading typically stops or is heavily restricted.`,
      rationale:
        "DECLINE — company in receivership. The receiver is realising assets for a secured creditor; new unsecured supplier debt has minimal recovery prospects.",
    },
    "voluntary-arrangement": {
      headline: `${name} is in a Company Voluntary Arrangement — high-risk engagement.`,
      signal: "CVA in force",
      evidence: `${name} is operating under a Company Voluntary Arrangement (CVA). Pre-CVA debts have been compromised; the company is paying historical creditors at a reduced rate.`,
      rationale:
        "PROCEED ONLY WITH 100% UPFRONT. CVA in force — pre-arrangement debts are being repaid at compromised rates. New post-CVA debt should rank ahead but only if the supervisor-approved cashflow allows.",
    },
    "insolvency-proceedings": {
      headline: `${name} is under insolvency proceedings — refuse the engagement.`,
      signal: "Insolvency proceedings active",
      evidence: `${name} is currently the subject of insolvency proceedings. The company's solvency and ability to pay new invoices cannot be relied upon.`,
      rationale:
        "DECLINE — insolvency proceedings active. Until the proceedings resolve and a clear corporate state is restored, the company cannot be relied upon to pay new invoices.",
    },
  } as const;

  // Type-assertion: we filtered for non-trading statuses above, so
  // `status` is guaranteed to be a key of `copy` here.
  const c = copy[status as keyof typeof copy];

  return {
    score: 100,
    tier: "critical",
    predicted_days_to_pay: 180, // upper bound — payment unlikely at all
    reasoning: [
      {
        signal: c.signal,
        weight: 10,
        evidence: c.evidence,
      },
      {
        signal: "Risk Matrix v1.1 — non-trading override",
        weight: 9,
        evidence:
          "The matrix's score-to-action mapping assumes a trading counter-party. When Companies House marks the entity as no longer trading, PayShield short-circuits to a Critical-tier 'decline or 100% upfront' outcome regardless of any other signal.",
      },
    ],
    headline: c.headline.length > 140 ? c.headline.slice(0, 137) + "..." : c.headline,
    action: {
      deposit_pct: 100,
      terms_days: 7,
      chase_from_day: 1,
      escalation_at_day: 1,
      rationale: c.rationale.length > 280 ? c.rationale.slice(0, 277) + "..." : c.rationale,
    },
  };
}

/* Sector benchmarks from §6.2 of the spec. */
function sectorBenchmark(sicCodes: string[]): number {
  const first = sicCodes[0] ?? "";
  const major = parseInt(first.slice(0, 2), 10);
  if (major >= 41 && major <= 43) return 67; // construction
  if (major === 47) return 45; // retail
  if (major === 55 || major === 56) return 38; // hospitality
  if (major >= 69 && major <= 74) return 42; // professional services
  if (major >= 10 && major <= 33) return 55; // manufacturing
  return 50;
}

/**
 * Score-to-action mapping — PayShield Risk Assessment Matrix v1.1.
 * Strict per-tier rules from the published decision tree. Exported as
 * `actionForTier` so the ML scorer can reuse the exact same action
 * numbers the heuristic and LLM paths produce — every code path lands
 * on the same matrix row for any given tier.
 */
export function actionForTier(
  tier: ScoreCard["tier"],
  /** When true the rationale gets a Phoenix-pattern preamble explaining
   *  why the points score has been overridden upward to Critical. */
  phoenixOverride = false,
): RecommendedAction {
  switch (tier) {
    case "low":
      // 0–29 / 100 · No deposit · Net-30
      return {
        deposit_pct: 0,
        terms_days: 30,
        chase_from_day: 35,
        escalation_at_day: 60,
        rationale:
          "Invoice as standard. Chase sequence dormant, fires only if payment slips past day 35.",
      };
    case "medium":
      // 30–49 / 100 · 20% deposit · Net-21
      return {
        deposit_pct: 20,
        terms_days: 21,
        chase_from_day: 14,
        escalation_at_day: 21,
        rationale:
          "Take a small deposit, tighten terms. Friendly chase from day 14, firmer reminder at day 21.",
      };
    case "high":
      // 50–74 / 100 · 40% deposit · Net-14
      return {
        deposit_pct: 40,
        terms_days: 14,
        chase_from_day: 7,
        escalation_at_day: 14,
        rationale:
          "Substantial deposit, short window. Chase from day 7, escalation tone at day 14, recovery prep at day 28.",
      };
    case "critical":
      // 75–100 / 100 · 50%+ deposit · Net-7
      return {
        deposit_pct: 50,
        terms_days: 7,
        chase_from_day: 3,
        escalation_at_day: 14,
        rationale: phoenixOverride
          ? "Phoenix-pattern override: tier forced to Critical regardless of points. Decline the job, or take half upfront on Net-7 with Small Business Commissioner referral drafted."
          : "Half upfront, weekly terms, or decline the job. Chase from day 3, escalate day 14, Small Business Commissioner referral drafted.",
      };
  }
}

export function fallbackScore(input: ScoreInput): ScoreCard {
  // Hard rule: if Companies House says the entity has stopped trading,
  // skip the points calculation entirely and return the
  // "decline / 100% upfront" critical card.
  const statusOverride = criticalStatusOverride(input);
  if (statusOverride) return statusOverride;

  let score = 30; // medium baseline
  const reasons: ScoreCard["reasoning"] = [];

  const ppr0 = input.payment_practices[0];
  const ppr1 = input.payment_practices[1];
  const benchmark = sectorBenchmark(input.company.sic_codes);

  if (ppr0) {
    if (ppr0.pct_paid_late > 40) {
      score += 25;
      reasons.push({
        signal: `${Math.round(ppr0.pct_paid_late)}% of invoices paid late`,
        weight: 9,
        evidence: `Latest payment practices report shows average ${Math.round(ppr0.avg_days_to_pay)} days to pay against a sector benchmark of ${benchmark}.`,
      });
    } else if (ppr0.pct_paid_late > 20) {
      score += 10;
      reasons.push({
        signal: "Moderate late-payment pattern",
        weight: 6,
        evidence: `${Math.round(ppr0.pct_paid_late)}% paid late, average ${Math.round(ppr0.avg_days_to_pay)} days against a sector benchmark of ${benchmark}.`,
      });
    } else {
      reasons.push({
        signal: "Strong on-time payment record",
        weight: 8,
        evidence: `${Math.round(ppr0.pct_paid_within_30)}% paid within 30 days, average ${Math.round(ppr0.avg_days_to_pay)} days. Only ${Math.round(ppr0.pct_paid_late)}% paid outside agreed terms.`,
      });
      score -= 8;
    }

    if (ppr0.avg_days_to_pay > benchmark + 10) {
      score += 12;
      reasons.push({
        signal: "Sector benchmark exceeded",
        weight: 6,
        evidence: `Sector benchmark is ${benchmark} days; this company runs ${Math.round(ppr0.avg_days_to_pay)}.`,
      });
    } else if (ppr0.avg_days_to_pay <= benchmark - 5) {
      reasons.push({
        signal: "Faster than sector benchmark",
        weight: 5,
        evidence: `Pays in ${Math.round(ppr0.avg_days_to_pay)} days versus a ${benchmark}-day sector benchmark.`,
      });
    }

    if (ppr1) {
      const trend = ppr0.pct_paid_late - ppr1.pct_paid_late;
      const daysTrend = ppr0.avg_days_to_pay - ppr1.avg_days_to_pay;
      if (trend > 8) {
        score += 12;
        reasons.push({
          signal: "Payment practices worsening",
          weight: 7,
          evidence: `Late share rose from ${Math.round(ppr1.pct_paid_late)}% to ${Math.round(ppr0.pct_paid_late)}% between the two reporting periods.`,
        });
      } else if (trend < -6) {
        reasons.push({
          signal: "Payment practices improving",
          weight: 5,
          evidence: `Late share fell from ${Math.round(ppr1.pct_paid_late)}% to ${Math.round(ppr0.pct_paid_late)}% between the two reporting periods.`,
        });
        score -= 4;
      } else {
        reasons.push({
          signal: "Stable across periods",
          weight: 4,
          evidence: `Late share moved by ${trend >= 0 ? "+" : ""}${Math.round(trend)} pts and average days by ${daysTrend >= 0 ? "+" : ""}${Math.round(daysTrend)} between H1 and H2.`,
        });
      }
    } else {
      reasons.push({
        signal: "Single reporting period on file",
        weight: 3,
        evidence:
          "Only one PPR period available; no trend comparison yet. Watch the next filing.",
      });
    }

    // Distribution colour — useful as a third bullet for clean records too.
    if (ppr0.pct_paid_within_30 >= 60) {
      reasons.push({
        signal: "Most invoices clear inside 30 days",
        weight: 4,
        evidence: `${Math.round(ppr0.pct_paid_within_30)}% within 30 days, ${Math.round(ppr0.pct_paid_31_to_60)}% in 31-60, ${Math.round(ppr0.pct_paid_over_60)}% beyond 60.`,
      });
    } else if (ppr0.pct_paid_over_60 >= 30) {
      score += 6;
      reasons.push({
        signal: "Significant share paid beyond 60 days",
        weight: 5,
        evidence: `${Math.round(ppr0.pct_paid_over_60)}% paid later than 60 days. Cash conversion is sluggish.`,
      });
    }
  } else {
    reasons.push({
      signal: "No payment practices data on file",
      weight: 4,
      evidence:
        "Company is below the PPR reporting threshold. Risk inferred from governance and accounts only.",
    });
  }

  if (input.company.accounts.overdue) {
    score += 18;
    reasons.push({
      signal: "Annual accounts overdue at Companies House",
      weight: 8,
      evidence: `Accounts last made up to ${input.company.accounts.last_made_up_to ?? "an unknown date"}; next filing already overdue.`,
    });
  }

  if (input.network.cfo_changed_recently) {
    score += 8;
    reasons.push({
      signal: "Recent CFO / finance director change",
      weight: 5,
      evidence: "Finance leadership changed within the last ninety days.",
    });
  }
  if (input.network.director_churn_12m >= 3) {
    score += 6;
    reasons.push({
      signal: "Director churn",
      weight: 4,
      evidence: `${input.network.director_churn_12m} officer changes in the last twelve months.`,
    });
  }
  if (input.network.disqualified_in_network > 0) {
    score += 10;
    reasons.push({
      signal: "Disqualified officer in network",
      weight: 6,
      evidence: `${input.network.disqualified_in_network} disqualified director(s) within two hops of the target.`,
    });
  }
  if (input.network.insolvent_neighbours > 0) {
    score += 4 * Math.min(input.network.insolvent_neighbours, 3);
    reasons.push({
      signal: "Insolvent companies in director network",
      weight: 4,
      evidence: `${input.network.insolvent_neighbours} insolvency event(s) among connected companies.`,
    });
  }

  const outstandingCharges = input.charges.filter(
    (c) => c.status.toLowerCase() === "outstanding",
  ).length;
  if (outstandingCharges >= 2) {
    score += 6;
    reasons.push({
      signal: "Multiple outstanding charges",
      weight: 4,
      evidence: `${outstandingCharges} outstanding charges on the register, including recent filings.`,
    });
  }

  score = Math.max(0, Math.min(95, score));

  /* ---- Phoenix-pattern heuristic override (Risk Matrix v1.1) ----
   * The sixth signal class. Sits OUTSIDE the points system.
   * If detected, the rule tree forces an immediate Critical tier outcome
   * regardless of the points score, because no payment-practice history
   * can be trusted from a freshly-incorporated entity sharing officers
   * with a recently dissolved one.
   * Trigger threshold: phoenix_pattern_score >= 2 (full structural match
   * — recently-incorporated company sharing 2+ directors with an insolvent
   * mature company, overlapping SIC codes, registered office proximity). */
  const phoenixTriggered = input.network.phoenix_pattern_score >= 2;
  if (phoenixTriggered) {
    // Force Critical tier; bump score above the 75 threshold so any
    // downstream consumer reading just the score still gets the right tier.
    score = Math.max(score, 80);
    reasons.unshift({
      signal: "Phoenix pattern detected",
      weight: 10,
      evidence: `Recently-incorporated company sharing officers with a recently dissolved one. Per Risk Matrix v1.1, this forces a Critical-tier outcome regardless of the points score.`,
    });
  }

  const tier = phoenixTriggered ? "critical" : tierFor(score);

  const predictedDays = ppr0
    ? Math.round(ppr0.avg_days_to_pay * (1 + (score - 30) / 200))
    : Math.round(benchmark * (1 + (score - 30) / 150));

  const sliced = reasons
    .sort((a, b) => b.weight - a.weight)
    .slice(0, Math.min(6, Math.max(2, reasons.length)));

  const headline = phoenixTriggered
    ? `${input.company.name} matches a Phoenix-pattern fingerprint — decline the job.`
    : score >= 75
      ? `${input.company.name} shows multiple distress signals — treat as ${tier}.`
      : score >= 50
        ? `${input.company.name} pays slowly relative to its sector. Tighten terms before invoicing.`
        : score >= 30
          ? `${input.company.name} looks broadly healthy with minor friction.`
          : `${input.company.name} has a clean, predictable payment profile.`;

  return {
    score,
    tier,
    predicted_days_to_pay: Math.max(7, Math.min(180, predictedDays)),
    reasoning: sliced,
    headline,
    action: actionForTier(tier, phoenixTriggered),
  };
}
