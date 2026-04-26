# PayShield — Decision Tree Integration Guide

This guide shows your team **exactly where to plug in their own decision
tree** without touching the UI.

The frontend is intentionally decoupled from the scoring logic. Every
score-card the UI renders flows through a single function that returns a
typed `ScoreCard`. Replace that function&rsquo;s body and the entire UI
&mdash; dial, action panel, reasoning list, chase preview &mdash; reflects
your tree automatically.

---

## TL;DR &mdash; the four files your team will touch

| File | What it controls | Touch when |
|---|---|---|
| **`lib/scoring/schema.ts`** | Tier thresholds, tier labels, tier colours, score-card output shape | Score &rarr; tier mapping changes; output schema changes |
| **`lib/scoring/fallback.ts`** | Rule-based scorer used offline (no API key) | You want a deterministic implementation of your tree |
| **`lib/scoring/agent.ts`** | LLM-based scorer (Claude tool-use mode) | You want to add prompt-based reasoning on top of your tree |
| **`lib/scoring/prompt.ts`** | System prompt that locks the LLM to the matrix | You want the LLM to obey *your* matrix, not v1.1 |

That&rsquo;s the entire integration surface. Nothing else needs to change.

---

## The contract &mdash; what your scorer must return

The UI consumes a `ScoreCard` validated against a Zod schema. As long as
your function returns this shape, the UI works:

```ts
// lib/scoring/schema.ts (already defined — your team imports this)

export type ScoreInput = {
  company: {
    name: string;
    number: string;
    sic_codes: string[];
    incorporated_on: string;
    status: 'active' | 'dissolved' | 'liquidation' | 'administration';
    accounts: { next_due: string | null; overdue: boolean; last_made_up_to: string | null };
  };
  payment_practices: PprPeriod[];   // last 2 PPR periods, or [] if not reportable
  officers:          Officer[];
  charges:           Charge[];
  network:           NetworkSignals;
};

export type ScoreCard = {
  score:                  number;       // 0–100
  tier:                   'low' | 'medium' | 'high' | 'critical';
  predicted_days_to_pay:  number;       // 1–365
  reasoning:              ReasoningSignal[];   // 2–6 entries, each with weight 1–10
  headline:               string;       // ≤ 140 chars, accountant-style
  action: {
    deposit_pct:        number;
    terms_days:         7 | 14 | 21 | 30 | 60;
    chase_from_day:     number;
    escalation_at_day:  number;
    rationale:          string;         // ≤ 280 chars
  };
};
```

**One function signature, one schema, zero coupling to the UI.**

---

## Integration paths &mdash; pick one (or both)

### Path A &mdash; "We have a deterministic decision tree"

Use this if your team built a rule-based scorer (lookup tables, Python
module, SQL query, formula sheet, etc.) and you want it in the UI without
involving an LLM.

**File to edit: [`lib/scoring/fallback.ts`](./lib/scoring/fallback.ts)**

The current file implements the v1.1 matrix as a reference. Replace its
body with a call to your tree:

```ts
// lib/scoring/fallback.ts
import { type ScoreCard, type ScoreInput, tierFor } from './schema';

export function fallbackScore(input: ScoreInput): ScoreCard {
  // 1. Call YOUR decision tree here.
  //    Could be a TypeScript port, a HTTP call to a Python service,
  //    or a query against a SQL view — any of these work.
  const yourTreeOutput = await runYourDecisionTree(input);

  // 2. Map your output to the ScoreCard shape.
  return {
    score: yourTreeOutput.points,
    tier: tierFor(yourTreeOutput.points),  // your thresholds in schema.ts
    predicted_days_to_pay: yourTreeOutput.predictedDays,
    reasoning: yourTreeOutput.signals.map((s) => ({
      signal:   s.title,
      weight:   s.severity,                // 1..10
      evidence: s.explanation,             // sentence-level evidence
    })),
    headline: yourTreeOutput.summary,
    action: {
      deposit_pct:       yourTreeOutput.deposit,
      terms_days:        yourTreeOutput.netDays,
      chase_from_day:    yourTreeOutput.chaseDay,
      escalation_at_day: yourTreeOutput.escalationDay,
      rationale:         yourTreeOutput.actionRationale,
    },
  };
}
```

If your tree returns different tier names (e.g. green/yellow/orange/red),
update the four enum members in `schema.ts` together &mdash; it&rsquo;s a
single search-and-replace because TypeScript&rsquo;s strict mode catches
every callsite.

---

### Path B &mdash; "We have a prompt or rule set we want an LLM to obey"

Use this if your team has a published methodology document and wants
Claude (or any tool-use LLM) to apply it consistently.

**Files to edit:**
- **[`lib/scoring/prompt.ts`](./lib/scoring/prompt.ts)** &mdash; replace the
  system prompt with your matrix specification
- **[`lib/scoring/agent.ts`](./lib/scoring/agent.ts)** &mdash; the agent
  scaffolding usually doesn&rsquo;t need changes; it already calls the
  `submit_score_card` tool with your prompt

The agent is already wired to:

1. Call Claude Sonnet with your system prompt + the input JSON
2. Force the model to call exactly one tool (`submit_score_card`)
3. Parse the tool call against the Zod schema
4. Return the validated `ScoreCard`

So writing a great prompt **is** the integration. The reference prompt at
the bottom of `prompt.ts` shows the structure that works:

- Input format
- Scoring weights (must sum to 100)
- Sector benchmarks
- Tier mapping (strict thresholds)
- Action decision tree (per-tier non-negotiables)
- Phoenix override (or whatever your override rules are)
- Reasoning discipline (what counts as evidence)
- Forbidden behaviours

Replace each section with your team&rsquo;s rules and the agent will
faithfully apply them on every score.

---

## How to change tier colours

If your team uses a different colour scheme (say, green / blue / orange /
red instead of green / blue / amber / red), edit one map and it
propagates everywhere &mdash; dial stroke, badge, dot, progress bar, all
five demo cards.

```ts
// lib/scoring/schema.ts
export const TIER_COLOURS: Record<ScoreCard['tier'], string> = {
  low:      'var(--good)',     // green  → your green CSS variable
  medium:   'var(--info)',     // blue   → your blue
  high:     'var(--warn)',     // amber  → your amber
  critical: 'var(--risk)',     // red    → your red
};
```

The CSS variables are defined in [`app/globals.css`](./app/globals.css):

```css
:root {
  --good: #1d9e75;   /* LOW    — adjust */
  --info: #378add;   /* MEDIUM — adjust */
  --warn: #f2a623;   /* HIGH   — adjust */
  --risk: #e8593c;   /* CRITICAL — adjust */
}
```

Change the hex values and every UI element automatically follows.

---

## How to change the action numbers

The matrix v1.1 is encoded in **two places** that must stay in sync:

1. **`lib/scoring/fallback.ts`** &mdash; the deterministic implementation
2. **`lib/scoring/prompt.ts`** &mdash; the LLM&rsquo;s ACTION DECISION TREE

If your team moves `MEDIUM` from `Net-21` to `Net-30`, you must update
both files. The fallback runs offline and CI; the prompt runs in
production with the LLM. Drift between them = inconsistent scores.

You can verify both are aligned by writing a one-shot test:

```ts
// lib/scoring/__test.ts (delete after running)
import { fallbackScore } from './fallback';
import type { ScoreInput } from './schema';

const result = fallbackScore({ /* your test input */ });
console.log(JSON.stringify(result.action, null, 2));
```

```bash
npx tsx lib/scoring/__test.ts
```

The output is what the UI will render. If it matches your matrix, you&rsquo;re good.

---

## What does NOT need to change

The team can ignore everything in these directories:

- **`app/`** &mdash; Next.js routing, page composition, layouts. Reads
  `ScoreCard` shapes only.
- **`components/`** &mdash; Score-card hero, action brief, chase preview,
  search box, Solana pay card, etc. Pure presentation, no business
  logic.
- **`lib/chase/schedule.ts`** &mdash; Email pack generator. Takes a
  `ScoreCard.action` and produces three ready-to-send emails. Can be
  customised but works out of the box.
- **`lib/data/`** &mdash; Companies House + PPR data resolution. Returns
  `ScoreInput` shapes; doesn&rsquo;t care how scoring works.
- **`lib/demo/companies.ts`** &mdash; Five hand-crafted demo companies for
  the live demo. Each has a `presetCard` that overrides the scorer for
  pitch consistency. Either keep them, replace them with your own
  examples, or delete the array entirely &mdash; the search box will
  fall back to PPR data.

---

## Smoke test

After integrating, run these three commands. All three should pass:

```bash
pnpm typecheck    # tsc --noEmit
pnpm lint         # ESLint
pnpm build        # Next production build
```

Then open `http://localhost:3000` (`pnpm dev`) and verify:

1. The home page loads.
2. Searching for any UK or NI company name shows suggestions with the
   correct tier-coloured dot.
3. Opening a score detail page renders the full hero + action panel +
   reasoning list with your scoring output.
4. The `Verify · Matrix` chip points to your matrix PDF in `/public/`.

If those four work, your decision tree is fully integrated.

---

## Questions?

The reference implementation in this repo (Risk Matrix v1.1) is
deliberately copy-pastable as a starting point. Read these files in
order to understand the contract before you customise:

1. [`lib/scoring/schema.ts`](./lib/scoring/schema.ts) &mdash; the data shapes
2. [`lib/scoring/fallback.ts`](./lib/scoring/fallback.ts) &mdash; deterministic reference
3. [`lib/scoring/prompt.ts`](./lib/scoring/prompt.ts) &mdash; LLM reference
4. [`components/score-card.tsx`](./components/score-card.tsx) &mdash; what the UI does with your output

That&rsquo;s the whole integration surface. The rest of the codebase is yours to enjoy.
