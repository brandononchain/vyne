import type {
  VyneNode,
  VyneEdge,
  VyneNodeData,
  AgentNodeData,
  TaskNodeData,
  ToolNodeData,
} from "./types";
import { generateAgentPromptPreview, generateTaskPromptPreview } from "./prompt-preview";

// ── Compiled payload types ───────────────────────────────────────────

export interface CompiledAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
  color: string;
  icon: string;
}

export interface CompiledTask {
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

export interface CompiledStep {
  order: number;
  nodeId: string;
  nodeType: "agent" | "task";
  name: string;
  description: string;
  icon: string;
  color: string;
  /** Friendly simulation message shown in the output drawer */
  simulationMessage: string;
  /** Duration in ms for the mocked simulation step */
  simulationDuration: number;
}

export interface CompiledWorkflow {
  name: string;
  compiledAt: string;
  agents: CompiledAgent[];
  tasks: CompiledTask[];
  tools: { nodeId: string; name: string; connectedToAgent: string | null }[];
  executionOrder: CompiledStep[];
  connections: { from: string; to: string; fromName: string; toName: string }[];
}

// ── Topological sort (Kahn's algorithm) ──────────────────────────────

function topologicalSort(
  nodeIds: string[],
  edges: VyneEdge[]
): string[] {
  const inDegree = new Map<string, number>();
  const adj = new Map<string, string[]>();

  for (const id of nodeIds) {
    inDegree.set(id, 0);
    adj.set(id, []);
  }

  for (const edge of edges) {
    if (nodeIds.includes(edge.source) && nodeIds.includes(edge.target)) {
      adj.get(edge.source)!.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    }
  }

  const queue: string[] = [];
  for (const [id, deg] of inDegree) {
    if (deg === 0) queue.push(id);
  }

  const sorted: string[] = [];
  while (queue.length > 0) {
    const current = queue.shift()!;
    sorted.push(current);
    for (const neighbor of adj.get(current) || []) {
      const newDeg = (inDegree.get(neighbor) || 1) - 1;
      inDegree.set(neighbor, newDeg);
      if (newDeg === 0) queue.push(neighbor);
    }
  }

  // If we couldn't sort everything, append remaining nodes (handles cycles gracefully)
  for (const id of nodeIds) {
    if (!sorted.includes(id)) sorted.push(id);
  }

  return sorted;
}

// ── Simulation message generator ─────────────────────────────────────

const agentActions: Record<string, string> = {
  "web-researcher": "is searching the web for information",
  "data-analyst": "is analyzing the data patterns",
  "content-writer": "is drafting content",
  "code-developer": "is writing and testing code",
  "project-manager": "is coordinating the team",
  "email-assistant": "is composing an email",
};

function getSimulationMessage(
  nodeData: VyneNodeData,
  allNodes: VyneNode[],
  edges: VyneEdge[],
  nodeId: string
): string {
  if (nodeData.type === "agent") {
    const agentData = nodeData as AgentNodeData;
    const action =
      agentActions[agentData.templateId] || "is working on the task";
    return `${agentData.name} ${action}...`;
  }
  if (nodeData.type === "task") {
    const taskData = nodeData as TaskNodeData;
    // Find upstream agent
    const upstreamEdge = edges.find((e) => e.target === nodeId);
    if (upstreamEdge) {
      const upstreamNode = allNodes.find((n) => n.id === upstreamEdge.source);
      if (upstreamNode && (upstreamNode.data as VyneNodeData).type === "agent") {
        return `Processing "${taskData.name}" — ${(upstreamNode.data as AgentNodeData).name} is executing...`;
      }
    }
    return `Processing task: ${taskData.name}...`;
  }
  return `Processing ${nodeData.name}...`;
}

// ── Main compiler ────────────────────────────────────────────────────

export function compileGraphToJSON(
  nodes: VyneNode[],
  edges: VyneEdge[]
): CompiledWorkflow {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // ── Compile agents ──────────────────────────────
  const agents: CompiledAgent[] = nodes
    .filter((n) => (n.data as VyneNodeData).type === "agent")
    .map((n) => {
      const d = n.data as unknown as AgentNodeData;
      return {
        id: n.id,
        name: d.name,
        role: d.role,
        systemPrompt: generateAgentPromptPreview(d),
        tools: d.tools,
        color: d.color,
        icon: d.icon,
      };
    });

  // ── Compile tasks ───────────────────────────────
  const tasks: CompiledTask[] = nodes
    .filter((n) => (n.data as VyneNodeData).type === "task")
    .map((n) => {
      const d = n.data as unknown as TaskNodeData;
      // Find assigned agent (upstream agent connected to this task)
      const upstreamEdge = edges.find(
        (e) =>
          e.target === n.id &&
          (nodeMap.get(e.source)?.data as VyneNodeData)?.type === "agent"
      );
      return {
        id: n.id,
        name: d.name,
        description: d.description,
        instructions: generateTaskPromptPreview(d),
        expectedInput: d.expectedInput,
        expectedOutput: d.expectedOutput,
        outputFormat: d.config.outputFormat,
        assignedAgentId: upstreamEdge?.source || null,
        color: d.color,
        icon: d.icon,
      };
    });

  // ── Compile tools ───────────────────────────────
  const tools = nodes
    .filter((n) => (n.data as VyneNodeData).type === "tool")
    .map((n) => {
      const d = n.data as unknown as ToolNodeData;
      const outEdge = edges.find((e) => e.source === n.id);
      return {
        nodeId: n.id,
        name: d.name,
        connectedToAgent: outEdge?.target || null,
      };
    });

  // ── Compile connections ─────────────────────────
  const connections = edges.map((e) => ({
    from: e.source,
    to: e.target,
    fromName: ((nodeMap.get(e.source)?.data as VyneNodeData)?.name) || e.source,
    toName: ((nodeMap.get(e.target)?.data as VyneNodeData)?.name) || e.target,
  }));

  // ── Determine execution order ───────────────────
  // Only include agents and tasks in execution (tools are equipment, not steps)
  const executableNodeIds = nodes
    .filter((n) => {
      const t = (n.data as VyneNodeData).type;
      return t === "agent" || t === "task";
    })
    .map((n) => n.id);

  const sortedIds = topologicalSort(executableNodeIds, edges);

  const executionOrder: CompiledStep[] = sortedIds.map((id, i) => {
    const node = nodeMap.get(id)!;
    const data = node.data as VyneNodeData;
    return {
      order: i + 1,
      nodeId: id,
      nodeType: data.type as "agent" | "task",
      name: data.name,
      description: (data as AgentNodeData).description || (data as TaskNodeData).description || "",
      icon: (data as AgentNodeData).icon || (data as TaskNodeData).icon || "Zap",
      color: (data as AgentNodeData).color || (data as TaskNodeData).color || "#4a7c59",
      simulationMessage: getSimulationMessage(data, nodes, edges, id),
      simulationDuration: 2000 + Math.random() * 2000, // 2-4s per step
    };
  });

  return {
    name: "Untitled Workflow",
    compiledAt: new Date().toISOString(),
    agents,
    tasks,
    tools,
    executionOrder,
    connections,
  };
}
