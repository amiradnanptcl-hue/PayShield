"use client";

import Link from "next/link";
import { useEffect } from "react";
import { ArrowRight } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("PayShield error", error);
  }, [error]);

  return (
    <main className="atmo flex flex-1 items-center justify-center px-5 py-24">
      <section className="brut-card mx-auto w-full max-w-xl bg-paper p-9 md:p-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
          Something interrupted us
        </div>
        <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.02] tracking-tight md:text-5xl">
          PayShield is regrouping. Try again in a moment.
        </h1>
        <p className="mt-5 leading-relaxed text-ink-2">
          The reasoning step failed to come back cleanly. We have logged the
          incident. Reloading usually clears it.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="brut-card-sm inline-flex items-center gap-2 bg-ink px-4 py-2.5 font-medium text-wash"
          >
            Try again <ArrowRight className="size-4" aria-hidden />
          </button>
          <Link
            href="/"
            className="brut-card-sm inline-flex items-center gap-2 bg-wash px-4 py-2.5 font-medium text-ink"
          >
            Back home
          </Link>
        </div>
        {error.digest && (
          <p className="mt-6 font-mono text-[11px] uppercase tracking-[0.16em] text-ink-3">
            digest · {error.digest}
          </p>
        )}
      </section>
    </main>
  );
}
