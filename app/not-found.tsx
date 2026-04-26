import Link from "next/link";

export default function NotFound() {
  return (
    <main className="atmo flex flex-1 items-center justify-center px-5 py-24">
      <section className="brut-card mx-auto w-full max-w-xl bg-paper p-9 md:p-12">
        <div className="font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3">
          404 · page not found
        </div>
        <h1 className="mt-3 font-display text-5xl font-extrabold leading-[0.95] tracking-tight md:text-6xl">
          That route isn’t scored yet.
        </h1>
        <p className="mt-4 text-lg leading-relaxed text-ink-2">
          Head back home and try a customer name. The five demo anchors will
          score in under eight seconds.
        </p>
        <Link
          href="/"
          className="brut-card-sm mt-8 inline-flex items-center gap-2 bg-ink px-4 py-2.5 font-medium text-wash"
        >
          Back home
        </Link>
      </section>
    </main>
  );
}
