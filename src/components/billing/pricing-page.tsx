"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Check, Leaf, ArrowRight, Shield, Sprout, Crown } from "lucide-react";
import { useBillingStore, PLANS, CREDIT_COSTS, type PlanConfig, type PlanTier } from "@/store/billing-store";
import { useState } from "react";

// ── Confirmation step after selecting a plan ─────────────────────────
function ConfirmStep({
  plan,
  currentPlan,
  onConfirm,
  onBack,
}: {
  plan: PlanConfig;
  currentPlan: PlanTier;
  onConfirm: () => void;
  onBack: () => void;
}) {
  const isDowngrade = PLANS.findIndex((p) => p.tier === plan.tier) < PLANS.findIndex((p) => p.tier === currentPlan);
  const currentPlanData = PLANS.find((p) => p.tier === currentPlan)!;

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -40 }}
      className="flex flex-col items-center justify-center h-full px-8"
    >
      <div className="w-full max-w-[420px] text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
          {isDowngrade ? <Sprout size={28} className="text-[var(--vyne-accent)]" /> : <Crown size={28} className="text-[var(--vyne-accent)]" />}
        </div>

        <h2 className="text-[22px] font-bold text-[var(--vyne-text-primary)] mb-2">
          {isDowngrade ? `Downgrade to ${plan.name}?` : `Upgrade to ${plan.name}`}
        </h2>
        <p className="text-[13px] text-[var(--vyne-text-secondary)] leading-relaxed mb-6 max-w-[360px] mx-auto">
          {isDowngrade
            ? `You'll move from ${currentPlanData.monthlyCredits.toLocaleString()} to ${plan.monthlyCredits.toLocaleString()} credits/month. Your current workflows will continue until the billing period ends.`
            : `You'll get ${plan.monthlyCredits.toLocaleString()} credits per month — that's ${(plan.monthlyCredits - currentPlanData.monthlyCredits).toLocaleString()} more than your current plan.`}
        </p>

        {/* Price comparison */}
        <div className="flex items-center justify-center gap-6 mb-6">
          <div className="text-center opacity-50">
            <p className="text-[11px] text-[var(--vyne-text-tertiary)] mb-1">Current</p>
            <p className="text-[20px] font-bold text-[var(--vyne-text-primary)] line-through">${currentPlanData.price}</p>
          </div>
          <ArrowRight size={16} className="text-[var(--vyne-text-tertiary)]" />
          <div className="text-center">
            <p className="text-[11px] text-[var(--vyne-accent)] font-semibold mb-1">New Plan</p>
            <p className="text-[28px] font-black text-[var(--vyne-accent)]">${plan.price}</p>
            <p className="text-[10px] text-[var(--vyne-text-tertiary)]">/month</p>
          </div>
        </div>

        {/* Key benefits */}
        {!isDowngrade && (
          <div className="bg-[var(--vyne-bg)] rounded-2xl p-4 mb-6 text-left">
            <p className="text-[10px] font-semibold text-[var(--vyne-text-tertiary)] uppercase tracking-wider mb-2.5">What you'll get</p>
            <div className="space-y-2">
              {plan.features.slice(0, 4).map((f) => (
                <div key={f} className="flex items-center gap-2">
                  <Check size={12} className="text-[var(--vyne-accent)] shrink-0" />
                  <span className="text-[12px] text-[var(--vyne-text-secondary)]">{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-2xl text-[13px] font-semibold border border-[var(--vyne-border)]
                       text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
          >
            Back to plans
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 rounded-2xl text-[13px] font-semibold
                       bg-[var(--vyne-accent)] text-white hover:opacity-90 transition-opacity shadow-md
                       flex items-center justify-center gap-2"
          >
            {isDowngrade ? "Confirm Downgrade" : "Confirm Upgrade"}
            <ArrowRight size={14} />
          </button>
        </div>

        <p className="text-[10px] text-[var(--vyne-text-tertiary)] mt-3">
          {isDowngrade
            ? "Changes take effect at the end of your current billing period."
            : "You'll be charged the prorated difference immediately."}
        </p>
      </div>
    </motion.div>
  );
}

// ── Plan card ────────────────────────────────────────────────────────
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
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        relative flex flex-col flex-1 rounded-[22px] border-[1.5px] p-6 transition-all min-w-0
        ${plan.highlighted
          ? "border-[var(--vyne-accent)] bg-white shadow-[0_4px_24px_rgba(74,124,89,0.12)] scale-[1.02] z-10"
          : "border-[var(--vyne-border)] bg-white shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"}
      `}
    >
      {plan.highlighted && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-[var(--vyne-accent)] text-white text-[10px] font-bold uppercase tracking-wider shadow-md">
          Recommended
        </div>
      )}

      <div className="mb-4">
        <h3 className="text-[15px] font-bold text-[var(--vyne-text-primary)] mb-2">{plan.name}</h3>
        <div className="flex items-baseline gap-1">
          <span className="text-[38px] font-black text-[var(--vyne-text-primary)] tracking-tight leading-none">${plan.price}</span>
          <span className="text-[12px] text-[var(--vyne-text-tertiary)] font-medium">/month</span>
        </div>
        <p className="text-[11px] text-[var(--vyne-text-secondary)] mt-1.5 font-medium">
          {plan.monthlyCredits.toLocaleString()} credits per month
        </p>
      </div>

      <div className="flex-1 mb-5">
        <ul className="space-y-2">
          {plan.features.map((f) => (
            <li key={f} className="flex items-start gap-2">
              <Check size={13} className={`shrink-0 mt-0.5 ${plan.highlighted ? "text-[var(--vyne-accent)]" : "text-[var(--vyne-success)]"}`} />
              <span className="text-[11.5px] text-[var(--vyne-text-secondary)] leading-snug">{f}</span>
            </li>
          ))}
        </ul>
      </div>

      <button
        onClick={onSelect}
        disabled={isCurrent}
        className={`
          w-full py-3 rounded-2xl text-[12px] font-semibold transition-all flex items-center justify-center gap-1.5
          ${isCurrent
            ? "bg-[var(--vyne-bg)] text-[var(--vyne-text-tertiary)] cursor-default border border-[var(--vyne-border)]"
            : plan.highlighted
            ? "bg-[var(--vyne-accent)] text-white hover:opacity-90 shadow-md"
            : "bg-[var(--vyne-bg-warm)] text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-border)] border border-[var(--vyne-border)]"}
        `}
      >
        {isCurrent ? "Current Plan" : plan.price === 0 ? "Downgrade" : "Upgrade"}
        {!isCurrent && <ArrowRight size={12} />}
      </button>
    </motion.div>
  );
}

// ── Main pricing page ───────────────────────────────────────────────
export function PricingPage() {
  const { pricingOpen, closePricing, currentPlan, setPlan, creditsUsed, creditsTotal } = useBillingStore();
  const [selectedPlan, setSelectedPlan] = useState<PlanConfig | null>(null);

  const remaining = creditsTotal - creditsUsed;

  const handleSelect = (plan: PlanConfig) => {
    if (plan.tier === currentPlan) return;
    setSelectedPlan(plan);
  };

  const handleConfirm = () => {
    if (selectedPlan) {
      setPlan(selectedPlan.tier);
      setSelectedPlan(null);
      closePricing();
    }
  };

  const handleClose = () => {
    setSelectedPlan(null);
    closePricing();
  };

  return (
    <AnimatePresence>
      {pricingOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[80] bg-black/25 backdrop-blur-sm"
            onClick={handleClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 20 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed inset-4 sm:inset-6 md:inset-8 lg:left-[10%] lg:right-[10%] lg:top-[4%] lg:bottom-[4%]
                       z-[81] bg-[var(--vyne-bg)] rounded-3xl border border-[var(--vyne-border)]
                       shadow-[0_16px_64px_rgba(26,35,22,0.15)] flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-8 pt-6 pb-2 shrink-0">
              <div>
                <h2 className="text-[22px] font-bold text-[var(--vyne-text-primary)]">Plans & Pricing</h2>
                <p className="text-[12px] text-[var(--vyne-text-secondary)] mt-0.5">
                  {remaining.toLocaleString()} credits remaining this month
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-9 h-9 rounded-xl flex items-center justify-center
                           text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                           hover:bg-white transition-colors border border-transparent hover:border-[var(--vyne-border)]"
              >
                <X size={18} />
              </button>
            </div>

            {/* Content area — fills remaining space */}
            <div className="flex-1 flex flex-col justify-center min-h-0 px-8 py-4">
              <AnimatePresence mode="wait">
                {selectedPlan ? (
                  <ConfirmStep
                    key="confirm"
                    plan={selectedPlan}
                    currentPlan={currentPlan}
                    onConfirm={handleConfirm}
                    onBack={() => setSelectedPlan(null)}
                  />
                ) : (
                  <motion.div
                    key="plans"
                    initial={{ opacity: 0, x: -40 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 40 }}
                    className="flex flex-col gap-5"
                  >
                    {/* Plan cards row */}
                    <div className="flex gap-4 items-stretch">
                      {PLANS.map((plan, i) => (
                        <motion.div key={plan.tier} className="flex-1 flex" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}>
                          <PricingCard plan={plan} isCurrent={currentPlan === plan.tier} onSelect={() => handleSelect(plan)} />
                        </motion.div>
                      ))}
                    </div>

                    {/* Credits + guarantee row */}
                    <div className="flex gap-4">
                      {/* Credit costs */}
                      <div className="flex-1 p-5 rounded-2xl bg-white border border-[var(--vyne-border)]">
                        <h4 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-3 flex items-center gap-1.5">
                          <Leaf size={13} className="text-[var(--vyne-accent)]" />
                          How credits work
                        </h4>
                        <div className="flex gap-3">
                          {[
                            { action: "Test Simulation", cost: CREDIT_COSTS.simulation, desc: "Per simulation run" },
                            { action: "Deploy Workflow", cost: CREDIT_COSTS.deployment, desc: "One-time per deploy" },
                            { action: "Live Execution", cost: CREDIT_COSTS.run, desc: "Per workflow run" },
                          ].map((item) => (
                            <div key={item.action} className="flex-1 p-3 rounded-xl bg-[var(--vyne-bg)] text-center">
                              <p className="text-[18px] font-bold text-[var(--vyne-accent)]">{item.cost}</p>
                              <p className="text-[10px] font-semibold text-[var(--vyne-text-primary)] mt-0.5">{item.action}</p>
                              <p className="text-[9px] text-[var(--vyne-text-tertiary)]">{item.desc}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Guarantee */}
                      <div className="w-[260px] shrink-0 p-5 rounded-2xl bg-[var(--vyne-accent-bg)]/50 border border-[var(--vyne-accent)]/10 flex flex-col justify-center">
                        <Shield size={18} className="text-[var(--vyne-accent)] mb-2" />
                        <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-1">Risk-free guarantee</p>
                        <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-relaxed">
                          14-day free trial on upgrades. Cancel or downgrade anytime — no penalties, no questions asked.
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
