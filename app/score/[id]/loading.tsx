import { StageIndicator } from "@/components/stage-indicator";

export default function Loading() {
  return (
    <>
      <header className="border-b-2 border-line bg-wash">
        <div className="mx-auto flex h-12 max-w-6xl items-center justify-between px-5 font-mono text-[11px] uppercase tracking-[0.18em] text-ink-3 md:px-8">
          <span>PayShield</span>
          <span className="inline-flex items-center gap-2">
            <span className="anim-pulse-dot size-1.5 rounded-full bg-risk" />
            PayShield is reasoning…
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-10 px-5 pb-20 pt-10 md:gap-14 md:px-8 md:pt-14">
        {/* Mast skeleton */}
        <section className="grid gap-6 border-b-2 border-line pb-8 md:grid-cols-[1fr_auto] md:items-end">
          <div className="space-y-3">
            <div className="skeleton-shimmer h-3 w-52 border border-line/20" />
            <div className="skeleton-shimmer h-16 w-3/4 border-2 border-line" />
            <div className="skeleton-shimmer h-3 w-2/3 border border-line/20" />
          </div>
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer h-7 w-32 border-2 border-line"
              />
            ))}
          </div>
        </section>

        {/* Hero skeleton */}
        <div className="grid gap-6 md:gap-8 xl:grid-cols-[1.55fr_1fr]">
          <div className="brut-ink relative grid grid-cols-1 gap-8 bg-ink p-10 text-wash xl:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-6">
              <div className="h-3 w-44 bg-wash/15" />
              <div className="h-32 w-3/4 bg-wash/15" />
              <div className="h-2 w-full bg-wash/15" />
              <div className="h-6 w-2/3 bg-wash/15" />
              <div className="grid grid-cols-2 gap-4">
                <div className="h-10 bg-wash/15" />
                <div className="h-10 bg-wash/15" />
              </div>

              <StageIndicator />
            </div>
            <div className="hidden items-center justify-center xl:flex">
              <div className="size-56 rounded-full border-[14px] border-wash/15" />
            </div>
          </div>

          <div className="brut-card flex flex-col gap-4 bg-paper p-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="skeleton-shimmer h-14 w-full border-2 border-line"
              />
            ))}
          </div>
        </div>

        {/* Reasoning skeleton */}
        <section className="brut-card bg-paper divide-y-2 divide-line">
          <div className="bg-wash-2 px-6 py-5">
            <div className="skeleton-shimmer h-7 w-1/2 border border-line/20" />
          </div>
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[auto_1fr_auto] items-start gap-4 px-6 py-5"
            >
              <div className="skeleton-shimmer h-4 w-6 border border-line/20" />
              <div className="space-y-2">
                <div className="skeleton-shimmer h-5 w-2/3 border border-line/20" />
                <div className="skeleton-shimmer h-3 w-full border border-line/10" />
              </div>
              <div className="skeleton-shimmer h-3 w-20 border border-line/10" />
            </div>
          ))}
        </section>
      </main>
    </>
  );
}
