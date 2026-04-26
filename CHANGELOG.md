# Changelog

All notable changes to PayShield are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com),
and this project follows [Semantic Versioning](https://semver.org).

## [1.1.0] &mdash; 2026-04-26

### Added
- **Phoenix-pattern heuristic** (sixth signal class). When a recently-
  incorporated company shares two or more directors with a recently
  insolvent mature company &mdash; with overlapping SIC codes and registered
  office proximity &mdash; the rule tree forces an immediate **Critical**
  tier outcome regardless of the points score.
- **Risk Matrix v1.1 PDF** at `public/payshield-risk-matrix-v1.pdf`,
  surfaced from a `Verify · Matrix v1.1` chip in the UI on every score
  page and the home methodology callout.
- **Solana Pay devnet checkout** alongside Stripe — 1 USDC payment with
  QR + deep-link, "Powered by Solana Pay" branding band, official logo.
- **Weight-meter legend** at the top of every reasoning section
  explaining the 1&ndash;3 / 4&ndash;6 / 7&ndash;10 zones.
- **Smart status pills** on company headers — Active / Dormant / Dissolved
  / Overdue with logic-driven tone and qualifier ("10 yrs · mature",
  "5 mo late").
- **Companies House + UK PPR register attribution** in the search eyebrow
  ("7,162 buyers"), giving auditors instant source confidence.
- **Mobile responsive overhaul** — header CTA, search placeholder, Solana
  hero band, ActionBrief tile grid, score-card metadata, all chips
  individually fixed for iPhone-class widths.

### Changed
- **CRITICAL action wording** &mdash; "or decline" now reads "or decline the
  job" (matrix v1.1 polish).
- **Tier colours redesigned** to four distinct hues (LOW=green,
  MEDIUM=blue, HIGH=amber, CRITICAL=red) matching the v1.1 PDF.
  Previously HIGH and CRITICAL collapsed into the same orange.
- **Score dial** simplified — removed redundant `RISK` eyebrow that was
  overlapping the 60px score number; vertically centred the digits.
- **"Founding offer" header CTA** now smooth-scrolls to `#pitch` rather
  than opening Stripe directly.

### Fixed
- TypeScript strict typecheck: 0 errors.
- ESLint: 0 errors, 0 warnings.
- Production build: 0 warnings.
- Removed `Date.now()` call during render that violated React purity.
- Added `images.qualities: [75, 95]` to `next.config.ts` for Next 16
  compatibility.
- Removed dead `Logo` SVG component (~75 lines).
- Fixed unescaped apostrophe in JSX hero copy.
- Search input now declares `role="combobox"` for valid `aria-expanded`.

## [1.0.0] &mdash; 2026-04-25

### Added
- Initial Risk Assessment Matrix v1.0 with four tiers
  (LOW / MEDIUM / HIGH / CRITICAL).
- Anthropic-powered scoring agent using Claude tool-use mode.
- Deterministic fallback heuristic producing matrix-equivalent output
  when no `ANTHROPIC_API_KEY` is set.
- Five hand-crafted demo companies covering every tier.
- 7,162 real PPR-reported UK & NI buyers ingested at build time.
- Companies House dossier rendering with status, charges, officers,
  accounts.
- Score-card hero with dial, progress bar, headline, reasoning list,
  recommended action panel.
- Chase email pack preview with firmer-reminder, escalation, and
  pre-collections templates.
- Stripe Payment Link integration for the founding-customer offer.
- Brutalist editorial design system &mdash; Fraunces serif + Geist sans
  + Geist Mono, custom CSS keyframe animations.
- Initial deployment to Vercel at `payshield-lake.vercel.app`.
