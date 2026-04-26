/**
 * PayShield ML scorer — primary scoring path when PPR data is available.
 *
 * Flow (Risk Matrix v1.1):
 *   1.  Extract the 11-feature vector from `ScoreInput`.
 *   2.  If features are unavailable (no PPR filings), return null so
 *       the caller falls back to the rule-based heuristic.
 *   3.  Walk the trained DecisionTreeClassifier — `risk-tree.json` —
 *       to get the probability of "will pay late".
 *   4.  Score = round(probability × 100). Tier from v1.1 thresholds.
 *   5.  Phoenix-pattern override: if `phoenix_pattern_score >= 2`, force
 *       Critical tier and bump score above 75 (matrix v1.1 §HEURISTIC).
 *   6.  Build human-readable reasoning by walking the decision path —
 *       every split the tree made becomes a bulleted ReasoningSignal.
 *   7.  Action numbers come from `actionFor(tier)` in fallback.ts so all
 *       three scoring paths (LLM, ML, heuristic) hit the same matrix.
 */

import { actionForTier } from "./fallback";
import {
  type ScoreCard,
  type ScoreInput,
  type ReasoningSignal,
  tierFor,
} from "./schema";
import {
  ML_MODEL_INFO,
  type DecisionStep,
  extractFeatures,
  predictRisk,
  prettyFeatureName,
} from "./ml/risk-tree";

/* ---------- Public entry point ---------- */

/**
 * Score a company via the trained decision tree. Returns null when the
 * input is missing the PPR features the model needs — caller should
 * route those companies to `fallbackScore` instead.
 */
export function mlScore(input: ScoreInput): ScoreCard | null {
  const features = extractFeatures(input);
  if (!features) return null;

  const prediction = predictRisk(features);

  const phoenixTriggered = input.network.phoenix_pattern_score >= 2;
  // Matrix v1.1 mandates Critical tier when Phoenix flag fires, regardless
  // of points. We bump the score to 80 so any downstream consumer reading
  // raw score still derives the right tier.
  const score = phoenixTriggered ? Math.max(prediction.score, 80) : prediction.score;
  const tier = phoenixTriggered ? "critical" : tierFor(score);

  const reasoning = pathToReasoning(prediction.path, input, phoenixTriggered);
  const headline = buildHeadline(input, tier, prediction.probability, phoenixTriggered);

  // Predicted days-to-pay: anchor on the latest PPR period and nudge by
  // the model's risk signal. Same formula shape as the heuristic so the
  // UI's "predicted to pay X days" stays comparable across paths.
  const ppr0 = input.payment_practices[0];
  const baseDays = ppr0?.avg_days_to_pay ?? 30;
  const nudge = (score - 30) / 200; // ±0.35 swing across the score band
  const predictedDays = Math.max(7, Math.min(180, Math.round(baseDays * (1 + nudge))));

  return {
    score,
    tier,
    predicted_days_to_pay: predictedDays,
    reasoning,
    headline,
    action: actionForTier(tier, phoenixTriggered),
  };
}

/* ---------- Reasoning ---------- */

/**
 * Convert the decision path into 2–6 ReasoningSignal entries, ranked
 * by descending impact (root-most splits first). Adds the Phoenix
 * override as the top signal when triggered.
 */
function pathToReasoning(
  path: DecisionStep[],
  input: ScoreInput,
  phoenixTriggered: boolean,
): ReasoningSignal[] {
  const signals: ReasoningSignal[] = [];

  if (phoenixTriggered) {
    signals.push({
      signal: "Phoenix pattern detected",
      weight: 10,
      evidence:
        "Recently-incorporated company sharing officers with a recently dissolved one. Per Risk Matrix v1.1, this forces a Critical-tier outcome regardless of the model's points score.",
    });
  }

  // Each split contributes one reasoning entry. Earlier splits in the
  // path have higher discriminative power (they applied to the largest
  // population), so we weight them more heavily.
  path.forEach((step, idx) => {
    signals.push({
      signal: prettyFeatureName(step.feature),
      // Top-level splits are most informative; weight tapers by depth.
      // Anchor weights to the matrix's 5-class scale (1-3 / 4-6 / 7-10).
      weight: weightForDepth(idx, path.length),
      evidence: stepEvidence(step, input),
    });
  });

  // Schema requires 2-6 entries. If the path was very shallow (e.g.
  // single-split confident prediction), pad with a model-attribution
  // signal so the UI always renders meaningfully.
  if (signals.length < 2) {
    signals.push({
      signal: "PayShield ML risk model",
      weight: 5,
      evidence: `Decision-tree classifier trained on ${ML_MODEL_INFO.trainRows.toLocaleString("en-GB")} UK & NI companies (${(ML_MODEL_INFO.trainAccuracy * 100).toFixed(1)}% training accuracy).`,
    });
  }

  // Cap at 6 entries — Zod schema enforces this, but trim defensively.
  return signals.slice(0, 6);
}

/**
 * Higher weight for splits closer to the root, lower for leaf-adjacent
 * splits. Maps to the matrix's 1-3 / 4-6 / 7-10 weight bands so the
 * UI's WeightLegend reads correctly.
 */
function weightForDepth(idx: number, totalDepth: number): 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 {
  if (totalDepth <= 1) return 9;
  // Map index 0..(totalDepth-1) into 9 → 4 monotonically.
  const ratio = idx / Math.max(1, totalDepth - 1);
  const w = Math.round(9 - ratio * 5); // 9, 8, 7, 6, 5, 4
  return Math.max(4, Math.min(9, w)) as 4 | 5 | 6 | 7 | 8 | 9;
}

/**
 * Render a single decision step as plain-English evidence. We use the
 * actual observed feature value plus the threshold the tree split on.
 */
function stepEvidence(step: DecisionStep, input: ScoreInput): string {
  const observed = step.observed;
  const threshold = step.threshold;
  const op = step.branch === "left" ? "at or below" : "above";

  switch (step.feature) {
    case "avg_days_to_pay_h2":
      return `Average days to pay in the latest reporting period is ${Math.round(observed)} — ${op} the model's split threshold of ${Math.round(threshold)} days.`;
    case "delta_days_to_pay_h1_to_h2": {
      const direction = observed >= 0 ? "rose" : "fell";
      return `Days-to-pay ${direction} by ${Math.abs(observed).toFixed(0)} days between H1 and H2 — ${op} the model's threshold of ${threshold.toFixed(0)} days.`;
    }
    case "pct_invoices_paid_late_h2":
      return `${observed.toFixed(0)}% of invoices paid late in the latest period — ${op} the model's split threshold of ${threshold.toFixed(0)}%.`;
    case "pct_invoices_over_60_days_h2":
      return `${observed.toFixed(0)}% paid beyond 60 days — ${op} the model's threshold of ${threshold.toFixed(0)}%.`;
    case "company_age_years":
      return `Company is ${observed.toFixed(0)} years old — ${op} the model's age threshold of ${threshold.toFixed(0)} years.`;
    case "accounts_overdue_flag":
      return input.company.accounts.overdue
        ? "Annual accounts are overdue at Companies House — a strong negative signal in the model."
        : "Annual accounts are filed and current — a positive signal in the model.";
    case "confirmation_statement_overdue_flag":
      return input.network.confirmation_statement_overdue
        ? "Confirmation statement is overdue at Companies House — the model treats this as a strong filing-anomaly signal."
        : "Confirmation statement is filed on time — the model takes this as a positive signal.";
    case "num_charges_outstanding": {
      const n = Math.round(observed);
      return `${n} outstanding charge${n === 1 ? "" : "s"} on the register — ${op} the model's threshold of ${threshold.toFixed(0)}.`;
    }
    case "num_director_disqualifications_in_network": {
      const n = Math.round(observed);
      return `${n} disqualified director${n === 1 ? "" : "s"} found within two hops of the company — ${op} the model's threshold.`;
    }
    case "num_psc_changes_last_12m": {
      const n = Math.round(observed);
      return `${n} change${n === 1 ? "" : "s"} of Persons of Significant Control in the last 12 months — ${op} the model's threshold of ${threshold.toFixed(0)}.`;
    }
    case "num_director_changes_last_12m": {
      const n = Math.round(observed);
      return `${n} officer change${n === 1 ? "" : "s"} filed in the last 12 months — ${op} the model's threshold of ${threshold.toFixed(0)}.`;
    }
    default:
      return `${prettyFeatureName(step.feature)} = ${observed} (split at ${threshold}).`;
  }
}

/**
 * Build a 1-sentence headline that reads like an accountant said it.
 * Schema caps it at 140 chars.
 */
function buildHeadline(
  input: ScoreInput,
  tier: ScoreCard["tier"],
  probability: number,
  phoenixTriggered: boolean,
): string {
  const name = input.company.name;
  if (phoenixTriggered) {
    return `${name} matches a Phoenix-pattern fingerprint — decline the job.`;
  }
  const pct = Math.round(probability * 100);
  switch (tier) {
    case "critical":
      return `${name} reads as critical risk — ML model predicts ${pct}% probability of late payment on the next invoice.`;
    case "high":
      return `${name} pays slowly relative to its sector — ML model predicts ${pct}% chance of late payment.`;
    case "medium":
      return `${name} shows moderate friction — ML model predicts ${pct}% chance of late payment, tighten terms.`;
    default:
      return `${name} has a clean payment profile — ML model gives only ${pct}% chance of late payment.`;
  }
}
