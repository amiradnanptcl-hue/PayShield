# Security policy

PayShield handles data about real UK and Northern Ireland businesses
sourced from public registers. Even though all data is public, we still
treat the application as a security-sensitive system because it makes
recommendations that can affect a small business's commercial decisions.

## Reporting a vulnerability

**Please do not open a public GitHub issue for security problems.**

Instead, email **security@payshield.io** with:

1. A description of the vulnerability
2. Steps to reproduce (or a proof-of-concept)
3. The impact you believe it has
4. Whether you'd like to be credited in the fix announcement

We aim to acknowledge security reports within **48 hours** and to ship
a patched build to the live demo within **7 days** of confirming the
issue.

## In scope

- Score calculation: any path where scores are produced that disagree
  with the published Risk Assessment Matrix v1.1
- Phoenix-pattern override: false positives or missed triggers
- Authentication / API surface (when `/api/*` routes are added)
- Solana Pay address spoofing or QR injection
- Stripe Payment Link integrity
- Cross-site scripting (XSS), SSRF, prototype pollution
- Dependency vulnerabilities (we monitor with `pnpm audit`)

## Out of scope

- Self-XSS that requires the victim to paste their own code into devtools
- Issues only reproducible on browsers that aren't current
- Brute-forcing the autocomplete API for company names (the data is
  public)

## Disclosure timeline

We follow [coordinated disclosure](https://en.wikipedia.org/wiki/Coordinated_vulnerability_disclosure):

1. You report &rarr; we acknowledge within 48h
2. We confirm + investigate
3. We patch + verify
4. Mutual disclosure (we coordinate timing with you, default 90 days)

Thank you for helping keep PayShield trustworthy.
