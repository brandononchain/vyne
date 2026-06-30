/**
 * ── Vyne LangGraph Compiler ──────────────────────────────────────────
 *
 * Transforms Vyne's compiled workflow JSON (from the frontend graph-compiler)
 * into an executable LangGraph StateGraph.
 *
 * Architecture:
 * 1. Parse the compiled JSON to extract agents, tasks, and execution order
 * 2. Create a LangGraph node for each executable step
 * 3. Each node: instantiate ChatAnthropic → bind tools → invoke with messages
 * 4. Wire edges based on the compiled execution order (linear chain)
 * 5. Return a compiled graph ready to .invoke() or .stream()
 *
 * The design is modular — new node types (HumanInTheLoop, ConditionalBranch)
 * can be added by creating a new node factory and registering it in the
 * nodeFactories map.
 */

import { ChatAnthropic } from "@langchain/anthropic";
import { StateGraph, Annotation, END, START } from "@langchain/langgraph";
import { ToolMessage, type BaseMessage, type AIMessage } from "@langchain/core/messages";
import { resolveTools } from "./tools";
import { buildMessageArray } from "./prompts";
import { withRetry } from "./retry";
import {
  ANTHROPIC_MODEL,
  MAX_TOKENS,
  DEFAULT_TEMPERATURE,
  MAX_TOOL_ITERATIONS,
} from "./config";

// ── Agent State ──────────────────────────────────────────────────────
// The universal state that flows through the entire LangGraph.
// Each node reads `messages` and `previousOutput`, produces output,
// and appends to the state for the next node.

export const AgentState = Annotation.Root({
  /** Accumulated messages across the conversation */
  messages: Annotation<BaseMessage[]>({
    reducer: (prev, next) => [...prev, ...next],
    default: () => [],
  }),
  /** The string output of the most recently completed node */
  previousOutput: Annotation<string>({
    reducer: (_prev, next) => next,
    default: () => "",
  }),
  /** Tracks which step we're on (for progress reporting) */
  currentStep: Annotation<number>({
    reducer: (_prev, next) => next,
    default: () => 0,
  }),
  /** Accumulated outputs from all completed steps */
  stepOutputs: Annotation<Record<string, string>>({
    reducer: (prev, next) => ({ ...prev, ...next }),
    default: () => ({}),
  }),
});

export type AgentStateType = typeof AgentState.State;

// ── Compiled Workflow Shape (from frontend graph-compiler.ts) ────────

interface CompiledAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  color: string;
  icon: string;
}

interface CompiledTask {
  id: string;
  name: string;
  description: string;
  instructions: string;
  expectedInput: string;
  expectedOutput: string;
  outputFormat: string;
  assignedAgentId: string | null;
  color: string;
  icon: string;
}

interface CompiledStep {
  order: number;
  nodeId: string;
  nodeType: "agent" | "task";
  name: string;
  description: string;
  icon: string;
  color: string;
  simulationMessage: string;
  simulationDuration: number;
}

interface CompiledWorkflowPayload {
  name: string;
  compiledAt: string;
  agents: CompiledAgent[];
  tasks: CompiledTask[];
  executionOrder: CompiledStep[];
  connections: { from: string; to: string; fromName: string; toName: string }[];
}

// ── Payload normalization ────────────────────────────────────────────
// The frontend saves graphJson as { compiled, sourceNodes, sourceEdges },
// but older drafts stored the compiled payload at the top level. This
// unwraps either shape into the CompiledWorkflowPayload the engine expects.

export function normalizeWorkflowPayload(
  graphJson: unknown
): CompiledWorkflowPayload {
  const g = (graphJson ?? {}) as Record<string, unknown>;
  const candidate =
    g.compiled && typeof g.compiled === "object"
      ? (g.compiled as Record<string, unknown>)
      : g;

  if (!Array.isArray(candidate.executionOrder)) {
    throw new Error("Workflow graph is missing a compiled executionOrder");
  }
  return candidate as unknown as CompiledWorkflowPayload;
}

// ── Progress callback type ───────────────────────────────────────────

export interface StepProgress {
  stepIndex: number;
  totalSteps: number;
  nodeId: string;
  nodeName: string;
  status: "running" | "complete" | "error";
  output?: string;
  error?: string;
}

export type OnStepProgress = (progress: StepProgress) => Promise<void>;

// ── LLM Factory ──────────────────────────────────────────────────────

function createLLM(temperature = DEFAULT_TEMPERATURE) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment variables."
    );
  }

  return new ChatAnthropic({
    model: ANTHROPIC_MODEL,
    anthropicApiKey: apiKey,
    temperature,
    maxTokens: MAX_TOKENS,
  });
}

// ── Text extraction ──────────────────────────────────────────────────
// Anthropic responses may be a string or an array of content blocks.

function extractText(content: AIMessage["content"]): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter(
        (block): block is { type: "text"; text: string } =>
          typeof block === "object" &&
          block !== null &&
          "type" in block &&
          block.type === "text"
      )
      .map((block) => block.text)
      .join("\n");
  }
  return JSON.stringify(content);
}

// ── ReAct tool loop ──────────────────────────────────────────────────
// Invokes the model, executes any tool calls it returns, feeds the
// results back, and repeats until the model stops calling tools (or we
// hit MAX_TOOL_ITERATIONS). Without this loop, bound tools are never run.

async function runWithToolLoop(
  model: ReturnType<typeof createLLM> | ReturnType<ReturnType<typeof createLLM>["bindTools"]>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toolInstances: any[],
  messages: BaseMessage[]
): Promise<{ output: string; messages: BaseMessage[] }> {
  const toolsByName = new Map(toolInstances.map((t) => [t.name, t]));
  const conversation: BaseMessage[] = [...messages];

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const response = (await withRetry(() => model.invoke(conversation), {
      maxRetries: 3,
      baseDelayMs: 2000,
    })) as AIMessage;

    conversation.push(response);

    const toolCalls = response.tool_calls ?? [];
    if (toolCalls.length === 0) {
      return { output: extractText(response.content), messages: conversation };
    }

    // Execute each requested tool call and feed the result back.
    for (const call of toolCalls) {
      const tool = toolsByName.get(call.name);
      let result: string;
      if (!tool) {
        result = `Error: tool "${call.name}" is not available.`;
      } else {
        try {
          const raw = await tool.invoke(call.args);
          result = typeof raw === "string" ? raw : JSON.stringify(raw);
        } catch (err) {
          result = `Error executing ${call.name}: ${
            err instanceof Error ? err.message : "unknown error"
          }`;
        }
      }
      conversation.push(
        new ToolMessage({ content: result, tool_call_id: call.id ?? call.name })
      );
    }
  }

  // Exhausted the loop — do a final non-tool call to force a text answer.
  const finalLLM = "bindTools" in model ? createLLM() : model;
  const finalResponse = (await withRetry(() => finalLLM.invoke(conversation), {
    maxRetries: 2,
    baseDelayMs: 2000,
  })) as AIMessage;
  conversation.push(finalResponse);
  return { output: extractText(finalResponse.content), messages: conversation };
}

// ── Node Factories ───────────────────────────────────────────────────
// Each factory creates a LangGraph node function for a specific node type.
// To add new node types (e.g., "human-in-the-loop"), add a new factory.

function createAgentNode(
  agent: CompiledAgent,
  task: CompiledTask | null,
  stepIndex: number,
  /** Original canvas node id for this step (keys stepOutputs for fan-in). */
  sourceNodeId: string,
  /** Upstream canvas node ids whose outputs feed this step. */
  upstreamNodeIds: { id: string; name: string }[],
  onProgress?: OnStepProgress
) {
  return async (state: AgentStateType): Promise<Partial<AgentStateType>> => {
    // Report: step starting
    await onProgress?.({
      stepIndex,
      totalSteps: -1, // filled by caller
      nodeId: agent.id,
      nodeName: agent.name,
      status: "running",
    });

    try {
      // 1. Gather actual upstream outputs (DAG fan-in). When a step has
      // multiple upstream nodes (convergence), label each so the model can
      // tell them apart. Falls back to previousOutput for linear chains.
      let upstreamInput: string | null = null;
      if (upstreamNodeIds.length > 1) {
        upstreamInput = upstreamNodeIds
          .map((u) => {
            const out = state.stepOutputs[u.id];
            return out ? `### Input from "${u.name}"\n${out}` : null;
          })
          .filter(Boolean)
          .join("\n\n");
      } else if (upstreamNodeIds.length === 1) {
        upstreamInput = state.stepOutputs[upstreamNodeIds[0].id] ?? state.previousOutput;
      } else {
        upstreamInput = state.previousOutput || null;
      }

      const messages = buildMessageArray(
        {
          name: agent.name,
          role: agent.role,
          tools: agent.tools,
          persona: extractPersona(agent.systemPrompt),
        },
        task
          ? {
              name: task.name,
              description: task.description,
              instructions: task.instructions,
              expectedInput: task.expectedInput,
              expectedOutput: task.expectedOutput,
              outputFormat: task.outputFormat,
            }
          : null,
        upstreamInput
      );

      // 2. Create the model and bind tools
      const baseLLM = createLLM();
      const tools = resolveTools(agent.tools);
      const model = tools.length > 0 ? baseLLM.bindTools(tools) : baseLLM;

      // 3. Run the agent⇄tool loop (executes any tool calls, feeds results back)
      const { output, messages: convo } = await runWithToolLoop(model, tools, messages);

      // Report: step complete
      await onProgress?.({
        stepIndex,
        totalSteps: -1,
        nodeId: agent.id,
        nodeName: agent.name,
        status: "complete",
        output: output.slice(0, 500), // Truncate for progress reporting
      });

      return {
        messages: convo.slice(messages.length), // only the new turns
        previousOutput: output,
        currentStep: stepIndex + 1,
        stepOutputs: { [sourceNodeId]: output },
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";

      await onProgress?.({
        stepIndex,
        totalSteps: -1,
        nodeId: agent.id,
        nodeName: agent.name,
        status: "error",
        error: errorMsg,
      });

      throw error;
    }
  };
}

// ── Persona Extractor ────────────────────────────────────────────────
// The frontend generates a systemPrompt string from the persona config.
// This reverses it into structured data for the prompt builder.
// In practice, we should pass the raw persona through the compiled JSON,
// but this handles backwards compatibility.

function extractPersona(systemPrompt: string) {
  return {
    goal: "",
    backstory: "",
    tone: "professional" as const,
    customInstructions: systemPrompt, // Use the full prompt as custom instructions
  };
}

// ── Main Compiler ────────────────────────────────────────────────────

/**
 * Compile a Vyne workflow JSON payload into an executable LangGraph.
 *
 * @param payload - The compiled workflow JSON from the frontend
 * @param onProgress - Optional callback for real-time step progress
 * @returns A compiled LangGraph ready to invoke
 */
export function compileToLangGraph(
  payload: CompiledWorkflowPayload,
  onProgress?: OnStepProgress
) {
  const { agents, tasks, executionOrder } = payload;

  // Build lookup maps
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  if (executionOrder.length === 0) {
    throw new Error("Workflow has no executable steps");
  }

  // ── Build the StateGraph ────────────────────────────
  const graph = new StateGraph(AgentState);

  const nodeNames: string[] = [];

  // Set of executable canvas node ids (agents + tasks) so we ignore
  // non-executable upstreams (e.g. tool nodes) when gathering fan-in.
  const execNodeIds = new Set(executionOrder.map((s) => s.nodeId));

  // Real upstream nodes per step, derived from the canvas connections.
  const upstreamFor = (nodeId: string) =>
    (payload.connections ?? [])
      .filter((c) => c.to === nodeId && execNodeIds.has(c.from))
      .map((c) => ({ id: c.from, name: c.fromName }));

  for (let i = 0; i < executionOrder.length; i++) {
    const step = executionOrder[i];
    const nodeName = `step_${i}`;
    nodeNames.push(nodeName);

    // Wrap progress callback with total steps count
    const wrappedProgress: OnStepProgress | undefined = onProgress
      ? async (p) => onProgress({ ...p, totalSteps: executionOrder.length })
      : undefined;

    if (step.nodeType === "agent") {
      const agent = agentMap.get(step.nodeId);
      if (!agent) {
        throw new Error(`Agent not found: ${step.nodeId} (${step.name})`);
      }

      // Find if there's a downstream task assigned to this agent
      const assignedTask = tasks.find((t) => t.assignedAgentId === step.nodeId);

      graph.addNode(
        nodeName,
        createAgentNode(
          agent,
          assignedTask || null,
          i,
          step.nodeId,
          upstreamFor(step.nodeId),
          wrappedProgress
        )
      );
    } else if (step.nodeType === "task") {
      // Task nodes without an assigned agent use a generic executor
      const task = taskMap.get(step.nodeId);
      if (!task) {
        throw new Error(`Task not found: ${step.nodeId} (${step.name})`);
      }

      // Find any agent connected upstream
      const upstreamAgent = agents.find((a) => {
        const connection = payload.connections.find(
          (c) => c.to === step.nodeId && c.from === a.id
        );
        return !!connection;
      });

      // Use the upstream agent (or a generic one) to execute the task
      const executorAgent = upstreamAgent || {
        id: `generic_${i}`,
        name: "Task Executor",
        role: "General Purpose Agent",
        systemPrompt: "You are a helpful assistant executing a workflow task.",
        tools: [],
        color: "#4a7c59",
        icon: "Zap",
      };

      graph.addNode(
        nodeName,
        createAgentNode(
          executorAgent,
          task,
          i,
          step.nodeId,
          upstreamFor(step.nodeId),
          wrappedProgress
        )
      );
    }
  }

  // ── Wire edges (linear chain based on execution order) ──
  // Dynamic node names require type assertion since LangGraph
  // expects literal types at the TS level.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const g = graph as any;

  // START → step_0
  g.addEdge(START, nodeNames[0]);

  // step_0 → step_1 → ... → step_n
  for (let i = 0; i < nodeNames.length - 1; i++) {
    g.addEdge(nodeNames[i], nodeNames[i + 1]);
  }

  // step_n → END
  g.addEdge(nodeNames[nodeNames.length - 1], END);

  // ── Compile and return ──────────────────────────────
  return graph.compile();
}

/**
 * Execute a compiled workflow and return the final state.
 * This is the main entry point called by the worker.
 */
export async function executeWorkflow(
  payload: CompiledWorkflowPayload,
  onProgress?: OnStepProgress
): Promise<AgentStateType> {
  const compiledGraph = compileToLangGraph(payload, onProgress);

  const result = await compiledGraph.invoke({
    messages: [],
    previousOutput: "",
    currentStep: 0,
    stepOutputs: {},
  });

  return result;
}
