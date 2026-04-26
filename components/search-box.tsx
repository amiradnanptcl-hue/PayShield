"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/cn";

type Suggestion = {
  name: string;
  number: string;
  sector: string;
  slug: string;
  score: number;
  tier: "low" | "medium" | "high" | "critical";
  source: "demo" | "ppr";
};

/* Risk Assessment Matrix v1.0 — autocomplete dot per tier. */
const TIER_DOT: Record<Suggestion["tier"], string> = {
  low: "bg-good",
  medium: "bg-info",
  high: "bg-warn",
  critical: "bg-risk",
};

export function SearchBox({
  initialQuery = "",
  variant = "hero",
}: {
  initialQuery?: string;
  variant?: "hero" | "compact";
}) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [isPending, startTransition] = useTransition();
  const [isNarrow, setIsNarrow] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();

  // Swap placeholder copy on narrow viewports so the full prompt does not
  // truncate at iPhone-class widths. Tracks resize so the placeholder
  // updates when the user rotates or resizes the window. SSR-safe browser
  // capability sniffing — must read `window` after hydration.
  useEffect(() => {
    const update = () => setIsNarrow(window.innerWidth < 480);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Debounced suggestions fetch — canonical effect use case (sync external
  // data with React state). The setSuggestions calls happen after a debounce
  // timer or async network response, never synchronously during a render
  // cycle, so the linter warning here is a false positive.
  useEffect(() => {
    const q = query.trim();
    if (!q) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSuggestions([]);
      return;
    }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/companies/search?q=${encodeURIComponent(q)}`,
          { signal: ctrl.signal },
        );
        if (!res.ok) return;
        const data = (await res.json()) as { results: Suggestion[] };
        setSuggestions(data.results);
        setHighlight(0);
      } catch {
        /* aborted */
      }
    }, 110);
    return () => {
      ctrl.abort();
      clearTimeout(t);
    };
  }, [query]);

  function go(slugOrSuggestion: string | Suggestion) {
    const slug =
      typeof slugOrSuggestion === "string"
        ? slugOrSuggestion
        : slugOrSuggestion.slug;
    setOpen(false);
    startTransition(() => {
      router.push(`/score/${slug}`);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (suggestions.length > 0) {
      go(suggestions[Math.min(highlight, suggestions.length - 1)]);
      return;
    }
    const q = query.trim();
    if (!q) return;
    startTransition(() => {
      router.push(`/?notfound=${encodeURIComponent(q)}`);
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight(
        (h) => (h - 1 + suggestions.length) % suggestions.length,
      );
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const heroSize = variant === "hero";

  return (
    <div className="relative w-full max-w-3xl">
      <form
        onSubmit={onSubmit}
        className={cn(
          "brut-card relative flex items-stretch overflow-hidden bg-paper transition-shadow",
          heroSize ? "h-16 sm:h-20 md:h-24" : "h-14",
        )}
      >
        <div
          className={cn(
            "flex items-center justify-center border-r-2 border-line",
            heroSize ? "w-14 sm:w-20 md:w-24" : "w-14",
          )}
        >
          <Search
            strokeWidth={2.4}
            className={cn(heroSize ? "size-5 sm:size-7" : "size-5", "text-ink")}
            aria-hidden
          />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={onKeyDown}
          name="q"
          autoComplete="off"
          spellCheck={false}
          placeholder={
            heroSize
              ? isNarrow
                ? "UK or NI company name"
                : "Type a UK or NI company name or number"
              : isNarrow
                ? "Check company"
                : "Check another company"
          }
          aria-label="Company name"
          aria-autocomplete="list"
          role="combobox"
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listId}
          aria-activedescendant={
            open && suggestions.length > 0
              ? `${listId}-${highlight}`
              : undefined
          }
          className={cn(
            "min-w-0 flex-1 bg-transparent px-3 outline-none placeholder:text-ink-3 sm:px-4",
            heroSize
              ? "font-display text-lg sm:text-2xl md:text-3xl placeholder:font-display placeholder:text-[13px] sm:placeholder:text-lg md:placeholder:text-xl"
              : "text-base",
          )}
        />

        <button
          type="submit"
          disabled={isPending}
          className={cn(
            "flex shrink-0 items-center gap-2 border-l-2 border-line bg-ink px-5 font-medium text-wash transition hover:bg-ink-2 disabled:opacity-60",
            heroSize ? "text-base md:px-7" : "text-sm",
          )}
        >
          {isPending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="size-4" aria-hidden />
          )}
          <span className={cn(heroSize ? "hidden md:inline" : "hidden sm:inline")}>
            Score it
          </span>
        </button>
      </form>

      {open && suggestions.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          className="brut-card absolute z-30 mt-3 w-full overflow-hidden bg-paper p-0"
        >
          {suggestions.map((s, i) => (
            <li
              id={`${listId}-${i}`}
              key={s.slug}
              role="option"
              aria-selected={i === highlight}
              onMouseDown={(e) => {
                e.preventDefault();
                go(s);
              }}
              onMouseEnter={() => setHighlight(i)}
              className={cn(
                "grid cursor-pointer grid-cols-[auto_1fr] items-center gap-4 border-b border-line/20 px-5 py-3 last:border-b-0 transition",
                i === highlight && "bg-wash-2",
              )}
            >
              <span
                className={cn(
                  "size-2.5 shrink-0 rounded-full",
                  TIER_DOT[s.tier],
                )}
                aria-hidden
              />
              <div className="min-w-0">
                <div className="truncate font-display text-lg font-semibold leading-tight">
                  {s.name}
                </div>
                <div className="truncate font-mono text-xs uppercase tracking-wider text-ink-3">
                  {s.number} · {s.sector}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
