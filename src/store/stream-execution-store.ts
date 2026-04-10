/**
 * ── Stream Execution Store ──────────────────────────────────────────
 *
 * Global Zustand store for real-time AI execution state.
 * Shared between TopBar (triggers execution) and LiveExecutionPanel
 * (displays streaming results).
 *
 * This replaces the local useState in useStreamExecution so that
 * any component can subscribe to execution state without prop-drilling.
 */

import { create } from "zustand";
import { useWorkflowStore } from "@/store/workflow-store";
import type { CompiledWorkflow } from "@/lib/graph-compiler";
import type { VyneNodeData } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────

export interface StepResult {
  stepIndex: number;
  nodeId: string;
  name: string;
  output: string;
  durationMs: number;
  tokenCount: number;
  status: "running" | "complete" | "error";
  error?: string;
  liveText: string;
}

interface StreamExecutionStore {
  isRunning: boolean;
  stepResults: StepResult[];
  finalOutput: string | null;
  totalDurationMs: number | null;
  error: string | null;
  compiledWorkflow: CompiledWorkflow | null;

  // Actions
  execute: (compiledWorkflow: CompiledWorkflow, userInput?: string) => void;
  cancel: () => void;
  reset: () => void;
}

// ── Abort controller (module-level) ──────────────────────────────────
let abortController: AbortController | null = null;

// ── Store ────────────────────────────────────────────────────────────

export const useStreamExecutionStore = create<StreamExecutionStore>((set, get) => ({
  isRunning: false,
  stepResults: [],
  finalOutput: null,
  totalDurationMs: null,
  error: null,
  compiledWorkflow: null,

  reset: () => {
    set({
      isRunning: false,
      stepResults: [],
      finalOutput: null,
      totalDurationMs: null,
      error: null,
      compiledWorkflow: null,
    });
  },

  cancel: () => {
    if (abortController) {
      abortController.abort();
      abortController = null;
    }
    set({ isRunning: false });
    useWorkflowStore.setState({
      isSimulating: false,
      simulationActiveNodeId: null,
    });
  },

  execute: async (compiledWorkflow: CompiledWorkflow, userInput?: string) => {
    // Cancel any existing execution
    if (abortController) {
      abortController.abort();
    }
    abortController = new AbortController();
    const signal = abortController.signal;

    // Initialize step results
    const initialResults: StepResult[] =
      compiledWorkflow.executionOrder.map((step, i) => ({
        stepIndex: i,
        nodeId: step.nodeId,
        name: step.name,
        output: "",
        durationMs: 0,
        tokenCount: 0,
        status: "running" as const,
        liveText: "",
      }));

    // Reset node statuses on canvas
    const wfStore = useWorkflowStore.getState();
    const resetNodes = wfStore.nodes.map((n) => ({
      ...n,
      data: {
        ...n.data,
        status: (n.data as VyneNodeData).type === "tool" ? (n.data as VyneNodeData).type : "idle",
      } as VyneNodeData,
    }));

    useWorkflowStore.setState({
      isSimulating: true,
      simulationActiveNodeId: null,
      simulationLog: compiledWorkflow.executionOrder.map((step, i) => ({
        stepIndex: i,
        nodeId: step.nodeId,
        name: step.name,
        message: "Waiting...",
        icon: step.icon,
        color: step.color,
        status: "pending" as const,
        timestamp: 0,
      })),
      simulationProgress: 0,
      configPanelNodeId: null,
      nodes: resetNodes,
    });

    set({
      isRunning: true,
      stepResults: initialResults,
      finalOutput: null,
      totalDurationMs: null,
      error: null,
      compiledWorkflow,
    });

    try {
      const response = await fetch("/api/workflows/stream", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agents: compiledWorkflow.agents,
          tasks: compiledWorkflow.tasks,
          executionOrder: compiledWorkflow.executionOrder,
          connections: compiledWorkflow.connections,
          userInput: userInput || undefined,
        }),
        signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: "Stream failed" }));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split("\n\n");
        buffer = events.pop() || "";

        for (const eventBlock of events) {
          if (!eventBlock.trim()) continue;

          const lines = eventBlock.split("\n");
          let eventType = "";
          let eventData = "";

          for (const line of lines) {
            if (line.startsWith("event: ")) eventType = line.slice(7);
            else if (line.startsWith("data: ")) eventData = line.slice(6);
          }

          if (!eventType || !eventData) continue;

          let data: Record<string, unknown>;
          try { data = JSON.parse(eventData); } catch { continue; }

          switch (eventType) {
            case "step:start": {
              const idx = data.stepIndex as number;
              const nodeId = data.nodeId as string;

              useWorkflowStore.setState((s) => ({
                simulationActiveNodeId: nodeId,
                simulationProgress: Math.round((idx / (data.totalSteps as number)) * 100),
                nodes: s.nodes.map((n) =>
                  n.id === nodeId
                    ? { ...n, data: { ...n.data, status: "running" } as VyneNodeData }
                    : n
                ),
                simulationLog: s.simulationLog.map((entry, i) =>
                  i === idx
                    ? { ...entry, status: "running" as const, message: `${data.name} is thinking...`, timestamp: Date.now() }
                    : entry
                ),
              }));
              break;
            }

            case "step:token": {
              const idx = data.stepIndex as number;
              set((prev) => ({
                stepResults: prev.stepResults.map((r, i) =>
                  i === idx ? { ...r, liveText: r.liveText + ((data.token as string) || "") } : r
                ),
              }));
              break;
            }

            case "step:complete": {
              const idx = data.stepIndex as number;
              const nodeId = data.nodeId as string;
              const output = data.output as string;

              set((prev) => ({
                stepResults: prev.stepResults.map((r, i) =>
                  i === idx
                    ? { ...r, output, durationMs: data.durationMs as number, tokenCount: data.tokenCount as number, status: "complete" as const, liveText: output }
                    : r
                ),
              }));

              useWorkflowStore.setState((s) => ({
                nodes: s.nodes.map((n) =>
                  n.id === nodeId ? { ...n, data: { ...n.data, status: "complete" } as VyneNodeData } : n
                ),
                simulationLog: s.simulationLog.map((entry, i) =>
                  i === idx
                    ? { ...entry, status: "complete" as const, message: output.slice(0, 200) + (output.length > 200 ? "..." : "") }
                    : entry
                ),
              }));
              break;
            }

            case "step:error": {
              const idx = data.stepIndex as number;
              const nodeId = data.nodeId as string;

              set((prev) => ({
                stepResults: prev.stepResults.map((r, i) =>
                  i === idx ? { ...r, status: "error" as const, error: data.error as string } : r
                ),
              }));

              useWorkflowStore.setState((s) => ({
                nodes: s.nodes.map((n) =>
                  n.id === nodeId ? { ...n, data: { ...n.data, status: "error" } as VyneNodeData } : n
                ),
                simulationLog: s.simulationLog.map((entry, i) =>
                  i === idx ? { ...entry, status: "complete" as const, message: `Error: ${data.error}` } : entry
                ),
              }));
              break;
            }

            case "workflow:done": {
              const finalOutput = data.finalOutput as string;
              const totalDurationMs = data.totalDurationMs as number;

              set({ isRunning: false, finalOutput, totalDurationMs });

              useWorkflowStore.setState({
                simulationActiveNodeId: null,
                simulationProgress: 100,
                isSimulating: false,
              });

              useWorkflowStore.getState().addToast({
                type: "success",
                title: "Workflow complete!",
                message: `Executed ${data.totalSteps} steps in ${(totalDurationMs / 1000).toFixed(1)}s with real AI.`,
                duration: 6000,
              });
              break;
            }

            case "workflow:error": {
              set({ isRunning: false, error: data.error as string });

              useWorkflowStore.setState({
                isSimulating: false,
                simulationActiveNodeId: null,
              });

              useWorkflowStore.getState().addToast({
                type: "error",
                title: "Workflow failed",
                message: data.error as string,
                duration: 8000,
              });
              break;
            }
          }
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        set({ isRunning: false });
        useWorkflowStore.setState({ isSimulating: false, simulationActiveNodeId: null });
        return;
      }

      const errorMsg = err instanceof Error ? err.message : "Execution failed";
      set({ isRunning: false, error: errorMsg });
      useWorkflowStore.setState({ isSimulating: false, simulationActiveNodeId: null });
      useWorkflowStore.getState().addToast({ type: "error", title: "Execution failed", message: errorMsg, duration: 8000 });
    }
  },
}));
