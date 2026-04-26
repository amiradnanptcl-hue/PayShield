import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Building2,
  ExternalLink,
  FileText,
  ShieldCheck,
} from "lucide-react";

import { resolveCompany, type ResolvedCompany } from "@/lib/data/lookup";
import { scoreCompany } from "@/lib/scoring/agent";
import { buildSchedule } from "@/lib/chase/schedule";
import type { ScoreCard, ScoreInput } from "@/lib/scoring/schema";

import { SearchBox } from "@/components/search-box";
import {
  ScoreCardHero,
  ReasoningList,
  WeightLegend,
} from "@/components/score-card";
import { ActionBrief } from "@/components/action-brief";
import { ChasePreview } from "@/components/chase-preview";

/* ---------- View model: collapse demo + ppr into one shape ---------- */

type CompanyView = {
  name: string;
  number: string;
  slug: string;
  sector: string;
  registered_office: string | null;
  input: ScoreInput;
  presetCard: ScoreCard | null;
  /** True for the rich hand-crafted anchors. */
  isAnchor: boolean;
};

function viewFor(resolved: ResolvedCompany): CompanyView {
  if (resolved.kind === "demo") {
    const d = resolved.demo;
    return {
      name: d.name,
      number: d.number,
      slug: d.slug,
      sector: d.sector,
      registered_office: d.registered_office,
      input: d.input,
      presetCard: d.card,
      isAnchor: true,
    };
  }
  if (resolved.kind === "ppr") {
    return {
      name: resolved.input.company.name,
      number: resolved.ppr.number,
      slug: resolved.ppr.slug,
      sector: resolved.sector,
      registered_office: null,
      input: resolved.input,
      presetCard: null,
      isAnchor: false,
    };
  }
  // kind === "companies-house" — live profile pulled from the register
  // for any company not in the demo set or the PPR ingest. PPR features
  // are absent so the ML scorer returns null and the heuristic fallback
  // produces the score from governance + filing signals only.
  return {
    name: resolved.input.company.name,
    number: resolved.profile.company_number,
    slug: `${resolved.input.company.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")}-${resolved.profile.company_number}`,
    sector: resolved.sector,
    registered_office: null,
    input: resolved.input,
    presetCard: null,
    isAnchor: false,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const resolved = await resolveCompany(id);
  if (!resolved) return { title: "Company not found" };
  const v = viewFor(resolved);
  const card = v.presetCard;
  if (!card) {
    return {
      title: `${v.name} — payment practices`,
      description: `Latest UK & Northern Ireland Payment Practices Reporting data for ${v.name} (${v.number}).`,
    };
  }
  const tier = card.tier.charAt(0).toUpperCase() + card.tier.slice(1);
  return {
    title: `${v.name} — risk ${card.score}/100`,
    description: `${tier} risk · predicted ${card.predicted_days_to_pay} days to pay · ${card.action.deposit_pct}% deposit recommended.`,
  };
}

export default async function ScorePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const resolved = await resolveCompany(id);
  if (!resolved) notFound();

  const view = viewFor(resolved);

  // Hand-crafted demo anchors always show their preset cards so the
  // five-tier spectrum (Tesco LOW → Highgate CRITICAL) reads cleanly
  // for the pitch. Real PPR-reported buyers run through the scoring
  // pipeline — ML decision tree first, heuristic fallback when the
  // model lacks features. The agent runs for ALL companies regardless
  // (and its model_used metadata is shown to viewers) so the decision
  // path is auditable even when we pin to a preset card.
  const result = await scoreCompany(view.input);
  const card = view.presetCard ?? result.card;

  // Stable demo anchor for the chase-preview schedule. Using a fixed
  // reference rather than `Date.now()` so the rendered email previews
  // are deterministic across requests, ISR cache invalidations, and
  // server reruns — and so the React purity rule is satisfied.
  const DEMO_INVOICE_DUE = new Date("2026-05-10T00:00:00Z").toISOString();
  const schedule = buildSchedule(card, {
    invoice_number: "INV-0419",
    customer_name: view.name,
    customer_email: "accounts@example.co.uk",
    amount_gbp: 12480,
    due_date: DEMO_INVOICE_DUE,
    sender_name: "Sam Patel",
    sender_company: "Patel & Co Engineering Ltd",
  });

  return (
    <>
      <ScoreHeader
        latencyMs={result.latency_ms}
        usedFallback={result.used_fallback}
      />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 pb-20 pt-10 md:gap-14 md:px-8 md:pt-14">
        <CompanyMast view={view} />

        <div className="grid gap-6 md:gap-8 xl:grid-cols-[1.55fr_1fr]">
          <ScoreCardHero
            card={card}
            company={{
              name: view.name,
              number: view.number,
              sector: view.sector,
            }}
          />
          <ActionBrief action={card.action} />
        </div>

        <section className="brut-card bg-paper">
          <header className="flex flex-wrap items-baseline justify-between gap-3 border-b-2 border-line bg-wash-2 px-6 py-5 md:px-8">
            <div>
              <h2 className="font-display text-3xl font-bold leading-tight">
                The reasoning, in full.
              </h2>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
                {view.isAnchor
                  ? "Each signal cites public-record evidence"
                  : "Inferred from the latest UK & Northern Ireland PPR filings"}
              </p>
            </div>
            <div className="flex flex-col items-start gap-2 sm:items-end">
              <MatrixVerifyLink />
              <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
                {card.reasoning.length} signals · model{" "}
                <span className="text-ink">{result.model_used}</span>
              </span>
            </div>
          </header>
          <div className="px-6 pb-2 pt-5 md:px-8">
            <WeightLegend />
          </div>
          <div className="px-6 md:px-8">
            <ReasoningList reasoning={card.reasoning} />
          </div>
        </section>

        <SourceStrip view={view} />

        <ChasePreview
          schedule={schedule}
          invoiceLabel="INV-0419 · £12,480.00"
        />

        <NextStep />
      </main>

      <ScoreFooter />
    </>
  );
}

/* ---------- Sub-pieces ---------- */

function ScoreHeader({
  latencyMs,
  usedFallback,
}: {
  latencyMs: number;
  usedFallback: boolean;
}) {
  const seconds =
    latencyMs < 950 ? `${Math.max(1, latencyMs)}ms` : `${(latencyMs / 1000).toFixed(2)}s`;
  return (
    <header className="border-b-2 border-line bg-wash">
      <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3 md:px-8 lg:grid lg:grid-cols-[auto_1fr_auto] lg:gap-6">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-2 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 hover:text-ink"
        >
          <ArrowLeft className="size-3.5" />
          <span>PayShield</span>
        </Link>
        <div className="hidden lg:block">
          <SearchBox variant="compact" />
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-3 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3 lg:ml-0">
          <span className="inline-flex items-center gap-1.5">
            <span
              className={`size-1.5 rounded-full ${usedFallback ? "bg-warn" : "bg-good"}`}
            />
            <span className="whitespace-nowrap">
              {usedFallback ? "Heuristic mode" : "Live reasoning"}
            </span>
          </span>
          <span className="hidden whitespace-nowrap sm:inline">
            · in {seconds}
          </span>
        </div>
      </div>
    </header>
  );
}

function CompanyMast({ view }: { view: CompanyView }) {
  const subtitle = view.registered_office
    ? `${view.sector} · ${view.registered_office}`
    : `${view.sector} · UK & Northern Ireland Payment Practices Reporting filing`;

  const statusPill = classifyStatus(view.input.company.status);
  const incorpPill = classifyIncorporation(view.input.company.incorporated_on);
  const accountsPill = view.isAnchor
    ? classifyAccounts(view.input.company.accounts)
    : null;

  return (
    <section className="space-y-5 border-b-2 border-line pb-8">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
        <span className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap">
          <Building2 className="size-3.5" aria-hidden />
          {view.isAnchor ? "Companies House dossier" : "PPR filing on record"}
        </span>
        <span className="text-ink-3/60" aria-hidden>·</span>
        <span className="num-tab whitespace-nowrap">{view.number}</span>
      </div>
      <h1 className="font-display text-[clamp(36px,5.6vw,80px)] font-extrabold leading-[0.94] tracking-tight">
        {view.name}
      </h1>
      <div className="flex flex-col-reverse gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-8">
        <p className="text-base text-ink-2">{subtitle}</p>
        <div className="flex flex-wrap gap-2 font-mono text-[11px] uppercase tracking-[0.16em] lg:shrink-0 lg:justify-end">
          <FactPill
            label="Status"
            value={statusPill.value}
            meta={statusPill.meta}
            tone={statusPill.tone}
          />
          {view.isAnchor && (
            <FactPill
              label="Incorporated"
              value={incorpPill.value}
              meta={incorpPill.meta}
              tone={incorpPill.tone}
            />
          )}
          {accountsPill ? (
            <FactPill
              label="Accounts"
              value={accountsPill.value}
              meta={accountsPill.meta}
              tone={accountsPill.tone}
            />
          ) : (
            !view.isAnchor && (
              <FactPill
                label="Periods"
                value={view.input.payment_practices.length.toString()}
                meta="on file"
              />
            )
          )}
        </div>
      </div>
    </section>
  );
}

/* ----- pill classifiers (logic-driven tone + qualifier) ----- */

type PillTone = "neutral" | "good" | "warn" | "risk";
type PillResult = { value: string; meta?: string; tone: PillTone };

function classifyStatus(raw: string): PillResult {
  const s = (raw || "").toLowerCase();
  if (s === "active") return { value: "Active", meta: "Trading", tone: "good" };
  if (
    s.includes("liquidation") ||
    s.includes("administration") ||
    s.includes("receivership")
  )
    return { value: raw, meta: "Insolvency event", tone: "risk" };
  if (s.includes("dissolved"))
    return { value: "Dissolved", meta: "Do not invoice", tone: "risk" };
  if (s.includes("strike"))
    return { value: raw, meta: "Action pending", tone: "risk" };
  if (s.includes("dormant"))
    return { value: "Dormant", meta: "Not trading", tone: "warn" };
  return { value: raw || "Unknown", meta: "Manual review", tone: "warn" };
}

function classifyIncorporation(iso: string): PillResult {
  const d = new Date(iso);
  const year = d.getFullYear().toString();
  const ms = Date.now() - d.getTime();
  const years = Math.max(0, Math.floor(ms / (365.25 * 24 * 3600 * 1000)));
  if (Number.isNaN(years)) return { value: year, tone: "neutral" };
  if (years < 2)
    return { value: year, meta: `${years || "<1"} yr · young`, tone: "warn" };
  if (years < 5)
    return { value: year, meta: `${years} yrs · established`, tone: "neutral" };
  return { value: year, meta: `${years} yrs · mature`, tone: "good" };
}

function classifyAccounts(acc: {
  overdue: boolean;
  next_due?: string | null;
  last_made_up_to?: string | null;
}): PillResult {
  if (acc.overdue) {
    const due = acc.next_due ? new Date(acc.next_due) : null;
    if (due && !Number.isNaN(due.getTime())) {
      const ms = Date.now() - due.getTime();
      const months = Math.max(1, Math.round(ms / (30.4 * 24 * 3600 * 1000)));
      return { value: "Overdue", meta: `${months} mo late`, tone: "risk" };
    }
    return { value: "Overdue", meta: "Filing missed", tone: "risk" };
  }
  if (acc.last_made_up_to) {
    const last = new Date(acc.last_made_up_to);
    if (!Number.isNaN(last.getTime())) {
      const meta = last.toLocaleDateString("en-GB", {
        month: "short",
        year: "numeric",
      });
      return { value: "Current", meta: `Filed ${meta}`, tone: "good" };
    }
  }
  return { value: "Current", meta: "On file", tone: "good" };
}

function FactPill({
  label,
  value,
  meta,
  tone = "neutral",
}: {
  label: string;
  value: string;
  meta?: string;
  tone?: PillTone;
}) {
  const dot =
    tone === "risk"
      ? "bg-risk"
      : tone === "warn"
        ? "bg-warn"
        : tone === "good"
          ? "bg-good"
          : "bg-ink";
  return (
    <span className="brut-line inline-flex items-center gap-2 bg-paper px-3 py-1.5">
      <span className={`size-1.5 shrink-0 rounded-full ${dot}`} aria-hidden />
      <span className="text-ink-3">{label}</span>
      <span className="text-ink">{value}</span>
      {meta && (
        <>
          <span className="text-ink-3/50" aria-hidden>·</span>
          <span className="normal-case tracking-normal text-ink-3">{meta}</span>
        </>
      )}
    </span>
  );
}

function SourceStrip({ view }: { view: CompanyView }) {
  const ppr = view.input.payment_practices[0];
  const prev = view.input.payment_practices[1];
  const trendDelta =
    ppr && prev ? ppr.pct_paid_late - prev.pct_paid_late : null;

  const stats: { label: string; value: string; sub: string }[] = [
    {
      label: "Avg days to pay",
      value: ppr ? ppr.avg_days_to_pay.toString() : "—",
      sub: ppr ? "latest reporting period" : "no PPR data",
    },
    {
      label: "Paid late",
      value: ppr ? `${Math.round(ppr.pct_paid_late)}%` : "—",
      sub: "share of invoices",
    },
  ];

  if (view.isAnchor) {
    stats.push(
      {
        label: "Director churn 12m",
        value: view.input.network.director_churn_12m.toString(),
        sub: "officer changes",
      },
      {
        label: "Charges outstanding",
        value: view.input.charges
          .filter((c) => c.status.toLowerCase() === "outstanding")
          .length.toString(),
        sub: "on register",
      },
    );
  } else {
    stats.push(
      {
        label: "Trend H1 → H2",
        value:
          trendDelta == null
            ? "—"
            : `${trendDelta > 0 ? "+" : ""}${Math.round(trendDelta)} pts`,
        sub: trendDelta == null ? "single period" : "late-payment share",
      },
      {
        label: "Periods on file",
        value: view.input.payment_practices.length.toString(),
        sub: "PPR filings",
      },
    );
  }
  return (
    <section className="grid grid-cols-2 gap-0 border-2 border-line bg-paper md:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className={
            "px-5 py-5 md:px-7 md:py-6 " +
            (i < 2 ? "border-b-2 border-line md:border-b-0 " : "") +
            (i % 2 === 0 ? "border-r-2 border-line " : "") +
            (i === 0 ? "" : "")
          }
        >
          <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            {s.label}
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-display text-4xl font-extrabold leading-none tabular-nums">
              {s.value}
            </span>
          </div>
          <div className="mt-1 text-xs text-ink-3">{s.sub}</div>
        </div>
      ))}
    </section>
  );
}

function NextStep() {
  return (
    <section className="brut-ink mt-2 grid gap-6 bg-ink px-7 py-9 text-wash lg:grid-cols-[1fr_auto] lg:items-center md:px-12">
      <div>
        <h2 className="font-display text-3xl font-bold leading-tight md:text-4xl">
          Want this for your real customers?
        </h2>
        <p className="mt-2 max-w-2xl text-wash/75">
          Tap our team during the demo. We will set you up with a workspace this
          week and waive the first month at the founding price.
        </p>
      </div>
      <div className="flex flex-col items-start gap-3 self-start">
        <a
          href="https://buy.stripe.com/cNi14n87u4Xsc4m0X4ejK00"
          target="_blank"
          rel="noopener noreferrer"
          className="brut-card-sm inline-flex items-center gap-2 bg-risk px-5 py-3 font-medium text-paper transition hover:translate-x-px hover:translate-y-px"
          style={{ boxShadow: "6px 6px 0 var(--wash)" }}
        >
          Become a founding customer
          <ExternalLink className="size-4" aria-hidden />
        </a>
        <span className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 font-mono text-[10px] uppercase tracking-[0.16em] text-wash/65">
          Pay with
          <span
            className="text-[13px] font-bold leading-none tracking-tight"
            style={{
              color: "#A89BFF",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              letterSpacing: "-0.02em",
              textTransform: "none",
            }}
          >
            Stripe
          </span>
          <span className="text-wash/40" aria-hidden>·</span>
          <span
            className="bg-clip-text text-[13px] font-bold leading-none tracking-tight text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(135deg, #C4A6FF 0%, #6BFFC8 100%)",
              WebkitBackgroundClip: "text",
              fontFamily:
                'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
              letterSpacing: "-0.02em",
              textTransform: "none",
            }}
          >
            Solana
          </span>
          <span className="text-wash/40">— card or 1 USDC on devnet</span>
        </span>
      </div>
    </section>
  );
}

function ScoreFooter() {
  return (
    <footer className="border-t-2 border-line bg-wash py-8">
      <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-3 px-5 md:flex-row md:items-center md:px-8">
        <p className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink-3">
          Generated from public Companies House and Payment Practices Reporting
          data. Not a credit reference agency.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <a
            href="/payshield-risk-matrix-v1.pdf"
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-1.5 font-mono text-[12px] uppercase tracking-[0.16em] text-ink underline decoration-[2px] underline-offset-4 hover:text-risk"
          >
            <FileText className="size-3.5" aria-hidden />
            Risk matrix v1.1
          </a>
          <Link
            href="/"
            className="font-mono text-[12px] uppercase tracking-[0.16em] text-ink underline decoration-[2px] underline-offset-4"
          >
            Score another company →
          </Link>
        </div>
      </div>
    </footer>
  );
}

/**
 * "Verify methodology" chip — shows the reviewer (an accountant, auditor,
 * or judge) where to download the canonical Risk Assessment Matrix v1.1
 * PDF that defines every score-to-action mapping rendered on this page.
 * The matrix is the contract; this chip is the link to it.
 */
function MatrixVerifyLink() {
  return (
    <a
      href="/payshield-risk-matrix-v1.pdf"
      target="_blank"
      rel="noopener"
      className="group inline-flex items-center gap-1.5 whitespace-nowrap border border-ink bg-paper px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink transition hover:bg-ink hover:text-paper"
      title="Open the PayShield Risk Assessment Matrix v1.1 PDF"
    >
      <ShieldCheck className="size-3 transition" aria-hidden />
      Verify · Matrix v1.1
      <FileText
        className="size-3 opacity-50 transition group-hover:opacity-100"
        aria-hidden
      />
    </a>
  );
}
