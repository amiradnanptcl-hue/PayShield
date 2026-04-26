import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, FileText, Lock } from "lucide-react";
import { SearchBox } from "@/components/search-box";
import { SolanaPayCard } from "@/components/solana-pay-card";
import { DEMO_COMPANIES } from "@/lib/demo/companies";

/** Live Stripe Payment Link — £1 first month, then £19/month for 12 months. */
const STRIPE_URL = "https://buy.stripe.com/cNi14n87u4Xsc4m0X4ejK00";

/* ---- Solana devnet payment (alternate rail for the founding offer) ----
 * Recipient is the founder's Phantom wallet on Solana Devnet.
 * USDC mint is Circle's official Devnet test token mint. */
const SOLANA_WALLET = "3gqxGMJRuHMpracn67RZ84okoVZP7CePFK8EuTeaUCiU";
const SOLANA_USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/* Risk Assessment Matrix v1.0 — tier-to-colour map.
   Mirrors lib/scoring/schema.ts TIER_COLOURS so the home page,
   score detail page, and dossiers all show the same four-band scheme:
   LOW = green · MEDIUM = blue · HIGH = amber · CRITICAL = red. */
const TIER_DOT: Record<string, string> = {
  low: "bg-good",
  medium: "bg-info",
  high: "bg-warn",
  critical: "bg-risk",
};

const TIER_LABEL_TEXT: Record<string, string> = {
  low: "text-good",
  medium: "text-info",
  high: "text-warn",
  critical: "text-risk",
};

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ notfound?: string; empty?: string }>;
}) {
  const sp = await searchParams;
  const notFound = sp.notfound;

  return (
    <>
      <SiteHeader />

      <main className="atmo relative flex flex-1 flex-col">
        <section className="mx-auto flex w-full max-w-6xl flex-col gap-12 px-5 pb-16 pt-14 md:gap-16 md:px-8 md:pb-20 md:pt-24">
          <div className="grid gap-10 md:grid-cols-[1fr_auto] md:items-end">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 border-2 border-line bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.18em]">
                <span className="size-1.5 rounded-full bg-risk anim-pulse-dot" />
                Built for HackBelfast 2026
              </div>
              <h1 className="font-display text-[clamp(44px,7.4vw,100px)] font-extrabold leading-[1.02] tracking-tight">
                <span className="block">Predict Who Pays Late,</span>
                <span className="mt-2 block italic font-medium text-risk">
                  Before You Invoice.
                </span>
              </h1>
              <p className="mt-7 max-w-2xl text-lg leading-relaxed text-ink-2 md:text-xl">
                The next customer who&rsquo;ll{" "}
                <span className="font-semibold text-ink">
                  ghost your invoice
                </span>{" "}
                is already on{" "}
                <em className="not-italic font-semibold text-ink">
                  Companies House
                </em>
                . <span className="font-semibold text-ink">PayShield</span>{" "}
                reads the public record across the{" "}
                <span className="font-semibold text-ink">
                  UK and Northern Ireland
                </span>{" "}
                faster than you can.{" "}
                <span className="font-semibold text-ink">Few seconds</span>,
                and you know whether to take the job, charge a deposit, or{" "}
                <span className="font-semibold text-ink">walk away</span>.
              </p>
              <p className="mt-4 max-w-2xl text-base leading-relaxed text-ink-2 md:text-lg">
                Plugs into{" "}
                <span className="font-semibold text-ink">Xero</span>,{" "}
                <span className="font-semibold text-ink">QuickBooks</span> and
                other accounting models with a{" "}
                <span className="font-semibold text-ink">single API</span>.
              </p>
            </div>

            <ManifestoStat />
          </div>

          <div className="space-y-5">
            <h2 className="inline-flex items-center gap-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-ink">
              <span
                className="inline-block h-[3px] w-7 bg-risk"
                aria-hidden
              />
              Check a customer
              <span className="font-medium text-ink-3">
                · Companies House + UK PPR register
              </span>
            </h2>
            <SearchBox />
            {notFound && (
              <p className="font-mono text-sm text-ink-2">
                No match for{" "}
                <span className="font-semibold text-ink">“{notFound}”</span>.
                Try a UK or Northern Ireland company by name or Companies House number.
              </p>
            )}
            <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink-3">
              Try:{" "}
              {DEMO_COMPANIES.map((c, i) => (
                <span key={c.slug}>
                  <Link
                    href={`/score/${c.slug}`}
                    className="text-ink underline decoration-ink decoration-[2px] underline-offset-[5px] hover:decoration-risk hover:text-risk"
                  >
                    {c.name}
                  </Link>
                  {i < DEMO_COMPANIES.length - 1 ? "  ·  " : ""}
                </span>
              ))}
            </p>
          </div>
        </section>

        <section className="border-y-2 border-line bg-paper">
          <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x-2 divide-y-2 divide-line sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
            {DEMO_COMPANIES.map((c) => (
              <Link
                key={c.slug}
                href={`/score/${c.slug}`}
                className="group relative flex flex-col gap-2.5 px-5 py-6 transition hover:bg-wash"
              >
                {/* Live tier classifier — pulsing ring + bigger dot + bold tier text */}
                <div className="flex items-center justify-between">
                  <span
                    className={`font-mono text-[12px] font-bold uppercase tracking-[0.16em] ${TIER_LABEL_TEXT[c.card.tier]}`}
                  >
                    {c.card.tier}
                  </span>
                  <span
                    className="relative flex size-4 items-center justify-center"
                    aria-hidden
                  >
                    <span
                      className={`absolute inline-flex size-full animate-ping rounded-full opacity-50 ${TIER_DOT[c.card.tier]}`}
                    />
                    <span
                      className={`relative inline-flex size-3 rounded-full ring-2 ring-paper ${TIER_DOT[c.card.tier]} transition-transform group-hover:scale-125`}
                    />
                  </span>
                </div>

                {/* Score */}
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold leading-none tabular-nums">
                    {c.card.score}
                  </span>
                  <span className="font-mono text-xs text-ink-3">/100</span>
                </div>

                {/* Mini risk meter — fills to the score % in tier colour */}
                <div
                  className="h-[3px] w-full overflow-hidden bg-ink/8"
                  aria-hidden
                >
                  <div
                    className={`h-full ${TIER_DOT[c.card.tier]} transition-[width,opacity] duration-500 ease-out group-hover:opacity-90`}
                    style={{ width: `${c.card.score}%` }}
                  />
                </div>

                <div className="text-base font-medium leading-tight">
                  {c.name}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
                  {c.sector}
                </div>
                <ArrowUpRight
                  className="absolute right-3 top-3 size-4 -translate-y-1 translate-x-1 text-ink-3 opacity-0 transition group-hover:opacity-100"
                  aria-hidden
                />
              </Link>
            ))}
          </div>
        </section>

        <HowItWorks />

        <SignalGrid />

        <Pitch />
      </main>

      <SiteFooter />
    </>
  );
}

function SiteHeader() {
  return (
    <header className="relative z-20 border-b-2 border-line bg-wash">
      <div className="mx-auto flex h-[84px] max-w-6xl items-center justify-between gap-3 px-4 sm:h-[96px] sm:gap-6 sm:px-5 md:px-8">
        {/* Brand block.
            The PNG has a baked-in tagline that's too small at any header
            height. We clip it out via an overflow-hidden container 80% of
            the image height, then re-render the tagline as proper HTML
            text below at a properly readable size. */}
        <Link
          href="/"
          className="group flex shrink-0 items-center gap-3"
          aria-label="PayShield — Late-payment intelligence"
        >
          {/* Icon only — the ram-in-shield from the source PNG. The image
              is rendered at its natural width inside an overflow-clipped
              container so only the left portion (the iconic mark) shows. */}
          <div
            className="relative shrink-0 overflow-hidden h-[48px] w-[52px] sm:h-[68px] sm:w-[72px] lg:h-[74px] lg:w-[78px]"
            aria-hidden
          >
            <Image
              src="/payshield-logo.png"
              alt=""
              width={1388}
              height={470}
              priority
              quality={95}
              className="absolute left-0 top-0 h-full max-w-none w-auto"
            />
          </div>

          {/* Wordmark + tagline rendered as live text so font-weight,
              letter-spacing and colour are fully controllable. */}
          <div className="flex min-w-0 flex-col items-start leading-none">
            <span className="font-display text-[24px] font-extrabold leading-none tracking-tight sm:text-[34px] lg:text-[38px]">
              <span className="text-ink">Pay</span>
              <span className="text-risk">Shield</span>
            </span>
            <span className="mt-1 font-mono text-[8.5px] font-extrabold uppercase tracking-[0.18em] text-ink sm:mt-1.5 sm:text-[11px] sm:tracking-[0.2em]">
              Late-payment intelligence
            </span>
          </div>
        </Link>

        {/* Primary nav */}
        <nav
          aria-label="Primary"
          className="hidden flex-1 items-center justify-center gap-9 lg:flex"
        >
          <NavLink href="#how">How it works</NavLink>
          <NavLink href="#signals">Signals</NavLink>
          <NavLink href="#pitch">Pricing</NavLink>
        </nav>

        {/* Right cluster */}
        <div className="flex shrink-0 items-center gap-3 md:gap-5">
          <span className="hidden items-center gap-2 border-2 border-line bg-paper px-3 py-1.5 font-mono text-[11px] uppercase tracking-[0.14em] text-ink lg:inline-flex">
            <span
              className="anim-pulse-dot size-2 rounded-full bg-good"
              aria-hidden
            />
            Live demo
          </span>
          <a
            href="#pitch"
            className="group inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap border-2 border-line bg-ink px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-wash shadow-[3px_3px_0_var(--ink)] transition hover:bg-ink-2 hover:shadow-[4px_4px_0_var(--risk)] sm:gap-2 sm:px-4 sm:py-2 sm:text-sm sm:font-medium sm:tracking-normal sm:normal-case"
            aria-label="Jump to founding-customer pricing"
          >
            <span className="sm:hidden">Offer</span>
            <span className="hidden sm:inline">Founding offer</span>
            <ArrowRight
              className="size-3.5 transition-transform group-hover:translate-x-0.5 sm:size-4"
              aria-hidden
            />
          </a>
        </div>
      </div>
    </header>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className="group relative py-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-ink-2 transition-colors hover:text-ink"
    >
      {children}
      <span
        className="absolute -bottom-0.5 left-0 h-[2px] w-0 bg-risk transition-all duration-200 group-hover:w-full"
        aria-hidden
      />
    </a>
  );
}

function ManifestoStat() {
  return (
    <div className="brut-card relative w-full max-w-sm overflow-hidden bg-paper md:w-[360px]">
      {/* Pane 1 — UK scale */}
      <section className="p-6">
        <div className="flex items-center gap-2 font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink">
          <span
            className="anim-pulse-dot size-1.5 rounded-full bg-risk"
            aria-hidden
          />
          What Britain is owed
        </div>
        <div className="mt-3 font-display text-[60px] font-extrabold leading-[0.9] tracking-tight">
          £70.4<span className="text-risk">bn</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-2">
          Stuck in unpaid invoices to UK SMEs. The average pile is{" "}
          <span className="font-semibold text-ink">£66,770</span> per business.{" "}
          <span className="font-semibold text-ink">38 close every day</span>{" "}
          from late payment.
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3/70">
          HoC Business &amp; Trade Committee · Feb 2026
        </p>
      </section>

      {/* Pane 2 — Northern Ireland local insight */}
      <section className="border-t-2 border-line bg-ink p-6 text-wash">
        <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-wash/70">
          <span
            className="anim-pulse-dot size-1.5 rounded-full bg-risk"
            aria-hidden
          />
          Northern Ireland · worst in UK
        </div>
        <div className="mt-3 font-display text-[64px] font-extrabold leading-[0.9] tracking-tight">
          72.8<span className="text-risk">%</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-wash/85">
          Of NI SME invoices paid late.{" "}
          <span className="font-semibold text-wash">Belfast</span> ranks in the
          top five worst UK cities. England 62.8% · Wales / Scotland 61.3%.
        </p>
        <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-wash/55">
          FreeAgent UK · Sep 2024 – Aug 2025
        </p>
      </section>
    </div>
  );
}

function HowItWorks() {
  const steps: { title: string; body: string[]; tag: string }[] = [
    {
      title: "Three parallel data pulls",
      body: [
        "You type a UK or Northern Ireland customer's name. We immediately open three public-data sources the rest of the market does not connect: the company's full Companies House record, the government's Payment Practices Reporting register where any sizeable UK or Northern Ireland buyer must declare how late they pay their suppliers, and a two-hop walk through their director network for shared officers, recent CFO exits, and disqualifications.",
        "Most credit tools check one source and call it a score. We read three, in parallel, in under three seconds. That is the foundation everything else in PayShield is built on.",
      ],
      tag: "01",
    },
    {
      title: "We score the risk",
      body: [
        "We feed the company's data through a smart rulebook we built from years of UK & Northern Ireland payment patterns. The same warning signs always lead to the same answer. A small construction firm whose payments are slipping and whose finance director just left will always come up as high risk. No guesswork.",
        "Then AI writes the explanation in plain English so you can read it in ten seconds and act on it.",
      ],
      tag: "02",
    },
    {
      title: "Score, reasoning, action",
      body: [
        "You get a 0–100 risk score with a clear traffic-light tier, the three or four reasons that drove it (cited from the data, not invented), and the exact deposit and Net-N terms to invoice on. A high-risk customer might trigger a 40% deposit on Net-14 with a chase from day seven. A clean customer might land at no deposit and Net-30. The decision is made for you.",
        "Then it streams to your screen as it forms, so you read the score before the reasoning, and the reasoning before the action. By the time the action lands, you have already decided what to do.",
      ],
      tag: "03",
    },
  ];

  return (
    <section id="how" className="border-b-2 border-line bg-wash py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mb-12 grid gap-6 md:grid-cols-[auto_1fr] md:items-end md:gap-12">
          <h2 className="font-display text-5xl font-bold leading-[0.95] tracking-tight md:text-6xl">
            How it works.
          </h2>
          <p className="max-w-xl text-ink-2 md:text-lg">
            A typed pipeline from public UK &amp; Northern Ireland data to a
            one-page brief. Sub-eight seconds end to end on the demo path.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {steps.map((s) => (
            <article
              key={s.tag}
              className="brut-card flex h-full flex-col gap-5 bg-paper p-7"
            >
              <div className="flex items-end justify-between gap-2">
                <div className="flex items-baseline gap-3">
                  <span className="font-display text-[56px] font-extrabold leading-[0.85] tabular-nums text-ink">
                    {s.tag}
                  </span>
                  <span className="pb-2 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-ink">
                    Step
                  </span>
                </div>
                <span className="font-display text-5xl font-extrabold leading-none tabular-nums text-risk">
                  /
                </span>
              </div>
              <h3 className="font-display text-[26px] font-bold leading-[1.1] tracking-tight">
                {s.title}
              </h3>
              <div className="flex flex-col gap-3 text-[15px] leading-relaxed text-ink-2">
                {s.body.map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function SignalGrid() {
  const signals = [
    {
      label: "Payment practices",
      detail: "H1 vs H2 trend, late share, average days",
      weight: "up to 35 pts",
    },
    {
      label: "Sector benchmark",
      detail: "Construction 67d · Retail 45d · Pro services 42d",
      weight: "up to 25 pts",
    },
    {
      label: "Director churn",
      detail: "Officer changes and CFO swaps in last 12m",
      weight: "up to 15 pts",
    },
    {
      label: "Filing anomalies",
      detail: "Overdue accounts, dissolved-active flag",
      weight: "up to 15 pts",
    },
    {
      label: "Network proximity",
      detail: "Disqualifications, charges, insolvency",
      weight: "up to 10 pts",
    },
    {
      label: "Phoenix patterns",
      detail: "Recently incorporated co. sharing directors with mature ones",
      weight: "heuristic flag",
    },
  ];

  return (
    <section id="signals" className="bg-wash-2 py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-5 md:px-8">
        <div className="mb-12 grid gap-6 md:grid-cols-[1fr_auto] md:items-end md:gap-12">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-ink">
              <span
                className="inline-block h-[3px] w-7 bg-risk"
                aria-hidden
              />
              What we look at
            </span>
            <h2 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl">
              Six classes of signal. One score that reads like an accountant
              wrote it.
            </h2>
          </div>
          {/* Methodology download — the canonical PDF that defines every
              score-to-action mapping shown on this site. Visible here so
              auditors and accountants can verify the rule tree before they
              even type a company name. */}
          <a
            href="/payshield-risk-matrix-v1.pdf"
            target="_blank"
            rel="noopener"
            className="group inline-flex items-start gap-3 border-2 border-ink bg-paper px-4 py-3 transition hover:bg-ink hover:text-paper md:shrink-0"
            title="Download the PayShield Risk Assessment Matrix v1.1"
          >
            <FileText className="mt-[2px] size-5 shrink-0" aria-hidden />
            <span className="flex flex-col text-left">
              <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-ink-3 transition group-hover:text-paper/70">
                Methodology · PDF
              </span>
              <span className="mt-0.5 font-display text-base font-bold leading-tight">
                Risk Assessment Matrix v1.1
              </span>
              <span className="mt-0.5 font-mono text-[10px] uppercase tracking-[0.14em] text-ink-3 transition group-hover:text-paper/70">
                Score thresholds · Action rules
              </span>
            </span>
          </a>
        </div>
        <div className="grid grid-cols-1 divide-y-2 divide-line border-2 border-line bg-paper md:grid-cols-2 md:divide-y-0 md:divide-x-2">
          <ul className="divide-y-2 divide-line">
            {signals.slice(0, 3).map((s) => (
              <SignalRow key={s.label} {...s} />
            ))}
          </ul>
          <ul className="divide-y-2 divide-line">
            {signals.slice(3).map((s) => (
              <SignalRow key={s.label} {...s} />
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

function SignalRow({
  label,
  detail,
  weight,
}: {
  label: string;
  detail: string;
  weight: string;
}) {
  return (
    <li className="grid grid-cols-[1fr_auto] items-start gap-4 px-6 py-5">
      <div>
        <h3 className="font-display text-xl font-semibold leading-tight">
          {label}
        </h3>
        <p className="mt-1 text-sm text-ink-2">{detail}</p>
      </div>
      <WeightBadge weight={weight} />
    </li>
  );
}

/**
 * Severity badge for the SignalGrid. Mirrors the product's tier
 * classification system used everywhere else (anchor strip, score-card
 * hero, risk meters), so a viewer scanning the page reads the SAME
 * colour language end to end.
 *
 *   30 + pts  → risk-orange gradient (mirrors HIGH/CRITICAL tier)
 *   20-29 pts → outlined risk-orange (still high impact)
 *   11-19 pts → amber gradient (mirrors MEDIUM tier)
 *   1-10 pts  → good-green gradient (mirrors LOW tier)
 *   "heuristic flag" → dashed neutral, italic (qualitatively different)
 *
 * Each filled tier uses a within-family gradient (deeper → lighter
 * shade of the same colour) for the modern Canva-grade depth,
 * plus a 2 px offset ink shadow for the brutalist lift.
 */
function WeightBadge({ weight }: { weight: string }) {
  const match = weight.match(/(\d+)\s*pts?/i);
  const pts = match ? Number(match[1]) : null;

  type Tone = {
    label: string;
    cls: string;
    style?: React.CSSProperties;
  };

  let tone: Tone;
  if (pts === null) {
    // Qualitative flag — dashed outline + italic, distinctly non-numeric
    tone = {
      label: weight,
      cls: "border-2 border-dashed border-ink/35 bg-paper text-ink-3 italic",
    };
  } else if (pts >= 30) {
    // Critical-tier weight — risk-orange gradient (#C03020 → #E8593C)
    tone = {
      label: `${pts} pts`,
      cls: "border-2 border-line text-paper",
      style: {
        background: "linear-gradient(135deg, #C03020 0%, #E8593C 100%)",
        boxShadow: "2px 2px 0 var(--ink)",
      },
    };
  } else if (pts >= 20) {
    // High-tier weight — outlined risk-orange with warm tint
    tone = {
      label: `${pts} pts`,
      cls: "border-2",
      style: {
        borderColor: "var(--risk)",
        color: "var(--risk)",
        backgroundColor: "rgba(232, 89, 60, 0.06)",
      },
    };
  } else if (pts >= 11) {
    // Medium-tier weight — warn-amber gradient (#D88A10 → #F2A623)
    tone = {
      label: `${pts} pts`,
      cls: "border-2 border-line text-ink",
      style: {
        background: "linear-gradient(135deg, #D88A10 0%, #F2A623 100%)",
        boxShadow: "2px 2px 0 var(--ink)",
      },
    };
  } else {
    // Low-tier weight — good-green gradient (#156947 → #1D9E75)
    tone = {
      label: `${pts} pts`,
      cls: "border-2 border-line text-paper",
      style: {
        background: "linear-gradient(135deg, #156947 0%, #1D9E75 100%)",
        boxShadow: "2px 2px 0 var(--ink)",
      },
    };
  }

  return (
    <span
      className={`inline-flex shrink-0 items-center whitespace-nowrap px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.12em] ${tone.cls}`}
      style={tone.style}
    >
      {tone.label}
    </span>
  );
}

function Pitch() {
  return (
    <section
      id="pitch"
      className="border-t-2 border-line bg-ink py-20 text-wash md:py-28"
    >
      <div className="mx-auto grid max-w-6xl gap-12 px-5 md:grid-cols-[1.2fr_1fr] md:px-8">
        <div>
          <span className="inline-flex items-center gap-3 font-mono text-[12px] font-bold uppercase tracking-[0.16em] text-wash">
            <span
              className="inline-block h-[3px] w-7 bg-risk"
              aria-hidden
            />
            Pricing — founding customers
          </span>
          <h2 className="mt-4 font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-6xl">
            One paying customer
            <br />
            during the hackathon.
          </h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-wash/80">
            We are looking for one founding customer this weekend.{" "}
            <span className="font-bold text-risk">£1 a month</span> for your
            first twelve months. Then{" "}
            <span className="font-bold text-risk">50% off list price</span>{" "}
            every month after that, for the lifetime of your subscription. The
            offer is open to any UK or Northern Ireland accountancy practice or
            B2B SME. Sign up before the pitch ends and{" "}
            <span className="font-semibold text-wash">
              your rate locks for life
            </span>
            .
          </p>
        </div>

        <div className="grid gap-5 md:gap-6">
          <PricingCard
            name="Practice"
            price="£49"
            audience="Accountancy practices, 1–15 staff"
            features={[
              "Unlimited customer scoring",
              "Multi-client workspace",
              "Integrate with Xero, QuickBooks",
              "Branded chase emails",
            ]}
          />
          <PricingCard
            name="Operator"
            price="£19"
            audience="B2B SMEs invoicing other businesses"
            features={[
              "100 customer scores per month",
              "Single workspace",
              "Standard chase templates",
              "CSV export",
            ]}
          />
          <SolanaPayCard
            recipient={SOLANA_WALLET}
            splTokenMint={SOLANA_USDC_MINT}
            amount="1"
            label="PayShield"
            message="Founding customer"
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({
  name,
  price,
  audience,
  features,
}: {
  name: string;
  price: string;
  audience: string;
  features: string[];
}) {
  return (
    <a
      href={STRIPE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative block brut-card-sm bg-paper p-6 text-ink outline outline-4 outline-risk transition hover:translate-x-[-1px] hover:translate-y-[-1px]"
      style={{ boxShadow: "8px 8px 0 var(--risk)" }}
    >
      <div className="flex items-baseline justify-between">
        <h3 className="font-display text-2xl font-bold">{name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="font-display text-4xl font-extrabold leading-none num-tab">
            {price}
          </span>
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-ink-3">
            /mo
          </span>
        </div>
      </div>
      <p className="mt-1 text-sm text-ink-3">{audience}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-1.5 size-1.5 rounded-full bg-ink" aria-hidden />
            {f}
          </li>
        ))}
      </ul>
      <div className="mt-5 flex items-center justify-between gap-3 border-t-2 border-line pt-3">
        <PaymentBadges />
        <span className="inline-flex items-center gap-1 whitespace-nowrap font-mono text-[11px] font-bold uppercase tracking-[0.16em] text-ink transition group-hover:text-risk">
          Subscribe
          <ArrowUpRight
            className="size-3.5 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
            aria-hidden
          />
        </span>
      </div>
    </a>
  );
}


/**
 * Trust strip — surfaces both supported payment rails. Stripe wordmark
 * uses the official brand purple (#635BFF); Solana wordmark uses the
 * brand gradient (purple → green). Both are styled text so they survive
 * any SVG quirks and read correctly at any size.
 */
function PaymentBadges() {
  return (
    <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-3">
      <Lock className="size-3" aria-hidden />
      <span>Pay with</span>
      <StripeWordmark />
      <span className="text-ink-3/60" aria-hidden>·</span>
      <SolanaWordmark />
    </span>
  );
}

function StripeWordmark() {
  return (
    <span
      role="img"
      aria-label="Stripe"
      className="inline-block translate-y-[-0.5px] text-[13px] font-bold leading-none tracking-tight"
      style={{
        color: "#635BFF",
        fontFamily:
          'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
        letterSpacing: "-0.02em",
        textTransform: "none",
      }}
    >
      Stripe
    </span>
  );
}

/**
 * Solana wordmark — gradient text in the official brand colours.
 * Uses background-clip so the same purple→green gradient that fronts
 * the SolanaPayCard eyebrow also fronts the wordmark, keeping the
 * brand language consistent across the page.
 */
/**
 * Solana brand mark for inline use in the trust strip — uses the official
 * logo file rather than gradient text so the brand reads identically to
 * the larger Solana hero band on the same page.
 */
function SolanaWordmark() {
  return (
    <Image
      src="/solana-logo.jpg"
      alt="Solana"
      width={1350}
      height={1011}
      className="inline-block h-[18px] w-auto translate-y-[-1px]"
      sizes="40px"
    />
  );
}

function SiteFooter() {
  return (
    <footer className="border-t-2 border-line bg-wash py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 md:flex-row md:items-center md:px-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink-3">
          PayShield · HackBelfast 2026 · en-GB
        </p>
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink-3">
          Public data only. Not a credit reference agency.
        </p>
      </div>
    </footer>
  );
}
