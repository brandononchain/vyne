"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Sparkles, ArrowRight, Shield } from "lucide-react";
import { useBillingStore, PLANS, CREDIT_COSTS, type PlanConfig } from "@/store/billing-store";

function PricingCard({
  plan,
  isCurrent,
  onSelect,
}: {
  plan: PlanConfig;
  isCurrent: boolean;
  onSelect: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative flex flex-col flex-1 rounded-2xl border p-6 transition-all
        ${
          plan.highlighted
            ? "border-[var(--vyne-accent)] bg-white shadow-lg scale-[1.02]"
            : "border-[var(--vyne-border)] bg-white shadow-[var(--shadow-sm)]"
        }
      `}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--vyne-accent)] text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
          Recommended
        </div>
      )}

      <div className="mb-5">
        <h3 className="text-[16px] font-bold text-[var(--vyne-text-primary)] mb-1">
          {plan.name}
        </h3>
        <div className="flex items-baseline gap-1">
          <span className="text-[36px] font-black text-[var(--vyne-text-primary)] tracking-tight">
            ${plan.price}
          </span>
          <span className="text-[12px] text-[var(--vyne-text-tertiary)]">/month</span>
        </div>
        <p className="text-[11px] text-[var(--vyne-text-secondary)] mt-1">
          {plan.monthlyCredits.toLocaleString()} credits per month
        </p>
      </div>

      <ul className="flex-1 space-y-2.5 mb-6">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check
              size={13}
              className={`shrink-0 mt-0.5 ${
                plan.highlighted ? "text-[var(--vyne-accent)]" : "text-[var(--vyne-success)]"
              }`}
            />
            <span className="text-[11px] text-[var(--vyne-text-secondary)] leading-snug">{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`
          w-full py-2.5 rounded-xl text-[12px] font-semibold transition-all
          ${
            isCurrent
              ? "bg-[var(--vyne-bg)] text-[var(--vyne-text-tertiary)] cursor-default"
              : plan.highlighted
              ? "bg-[var(--vyne-accent)] text-white hover:opacity-90 shadow-md"
              : "bg-[var(--vyne-bg-warm)] text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-border)] border border-[var(--vyne-border)]"
          }
        `}
      >
        {isCurrent ? "Current Plan" : plan.price === 0 ? "Downgrade" : "Upgrade"}
        {!isCurrent && <ArrowRight size={12} className="inline ml-1" />}
      </button>
    </motion.div>
  );
}

export function PricingPage() {
  const { pricingOpen, closePricing, currentPlan, setPlan, creditsUsed, creditsTotal } =
    useBillingStore();

  const remaining = creditsTotal - creditsUsed;

  return (
    <AnimatePresence>
      {pricingOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/20 backdrop-blur-[2px]"
            onClick={closePricing}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 24 }}
            transition={{ type: "spring", stiffness: 350, damping: 28 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[81]
                       w-[720px] max-h-[85vh] bg-[var(--vyne-bg)] rounded-2xl border border-[var(--vyne-border)]
                       shadow-[var(--shadow-lg)] overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-[var(--vyne-bg)] px-8 pt-6 pb-4">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-[20px] font-bold text-[var(--vyne-text-primary)]">
                    Plans & Pricing
                  </h2>
                  <p className="text-[12px] text-[var(--vyne-text-secondary)]">
                    {remaining.toLocaleString()} credits remaining this month
                  </p>
                </div>
                <button
                  onClick={closePricing}
                  className="w-8 h-8 rounded-lg flex items-center justify-center
                             text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                             hover:bg-white transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Plan cards */}
            <div className="px-8 pb-4 flex gap-4 items-stretch">
              {PLANS.map((plan) => (
                <PricingCard
                  key={plan.tier}
                  plan={plan}
                  isCurrent={currentPlan === plan.tier}
                  onSelect={() => {
                    setPlan(plan.tier);
                    closePricing();
                  }}
                />
              ))}
            </div>

            {/* Credit costs table */}
            <div className="px-8 pb-6">
              <div className="p-4 rounded-xl bg-white border border-[var(--vyne-border)]">
                <h4 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-3 flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[var(--vyne-accent)]" />
                  How credits work
                </h4>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { action: "Test Simulation", cost: CREDIT_COSTS.simulation, desc: "Per simulation run" },
                    { action: "Deploy Workflow", cost: CREDIT_COSTS.deployment, desc: "One-time per deploy" },
                    { action: "Live Execution", cost: CREDIT_COSTS.run, desc: "Per workflow run" },
                  ].map((item) => (
                    <div key={item.action} className="p-3 rounded-xl bg-[var(--vyne-bg)] text-center">
                      <p className="text-[16px] font-bold text-[var(--vyne-accent)]">{item.cost}</p>
                      <p className="text-[10px] font-semibold text-[var(--vyne-text-primary)]">{item.action}</p>
                      <p className="text-[9px] text-[var(--vyne-text-tertiary)]">{item.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-8 pb-6">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                <Shield size={13} className="text-[var(--vyne-success)] shrink-0 mt-0.5" />
                <p className="text-[10px] text-emerald-700 leading-snug">
                  All plans include a 14-day free trial of the next tier. Cancel or downgrade anytime with no penalties. Your workflows continue running until the end of your billing period.
                </p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
