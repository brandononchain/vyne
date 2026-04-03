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
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "@/lib/types";
import {
  validateConnection,
  isDuplicateConnection,
  isSelfConnection,
} from "@/lib/connection-rules";
import {
  compileGraphToJSON,
  type CompiledWorkflow,
  type CompiledStep,
} from "@/lib/graph-compiler";

// ── History snapshot for undo/redo ───────────────────────────────────
interface Snapshot {
  nodes: VyneNode[];
  edges: VyneEdge[];
}

// ── Simulation log entry ─────────────────────────────────────────────
export interface SimulationLogEntry {
  stepIndex: number;
  nodeId: string;
  name: string;
  message: string;
  icon: string;
  color: string;
  status: "running" | "complete" | "pending";
  timestamp: number;
}

interface WorkflowState {
  // ── Canvas state ─────────────────────────────────────
  nodes: VyneNode[];
  edges: VyneEdge[];
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // ── Node operations ──────────────────────────────────
  addAgentFromTemplate: (template: AgentTemplate, position: { x: number; y: number }) => void;
  addTaskFromTemplate: (template: TaskTemplate, position: { x: number; y: number }) => void;
  addToolFromTemplate: (template: ToolTemplate, position: { x: number; y: number }) => void;
  removeNode: (nodeId: string) => void;
  getNodeById: (nodeId: string) => VyneNode | undefined;
  updateNodeData: (nodeId: string, updates: Partial<VyneNodeData>) => void;
  loadTemplate: (nodes: VyneNode[], edges: VyneEdge[]) => void;

  // ── Config panel ─────────────────────────────────────
  configPanelNodeId: string | null;
  openConfigPanel: (nodeId: string) => void;
  closeConfigPanel: () => void;

  // ── Simulation ───────────────────────────────────────
  isSimulating: boolean;
  simulationActiveNodeId: string | null;
  simulationLog: SimulationLogEntry[];
  compiledWorkflow: CompiledWorkflow | null;
  simulationProgress: number; // 0-100
  startSimulation: () => void;
  stopSimulation: () => void;
  _runSimulation: (workflow: CompiledWorkflow) => Promise<void>;

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

// Abort controller for cancelling simulation
let simulationAbort: AbortController | null = null;

export const useWorkflowStore = create<WorkflowState>((set, get) => ({
  // ── Canvas state ─────────────────────────────────────
  nodes: [],
  edges: [],

  onNodesChange: (changes) => {
    if (get().isSimulating) return; // Lock editing during simulation
    set({ nodes: applyNodeChanges(changes, get().nodes) as VyneNode[] });
  },

  onEdgesChange: (changes) => {
    if (get().isSimulating) return;
    const hasDeletions = changes.some((c) => c.type === "remove");
    if (hasDeletions) get().pushSnapshot();
    set({ edges: applyEdgeChanges(changes, get().edges) });
  },

  onConnect: (connection) => {
    if (get().isSimulating) return;
    const { nodes, edges, addToast, pushSnapshot } = get();

    const sourceNode = nodes.find((n) => n.id === connection.source);
    const targetNode = nodes.find((n) => n.id === connection.target);
    if (!sourceNode || !targetNode) return;

    if (isSelfConnection(connection.source, connection.target)) {
      addToast({ type: "info", title: "Can't connect to itself", message: "An agent can't send data to itself. Connect it to a different node to create a flow.", duration: 4000 });
      return;
    }

    if (isDuplicateConnection(connection.source, connection.target, edges)) {
      addToast({ type: "info", title: "Already connected", message: "These two nodes are already linked.", duration: 3000 });
      return;
    }

    const result = validateConnection(sourceNode, targetNode);

    if (!result.allowed) {
      const rule = result.rule;
      addToast({
        type: "error",
        title: rule ? "Connection not allowed" : "Invalid connection",
        message: rule ? `${rule.reason}${rule.suggestion ? ` ${rule.suggestion}` : ""}` : "This connection type isn't supported.",
        duration: 6000,
      });
      return;
    }

    if (result.compatibilityWarning) {
      addToast({ type: "warning", title: "Unusual pairing", message: result.compatibilityWarning, duration: 5000 });
    }

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

    if (result.rule) {
      addToast({ type: "success", title: "Connected!", message: result.rule.reason, duration: 4000 });
    }

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
      type: "agent", templateId: template.id, name: template.name, role: template.role,
      description: template.description, icon: template.icon, color: template.color,
      tools: template.defaultTools, persona: { ...DEFAULT_AGENT_PERSONA }, status: "idle",
    };
    set({ nodes: [...get().nodes, { id, type: "agentNode", position, data }] });
    const step = get().onboardingStep;
    if (step === "welcome" || step === "drag-agent") set({ onboardingStep: "configure-agent" });
  },

  addTaskFromTemplate: (template, position) => {
    get().pushSnapshot();
    const id = nextNodeId();
    const data: TaskNodeData = {
      type: "task", templateId: template.id, name: template.name, description: template.description,
      icon: template.icon, color: template.color, expectedInput: template.expectedInput,
      expectedOutput: template.expectedOutput, config: { ...DEFAULT_TASK_CONFIG }, status: "pending",
    };
    set({ nodes: [...get().nodes, { id, type: "taskNode", position, data }] });
    const step = get().onboardingStep;
    if (step === "add-task" || step === "configure-agent") set({ onboardingStep: "connect" });
  },

  addToolFromTemplate: (template, position) => {
    get().pushSnapshot();
    const id = nextNodeId();
    const data: ToolNodeData = {
      type: "tool", templateId: template.id, name: template.name, description: template.description,
      icon: template.icon, color: template.color, compatibleWith: template.compatibleWith,
    };
    set({ nodes: [...get().nodes, { id, type: "toolNode", position, data }] });
  },

  removeNode: (nodeId) => {
    get().pushSnapshot();
    if (get().configPanelNodeId === nodeId) set({ configPanelNodeId: null });
    set({
      nodes: get().nodes.filter((n) => n.id !== nodeId),
      edges: get().edges.filter((e) => e.source !== nodeId && e.target !== nodeId),
    });
  },

  getNodeById: (nodeId) => get().nodes.find((n) => n.id === nodeId),

  loadTemplate: (templateNodes, templateEdges) => {
    get().pushSnapshot();
    // Deep clone to avoid mutation of template data
    const nodes: VyneNode[] = JSON.parse(JSON.stringify(templateNodes));
    const edges: VyneEdge[] = JSON.parse(JSON.stringify(templateEdges));
    set({ nodes, edges, configPanelNodeId: null });
    // Dismiss onboarding since they're using a template
    set({ onboardingDismissed: true });
  },

  updateNodeData: (nodeId, updates) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id !== nodeId) return node;
        return { ...node, data: { ...node.data, ...updates } as VyneNodeData };
      }),
    });
  },

  // ── Config panel ─────────────────────────────────────
  configPanelNodeId: null,
  openConfigPanel: (nodeId) => set({ configPanelNodeId: nodeId }),
  closeConfigPanel: () => set({ configPanelNodeId: null }),

  // ── Simulation ───────────────────────────────────────
  isSimulating: false,
  simulationActiveNodeId: null,
  simulationLog: [],
  compiledWorkflow: null,
  simulationProgress: 0,

  startSimulation: () => {
    const { nodes, edges, addToast } = get();

    // Validation: need at least one agent or task
    const executableNodes = nodes.filter((n) => {
      const t = (n.data as VyneNodeData).type;
      return t === "agent" || t === "task";
    });

    if (executableNodes.length === 0) {
      addToast({
        type: "error",
        title: "Nothing to run",
        message: "Add at least one agent or task to your canvas before running the workflow.",
        duration: 4000,
      });
      return;
    }

    // Compile the graph
    const workflow = compileGraphToJSON(nodes, edges);

    // Build initial log entries
    const log: SimulationLogEntry[] = workflow.executionOrder.map((step, i) => ({
      stepIndex: i,
      nodeId: step.nodeId,
      name: step.name,
      message: step.simulationMessage,
      icon: step.icon,
      color: step.color,
      status: "pending" as const,
      timestamp: 0,
    }));

    // Close config panel, set state
    set({
      isSimulating: true,
      configPanelNodeId: null,
      compiledWorkflow: workflow,
      simulationLog: log,
      simulationActiveNodeId: null,
      simulationProgress: 0,
    });

    // Reset all node statuses
    set({
      nodes: get().nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: (n.data as VyneNodeData).type === "tool"
            ? (n.data as ToolNodeData).status
            : "idle",
        } as VyneNodeData,
      })),
    });

    // Start the simulation loop
    get()._runSimulation(workflow);
  },

  stopSimulation: () => {
    if (simulationAbort) {
      simulationAbort.abort();
      simulationAbort = null;
    }

    // Reset all node statuses
    set({
      isSimulating: false,
      simulationActiveNodeId: null,
      simulationProgress: 100,
      nodes: get().nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: (n.data as VyneNodeData).type === "task" ? "pending" : "idle",
        } as VyneNodeData,
      })),
    });
  },

  _runSimulation: async (workflow) => {
    simulationAbort = new AbortController();
    const signal = simulationAbort.signal;
    const steps = workflow.executionOrder;
    const totalSteps = steps.length;

    for (let i = 0; i < totalSteps; i++) {
      if (signal.aborted) return;

      const step = steps[i];

      // Mark this step as running
      set({
        simulationActiveNodeId: step.nodeId,
        simulationProgress: Math.round(((i) / totalSteps) * 100),
      });

      // Update node status to "running"
      set({
        nodes: get().nodes.map((n) => {
          if (n.id === step.nodeId) {
            return {
              ...n,
              data: { ...n.data, status: "running" } as VyneNodeData,
            };
          }
          return n;
        }),
      });

      // Update log entry
      set({
        simulationLog: get().simulationLog.map((entry, idx) =>
          idx === i
            ? { ...entry, status: "running" as const, timestamp: Date.now() }
            : entry
        ),
      });

      // Wait for simulated duration
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(resolve, step.simulationDuration);
        signal.addEventListener("abort", () => {
          clearTimeout(timer);
          reject(new Error("aborted"));
        }, { once: true });
      }).catch(() => { return; });

      if (signal.aborted) return;

      // Mark step complete
      set({
        nodes: get().nodes.map((n) => {
          if (n.id === step.nodeId) {
            return {
              ...n,
              data: { ...n.data, status: "complete" } as VyneNodeData,
            };
          }
          return n;
        }),
        simulationLog: get().simulationLog.map((entry, idx) =>
          idx === i
            ? { ...entry, status: "complete" as const }
            : entry
        ),
      });
    }

    // Simulation complete
    set({
      simulationActiveNodeId: null,
      simulationProgress: 100,
    });

    get().addToast({
      type: "success",
      title: "Simulation complete!",
      message: `All ${totalSteps} steps executed successfully. Your workflow is ready for deployment.`,
      duration: 5000,
    });
  },

  // ── Undo / Redo ──────────────────────────────────────
  undoStack: [],
  redoStack: [],

  pushSnapshot: () => {
    const { nodes, edges, undoStack } = get();
    const snapshot: Snapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    set({ undoStack: [...undoStack.slice(-30), snapshot], redoStack: [] });
  },

  undo: () => {
    if (get().isSimulating) return;
    const { undoStack, nodes, edges } = get();
    if (undoStack.length === 0) return;
    const current: Snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    const previous = undoStack[undoStack.length - 1];
    set({ nodes: previous.nodes, edges: previous.edges, undoStack: undoStack.slice(0, -1), redoStack: [...get().redoStack, current] });
  },

  redo: () => {
    if (get().isSimulating) return;
    const { redoStack, nodes, edges } = get();
    if (redoStack.length === 0) return;
    const current: Snapshot = { nodes: JSON.parse(JSON.stringify(nodes)), edges: JSON.parse(JSON.stringify(edges)) };
    const next = redoStack[redoStack.length - 1];
    set({ nodes: next.nodes, edges: next.edges, redoStack: redoStack.slice(0, -1), undoStack: [...get().undoStack, current] });
  },

  // ── Toasts ───────────────────────────────────────────
  toasts: [],

  addToast: (toast) => {
    const id = nextToastId();
    set({ toasts: [...get().toasts, { ...toast, id }] });
    setTimeout(() => {
      set({ toasts: get().toasts.filter((t) => t.id !== id) });
    }, toast.duration || 4000);
  },

  removeToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),

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
