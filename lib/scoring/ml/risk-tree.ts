/**
 * PayShield ML risk scorer — pure-TypeScript inference over a sklearn
 * DecisionTreeClassifier extracted into a flat node array.
 *
 * The model is a binary classifier: class 1 = "will pay late". The
 * probability of class 1 maps directly to PayShield's 0–100 risk score
 * via `round(prob × 100)`. Risk Matrix v1.1 then owns tier thresholds.
 *
 * Tree extraction: see `scripts/extract-tree.py`. The pickle ships
 * separately at the repo root; the runtime only reads the JSON.
 *
 * Inference cost: O(depth) = O(7) per call. ~0.05 ms per request.
 */

import type { ScoreInput } from "../schema";
import treeJson from "./risk-tree.json";

/* ---------- Tree typing ---------- */

type TreeNode = {
  id: number;
  is_leaf: boolean;
  feature: number;
  threshold: number;
  left: number;
  right: number;
  samples: number;
  class_probabilities: number[];
};

type RiskTree = {
  model_type: string;
  feature_names: string[];
  n_features: number;
  n_nodes: number;
  classes: number[];
  nodes: TreeNode[];
  training_metadata: {
    n_train_rows: number;
    train_accuracy: number;
    sklearn_version: string;
  };
};

const TREE = treeJson as RiskTree;

/* ---------- Feature extraction ---------- */

/**
 * Builds the 11-feature vector the model was trained on, in the exact
 * order it expects. Returns null when the input lacks PPR data — in
 * that case the caller should fall back to the rule-based heuristic
 * because four of the eleven features come from PPR filings.
 *
 * Feature order (must match `risk_tree_meta.json`):
 *   0  avg_days_to_pay_h2
 *   1  delta_days_to_pay_h1_to_h2
 *   2  pct_invoices_paid_late_h2
 *   3  pct_invoices_over_60_days_h2
 *   4  company_age_years
 *   5  accounts_overdue_flag         (0|1)
 *   6  confirmation_statement_overdue_flag  (0|1)
 *   7  num_charges_outstanding
 *   8  num_director_disqualifications_in_network
 *   9  num_psc_changes_last_12m
 *  10  num_director_changes_last_12m
 */
export function extractFeatures(input: ScoreInput): number[] | null {
  const ppr0 = input.payment_practices[0];
  if (!ppr0) return null;

  const ppr1 = input.payment_practices[1];
  const ageYears = yearsSince(input.company.incorporated_on);
  const outstandingCharges = input.charges.filter(
    (c) => c.status.toLowerCase() === "outstanding",
  ).length;

  return [
    ppr0.avg_days_to_pay,
    ppr1 ? ppr0.avg_days_to_pay - ppr1.avg_days_to_pay : 0,
    ppr0.pct_paid_late,
    ppr0.pct_paid_over_60,
    ageYears,
    input.company.accounts.overdue ? 1 : 0,
    input.network.confirmation_statement_overdue ? 1 : 0,
    outstandingCharges,
    input.network.disqualified_in_network,
    input.network.psc_changes_12m,
    input.network.director_churn_12m,
  ];
}

function yearsSince(iso: string): number {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return 0;
  // Stable demo: count whole years against a fixed reference so SSR &
  // ISR caches produce deterministic scores. 2026-04-26 = HackBelfast 2026.
  const REFERENCE_DATE = new Date("2026-04-26T00:00:00Z").getTime();
  return Math.max(0, (REFERENCE_DATE - t) / (365.25 * 24 * 3600 * 1000));
}

/* ---------- Tree traversal ---------- */

export type DecisionStep = {
  feature: string;
  featureIndex: number;
  threshold: number;
  observed: number;
  branch: "left" | "right";
  /** Reads as `pct_invoices_paid_late_h2 > 42.5  (observed: 71)` */
  human: string;
};

export type Prediction = {
  /** Probability of class 1 (= "will pay late"), in [0, 1]. */
  probability: number;
  /** PayShield score on 0–100 scale, rounded. */
  score: number;
  /** Decision path from root to leaf, ordered. */
  path: DecisionStep[];
  /** Final leaf node id (useful for caching/debug). */
  leafId: number;
};

/**
 * Walks the tree from the root and returns the predicted probability
 * of class 1, plus the full decision path so the UI can render the
 * exact sequence of rules that fired.
 *
 * Throws if the feature vector length doesn't match the model.
 */
export function predictRisk(features: number[]): Prediction {
  if (features.length !== TREE.n_features) {
    throw new Error(
      `feature length mismatch: got ${features.length}, model expects ${TREE.n_features}`,
    );
  }

  const path: DecisionStep[] = [];
  let nodeId = 0;
  // Hard ceiling guard against any malformed tree producing infinite loops.
  const MAX_STEPS = TREE.n_nodes + 2;
  for (let step = 0; step < MAX_STEPS; step++) {
    const node = TREE.nodes[nodeId];
    if (!node) {
      throw new Error(`tree corruption: node ${nodeId} missing`);
    }
    if (node.is_leaf) {
      // Class 1 probability is index of class `1` in the model's class array.
      const classIdx = TREE.classes.indexOf(1);
      const probability =
        classIdx >= 0
          ? node.class_probabilities[classIdx]
          : node.class_probabilities[node.class_probabilities.length - 1];
      return {
        probability,
        score: Math.round(probability * 100),
        path,
        leafId: nodeId,
      };
    }

    const observed = features[node.feature];
    const featureName = TREE.feature_names[node.feature];
    // sklearn convention: left when value <= threshold, right otherwise.
    const goesLeft = observed <= node.threshold;
    const op = goesLeft ? "≤" : ">";
    path.push({
      feature: featureName,
      featureIndex: node.feature,
      threshold: node.threshold,
      observed,
      branch: goesLeft ? "left" : "right",
      human: `${prettyFeatureName(featureName)} ${op} ${formatThreshold(featureName, node.threshold)}  (observed: ${formatThreshold(featureName, observed)})`,
    });
    nodeId = goesLeft ? node.left : node.right;
  }

  throw new Error("tree traversal exceeded max-steps guard");
}

/* ---------- Display helpers ---------- */

const FEATURE_LABELS: Record<string, string> = {
  avg_days_to_pay_h2: "Avg days to pay (H2)",
  delta_days_to_pay_h1_to_h2: "Days-to-pay change H1→H2",
  pct_invoices_paid_late_h2: "% invoices paid late (H2)",
  pct_invoices_over_60_days_h2: "% paid beyond 60 days (H2)",
  company_age_years: "Company age (years)",
  accounts_overdue_flag: "Accounts overdue",
  confirmation_statement_overdue_flag: "Confirmation statement overdue",
  num_charges_outstanding: "Outstanding charges",
  num_director_disqualifications_in_network:
    "Disqualified directors in network",
  num_psc_changes_last_12m: "PSC changes (last 12m)",
  num_director_changes_last_12m: "Director changes (last 12m)",
};

export function prettyFeatureName(raw: string): string {
  return FEATURE_LABELS[raw] ?? raw;
}

function formatThreshold(featureName: string, value: number): string {
  if (
    featureName === "accounts_overdue_flag" ||
    featureName === "confirmation_statement_overdue_flag"
  ) {
    return value >= 0.5 ? "yes" : "no";
  }
  if (featureName.startsWith("pct_")) return `${value.toFixed(1)}%`;
  if (featureName === "company_age_years") return `${value.toFixed(1)} yrs`;
  if (featureName.startsWith("avg_") || featureName.startsWith("delta_"))
    return `${value.toFixed(0)} days`;
  return `${value.toFixed(0)}`;
}

/* ---------- Public metadata, for diagnostics + audit chips ---------- */

export const ML_MODEL_INFO = {
  type: TREE.model_type,
  trainAccuracy: TREE.training_metadata.train_accuracy,
  trainRows: TREE.training_metadata.n_train_rows,
  sklearnVersion: TREE.training_metadata.sklearn_version,
  nFeatures: TREE.n_features,
  nNodes: TREE.n_nodes,
} as const;
