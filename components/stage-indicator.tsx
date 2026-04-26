"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

const STAGES = [
  "Pulling Companies House",
  "Reading payment practices",
  "Walking director network",
  "Reasoning",
] as const;

/**
 * Lightweight progress label used inside loading.tsx.
 * Pure UI — advances on a fixed cadence so there is always something on screen.
 */
export function StageIndicator() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (index >= STAGES.length - 1) return;
    const t = setTimeout(() => setIndex((i) => i + 1), 700 + Math.random() * 300);
    return () => clearTimeout(t);
  }, [index]);

  return (
    <ul className="grid w-full max-w-md gap-1.5">
      {STAGES.map((stage, i) => {
        const done = i < index;
        const active = i === index;
        return (
          <li
            key={stage}
            className={cn(
              "anim-stage flex items-center gap-3 border-l-2 px-4 py-2 font-mono text-xs uppercase tracking-[0.16em] transition",
              done && "border-good text-ink-3",
              active && "border-ink text-ink",
              !done && !active && "border-ink/15 text-ink-3/60",
            )}
            style={{ animationDelay: `${i * 60}ms` }}
          >
            {done ? (
              <span className="size-2 rounded-full bg-good" aria-hidden />
            ) : active ? (
              <span
                className="anim-pulse-dot size-2 rounded-full bg-ink"
                aria-hidden
              />
            ) : (
              <span className="size-2 rounded-full bg-ink/20" aria-hidden />
            )}
            {stage}
          </li>
        );
      })}
    </ul>
  );
}
