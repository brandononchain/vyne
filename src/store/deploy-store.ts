import { create } from "zustand";
import type { CompiledWorkflow } from "@/lib/graph-compiler";
import type { VyneNode, VyneEdge } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflow-store";

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

// ── Store — starts EMPTY, loaded from API ────────────────────────────

export const useDeployStore = create<DeployStore>((set, get) => ({
  deployedWorkflows: [],

  addDeployedWorkflow: (workflow) => {
    set({ deployedWorkflows: [workflow, ...get().deployedWorkflows] });
  },

  setDeployedWorkflows: (workflows) => {
    set({ deployedWorkflows: workflows });
  },

  toggleWorkflowStatus: async (id) => {
    const before = get().deployedWorkflows;
    const target = before.find((w) => w.id === id);
    if (!target) return;
    const nextStatus: WorkflowStatus = target.status === "live" ? "paused" : "live";

    // Optimistic update, then persist; roll back on failure.
    set({ deployedWorkflows: before.map((w) => (w.id === id ? { ...w, status: nextStatus } : w)) });
    try {
      const res = await fetch(`/api/workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus === "live" ? "LIVE" : "PAUSED" }),
      });
      if (!res.ok) throw new Error(`Update failed (${res.status})`);
    } catch (err) {
      console.error("[DeployStore] toggleWorkflowStatus failed:", err);
      set({ deployedWorkflows: before }); // rollback
      useWorkflowStore.getState().addToast({
        type: "error", title: "Couldn't update workflow",
        message: "We couldn't reach the server. Please try again.", duration: 4000,
      });
    }
  },

  removeDeployedWorkflow: async (id) => {
    const before = get().deployedWorkflows;
    set({ deployedWorkflows: before.filter((w) => w.id !== id) }); // optimistic
    try {
      const res = await fetch(`/api/workflows/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    } catch (err) {
      console.error("[DeployStore] removeDeployedWorkflow failed:", err);
      set({ deployedWorkflows: before }); // rollback
      useWorkflowStore.getState().addToast({
        type: "error", title: "Couldn't delete workflow",
        message: "We couldn't reach the server. Please try again.", duration: 4000,
      });
    }
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

/** Credentials minted server-side by POST /api/workflows (status=LIVE). */
export interface ServerDeployResult {
  id: string;
  endpointUrl: string;
  apiKey: string;
  webhookSecret: string;
  createdAt?: string;
}

export function deployWorkflow(
  compiledWorkflow: CompiledWorkflow,
  name: string,
  triggerType: TriggerType,
  server: ServerDeployResult,
  sourceNodes: VyneNode[] = [],
  sourceEdges: VyneEdge[] = []
): DeployedWorkflow {
  return {
    id: server.id,
    name,
    description: `${compiledWorkflow.agents.length} agents, ${compiledWorkflow.tasks.length} tasks`,
    triggerType,
    status: "live",
    endpointUrl: server.endpointUrl,
    apiKey: server.apiKey,
    webhookSecret: server.webhookSecret,
    deployedAt: server.createdAt ?? new Date().toISOString(),
    lastRunAt: null,
    agentCount: compiledWorkflow.agents.length,
    taskCount: compiledWorkflow.tasks.length,
    compiledWorkflow,
    sourceNodes: JSON.parse(JSON.stringify(sourceNodes)),
    sourceEdges: JSON.parse(JSON.stringify(sourceEdges)),
    metrics: { totalRuns: 0, successfulRuns: 0, failedRuns: 0, avgDurationMs: 0, last7Days: [0, 0, 0, 0, 0, 0, 0] },
  };
}
