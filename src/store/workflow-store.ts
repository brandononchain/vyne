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
  VyneNodeData,
  AgentNodeData,
  TaskNodeData,
  ToolNodeData,
  OnboardingStep,
  Toast,
  AgentTemplate,
  TaskTemplate,
  ToolTemplate,
} from "@/lib/types";
import {
  validateConnection,
  isDuplicateConnection,
  isSelfConnection,
} from "@/lib/connection-rules";

// ── History snapshot for undo/redo ───────────────────────────────────
interface Snapshot {
  nodes: VyneNode[];
  edges: VyneEdge[];
}

interface WorkflowState {
  // ── Canvas state ─────────────────────────────────────
  nodes: VyneNode[];
  edges: VyneEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // ── Node operations ──────────────────────────────────
  addAgentFromTemplate: (
    template: AgentTemplate,
    position: { x: number; y: number }
  ) => void;
  addTaskFromTemplate: (
    template: TaskTemplate,
    position: { x: number; y: number }
  ) => void;
  addToolFromTemplate: (
    template: ToolTemplate,
    position: { x: number; y: number }
  ) => void;
  removeNode: (nodeId: string) => void;
  getNodeById: (nodeId: string) => VyneNode | undefined;

  // ── Undo / Redo ──────────────────────────────────────
  undoStack: Snapshot[];
  redoStack: Snapshot[];
  pushSnapshot: () => void;
  undo: () => void;
  redo: () => void;

  // ── Toasts ───────────────────────────────────────────
  toasts: Toast[];
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;

  // ── Onboarding ───────────────────────────────────────
  onboardingStep: OnboardingStep;
  onboardingDismissed: boolean;
  setOnboardingStep: (step: OnboardingStep) => void;
  dismissOnboarding: () => void;

  // ── Sidebar ──────────────────────────────────────────
  sidebarOpen: boolean;
  sidebarTab: "agents" | "tasks" | "tools";
  toggleSidebar: () => void;
  setSidebarTab: (tab: "agents" | "tasks" | "tools") => void;

  // ── Canvas drop zone ─────────────────────────────────
  isDraggingOver: boolean;
  setIsDraggingOver: (v: boolean) => void;

  // ── Selection ────────────────────────────────────────
  selectedNodeId: string | null;
  setSelectedNodeId: (id: string | null) => void;
}

let nodeIdCounter = 0;
const nextNodeId = () => `node-${++nodeIdCounter}`;

let toastIdCounter = 0;
const nextToastId = () => `toast-${++toastIdCounter}`;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // ── Canvas state ─────────────────────────────────────
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    set({ nodes: applyNodeChanges(changes, get().nodes) as VyneNode[] });
  },

  onEdgesChange: (changes) => {
    // Snapshot before edge deletion
    const hasDeletions = changes.some(
      (c) => c.type === "remove"
    );
    if (hasDeletions) get().pushSnapshot();

    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    const { nodes, edges, addToast, pushSnapshot } = get();

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);

    if (!sourceNode || !targetNode) return;

    // ── Validation: self-connection ────────────────────
    if (isSelfConnection(connection.source, connection.target)) {
      addToast({
        type: "info",
        title: "Can't connect to itself",
        message:
          "An agent can't send data to itself. Connect it to a different node to create a flow.",
        duration: 4000,
      });
      return;
    }

    // ── Validation: duplicate ──────────────────────────
    if (isDuplicateConnection(connection.source, connection.target, edges)) {
      addToast({
        type: "info",
        title: "Already connected",
        message:
          "These two nodes are already linked. Each connection only needs to be made once.",
        duration: 3000,
      });
      return;
    }

    // ── Validation: rule engine ────────────────────────
    const result = validateConnection(sourceNode, targetNode);

    if (!result.allowed) {
      const rule = result.rule;
      addToast({
        type: "error",
        title: rule ? "Connection not allowed" : "Invalid connection",
        message: rule
          ? `${rule.reason}${rule.suggestion ? ` ${rule.suggestion}` : ""}`
          : "This connection type isn't supported. Try connecting different node types.",
        duration: 6000,
      });
      return;
    }

    // ── Compatibility warning (allowed but suboptimal) ─
    if (result.compatibilityWarning) {
      addToast({
        type: "warning",
        title: "Unusual pairing",
        message: result.compatibilityWarning,
        duration: 5000,
      });
    }

    // ── Success: make the connection ───────────────────
    pushSnapshot();

    const newEdge: VyneEdge = {
      ...connection,
      id: `edge-${connection.source}-${connection.target}`,
      type: "vyneEdge" as const,
      animated: true,
      source: connection.source,
      target: connection.target,
    };

    set({ edges: addEdge(newEdge, get().edges) as VyneEdge[] });

    // Educational success toast
    if (result.rule) {
      addToast({
        type: "success",
        title: "Connected!",
        message: result.rule.reason,
        duration: 4000,
      });
    }

    // Advance onboarding
    const step = get().onboardingStep;
    if (step === "connect" || step === "configure-agent" || step === "add-task") {
      set({ onboardingStep: "complete" });
    }
  },

  // ── Node operations ──────────────────────────────────
  addAgentFromTemplate: (template, position) => {
    get().pushSnapshot();

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

  addTaskFromTemplate: (template, position) => {
    get().pushSnapshot();

    const id = nextNodeId();
    const data: TaskNodeData = {
      type: "task",
      templateId: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      expectedInput: template.expectedInput,
      expectedOutput: template.expectedOutput,
      status: "pending",
    };

    const newNode: VyneNode = {
      id,
      type: "taskNode",
      position,
      data,
    };

    set({ nodes: [...get().nodes, newNode] });

    // Advance onboarding
    const step = get().onboardingStep;
    if (step === "add-task" || step === "configure-agent") {
      set({ onboardingStep: "connect" });
    }
  },

  addToolFromTemplate: (template, position) => {
    get().pushSnapshot();

    const id = nextNodeId();
    const data: ToolNodeData = {
      type: "tool",
      templateId: template.id,
      name: template.name,
      description: template.description,
      icon: template.icon,
      color: template.color,
      compatibleWith: template.compatibleWith,
    };

    const newNode: VyneNode = {
      id,
      type: "toolNode",
      position,
      data,
    };

    set({ nodes: [...get().nodes, newNode] });
  },

  removeNode: (nodeId) => {
    get().pushSnapshot();
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter(
        (e) => e.source !== nodeId && e.target !== nodeId
      ),
    });
  },

  getNodeById: (nodeId) => get().nodes.find((n) => n.id === nodeId),

  // ── Undo / Redo ──────────────────────────────────────
  undoStack: [],
  redoStack: [],

  pushSnapshot: () => {
    const { nodes, edges, undoStack } = get();
    const snapshot: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({
      undoStack: [...undoStack.slice(-30), snapshot], // keep last 30
      redoStack: [], // clear redo on new action
    });
  },

  undo: () => {
    const { undoStack, nodes, edges } = get();
    if (undoStack.length === 0) return;

    const current: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const previous = undoStack[undoStack.length - 1];

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      undoStack: undoStack.slice(0, -1),
      redoStack: [...get().redoStack, current],
    });
  },

  redo: () => {
    const { redoStack, nodes, edges } = get();
    if (redoStack.length === 0) return;

    const current: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const next = redoStack[redoStack.length - 1];

    set({
      nodes: next.nodes,
      edges: next.edges,
      redoStack: redoStack.slice(0, -1),
      undoStack: [...get().undoStack, current],
    });
  },

  // ── Toasts ───────────────────────────────────────────
  toasts: [],

  addToast: (toast) => {
    const id = nextToastId();
    const newToast: Toast = { ...toast, id };
    set({ toasts: [...get().toasts, newToast] });

    // Auto-dismiss
    const duration = toast.duration || 4000;
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, duration);
  },

  removeToast: (id) => {
    set({ toasts: get().toasts.filter((t) => t.id !== id) });
  },

  // ── Onboarding ───────────────────────────────────────
  onboardingStep: "welcome",
  onboardingDismissed: false,
  setOnboardingStep: (step) => set({ onboardingStep: step }),
  dismissOnboarding: () => set({ onboardingDismissed: true }),

  // ── Sidebar ──────────────────────────────────────────
  sidebarOpen: true,
  sidebarTab: "agents",
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSidebarTab: (tab) => set({ sidebarTab: tab }),

  // ── Canvas drop zone ─────────────────────────────────
  isDraggingOver: false,
  setIsDraggingOver: (v) => set({ isDraggingOver: v }),

  // ── Selection ────────────────────────────────────────
  selectedNodeId: null,
  setSelectedNodeId: (id) => set({ selectedNodeId: id }),
}));
