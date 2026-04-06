import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────

export type PlanTier = "hobby" | "pro" | "business";

export interface UsageEntry {
  id: string;
  workflowId: string;
  workflowName: string;
  creditsUsed: number;
  timestamp: string;
  type: "simulation" | "deployment" | "run";
}

export interface PlanConfig {
  tier: PlanTier;
  name: string;
  monthlyCredits: number;
  price: number;
  features: string[];
  highlighted?: boolean;
}

export const PLANS: PlanConfig[] = [
  {
    tier: "hobby",
    name: "Hobby",
    monthlyCredits: 1000,
    price: 0,
    features: [
      "1,000 Action Credits / month",
      "3 deployed workflows",
      "Basic agent templates",
      "Community support",
      "API access",
    ],
  },
  {
    tier: "pro",
    name: "Pro",
    monthlyCredits: 5000,
    price: 29,
    highlighted: true,
    features: [
      "5,000 Action Credits / month",
      "Unlimited deployed workflows",
      "All agent templates",
      "Priority support",
      "Advanced tools & integrations",
      "Team collaboration (3 seats)",
      "Webhook triggers",
      "Custom branding",
    ],
  },
  {
    tier: "business",
    name: "Business",
    monthlyCredits: 25000,
    price: 99,
    features: [
      "25,000 Action Credits / month",
      "Unlimited everything",
      "All Pro features",
      "Dedicated account manager",
      "SSO & SAML",
      "Audit logs",
      "Custom SLA",
      "Unlimited team seats",
      "On-premise deployment option",
    ],
  },
];

export const CREDIT_COSTS = {
  simulation: 5,
  deployment: 25,
  run: 10,
};

// ── Store — starts at defaults, loaded from DB via API ───────────────

interface BillingState {
  currentPlan: PlanTier;
  setPlan: (tier: PlanTier) => void;

  creditsUsed: number;
  creditsTotal: number;
  setCredits: (used: number, total: number) => void;
  creditsRemaining: () => number;
  consumeCredits: (amount: number, workflowId: string, workflowName: string, type: UsageEntry["type"]) => boolean;

  usageHistory: UsageEntry[];
  setUsageHistory: (entries: UsageEntry[]) => void;

  upgradeModalOpen: boolean;
  upgradeReason: string;
  openUpgradeModal: (reason: string) => void;
  closeUpgradeModal: () => void;

  pricingOpen: boolean;
  openPricing: () => void;
  closePricing: () => void;

  canAffordSimulation: () => boolean;
  canAffordDeployment: () => boolean;
}

let entryCounter = 0;

export const useBillingStore = create<BillingState>((set, get) => ({
  currentPlan: "hobby",
  creditsUsed: 0,
  creditsTotal: 1000,
  usageHistory: [],

  setPlan: (tier) => {
    const plan = PLANS.find((p) => p.tier === tier);
    if (plan) set({ currentPlan: tier, creditsTotal: plan.monthlyCredits });
  },

  setCredits: (used, total) => set({ creditsUsed: used, creditsTotal: total }),

  setUsageHistory: (entries) => set({ usageHistory: entries }),

  creditsRemaining: () => get().creditsTotal - get().creditsUsed,

  consumeCredits: (amount, workflowId, workflowName, type) => {
    const remaining = get().creditsRemaining();
    if (remaining < amount) return false;
    const entry: UsageEntry = {
      id: `u${++entryCounter}`,
      workflowId, workflowName, creditsUsed: amount,
      timestamp: new Date().toISOString(), type,
    };
    set({
      creditsUsed: get().creditsUsed + amount,
      usageHistory: [entry, ...get().usageHistory],
    });
    return true;
  },

  canAffordSimulation: () => get().creditsRemaining() >= CREDIT_COSTS.simulation,
  canAffordDeployment: () => get().creditsRemaining() >= CREDIT_COSTS.deployment,

  upgradeModalOpen: false,
  upgradeReason: "",
  openUpgradeModal: (reason) => set({ upgradeModalOpen: true, upgradeReason: reason }),
  closeUpgradeModal: () => set({ upgradeModalOpen: false }),

  pricingOpen: false,
  openPricing: () => set({ pricingOpen: true }),
  closePricing: () => set({ pricingOpen: false }),
}));
