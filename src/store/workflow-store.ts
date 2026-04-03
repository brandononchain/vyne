import { create } from "zustand";
import {
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  type Connection,
  type NodeChange,
  type EdgeChange,
} from "@xyflow/react";
import type {
  VyneNode,
  VyneEdge,
  AgentNodeData,
  OnboardingStep,
} from "@/lib/types";
import type { AgentTemplate } from "@/lib/types";

interface WorkflowState {
  // ── Canvas state ─────────────────────────────────────
  nodes: VyneNode[];
  edges: VyneEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // ── Agent operations ─────────────────────────────────
  addAgentFromTemplate: (
    template: AgentTemplate,
    position: { x: number; y: number }
  ) => void;
  removeNode: (nodeId: string) => void;
  nodeCount: () => number;

  // ── Onboarding ───────────────────────────────────────
  onboardingStep: OnboardingStep;
  onboardingDismissed: boolean;
  setOnboardingStep: (step: OnboardingStep) => void;
  dismissOnboarding: () => void;

  // ── Sidebar ──────────────────────────────────────────
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // ── Selection ────────────────────────────────────────
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}

let nodeIdCounter = 0;
const nextNodeId = () => `node-${++nodeIdCounter}`;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // ── Canvas state ─────────────────────────────────────
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as VyneNode[] });
  },

  onEdgesChange: (changes) => {
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const newEdge: VyneEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      type: "smoothstep" as const,
      animated: true,
      source: connection.source,
      target: connection.target,
    };
    set({ edges: addEdge(newEdge, get().edges) as VyneEdge[] });

    // Advance onboarding if connecting nodes
    if (get().onboardingStep === "connect") {
      set({ onboardingStep: "complete" });
    }
  },

  // ── Agent operations ─────────────────────────────────
  addAgentFromTemplate: (template, position) => {
    const id = nextNodeId();
    const data: AgentNodeData = {
      type: "agent",
      templateId: template.id,
      name: template.name,
      role: template.role,
      description: template.description,
      icon: template.icon,
      color: template.color,
      tools: template.defaultTools,
      status: "idle",
    };

    const newNode: VyneNode = {
      id,
      type: "agentNode",
      position,
      data,
    };

    set({ nodes: [...get().nodes, newNode] });

    // Advance onboarding
    const step = get().onboardingStep;
    if (step === "welcome" || step === "drag-agent") {
      set({ onboardingStep: "configure-agent" });
    }
  },

  removeNode: (nodeId) => {
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    });
  },

  nodeCount: () => get().nodes.length,

  // ── Onboarding ───────────────────────────────────────
  onboardingStep: "welcome",
  onboardingDismissed: false,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  dismissOnboarding: () => set({ onboardingDismissed: true }),

  // ── Sidebar ──────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),

  // ── Selection ────────────────────────────────────────
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}));
