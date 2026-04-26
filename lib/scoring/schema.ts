import { z } from "zod";

/* ---------- Input schema (what we feed the agent) ---------- */

/** Companies House status values that PayShield understands. The four
 *  trading-impaired states (everything except "active") trigger a hard
 *  Critical-tier override regardless of any other signal — see
 *  `criticalStatusOverride()` in fallback.ts. */
export const CompanyStatus = z.enum([
  "active",
  "dissolved",
  "liquidation",
  "administration",
  "receivership",
  "voluntary-arrangement",
  "insolvency-proceedings",
  "removed",
]);
export type CompanyStatus = z.infer<typeof CompanyStatus>;

export const CompanyProfile = z.object({
  name: z.string(),
  number: z.string(),
  sic_codes: z.array(z.string()),
  incorporated_on: z.string(),
  status: CompanyStatus,
  accounts: z.object({
    next_due: z.string().nullable(),
    overdue: z.boolean(),
    last_made_up_to: z.string().nullable(),
  }),
});

export const PprPeriod = z.object({
  period_start: z.string(),
  period_end: z.string(),
  avg_days_to_pay: z.number(),
  pct_paid_within_30: z.number(),
  pct_paid_31_to_60: z.number(),
  pct_paid_over_60: z.number(),
  pct_paid_late: z.number(),
});

export const Officer = z.object({
  name: z.string(),
  role: z.string(),
  appointed_on: z.string(),
  resigned_on: z.string().nullable(),
});

export const Charge = z.object({
  classification: z.string(),
  status: z.string(),
  delivered_on: z.string(),
});

export const NetworkSignals = z.object({
  director_churn_12m: z.number(),
  cfo_changed_recently: z.boolean(),
  disqualified_in_network: z.number(),
  insolvent_neighbours: z.number(),
  phoenix_pattern_score: z.number().min(0).max(3),
  /** PSC = Persons of Significant Control. Filed at Companies House
   *  whenever the controlling shareholder/officer changes. Used by the
   *  v1.1 ML model as a churn signal independent of director changes. */
  psc_changes_12m: z.number().int().min(0).default(0),
  /** Confirmation Statement is the annual filing that confirms a
   *  company's officers, shareholders, registered office and SIC codes.
   *  An overdue confirmation statement is a strong filing-anomaly signal. */
  confirmation_statement_overdue: z.boolean().default(false),
});

export const ScoreInput = z.object({
  company: CompanyProfile,
  payment_practices: z.array(PprPeriod),
  officers: z.array(Officer),
  charges: z.array(Charge),
  network: NetworkSignals,
});
export type ScoreInput = z.infer<typeof ScoreInput>;

/* ---------- Output schema (what the agent returns) ---------- */

export const ReasoningSignal = z.object({
  signal: z.string(),
  weight: z.number().int().min(1).max(10),
  evidence: z.string(),
});
export type ReasoningSignal = z.infer<typeof ReasoningSignal>;

export const RecommendedAction = z.object({
  deposit_pct: z.number().int().min(0).max(100),
  terms_days: z.union([
    z.literal(7),
    z.literal(14),
    z.literal(21),
    z.literal(30),
    z.literal(60),
  ]),
  chase_from_day: z.number().int().min(1),
  escalation_at_day: z.number().int().min(1),
  rationale: z.string().max(280),
});
export type RecommendedAction = z.infer<typeof RecommendedAction>;

export const ScoreCard = z.object({
  score: z.number().int().min(0).max(100),
  tier: z.enum(["low", "medium", "high", "critical"]),
  predicted_days_to_pay: z.number().int().min(1).max(365),
  reasoning: z.array(ReasoningSignal).min(2).max(6),
  headline: z.string().max(140),
  action: RecommendedAction,
});
export type ScoreCard = z.infer<typeof ScoreCard>;

/* ---------- Helpers ---------- */

export function tierFor(
  score: number,
): "low" | "medium" | "high" | "critical" {
  if (score < 30) return "low";
  if (score < 50) return "medium";
  if (score < 75) return "high";
  return "critical";
}

export const TIER_COPY: Record<
  ScoreCard["tier"],
  { label: string; tone: string }
> = {
  low: { label: "Low risk", tone: "Pay on standard terms." },
  medium: { label: "Medium risk", tone: "Tighten terms, light chase." },
  high: { label: "High risk", tone: "Take a deposit, chase early." },
  critical: { label: "Critical risk", tone: "Deposit upfront, short terms." },
};

/**
 * Tier → CSS variable map.
 * Aligned to PayShield Risk Assessment Matrix v1.1:
 *   LOW = green · MEDIUM = blue · HIGH = amber · CRITICAL = red.
 * Each tier has its own colour so the four bands of the decision tree
 * are visually distinct everywhere — score dial, badges, dots, bars.
 */
export const TIER_COLOURS: Record<ScoreCard["tier"], string> = {
  low: "var(--good)",
  medium: "var(--info)",
  high: "var(--warn)",
  critical: "var(--risk)",
};
