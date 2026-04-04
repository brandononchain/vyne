"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Leaf, ArrowRight, Sprout, Heart, TrendingUp } from "lucide-react";
import { useBillingStore, PLANS, type PlanConfig } from "@/store/billing-store";

function PlanCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: PlanConfig;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <div
      className={`
        relative flex-1 rounded-2xl border p-4 transition-all duration-200
        ${plan.highlighted ? "border-[var(--vyne-accent)] bg-[var(--vyne-accent-bg)]/30 shadow-md" : "border-[var(--vyne-border)] bg-white"}
      `}
    >
      {plan.highlighted && (
        <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[var(--vyne-accent)] text-white text-[9px] font-bold uppercase tracking-wider">
          Most Popular
        </div>
      )}

      <h4 className="text-[13px] font-bold text-[var(--vyne-text-primary)] mb-0.5">
        {plan.name}
      </h4>
      <div className="flex items-baseline gap-1 mb-3">
        <span className="text-[24px] font-black text-[var(--vyne-text-primary)]">
          ${plan.price}
        </span>
        <span className="text-[11px] text-[var(--vyne-text-tertiary)]">/month</span>
      </div>

      <ul className="space-y-1.5 mb-4">
        {plan.features.slice(0, 4).map((f) => (
          <li key={f} className="flex items-start gap-1.5">
            <Leaf size={10} className="text-[var(--vyne-accent)] shrink-0 mt-0.5" />
            <span className="text-[10px] text-[var(--vyne-text-secondary)] leading-snug">
              {f}
            </span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`
          w-full py-2 rounded-xl text-[11px] font-semibold transition-all
          ${
            isCurrent
              ? "bg-[var(--vyne-bg)] text-[var(--vyne-text-tertiary)] cursor-default"
              : plan.highlighted
              ? "bg-[var(--vyne-accent)] text-white hover:opacity-90 shadow-sm"
              : "bg-[var(--vyne-bg-warm)] text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-border)]"
          }
        `}
      >
        {isCurrent ? "Current Plan" : `Upgrade to ${plan.name}`}
      </button>
    </div>
  );
}

export function UpgradeModal() {
  const {
    upgradeModalOpen,
    upgradeReason,
    closeUpgradeModal,
    currentPlan,
    setPlan,
    creditsTotal,
    creditsUsed,
  } = useBillingStore();

  const remaining = creditsTotal - creditsUsed;
  const usedPercentage = creditsTotal > 0 ? Math.round((creditsUsed / creditsTotal) * 100) : 0;

  const handleUpgrade = (tier: PlanConfig["tier"]) => {
    setPlan(tier);
    closeUpgradeModal();
  };

  return (
    <AnimatePresence>
      {upgradeModalOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[70] bg-black/20 backdrop-blur-[2px]"
            onClick={closeUpgradeModal}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[71]
                       w-[560px] bg-white rounded-2xl border border-[var(--vyne-border)]
                       shadow-[var(--shadow-lg)] overflow-hidden"
          >
            {/* Header */}
            <div className="px-6 pt-5 pb-4 text-center relative">
              <button
                onClick={closeUpgradeModal}
                className="absolute right-4 top-4 w-7 h-7 rounded-lg flex items-center justify-center
                           text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                           hover:bg-[var(--vyne-bg-warm)] transition-colors"
              >
                <X size={14} />
              </button>

              <div className="w-12 h-12 mx-auto rounded-2xl bg-[var(--vyne-task-bg)] flex items-center justify-center mb-3">
                <Sprout size={22} className="text-[var(--vyne-task)]" />
              </div>

              <h2 className="text-[17px] font-bold text-[var(--vyne-text-primary)] mb-1">
                {remaining <= 0 ? "You've used all your credits!" : "Running low on credits"}
              </h2>
              <p className="text-[12px] text-[var(--vyne-text-secondary)] max-w-[380px] mx-auto leading-relaxed">
                {upgradeReason ||
                  `You've used ${usedPercentage}% of your monthly credits. Upgrade your plan to keep your workflows running smoothly.`}
              </p>
            </div>

            {/* Value callout */}
            <div className="mx-6 mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-100 flex items-start gap-2">
              <Heart size={13} className="text-[var(--vyne-success)] shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold text-emerald-800 mb-0.5">
                  Your workflows have been busy!
                </p>
                <p className="text-[10px] text-emerald-700 leading-snug">
                  You've automated {creditsUsed.toLocaleString()} actions so far this month.
                  That's hours of manual work saved. Upgrading means your agents never stop working.
                </p>
              </div>
            </div>

            {/* Plans */}
            <div className="px-6 pb-5 flex gap-3">
              {PLANS.map((plan) => (
                <PlanCard
                  key={plan.tier}
                  plan={plan}
                  isCurrent={currentPlan === plan.tier}
                  onSelect={() => handleUpgrade(plan.tier)}
                />
              ))}
            </div>

            {/* Footer */}
            <div className="px-6 py-3 border-t border-[var(--vyne-border)] bg-[var(--vyne-bg-warm)] text-center">
              <p className="text-[10px] text-[var(--vyne-text-tertiary)]">
                Credits reset on the 1st of each month. Unused credits don't roll over.
                Cancel anytime.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
