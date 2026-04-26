import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { DEMO_COMPANIES } from "@/lib/demo/companies";

export default function NotFound() {
  return (
    <main className="atmo flex flex-1 items-center justify-center px-5 py-20 md:py-28">
      <section className="brut-card mx-auto w-full max-w-2xl bg-paper p-9 md:p-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
          404 · score not found
        </div>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-6xl">
          That company isn’t in the demo cache.
        </h1>
        <p className="mt-5 text-lg leading-relaxed text-ink-2">
          PayShield runs from a five-company demo cache for the live pitch. Pick
          one of the anchors below or head back home to start over.
        </p>
        <div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {DEMO_COMPANIES.map((c) => (
            <Link
              key={c.slug}
              href={`/score/${c.slug}`}
              className="brut-card-sm group flex items-center justify-between gap-4 bg-wash px-4 py-3"
            >
              <div className="min-w-0">
                <div className="truncate font-display text-base font-semibold leading-tight">
                  {c.name}
                </div>
                <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
                  Score {c.card.score} · {c.card.tier}
                </div>
              </div>
              <ArrowRight
                className="size-4 shrink-0 text-ink-3 transition group-hover:translate-x-1 group-hover:text-ink"
                aria-hidden
              />
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
