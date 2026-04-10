/**
 * ── useStreamExecution ──────────────────────────────────────────────
 *
 * React hook that connects to /api/workflows/stream via SSE
 * and drives the canvas UI in real time during execution.
 *
 * Usage:
 *   const { execute, isRunning, stepResults, cancel } = useStreamExecution();
 *   execute(compiledWorkflow);
 *
 * The hook updates the workflow store directly:
 *   - Sets node statuses (idle → running → complete/error)
 *   - Populates the simulation log with real LLM outputs
 *   - Tracks progress percentage
 */

import { useCallback, useRef, useState } from "react";
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
  /** Tokens accumulated so far (during streaming) */
  liveText: string;
}

export interface StreamExecutionState {
  isRunning: boolean;
  stepResults: StepResult[];
  finalOutput: string | null;
  totalDurationMs: number | null;
  error: string | null;
}

// ── Hook ─────────────────────────────────────────────────────────────

export function useStreamExecution() {
  const [state, setState] = useState<StreamExecutionState>({
    isRunning: false,
    stepResults: [],
    finalOutput: null,
    totalDurationMs: null,
    error: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const execute = useCallback(
    async (compiledWorkflow: CompiledWorkflow, userInput?: string) => {
      const store = useWorkflowStore.getState();

      // Cancel any existing execution
      if (abortRef.current) {
        abortRef.current.abort();
      }

      const abort = new AbortController();
      abortRef.current = abort;

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

      // Reset all node statuses
      const resetNodes = store.nodes.map((n) => ({
        ...n,
        data: {
          ...n.data,
          status:
            (n.data as VyneNodeData).type === "tool"
              ? (n.data as VyneNodeData).type
              : "idle",
        } as VyneNodeData,
      }));

      // Update store: start execution
      useWorkflowStore.setState({
        isSimulating: true,
        simulationActiveNodeId: null,
        simulationLog: compiledWorkflow.executionOrder.map((step, i) => ({
          stepIndex: i,
          nodeId: step.nodeId,
          name: step.name,
          message: `Waiting...`,
          icon: step.icon,
          color: step.color,
          status: "pending" as const,
          timestamp: 0,
        })),
        simulationProgress: 0,
        configPanelNodeId: null,
        nodes: resetNodes,
      });

      setState({
        isRunning: true,
        stepResults: initialResults,
        finalOutput: null,
        totalDurationMs: null,
        error: null,
      });

      try {
        // ── Connect to SSE stream ──────────────────────
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
          signal: abort.signal,
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Stream failed" }));
          throw new Error(err.error || `HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";

        // ── Parse SSE events ────────────────────────────
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on double newlines (SSE event separator)
          const events = buffer.split("\n\n");
          buffer = events.pop() || ""; // Keep incomplete event in buffer

          for (const eventBlock of events) {
            if (!eventBlock.trim()) continue;

            const lines = eventBlock.split("\n");
            let eventType = "";
            let eventData = "";

            for (const line of lines) {
              if (line.startsWith("event: ")) {
                eventType = line.slice(7);
              } else if (line.startsWith("data: ")) {
                eventData = line.slice(6);
              }
            }

            if (!eventType || !eventData) continue;

            let data: Record<string, unknown>;
            try {
              data = JSON.parse(eventData);
            } catch {
              continue;
            }

            // ── Handle each event type ──────────────────
            switch (eventType) {
              case "step:start": {
                const idx = data.stepIndex as number;
                const nodeId = data.nodeId as string;

                // Update node status to running
                useWorkflowStore.setState((s) => ({
                  simulationActiveNodeId: nodeId,
                  simulationProgress: Math.round(
                    (idx / (data.totalSteps as number)) * 100
                  ),
                  nodes: s.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          data: { ...n.data, status: "running" } as VyneNodeData,
                        }
                      : n
                  ),
                  simulationLog: s.simulationLog.map((entry, i) =>
                    i === idx
                      ? {
                          ...entry,
                          status: "running" as const,
                          message: `${data.name} is thinking...`,
                          timestamp: Date.now(),
                        }
                      : entry
                  ),
                }));
                break;
              }

              case "step:token": {
                const idx = data.stepIndex as number;

                // Update live text in step results
                setState((prev) => ({
                  ...prev,
                  stepResults: prev.stepResults.map((r, i) =>
                    i === idx
                      ? {
                          ...r,
                          liveText:
                            r.liveText + ((data.token as string) || ""),
                        }
                      : r
                  ),
                }));

                // Update simulation log with live preview
                useWorkflowStore.setState((s) => ({
                  simulationLog: s.simulationLog.map((entry, i) =>
                    i === idx
                      ? {
                          ...entry,
                          message:
                            ((data.token as string) || "").length > 0
                              ? `Generating response...`
                              : entry.message,
                        }
                      : entry
                  ),
                }));
                break;
              }

              case "step:complete": {
                const idx = data.stepIndex as number;
                const nodeId = data.nodeId as string;
                const output = data.output as string;

                // Update step result
                setState((prev) => ({
                  ...prev,
                  stepResults: prev.stepResults.map((r, i) =>
                    i === idx
                      ? {
                          ...r,
                          output,
                          durationMs: data.durationMs as number,
                          tokenCount: data.tokenCount as number,
                          status: "complete" as const,
                          liveText: output,
                        }
                      : r
                  ),
                }));

                // Update node and log
                useWorkflowStore.setState((s) => ({
                  nodes: s.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            status: "complete",
                          } as VyneNodeData,
                        }
                      : n
                  ),
                  simulationLog: s.simulationLog.map((entry, i) =>
                    i === idx
                      ? {
                          ...entry,
                          status: "complete" as const,
                          message: output.slice(0, 120) + (output.length > 120 ? "..." : ""),
                        }
                      : entry
                  ),
                }));
                break;
              }

              case "step:error": {
                const idx = data.stepIndex as number;
                const nodeId = data.nodeId as string;

                setState((prev) => ({
                  ...prev,
                  stepResults: prev.stepResults.map((r, i) =>
                    i === idx
                      ? {
                          ...r,
                          status: "error" as const,
                          error: data.error as string,
                        }
                      : r
                  ),
                }));

                useWorkflowStore.setState((s) => ({
                  nodes: s.nodes.map((n) =>
                    n.id === nodeId
                      ? {
                          ...n,
                          data: {
                            ...n.data,
                            status: "error",
                          } as VyneNodeData,
                        }
                      : n
                  ),
                  simulationLog: s.simulationLog.map((entry, i) =>
                    i === idx
                      ? {
                          ...entry,
                          status: "complete" as const,
                          message: `Error: ${data.error}`,
                        }
                      : entry
                  ),
                }));
                break;
              }

              case "workflow:done": {
                const finalOutput = data.finalOutput as string;
                const totalDurationMs = data.totalDurationMs as number;

                setState((prev) => ({
                  ...prev,
                  isRunning: false,
                  finalOutput,
                  totalDurationMs,
                }));

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
                setState((prev) => ({
                  ...prev,
                  isRunning: false,
                  error: data.error as string,
                }));

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
          // User cancelled
          setState((prev) => ({ ...prev, isRunning: false }));
          useWorkflowStore.setState({
            isSimulating: false,
            simulationActiveNodeId: null,
          });
          return;
        }

        const errorMsg =
          err instanceof Error ? err.message : "Execution failed";
        setState((prev) => ({
          ...prev,
          isRunning: false,
          error: errorMsg,
        }));

        useWorkflowStore.setState({
          isSimulating: false,
          simulationActiveNodeId: null,
        });

        useWorkflowStore.getState().addToast({
          type: "error",
          title: "Execution failed",
          message: errorMsg,
          duration: 8000,
        });
      }
    },
    []
  );

  const cancel = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }
  }, []);

  return {
    ...state,
    execute,
    cancel,
  };
}
