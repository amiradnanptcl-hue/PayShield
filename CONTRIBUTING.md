# Contributing to PayShield

Thanks for thinking about contributing. PayShield is a small, opinionated
codebase &mdash; the bar for changes is *"would an accountant agree this is
correct?"* more than *"does it compile?"*. The matrix is the contract.

---

## What kind of contribution?

| Type | What's it look like? | How to start |
|---|---|---|
| **Bug** | A score, action, or page disagrees with the published Risk Matrix v1.1 | Open an [issue](./.github/ISSUE_TEMPLATE/bug_report.yml) with the route and the matrix row that disagrees. |
| **Matrix update** | A new tier threshold, action number, or signal class | Open a *Feature request* issue first &mdash; matrix changes need a new PDF revision before code lands. |
| **New integration** | Slack alert, Xero export, push notification, etc. | Feature request with the user story. |
| **UI / copy polish** | Type, layout, mobile fix | Direct PR is fine if it's small. |
| **Docs** | README, CONTRIBUTING, screenshots | Direct PR. |

---

## Local setup

```bash
git clone https://github.com/<org>/payshield.git
cd payshield
pnpm install
pnpm dev          # http://localhost:3000
```

You don't need any environment variables to run the demo. The fallback
heuristic is matrix-equivalent and runs offline. If you want to exercise
the LLM scoring path, drop your key into `.env.local`:

```
ANTHROPIC_API_KEY=sk-ant-...
```

---

## Before opening a PR

```bash
pnpm typecheck    # tsc --noEmit, must pass
pnpm lint         # ESLint, must be clean (0 errors, 0 warnings)
pnpm build        # full production build, must succeed
```

CI runs these three commands on every push and pull request.
PRs that fail any of them won't be merged.

---

## Code style

- **TypeScript strict.** No `any` without an inline justification comment.
- **Zod is the boundary.** Anything entering the scoring pipeline gets
  validated; anything leaving it gets parsed before render.
- **Server Components by default.** Add `"use client"` only when you need
  state, effects, or browser APIs &mdash; and document why in a comment.
- **Tailwind v4, no inline styles** unless animating a value (transform,
  width %). Tokens live in `globals.css` and are exposed via `@theme`.
- **Keep the matrix in sync.** If you touch any of these:
  - `lib/scoring/schema.ts` &mdash; `tierFor`, `TIER_COPY`, `TIER_COLOURS`
  - `lib/scoring/fallback.ts` &mdash; `actionFor` numbers + Phoenix override
  - `lib/scoring/prompt.ts` &mdash; ACTION DECISION TREE
  - `lib/demo/companies.ts` &mdash; preset cards
  ...you must update **all four** atomically. Otherwise reviewers see
  drift and reject the PR.
- **Conventional commits.** Examples:
  - `feat: add Slack alert when watched score changes tier`
  - `fix(score-card): mobile dial overlapped 87 with the eyebrow`
  - `chore: bump @anthropic-ai/sdk to 0.92`

---

## Testing scoring changes

There's no formal test runner yet, but every scoring change should be
spot-checked against:

1. **The five demo anchors** (Tesco / BrightPlumb / Highgate / Meadow /
   Halford) &mdash; their preset cards already match the matrix; if your
   change moves a tier, re-anchor the relevant card.
2. **A Phoenix-pattern input** &mdash; `phoenix_pattern_score >= 2` must
   force tier=critical, score >= 80, action.deposit_pct=50, terms_days=7.
3. **An empty PPR input** &mdash; the fallback should not throw.

The fastest way to verify is the throw-away harness pattern:

```ts
// lib/scoring/__test.ts (delete after use)
import { fallbackScore } from "./fallback";
console.log(fallbackScore({ /* your test input */ }));
```

Run with `npx tsx lib/scoring/__test.ts`.

---

## Reporting security issues

Please **do not** open a public issue for security problems.
Email `security@payshield.io` (or DM the maintainer privately).
See [SECURITY.md](./SECURITY.md).

---

## License

By contributing, you agree your contributions are licensed under the MIT
License (see [LICENSE](./LICENSE)).
