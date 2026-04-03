import { create } from "zustand";
import type { CompiledWorkflow } from "@/lib/graph-compiler";

// ── Types ────────────────────────────────────────────────────────────

export type TriggerType = "api" | "webhook" | "schedule";
export type WorkflowStatus = "live" | "paused" | "draft";

export interface DeployedWorkflow {
  id: string;
  name: string;
  description: string;
  triggerType: TriggerType;
  status: WorkflowStatus;
  endpointUrl: string;
  apiKey: string;
  webhookSecret: string;
  deployedAt: string;
  lastRunAt: string | null;
  agentCount: number;
  taskCount: number;
  compiledWorkflow: CompiledWorkflow;

  // Analytics (mocked)
  metrics: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    avgDurationMs: number;
    last7Days: number[]; // runs per day, most recent last
  };
}

export interface DeployModalState {
  isOpen: boolean;
  step: "configure" | "deploying" | "success";
  workflowName: string;
  triggerType: TriggerType;
}

interface DeployStore {
  // ── Deployed workflows ─────────────────────────────
  deployedWorkflows: DeployedWorkflow[];
  addDeployedWorkflow: (workflow: DeployedWorkflow) => void;
  toggleWorkflowStatus: (id: string) => void;
  removeDeployedWorkflow: (id: string) => void;

  // ── Deploy modal ───────────────────────────────────
  deployModal: DeployModalState;
  openDeployModal: () => void;
  closeDeployModal: () => void;
  setDeployModalStep: (step: DeployModalState["step"]) => void;
  setDeployWorkflowName: (name: string) => void;
  setDeployTriggerType: (type: TriggerType) => void;

  // ── View routing ───────────────────────────────────
  currentView: "canvas" | "dashboard" | "templates";
  setCurrentView: (view: "canvas" | "dashboard" | "templates") => void;
}

// ── Helpers ──────────────────────────────────────────────────────────

function generateId(): string {
  return `wf_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function generateApiKey(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const segments = [8, 4, 4, 4, 12].map((len) =>
    Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join("")
  );
  return `vyne_${segments.join("-")}`;
}

function generateWebhookSecret(): string {
  return `whsec_${Array.from({ length: 32 }, () =>
    "abcdef0123456789"[Math.floor(Math.random() * 16)]
  ).join("")}`;
}

function generateMockMetrics(): DeployedWorkflow["metrics"] {
  const totalRuns = Math.floor(Math.random() * 400) + 50;
  const successRate = 0.92 + Math.random() * 0.07;
  const successfulRuns = Math.floor(totalRuns * successRate);
  return {
    totalRuns,
    successfulRuns,
    failedRuns: totalRuns - successfulRuns,
    avgDurationMs: Math.floor(3000 + Math.random() * 12000),
    last7Days: Array.from({ length: 7 }, () => Math.floor(Math.random() * 30) + 2),
  };
}

// Pre-seed with sample deployed workflows for the dashboard
const sampleWorkflows: DeployedWorkflow[] = [
  {
    id: "wf_sample_1",
    name: "Daily Research Digest",
    description: "Researches trending topics and sends a summary email every morning.",
    triggerType: "schedule",
    status: "live",
    endpointUrl: "https://api.vyne.ai/v1/workflows/wf_sample_1/run",
    apiKey: generateApiKey(),
    webhookSecret: generateWebhookSecret(),
    deployedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    agentCount: 2,
    taskCount: 3,
    compiledWorkflow: null as unknown as CompiledWorkflow,
    metrics: { totalRuns: 142, successfulRuns: 139, failedRuns: 3, avgDurationMs: 8200, last7Days: [18, 21, 19, 22, 20, 24, 18] },
  },
  {
    id: "wf_sample_2",
    name: "Support Ticket Analyzer",
    description: "Reads incoming support tickets, categorizes them, and drafts responses.",
    triggerType: "webhook",
    status: "live",
    endpointUrl: "https://api.vyne.ai/v1/workflows/wf_sample_2/webhook",
    apiKey: generateApiKey(),
    webhookSecret: generateWebhookSecret(),
    deployedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    lastRunAt: new Date(Date.now() - 1200000).toISOString(),
    agentCount: 3,
    taskCount: 2,
    compiledWorkflow: null as unknown as CompiledWorkflow,
    metrics: { totalRuns: 387, successfulRuns: 381, failedRuns: 6, avgDurationMs: 5400, last7Days: [52, 48, 61, 55, 59, 63, 49] },
  },
  {
    id: "wf_sample_3",
    name: "Content Pipeline",
    description: "Generates blog drafts from topic briefs and sends for review.",
    triggerType: "api",
    status: "paused",
    endpointUrl: "https://api.vyne.ai/v1/workflows/wf_sample_3/run",
    apiKey: generateApiKey(),
    webhookSecret: generateWebhookSecret(),
    deployedAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    lastRunAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    agentCount: 2,
    taskCount: 4,
    compiledWorkflow: null as unknown as CompiledWorkflow,
    metrics: { totalRuns: 63, successfulRuns: 60, failedRuns: 3, avgDurationMs: 15200, last7Days: [4, 6, 3, 0, 0, 0, 0] },
  },
];

export const useDeployStore = create<DeployStore>((set, get) => ({
  // ── Deployed workflows ─────────────────────────────
  deployedWorkflows: sampleWorkflows,

  addDeployedWorkflow: (workflow) => {
    set({ deployedWorkflows: [workflow, ...get().deployedWorkflows] });
  },

  toggleWorkflowStatus: (id) => {
    set({
      deployedWorkflows: get().deployedWorkflows.map((w) =>
        w.id === id
          ? { ...w, status: (w.status === "live" ? "paused" : "live") as WorkflowStatus }
          : w
      ),
    });
  },

  removeDeployedWorkflow: (id) => {
    set({ deployedWorkflows: get().deployedWorkflows.filter((w) => w.id !== id) });
  },

  // ── Deploy modal ───────────────────────────────────
  deployModal: {
    isOpen: false,
    step: "configure",
    workflowName: "",
    triggerType: "api",
  },

  openDeployModal: () =>
    set({
      deployModal: {
        isOpen: true,
        step: "configure",
        workflowName: "",
        triggerType: "api",
      },
    }),

  closeDeployModal: () =>
    set({
      deployModal: { ...get().deployModal, isOpen: false },
    }),

  setDeployModalStep: (step) =>
    set({ deployModal: { ...get().deployModal, step } }),

  setDeployWorkflowName: (name) =>
    set({ deployModal: { ...get().deployModal, workflowName: name } }),

  setDeployTriggerType: (type) =>
    set({ deployModal: { ...get().deployModal, triggerType: type } }),

  // ── View routing ───────────────────────────────────
  currentView: "canvas",
  setCurrentView: (view) => set({ currentView: view }),
}));

// ── Deploy action (called from modal) ────────────────────────────────
export function deployWorkflow(
  compiledWorkflow: CompiledWorkflow,
  name: string,
  triggerType: TriggerType
): DeployedWorkflow {
  const id = generateId();
  return {
    id,
    name,
    description: `${compiledWorkflow.agents.length} agents, ${compiledWorkflow.tasks.length} tasks`,
    triggerType,
    status: "live",
    endpointUrl:
      triggerType === "webhook"
        ? `https://api.vyne.ai/v1/workflows/${id}/webhook`
        : `https://api.vyne.ai/v1/workflows/${id}/run`,
    apiKey: generateApiKey(),
    webhookSecret: generateWebhookSecret(),
    deployedAt: new Date().toISOString(),
    lastRunAt: null,
    agentCount: compiledWorkflow.agents.length,
    taskCount: compiledWorkflow.tasks.length,
    compiledWorkflow,
    metrics: generateMockMetrics(),
  };
}
