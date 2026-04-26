import { cn } from "@/lib/cn";
import type { ScoreCard } from "@/lib/scoring/schema";

/* Risk Assessment Matrix v1.0 — fill per tier. */
const TIER_FILL: Record<ScoreCard["tier"], string> = {
  low: "bg-good",
  medium: "bg-info",
  high: "bg-warn",
  critical: "bg-risk",
};

export function ScoreMeter({
  score,
  tier,
  className,
}: {
  score: number;
  tier: ScoreCard["tier"];
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, score));
  return (
    <div
      className={cn("h-3 w-full overflow-hidden border-2 border-line bg-paper", className)}
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={score}
    >
      <div
        className={cn("anim-risk-fill h-full", TIER_FILL[tier])}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
