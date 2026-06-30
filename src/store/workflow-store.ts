import { create } from "zustand";
import { persist } from "zustand/middleware";
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

// ── Server execution status (from GET /api/workflows/execute) ────────
interface ServerStepLog {
  stepIndex: number;
  nodeId: string;
  nodeName: string;
  status: "running" | "complete" | "error";
}
interface ServerExecution {
  status: "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "CANCELLED";
  stepsTotal: number;
  stepsCompleted: number;
  errorMessage: string | null;
  stepLogs: ServerStepLog[] | null;
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

  // ── Persistence & real execution ─────────────────────
  currentWorkflowId: string | null;
  isSaving: boolean;
  /** Persist the canvas to the backend. Returns the workflow id or null. */
  saveWorkflow: (opts?: { silent?: boolean }) => Promise<string | null>;
  /** Replace the canvas with a saved workflow's nodes/edges (for editing). */
  loadWorkflowData: (nodes: VyneNode[], edges: VyneEdge[], workflowId: string | null) => void;
  /** Save, enqueue a real backend run, and stream progress; falls back to
   * the local visual simulation if the queue/engine is unavailable. */
  runWorkflow: () => Promise<void>;
}

let nodeIdCounter = 0;
const nextNodeId = () => `node-${++nodeIdCounter}`;

let toastIdCounter = 0;
const nextToastId = () => `toast-${++toastIdCounter}`;

// Abort controller for cancelling simulation
let simulationAbort: AbortController | null = null;

export const useWorkflowStore = create<WorkflowState>()(
  persist(
    (set, get) => ({
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

  // ── Persistence & real execution ─────────────────────
  currentWorkflowId: null,
  isSaving: false,

  saveWorkflow: async (opts) => {
    const { nodes, edges, currentWorkflowId, addToast } = get();
    const compiled = compileGraphToJSON(nodes, edges);
    const agentCount = nodes.filter((n) => (n.data as VyneNodeData).type === "agent").length;
    const taskCount = nodes.filter((n) => (n.data as VyneNodeData).type === "task").length;
    const graphJson = { compiled, sourceNodes: nodes, sourceEdges: edges };
    set({ isSaving: true });
    try {
      let id = currentWorkflowId;
      if (currentWorkflowId) {
        const res = await fetch(`/api/workflows/${currentWorkflowId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ graphJson, agentCount, taskCount }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
      } else {
        const res = await fetch("/api/workflows", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: "Untitled Workflow", graphJson, agentCount, taskCount, status: "DRAFT" }),
        });
        if (!res.ok) throw new Error(`Save failed (${res.status})`);
        const d = await res.json();
        id = d.id as string;
        set({ currentWorkflowId: id });
      }
      if (!opts?.silent) {
        addToast({ type: "success", title: "Workflow saved", message: "Your changes are stored safely.", duration: 2500 });
      }
      return id;
    } catch (err) {
      console.error("[Store] saveWorkflow failed:", err);
      if (!opts?.silent) {
        addToast({ type: "error", title: "Couldn't save", message: "Check your connection and try again.", duration: 4000 });
      }
      return null;
    } finally {
      set({ isSaving: false });
    }
  },

  loadWorkflowData: (nodes, edges, workflowId) => {
    set({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      currentWorkflowId: workflowId,
      configPanelNodeId: null,
      onboardingDismissed: true,
    });
  },

  runWorkflow: async () => {
    const { nodes, edges, addToast } = get();

    const executableNodes = nodes.filter((n) => {
      const t = (n.data as VyneNodeData).type;
      return t === "agent" || t === "task";
    });
    if (executableNodes.length === 0) {
      addToast({ type: "error", title: "Nothing to run", message: "Add at least one agent or task before running.", duration: 4000 });
      return;
    }

    const workflow = compileGraphToJSON(nodes, edges);
    const log: SimulationLogEntry[] = workflow.executionOrder.map((step, i) => ({
      stepIndex: i, nodeId: step.nodeId, name: step.name, message: step.simulationMessage,
      icon: step.icon, color: step.color, status: "pending" as const, timestamp: 0,
    }));

    set({
      isSimulating: true, configPanelNodeId: null, compiledWorkflow: workflow,
      simulationLog: log, simulationActiveNodeId: null, simulationProgress: 0,
      nodes: get().nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status: (n.data as VyneNodeData).type === "tool" ? (n.data as ToolNodeData).status : "idle",
        } as VyneNodeData,
      })),
    });

    // Persist first so the backend has something to execute.
    const workflowId = await get().saveWorkflow({ silent: true });

    // Try to enqueue a real run; on any failure, fall back to the local mock.
    let executionId: string | null = null;
    if (workflowId) {
      try {
        const res = await fetch("/api/workflows/execute", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workflowId, type: "run" }),
        });
        if (res.ok) {
          executionId = (await res.json()).executionId as string;
        } else if (res.status === 402) {
          set({ isSimulating: false, simulationProgress: 0 });
          addToast({ type: "error", title: "Out of credits", message: "You don't have enough credits to run this workflow.", duration: 5000 });
          return;
        }
      } catch (err) {
        console.error("[Store] execute enqueue failed:", err);
      }
    }

    if (!executionId) {
      addToast({ type: "info", title: "Preview run", message: "Live execution is unavailable here — showing a simulated run.", duration: 4000 });
      await get()._runSimulation(workflow);
      return;
    }

    // Poll execution status and stream progress into the canvas.
    simulationAbort = new AbortController();
    const signal = simulationAbort.signal;
    const totalSteps = workflow.executionOrder.length;

    while (!signal.aborted) {
      await new Promise((r) => setTimeout(r, 1200));
      if (signal.aborted) return;

      let exec: ServerExecution | null = null;
      try {
        const res = await fetch(`/api/workflows/execute?executionId=${executionId}`);
        if (res.ok) exec = (await res.json()).execution as ServerExecution;
      } catch {
        continue; // transient — keep polling
      }
      if (!exec) continue;

      // Map server step logs onto the simulation UI.
      const serverLogs = Array.isArray(exec.stepLogs) ? exec.stepLogs : [];
      const statusByStep = new Map<number, string>();
      for (const sl of serverLogs) statusByStep.set(sl.stepIndex, sl.status);

      set({
        simulationProgress: totalSteps > 0 ? Math.round(((exec.stepsCompleted ?? 0) / totalSteps) * 100) : 0,
        simulationActiveNodeId: serverLogs.find((s) => s.status === "running")?.nodeId ?? null,
        simulationLog: get().simulationLog.map((entry) => {
          const s = statusByStep.get(entry.stepIndex);
          if (s === "complete") return { ...entry, status: "complete" as const };
          if (s === "running") return { ...entry, status: "running" as const, timestamp: entry.timestamp || Date.now() };
          return entry;
        }),
        nodes: get().nodes.map((n) => {
          const sl = serverLogs.find((s) => s.nodeId === n.id);
          if (!sl) return n;
          const status = sl.status === "complete" ? "complete" : sl.status === "running" ? "running" : (n.data as VyneNodeData).status;
          return { ...n, data: { ...n.data, status } as VyneNodeData };
        }),
      });

      if (exec.status === "COMPLETED") {
        set({ isSimulating: false, simulationActiveNodeId: null, simulationProgress: 100 });
        addToast({ type: "success", title: "Run complete!", message: `Executed ${totalSteps} step${totalSteps !== 1 ? "s" : ""} successfully.`, duration: 5000 });
        return;
      }
      if (exec.status === "FAILED" || exec.status === "CANCELLED") {
        set({ isSimulating: false, simulationActiveNodeId: null });
        addToast({ type: "error", title: "Run failed", message: exec.errorMessage || "The workflow run did not complete.", duration: 6000 });
        return;
      }
    }
  },
    }),
    {
      name: "vyne-canvas",
      partialize: (s) => ({
        nodes: s.nodes,
        edges: s.edges,
        currentWorkflowId: s.currentWorkflowId,
        onboardingDismissed: s.onboardingDismissed,
      }),
    }
  )
);
