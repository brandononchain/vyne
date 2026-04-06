import { create } from "zustand";
import type { CompiledWorkflow } from "@/lib/graph-compiler";
import type { VyneNode, VyneEdge } from "@/lib/types";

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
  sourceNodes: VyneNode[];
  sourceEdges: VyneEdge[];
  metrics: {
    totalRuns: number;
    successfulRuns: number;
    failedRuns: number;
    avgDurationMs: number;
    last7Days: number[];
  };
}

export interface DeployModalState {
  isOpen: boolean;
  step: "configure" | "deploying" | "success";
  workflowName: string;
  triggerType: TriggerType;
}

interface DeployStore {
  deployedWorkflows: DeployedWorkflow[];
  addDeployedWorkflow: (workflow: DeployedWorkflow) => void;
  setDeployedWorkflows: (workflows: DeployedWorkflow[]) => void;
  toggleWorkflowStatus: (id: string) => void;
  removeDeployedWorkflow: (id: string) => void;

  deployModal: DeployModalState;
  openDeployModal: () => void;
  closeDeployModal: () => void;
  setDeployModalStep: (step: DeployModalState["step"]) => void;
  setDeployWorkflowName: (name: string) => void;
  setDeployTriggerType: (type: TriggerType) => void;

  currentView: "canvas" | "dashboard" | "templates" | "settings";
  setCurrentView: (view: "canvas" | "dashboard" | "templates" | "settings") => void;
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

// ── Store — starts EMPTY, loaded from API ────────────────────────────

export const useDeployStore = create<DeployStore>((set, get) => ({
  deployedWorkflows: [],

  addDeployedWorkflow: (workflow) => {
    set({ deployedWorkflows: [workflow, ...get().deployedWorkflows] });
  },

  setDeployedWorkflows: (workflows) => {
    set({ deployedWorkflows: workflows });
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

  deployModal: {
    isOpen: false,
    step: "configure",
    workflowName: "",
    triggerType: "api",
  },

  openDeployModal: () =>
    set({ deployModal: { isOpen: true, step: "configure", workflowName: "", triggerType: "api" } }),

  closeDeployModal: () =>
    set({ deployModal: { ...get().deployModal, isOpen: false } }),

  setDeployModalStep: (step) =>
    set({ deployModal: { ...get().deployModal, step } }),

  setDeployWorkflowName: (name) =>
    set({ deployModal: { ...get().deployModal, workflowName: name } }),

  setDeployTriggerType: (type) =>
    set({ deployModal: { ...get().deployModal, triggerType: type } }),

  currentView: "canvas",
  setCurrentView: (view) => set({ currentView: view }),
}));

// ── Deploy action ────────────────────────────────────────────────────

export function deployWorkflow(
  compiledWorkflow: CompiledWorkflow,
  name: string,
  triggerType: TriggerType,
  sourceNodes: VyneNode[] = [],
  sourceEdges: VyneEdge[] = []
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
    sourceNodes: JSON.parse(JSON.stringify(sourceNodes)),
    sourceEdges: JSON.parse(JSON.stringify(sourceEdges)),
    metrics: { totalRuns: 0, successfulRuns: 0, failedRuns: 0, avgDurationMs: 0, last7Days: [0, 0, 0, 0, 0, 0, 0] },
  };
}
