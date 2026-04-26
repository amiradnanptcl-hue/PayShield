import {
  AlertOctagon,
  CalendarClock,
  Coins,
  FileText,
  HourglassIcon,
} from "lucide-react";
import type { RecommendedAction } from "@/lib/scoring/schema";

const ROWS = [
  {
    key: "deposit_pct",
    label: "Deposit",
    icon: Coins,
    suffix: "%",
  },
  {
    key: "terms_days",
    label: "Payment terms",
    icon: HourglassIcon,
    prefix: "Net-",
  },
  {
    key: "chase_from_day",
    label: "Chase from day",
    icon: CalendarClock,
  },
  {
    key: "escalation_at_day",
    label: "Escalate at day",
    icon: AlertOctagon,
  },
] as const;

export function ActionBrief({ action }: { action: RecommendedAction }) {
  return (
    <aside className="brut-card flex h-full flex-col bg-paper">
      <header className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-2 border-b-2 border-line bg-wash-2 px-6 py-4">
        <h2 className="font-display text-2xl font-bold leading-tight">
          Recommended action
        </h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
          for the next invoice
        </span>
        <a
          href="/payshield-risk-matrix-v1.pdf"
          target="_blank"
          rel="noopener"
          className="group inline-flex items-center gap-1.5 whitespace-nowrap border border-line bg-paper px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.16em] text-ink transition hover:bg-ink hover:text-paper"
          title="Download the PayShield Risk Assessment Matrix v1.1"
        >
          <FileText className="size-3" aria-hidden />
          Verify · Matrix v1.1
        </a>
      </header>

      <ul className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-1 xl:grid-rows-4">
        {ROWS.map((row, i) => {
          const Icon = row.icon;
          const value = action[row.key as keyof RecommendedAction] as number;
          /* Mobile single-col: every row gets a bottom border except the
             last; the labels and big numerals get their full natural width
             so "Payment terms / Net-21" and "Chase from day / 14" never
             wrap mid-word.
             sm: 2-col grid:  [0|1] / [2|3]  — vertical separator between
             columns, horizontal between rows 0 and 2.
             xl: collapses back to single column inside the right rail. */
          const isLeft = i % 2 === 0;
          const isTop = i < 2;
          const cls = [
            "anim-type-in flex items-center gap-4 px-5 py-4 sm:px-6 sm:py-5 border-line",
            // Mobile: every row except last gets a bottom divider
            i < 3 && "border-b-2",
            // sm: replace mobile bottom border with the 2-col grid pattern
            "sm:border-b-0",
            isLeft && "sm:border-r-2 xl:border-r-0",
            isTop && "sm:border-b-2",
            !isTop && "xl:border-t-2",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <li
              key={row.key}
              className={cls}
              style={{ animationDelay: `${100 + i * 70}ms` }}
            >
              <div className="brut-line flex size-11 shrink-0 items-center justify-center bg-wash sm:size-12">
                <Icon className="size-4 sm:size-5" strokeWidth={2.2} aria-hidden />
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
                  {row.label}
                </div>
                <div className="font-display text-3xl font-bold leading-none tabular-nums">
                  {"prefix" in row ? row.prefix : ""}
                  {value}
                  {"suffix" in row ? row.suffix : ""}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      <p className="anim-type-in border-t-2 border-line px-6 py-5 text-[15px] italic leading-relaxed text-ink-2">
        {action.rationale}
      </p>
    </aside>
  );
}
