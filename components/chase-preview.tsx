"use client";

import { useState } from "react";
import { Mail, ShieldAlert, ChevronDown, Check, Send } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ChaseStage } from "@/lib/chase/schedule";

const TYPE_LABEL: Record<ChaseStage["type"], string> = {
  polite: "Polite reminder",
  firm: "Firmer reminder",
  escalation: "Escalation",
  "pre-collections": "Pre-collections",
};

const TYPE_ICON: Record<ChaseStage["type"], typeof Mail> = {
  polite: Mail,
  firm: Mail,
  escalation: ShieldAlert,
  "pre-collections": ShieldAlert,
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ChasePreview({
  schedule,
  invoiceLabel,
}: {
  schedule: ChaseStage[];
  invoiceLabel: string;
}) {
  const [armed, setArmed] = useState(false);
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="brut-card flex flex-col bg-paper">
      <header className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 border-b-2 border-line bg-wash-2 px-6 py-5">
        <div>
          <h2 className="font-display text-2xl font-bold leading-tight">
            Chase sequence
          </h2>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            {invoiceLabel} · drafted by Claude Haiku
          </p>
        </div>
        <button
          type="button"
          onClick={() => setArmed((v) => !v)}
          aria-pressed={armed}
          className={cn(
            "inline-flex items-center gap-2 border-2 border-line px-4 py-2 font-medium transition",
            armed
              ? "bg-good text-paper"
              : "bg-ink text-wash hover:bg-ink-2 active:translate-y-[1px]",
          )}
        >
          {armed ? (
            <>
              <Check className="size-4" aria-hidden /> Sequence armed
            </>
          ) : (
            <>
              <Send className="size-4" aria-hidden /> Arm 4-stage sequence
            </>
          )}
        </button>
      </header>

      <ol className="grid">
        {schedule.map((stage, i) => {
          const Icon = TYPE_ICON[stage.type];
          const open = openIndex === i;
          const delay = armed ? i * 110 : i * 60;
          return (
            <li
              key={stage.day}
              className={cn(
                "border-b-2 border-line last:border-b-0",
                armed && "anim-type-in",
              )}
              style={
                armed
                  ? { animationDelay: `${delay}ms`, animationDuration: "0.55s" }
                  : undefined
              }
            >
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                aria-expanded={open}
                className="grid w-full grid-cols-[auto_auto_1fr_auto] items-center gap-5 px-6 py-5 text-left transition hover:bg-wash-2"
              >
                <div className="flex flex-col items-center font-mono">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-ink-3">
                    Day
                  </span>
                  <span className="font-display text-3xl font-bold leading-none tabular-nums text-ink">
                    {stage.day}
                  </span>
                </div>
                <div className="brut-line flex size-11 items-center justify-center bg-wash">
                  <Icon className="size-5" strokeWidth={2.2} aria-hidden />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
                    {TYPE_LABEL[stage.type]} · {formatDate(stage.send_at)}
                  </div>
                  <div className="mt-1 truncate font-display text-lg font-semibold leading-tight">
                    {stage.subject}
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "size-5 shrink-0 transition-transform",
                    open && "rotate-180",
                  )}
                  aria-hidden
                />
              </button>

              {open && (
                <div className="border-t border-line/15 bg-wash/60 px-6 py-5">
                  <pre className="whitespace-pre-wrap font-sans text-[14.5px] leading-relaxed text-ink-2">
                    {stage.body}
                  </pre>
                  <div className="mt-3 flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
                    <span className="size-1.5 rounded-full bg-ink-3" aria-hidden />
                    {stage.tone}
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ol>

      {armed && (
        <div className="anim-type-in border-t-2 border-line bg-wash px-6 py-4 font-mono text-[12px] tracking-wide text-ink-2">
          DEMO MODE · sends mocked. In production, Resend dispatches each stage
          on the scheduled day.
        </div>
      )}
    </section>
  );
}
