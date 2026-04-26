## Summary

<!-- One sentence on what this PR does. The why goes below. -->

## Why

<!-- The problem this solves. Reference an issue with `Closes #N` if there is one. -->

## What changed

<!-- Bullet list of the substantive changes — files, functions, behaviour. -->

-
-

## Risk Matrix impact

<!-- Tick the box that matches. -->

- [ ] **No matrix change** — UI, copy, tooling, or refactor only.
- [ ] **Matrix-aligned** — implements an existing rule from v1.1.
- [ ] **Matrix update** — proposes a new tier threshold, action, or signal.
      Linked PDF revision: <!-- link to the updated v1.x PDF if applicable -->

## Test plan

- [ ] `pnpm typecheck` — passes
- [ ] `pnpm lint` — clean
- [ ] `pnpm build` — production build succeeds
- [ ] Manually verified the affected route(s) at desktop and mobile widths
- [ ] Verified the four tier colours still read distinctly
- [ ] If scoring changed: ran `lib/scoring/__phoenix-test.ts` style spot-checks

## Screenshots / recordings

<!-- If the PR is visual, before/after screenshots help reviewers. -->
