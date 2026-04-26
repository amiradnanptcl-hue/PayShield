import {
  type ScoreCard,
  type ScoreInput,
  tierFor,
  type RecommendedAction,
} from "./schema";

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
 * Strict per-tier rules from the published decision tree.
 */
function actionFor(
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
    action: actionFor(tier, phoenixTriggered),
  };
}
