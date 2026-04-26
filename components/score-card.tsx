import { cn } from "@/lib/cn";
import type { ScoreCard, ReasoningSignal } from "@/lib/scoring/schema";
import { TIER_COPY } from "@/lib/scoring/schema";

/* PayShield Risk Assessment Matrix v1.0 — tier colour map.
   LOW = green · MEDIUM = blue · HIGH = amber · CRITICAL = red.
   Text colour flips per background so contrast clears WCAG AA. */
const TIER_BADGE: Record<ScoreCard["tier"], string> = {
  low: "bg-good text-paper",
  medium: "bg-info text-paper",
  high: "bg-warn text-ink",
  critical: "bg-risk text-paper",
};

const TIER_FILL: Record<ScoreCard["tier"], string> = {
  low: "bg-good",
  medium: "bg-info",
  high: "bg-warn",
  critical: "bg-risk",
};

export function ScoreCardHero({
  card,
  company,
}: {
  card: ScoreCard;
  company: { name: string; number: string; sector: string };
}) {
  const tierCopy = TIER_COPY[card.tier];
  const pct = Math.max(0, Math.min(100, card.score));

  return (
    <article className="brut-ink relative overflow-hidden bg-ink text-wash">
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1fr]">
        {/* Left: Score */}
        <div className="relative flex flex-col justify-between gap-10 p-8 md:p-12">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.18em] text-wash/60">
              PayShield risk score
            </span>
            <span
              className={cn(
                "whitespace-nowrap border-2 border-wash px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-[0.16em]",
                TIER_BADGE[card.tier],
              )}
            >
              {tierCopy.label}
            </span>
          </div>

          <div className="anim-score-pop">
            <div className="flex items-end gap-3 leading-none">
              <span className="font-display text-[120px] font-extrabold leading-[0.85] tracking-tight md:text-[180px]">
                {card.score}
              </span>
              <span className="mb-3 font-display text-3xl font-medium text-wash/55 md:mb-5 md:text-4xl">
                /100
              </span>
            </div>

            <div className="mt-5 h-2 w-full overflow-hidden border border-wash/40 bg-wash/10">
              <div
                className={cn("anim-risk-fill h-full", TIER_FILL[card.tier])}
                style={{ width: `${pct}%` }}
              />
            </div>

            <p className="mt-6 max-w-[36ch] font-display text-2xl leading-[1.15] md:text-[28px]">
              {card.headline}
            </p>
          </div>

          <dl className="grid grid-cols-1 gap-x-6 gap-y-3 border-t border-wash/20 pt-6 font-mono text-xs uppercase tracking-wider sm:grid-cols-2 sm:gap-y-1">
            <div>
              <dt className="text-wash/55">Company</dt>
              <dd className="mt-1 font-display text-base normal-case tracking-normal">
                {company.name}
              </dd>
            </div>
            <div className="min-w-0">
              <dt className="text-wash/55">CRN · sector</dt>
              <dd className="mt-1 break-words normal-case tracking-normal text-wash sm:truncate">
                {company.number} · {company.sector}
              </dd>
            </div>
            <div className="sm:mt-3">
              <dt className="text-wash/55">Predicted to pay</dt>
              <dd className="mt-1 font-display text-base normal-case tracking-normal">
                <span className="num-tab">{card.predicted_days_to_pay}</span>{" "}
                days
              </dd>
            </div>
            <div className="sm:mt-3">
              <dt className="text-wash/55">Treatment</dt>
              <dd className="mt-1 normal-case tracking-normal text-wash">
                {tierCopy.tone}
              </dd>
            </div>
          </dl>
        </div>

        {/* Right: dial */}
        <div className="relative flex items-center justify-center border-t-2 border-wash/20 p-4 sm:p-6 md:p-8 xl:border-l-2 xl:border-t-0 xl:p-6 2xl:p-8">
          <ScoreDial score={card.score} tier={card.tier} />
        </div>
      </div>
    </article>
  );
}

/* ---------- Score dial (SVG arc) ---------- */

function ScoreDial({
  score,
  tier,
}: {
  score: number;
  tier: ScoreCard["tier"];
}) {
  // Single dial, 270° sweep from -135 to +135.
  const r = 92;
  const c = 2 * Math.PI * r;
  const sweep = 0.75; // 75% of circumference
  const used = c * sweep * (score / 100);
  const dash = `${used} ${c}`;

  /* Risk Assessment Matrix v1.0 — dial stroke per tier. */
  const stroke = {
    low: "var(--good)",
    medium: "var(--info)",
    high: "var(--warn)",
    critical: "var(--risk)",
  }[tier];

  return (
    <svg
      viewBox="-110 -110 220 220"
      className="aspect-square w-full max-w-[280px] sm:max-w-[320px] md:max-w-[360px] xl:max-w-[340px] 2xl:max-w-[400px]"
      role="img"
      aria-label={`Risk dial showing ${score} of 100`}
    >
      <defs>
        <pattern
          id="grid"
          width="6"
          height="6"
          patternUnits="userSpaceOnUse"
          patternTransform="rotate(0)"
        >
          <circle cx="0" cy="0" r="0.5" fill="rgba(250,248,243,0.18)" />
        </pattern>
      </defs>
      <rect x="-110" y="-110" width="220" height="220" fill="url(#grid)" />

      {/* Tick marks every 10 */}
      {Array.from({ length: 11 }).map((_, i) => {
        const angle = -135 + (i * 270) / 10;
        const rad = (angle * Math.PI) / 180;
        const x1 = Math.cos(rad) * (r + 8);
        const y1 = Math.sin(rad) * (r + 8);
        const x2 = Math.cos(rad) * (r + (i % 5 === 0 ? 16 : 12));
        const y2 = Math.sin(rad) * (r + (i % 5 === 0 ? 16 : 12));
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(250,248,243,0.45)"
            strokeWidth={i % 5 === 0 ? 2 : 1}
          />
        );
      })}

      {/* Track */}
      <circle
        r={r}
        fill="none"
        stroke="rgba(250,248,243,0.18)"
        strokeWidth="14"
        strokeDasharray={`${c * sweep} ${c}`}
        transform="rotate(135)"
      />
      {/* Fill */}
      <circle
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth="14"
        strokeLinecap="square"
        strokeDasharray={dash}
        transform="rotate(135)"
        style={{
          transition: "stroke-dasharray 1.4s cubic-bezier(0.2,0.8,0.2,1)",
        }}
      />
      {/* Score number — vertically centred, no eyebrow behind it */}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        y="-4"
        className="fill-wash"
        style={{
          fontFamily: "var(--font-display)",
          fontSize: "62px",
          fontWeight: 700,
          letterSpacing: "-0.02em",
        }}
      >
        {score}
      </text>
      {/* Tier label sits cleanly below the number */}
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        y="44"
        className="fill-wash/65"
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: "11px",
          letterSpacing: "0.22em",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {tier}
      </text>
    </svg>
  );
}

/* ---------- Reasoning section ---------- */

export function ReasoningList({
  reasoning,
}: {
  reasoning: ReasoningSignal[];
}) {
  return (
    <ol className="divide-y-2 divide-line">
      {reasoning.map((r, i) => (
        <li
          key={`${r.signal}-${i}`}
          className="anim-type-in grid grid-cols-[auto_1fr_auto] gap-4 py-5"
          style={{ animationDelay: `${i * 80}ms` }}
        >
          <span className="font-mono text-sm tabular-nums text-ink-3">
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-xl font-semibold leading-snug">
              {r.signal}
            </h3>
            <p className="mt-1 text-[15px] leading-relaxed text-ink-2">
              {r.evidence}
            </p>
          </div>
          <WeightDots weight={r.weight} />
        </li>
      ))}
    </ol>
  );
}

/**
 * Reading legend for the WeightDots gauge — shown once at the top of the
 * reasoning section so a first-time viewer can decode what the small bars
 * to the right of every signal mean. Three columns map directly to the
 * three colour zones inside WeightDots so the visual language matches.
 */
export function WeightLegend() {
  const items: {
    range: string;
    label: string;
    hint: string;
    fillCols: number;
    fill: string;
    outline: string;
    text: string;
  }[] = [
    {
      range: "1–3",
      label: "Low impact",
      hint: "Background context",
      fillCols: 3,
      fill: "bg-good",
      outline: "bg-good/15",
      text: "text-good",
    },
    {
      range: "4–6",
      label: "Moderate",
      hint: "Materially shifts the score",
      fillCols: 6,
      fill: "bg-warn",
      outline: "bg-warn/15",
      text: "text-warn",
    },
    {
      range: "7–10",
      label: "Severe",
      hint: "Drives the tier classification",
      fillCols: 10,
      fill: "bg-risk",
      outline: "bg-risk/15",
      text: "text-risk",
    },
  ];

  return (
    <div className="brut-line bg-paper p-4 md:p-5">
      <div className="mb-3 flex items-center gap-2 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink-3">
        <span className="inline-block h-[3px] w-5 bg-ink" aria-hidden />
        How to read the weight meter
      </div>
      <dl className="grid gap-3 sm:grid-cols-3 sm:gap-x-5">
        {items.map((it, idx) => (
          <div key={it.range} className="flex items-start gap-3">
            <div
              className="mt-[2px] flex h-4 shrink-0 items-end gap-[2px]"
              aria-hidden
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const inZone =
                  idx === 0 ? i < 3 : idx === 1 ? i >= 3 && i < 6 : i >= 6;
                const cls = inZone ? it.fill : it.outline;
                const h = 4 + i * 1.1;
                return (
                  <span
                    key={i}
                    className={cn("block w-[3px] rounded-[1px]", cls)}
                    style={{ height: `${h}px` }}
                  />
                );
              })}
            </div>
            <div className="min-w-0">
              <dt
                className={cn(
                  "font-mono text-[11px] font-bold uppercase tracking-wide tabular-nums",
                  it.text,
                )}
              >
                {it.range} · {it.label}
              </dt>
              <dd className="mt-0.5 text-[12px] leading-snug text-ink-2">
                {it.hint}
              </dd>
            </div>
          </div>
        ))}
      </dl>
    </div>
  );
}

/**
 * Speedometer-style signal-weight meter.
 *
 * Ten thin segments rising in height (left → right), divided into three
 * colour zones — green (1-3, low impact) → amber (4-6, moderate) →
 * risk-orange (7-10, severe). Filled segments use solid zone colour,
 * unfilled segments outline at low opacity. The numeric readout sits
 * above as a fixed-width tabular figure so cards always align.
 *
 * Reads as a tiny gauge from a metre away.
 */
function WeightDots({ weight }: { weight: number }) {
  const filled = Math.max(1, Math.min(10, Math.round(weight)));

  const zone = (i: number) => {
    if (i < 3) return { fill: "bg-good", outline: "bg-good/15" };
    if (i < 6) return { fill: "bg-warn", outline: "bg-warn/15" };
    return { fill: "bg-risk", outline: "bg-risk/15" };
  };

  // Tier label drives the readout colour
  const readoutColour =
    filled <= 3 ? "text-good" : filled <= 6 ? "text-warn" : "text-risk";

  return (
    <div
      className="flex flex-col items-end gap-1 pt-1"
      aria-label={`Signal weight ${filled} out of 10`}
    >
      <span
        className={cn(
          "font-mono text-[10px] font-bold tabular-nums tracking-wide",
          readoutColour,
        )}
      >
        {filled}/10
      </span>
      <div className="flex h-4 items-end gap-[2px]">
        {Array.from({ length: 10 }).map((_, i) => {
          const isFilled = i < filled;
          const z = zone(i);
          // Bar heights ramp 4 → 14 px to give the gauge its rising arc
          const h = 4 + i * 1.1;
          return (
            <span
              key={i}
              className={cn(
                "block w-[3px] rounded-[1px]",
                isFilled ? z.fill : z.outline,
              )}
              style={{ height: `${h}px` }}
            />
          );
        })}
      </div>
    </div>
  );
}
