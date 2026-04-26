/**
 * Export a single, self-contained JSON catalog of every company PayShield
 * knows about (5 hand-crafted demo anchors + ~7,000 real UK PPR filers).
 *
 * Output:
 *   HACKBELFAST/payshield-companies.json
 *
 * Each record carries the data, the derived sector and risk tier, and the
 * permalink slug. Suitable for sharing with collaborators or pasting into
 * a spreadsheet.
 */
import fs from "node:fs";
import path from "node:path";

import { DEMO_COMPANIES } from "../lib/demo/companies";
import {
  PPR_COMPANIES,
  formatCompanyName,
  inferSectorFromName,
} from "../lib/data/ppr";
import { tierFor, type ScoreCard } from "../lib/scoring/schema";

type ExportRow = {
  number: string;
  name: string;
  slug: string;
  sector: string;
  source: "demo" | "ppr";
  score: number;
  tier: ScoreCard["tier"];
  predicted_days_to_pay?: number;
  latest_filing?: string;
  payment_practices: Array<{
    period_start: string;
    period_end: string;
    avg_days_to_pay: number;
    pct_paid_within_30: number;
    pct_paid_31_to_60: number;
    pct_paid_over_60: number;
    pct_paid_late: number;
  }>;
  url: string;
};

function quickPprTier(p: (typeof PPR_COMPANIES)[number]): {
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

const BASE_URL = "https://payshield.io";

function main() {
  const t0 = Date.now();

  const demos: ExportRow[] = DEMO_COMPANIES.map((c) => ({
    number: c.number,
    name: c.name,
    slug: c.slug,
    sector: c.sector,
    source: "demo",
    score: c.card.score,
    tier: c.card.tier,
    predicted_days_to_pay: c.card.predicted_days_to_pay,
    payment_practices: c.input.payment_practices,
    url: `${BASE_URL}/score/${c.slug}`,
  }));

  const pprs: ExportRow[] = PPR_COMPANIES.map((p) => {
    const { tier, score } = quickPprTier(p);
    return {
      number: p.number,
      name: formatCompanyName(p.name),
      slug: p.slug,
      sector: inferSectorFromName(p.name),
      source: "ppr",
      score,
      tier,
      latest_filing: p.latest_filing,
      payment_practices: p.payment_practices.map((q) => ({
        period_start: q.period_start,
        period_end: q.period_end,
        avg_days_to_pay: q.avg_days_to_pay,
        pct_paid_within_30: q.pct_paid_within_30,
        pct_paid_31_to_60: q.pct_paid_31_to_60,
        pct_paid_over_60: q.pct_paid_over_60,
        pct_paid_late: q.pct_paid_late,
      })),
      url: `${BASE_URL}/score/${p.slug}`,
    };
  });

  const all: ExportRow[] = [...demos, ...pprs];

  // Tier distribution for the metadata header.
  const dist: Record<ScoreCard["tier"], number> = {
    low: 0,
    medium: 0,
    high: 0,
    critical: 0,
  };
  for (const r of all) dist[r.tier]++;

  const payload = {
    metadata: {
      product: "PayShield",
      generated_at: new Date().toISOString(),
      source:
        "UK Payment Practices Reporting register (check-payment-practices.service.gov.uk) + 5 hand-crafted demo anchors",
      total_companies: all.length,
      total_demo_anchors: demos.length,
      total_ppr_companies: pprs.length,
      tier_distribution: dist,
      schema:
        "Each company has number, name, slug, sector, source, score (0-100), tier (low|medium|high|critical), payment_practices[] (last 2 PPR periods), and a deep-link URL.",
      tier_thresholds: {
        low: "0-29",
        medium: "30-49",
        high: "50-74",
        critical: "75-100",
      },
    },
    companies: all,
  };

  // Sort: demo anchors first, then PPR by score desc (most interesting first)
  payload.companies.sort((a, b) => {
    if (a.source !== b.source) return a.source === "demo" ? -1 : 1;
    return b.score - a.score;
  });

  const outPath = path.resolve(
    process.cwd(),
    "..",
    "payshield-companies.json",
  );
  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2));
  const sizeMb = (fs.statSync(outPath).size / 1e6).toFixed(2);

  console.log(
    `Wrote ${all.length.toLocaleString()} companies (${sizeMb} MB) to ${outPath} in ${Date.now() - t0}ms.`,
  );
  console.log(
    `  • ${demos.length} demo anchors (rich hand-crafted data)`,
  );
  console.log(
    `  • ${pprs.length.toLocaleString()} real UK companies from the PPR register`,
  );
  console.log(
    `  Tiers — low ${dist.low.toLocaleString()}, medium ${dist.medium.toLocaleString()}, high ${dist.high.toLocaleString()}, critical ${dist.critical.toLocaleString()}`,
  );
}

main();
