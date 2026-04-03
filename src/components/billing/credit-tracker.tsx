"use client";

import { useBillingStore, PLANS } from "@/store/billing-store";

/**
 * Compact credit ring + text that lives in the topbar.
 * Shows remaining credits as a circular progress indicator.
 */
export function CreditTracker() {
  const { creditsUsed, creditsTotal, currentPlan, openPricing } = useBillingStore();
  const remaining = creditsTotal - creditsUsed;
  const percentage = creditsTotal > 0 ? (remaining / creditsTotal) * 100 : 0;
  const plan = PLANS.find((p) => p.tier === currentPlan);

  // Ring dimensions
  const size = 22;
  const stroke = 2.5;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (percentage / 100) * circumference;

  // Color based on remaining credits
  const ringColor =
    percentage > 40
      ? "var(--vyne-success)"
      : percentage > 15
      ? "var(--vyne-warning)"
      : "var(--vyne-error)";

  return (
    <button
      onClick={openPricing}
      className="flex items-center gap-2 px-2.5 py-1 rounded-lg
                 hover:bg-[var(--vyne-bg-warm)] transition-colors group"
      title="View credits and plans"
    >
      {/* Progress ring */}
      <svg width={size} height={size} className="shrink-0 -rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--vyne-border)"
          strokeWidth={stroke}
        />
        {/* Progress ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className="transition-all duration-500 ease-out"
        />
      </svg>

      {/* Text */}
      <div className="flex items-baseline gap-1">
        <span className="text-[11px] font-bold text-[var(--vyne-text-primary)]">
          {remaining.toLocaleString()}
        </span>
        <span className="text-[9px] text-[var(--vyne-text-tertiary)]">
          / {creditsTotal.toLocaleString()}
        </span>
      </div>

      {/* Plan badge */}
      <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--vyne-accent-bg)] text-[var(--vyne-accent)]">
        {plan?.name}
      </span>
    </button>
  );
}
