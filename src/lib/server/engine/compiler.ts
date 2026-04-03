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
import type { BaseMessage } from "@langchain/core/messages";
import { resolveTools } from "./tools";
import { buildMessageArray } from "./prompts";
import { withRetry } from "./retry";

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

function createLLM(temperature = 0.7) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "ANTHROPIC_API_KEY is not set. Add it to your environment variables."
    );
  }

  return new ChatAnthropic({
    model: "claude-sonnet-4-20250514",
    anthropicApiKey: apiKey,
    temperature,
    maxTokens: 4096,
  });
}

// ── Node Factories ───────────────────────────────────────────────────
// Each factory creates a LangGraph node function for a specific node type.
// To add new node types (e.g., "human-in-the-loop"), add a new factory.

function createAgentNode(
  agent: CompiledAgent,
  task: CompiledTask | null,
  stepIndex: number,
  onProgress?: OnStepProgress
) {
  const nodeId = `step_${stepIndex}`;

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
      // 1. Build the message array from persona + task config
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
        state.previousOutput || null
      );

      // 2. Create the model and bind tools
      const baseLLM = createLLM();
      const tools = resolveTools(agent.tools);
      const model = tools.length > 0 ? baseLLM.bindTools(tools) : baseLLM;

      // 3. Invoke with retry (handles 429 rate limits)
      const response = await withRetry(
        () => model.invoke(messages),
        {
          maxRetries: 3,
          baseDelayMs: 2000,
          onRetry: (attempt, error, delayMs) => {
            console.warn(
              `[Compiler] Retry ${attempt} for agent "${agent.name}": ${error.message} (waiting ${delayMs}ms)`
            );
          },
        }
      );

      // 4. Extract the text output
      const output =
        typeof response.content === "string"
          ? response.content
          : Array.isArray(response.content)
          ? response.content
              .filter((block): block is { type: "text"; text: string } =>
                typeof block === "object" && block !== null && "type" in block && block.type === "text"
              )
              .map((block) => block.text)
              .join("\n")
          : JSON.stringify(response.content);

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
        messages: [response],
        previousOutput: output,
        currentStep: stepIndex + 1,
        stepOutputs: { [nodeId]: output },
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

  for (let i = 0; i < executionOrder.length; i++) {
    const step = executionOrder[i];
    const nodeName = `step_${i}`;
    nodeNames.push(nodeName);

    if (step.nodeType === "agent") {
      const agent = agentMap.get(step.nodeId);
      if (!agent) {
        throw new Error(`Agent not found: ${step.nodeId} (${step.name})`);
      }

      // Find if there's a downstream task assigned to this agent
      const assignedTask = tasks.find((t) => t.assignedAgentId === step.nodeId);

      // Wrap progress callback with total steps count
      const wrappedProgress: OnStepProgress | undefined = onProgress
        ? async (p) => onProgress({ ...p, totalSteps: executionOrder.length })
        : undefined;

      graph.addNode(
        nodeName,
        createAgentNode(agent, assignedTask || null, i, wrappedProgress)
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
        color: "#6c5ce7",
        icon: "Zap",
      };

      const wrappedProgress: OnStepProgress | undefined = onProgress
        ? async (p) => onProgress({ ...p, totalSteps: executionOrder.length })
        : undefined;

      graph.addNode(
        nodeName,
        createAgentNode(executorAgent, task, i, wrappedProgress)
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
