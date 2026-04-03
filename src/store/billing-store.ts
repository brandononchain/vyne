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
  price: number; // $ per month
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

// ── Credit costs ─────────────────────────────────────────────────────
export const CREDIT_COSTS = {
  simulation: 5,
  deployment: 25,
  run: 10,
};

// ── Store ────────────────────────────────────────────────────────────

interface BillingState {
  // Plan
  currentPlan: PlanTier;
  setPlan: (tier: PlanTier) => void;

  // Credits
  creditsUsed: number;
  creditsTotal: number;
  creditsRemaining: () => number;
  consumeCredits: (amount: number, workflowId: string, workflowName: string, type: UsageEntry["type"]) => boolean;

  // Usage history
  usageHistory: UsageEntry[];

  // Upgrade modal
  upgradeModalOpen: boolean;
  upgradeReason: string;
  openUpgradeModal: (reason: string) => void;
  closeUpgradeModal: () => void;

  // Pricing page
  pricingOpen: boolean;
  openPricing: () => void;
  closePricing: () => void;

  // Can afford checks
  canAffordSimulation: () => boolean;
  canAffordDeployment: () => boolean;
}

// Seed with realistic usage history
const seedHistory: UsageEntry[] = [
  { id: "u1", workflowId: "wf_sample_1", workflowName: "Daily Research Digest", creditsUsed: 10, timestamp: new Date(Date.now() - 3600000).toISOString(), type: "run" },
  { id: "u2", workflowId: "wf_sample_2", workflowName: "Support Ticket Analyzer", creditsUsed: 10, timestamp: new Date(Date.now() - 7200000).toISOString(), type: "run" },
  { id: "u3", workflowId: "wf_sample_1", workflowName: "Daily Research Digest", creditsUsed: 10, timestamp: new Date(Date.now() - 86400000).toISOString(), type: "run" },
  { id: "u4", workflowId: "wf_sample_3", workflowName: "Content Pipeline", creditsUsed: 25, timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), type: "deployment" },
  { id: "u5", workflowId: "wf_sample_2", workflowName: "Support Ticket Analyzer", creditsUsed: 10, timestamp: new Date(Date.now() - 2 * 86400000).toISOString(), type: "run" },
  { id: "u6", workflowId: "wf_sample_1", workflowName: "Daily Research Digest", creditsUsed: 5, timestamp: new Date(Date.now() - 3 * 86400000).toISOString(), type: "simulation" },
  { id: "u7", workflowId: "wf_sample_2", workflowName: "Support Ticket Analyzer", creditsUsed: 25, timestamp: new Date(Date.now() - 5 * 86400000).toISOString(), type: "deployment" },
  { id: "u8", workflowId: "wf_sample_1", workflowName: "Daily Research Digest", creditsUsed: 25, timestamp: new Date(Date.now() - 7 * 86400000).toISOString(), type: "deployment" },
];

const seedCreditsUsed = seedHistory.reduce((s, e) => s + e.creditsUsed, 0);

let entryCounter = seedHistory.length + 1;

export const useBillingStore = create<BillingState>((set, get) => ({
  currentPlan: "pro",
  creditsUsed: seedCreditsUsed,
  creditsTotal: 5000,
  usageHistory: seedHistory,

  setPlan: (tier) => {
    const plan = PLANS.find((p) => p.tier === tier);
    if (plan) {
      set({ currentPlan: tier, creditsTotal: plan.monthlyCredits });
    }
  },

  creditsRemaining: () => get().creditsTotal - get().creditsUsed,

  consumeCredits: (amount, workflowId, workflowName, type) => {
    const remaining = get().creditsRemaining();
    if (remaining < amount) return false;

    const entry: UsageEntry = {
      id: `u${++entryCounter}`,
      workflowId,
      workflowName,
      creditsUsed: amount,
      timestamp: new Date().toISOString(),
      type,
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
