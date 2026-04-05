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

  // Source graph for reloading onto canvas
  sourceNodes: import("@/lib/types").VyneNode[];
  sourceEdges: import("@/lib/types").VyneEdge[];

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
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "@/lib/types";
import type { VyneNode, VyneEdge, AgentNodeData, TaskNodeData } from "@/lib/types";

function makeSampleNodes(config: { agents: { id: string; name: string; role: string; icon: string; color: string; tools: string[]; x: number; y: number }[]; tasks: { id: string; name: string; desc: string; icon: string; color: string; input: string; output: string; x: number; y: number }[]; edges: { source: string; target: string }[] }): { nodes: VyneNode[]; edges: VyneEdge[] } {
  const nodes: VyneNode[] = [
    ...config.agents.map((a) => ({
      id: a.id, type: "agentNode" as const, position: { x: a.x, y: a.y },
      data: { type: "agent" as const, templateId: a.id, name: a.name, role: a.role, description: `${a.role} agent.`, icon: a.icon, color: a.color, tools: a.tools, persona: { ...DEFAULT_AGENT_PERSONA }, status: "idle" as const } as AgentNodeData,
    })),
    ...config.tasks.map((t) => ({
      id: t.id, type: "taskNode" as const, position: { x: t.x, y: t.y },
      data: { type: "task" as const, templateId: t.id, name: t.name, description: t.desc, icon: t.icon, color: t.color, expectedInput: t.input, expectedOutput: t.output, config: { ...DEFAULT_TASK_CONFIG }, status: "pending" as const } as TaskNodeData,
    })),
  ];
  const edges: VyneEdge[] = config.edges.map((e, i) => ({
    id: `edge-${i}`, source: e.source, target: e.target, type: "vyneEdge" as const, animated: true,
  }));
  return { nodes, edges };
}

const sample1 = makeSampleNodes({
  agents: [
    { id: "s1-a1", name: "Web Researcher", role: "Research Specialist", icon: "Globe", color: "#4a7c59", tools: ["web-search", "url-reader"], x: 80, y: 100 },
    { id: "s1-a2", name: "Content Writer", role: "Creative Writer", icon: "PenTool", color: "#b8694a", tools: ["text-editor"], x: 700, y: 100 },
  ],
  tasks: [
    { id: "s1-t1", name: "Research Topics", desc: "Find trending topics and gather sources.", icon: "FileSearch", color: "#d4a84b", input: "Topic keywords", output: "Research notes", x: 300, y: 60 },
    { id: "s1-t2", name: "Draft Summary", desc: "Write a concise digest from research.", icon: "FileEdit", color: "#d4a84b", input: "Research notes", output: "Email draft", x: 500, y: 160 },
    { id: "s1-t3", name: "Send Email", desc: "Deliver the digest via email.", icon: "Send", color: "#d4a84b", input: "Email draft", output: "Sent confirmation", x: 920, y: 100 },
  ],
  edges: [{ source: "s1-a1", target: "s1-t1" }, { source: "s1-t1", target: "s1-t2" }, { source: "s1-t2", target: "s1-a2" }, { source: "s1-a2", target: "s1-t3" }],
});

const sample2 = makeSampleNodes({
  agents: [
    { id: "s2-a1", name: "Ticket Reader", role: "Support Analyst", icon: "FileSearch", color: "#4a7c59", tools: ["web-search"], x: 80, y: 120 },
    { id: "s2-a2", name: "Categorizer", role: "Classification Agent", icon: "ListChecks", color: "#5a9e6f", tools: [], x: 400, y: 40 },
    { id: "s2-a3", name: "Response Drafter", role: "Support Writer", icon: "PenTool", color: "#b8694a", tools: ["text-editor"], x: 400, y: 220 },
  ],
  tasks: [
    { id: "s2-t1", name: "Classify Ticket", desc: "Determine priority and category.", icon: "ListChecks", color: "#d4a84b", input: "Raw ticket", output: "Category + priority", x: 700, y: 40 },
    { id: "s2-t2", name: "Draft Response", desc: "Write a helpful reply.", icon: "FileEdit", color: "#d4a84b", input: "Ticket + category", output: "Draft response", x: 700, y: 220 },
  ],
  edges: [{ source: "s2-a1", target: "s2-a2" }, { source: "s2-a1", target: "s2-a3" }, { source: "s2-a2", target: "s2-t1" }, { source: "s2-a3", target: "s2-t2" }],
});

const sample3 = makeSampleNodes({
  agents: [
    { id: "s3-a1", name: "Topic Planner", role: "Content Strategist", icon: "Globe", color: "#4a7c59", tools: ["web-search"], x: 80, y: 120 },
    { id: "s3-a2", name: "Blog Writer", role: "Creative Writer", icon: "PenTool", color: "#b8694a", tools: ["text-editor", "grammar-checker"], x: 600, y: 120 },
  ],
  tasks: [
    { id: "s3-t1", name: "Research Brief", desc: "Create a topic brief with outline.", icon: "FileSearch", color: "#d4a84b", input: "Content calendar", output: "Topic brief", x: 300, y: 50 },
    { id: "s3-t2", name: "Write Draft", desc: "Produce a first draft blog post.", icon: "FileEdit", color: "#d4a84b", input: "Topic brief", output: "Blog draft", x: 300, y: 200 },
    { id: "s3-t3", name: "Edit & Polish", desc: "Review grammar and improve flow.", icon: "ShieldCheck", color: "#d4a84b", input: "Blog draft", output: "Final post", x: 850, y: 50 },
    { id: "s3-t4", name: "Send for Review", desc: "Submit to editor for approval.", icon: "Send", color: "#d4a84b", input: "Final post", output: "Review status", x: 850, y: 200 },
  ],
  edges: [{ source: "s3-a1", target: "s3-t1" }, { source: "s3-t1", target: "s3-t2" }, { source: "s3-t2", target: "s3-a2" }, { source: "s3-a2", target: "s3-t3" }, { source: "s3-a2", target: "s3-t4" }],
});

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
    sourceNodes: sample1.nodes,
    sourceEdges: sample1.edges,
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
    sourceNodes: sample2.nodes,
    sourceEdges: sample2.edges,
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
    sourceNodes: sample3.nodes,
    sourceEdges: sample3.edges,
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
    metrics: generateMockMetrics(),
  };
}
