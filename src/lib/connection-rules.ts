import type { ConnectionRule, VyneNode, VyneNodeData, ToolNodeData } from "./types";

/**
 * Connection rules matrix — defines which node types can connect to which.
 *
 * The design philosophy: Agents are the "workers", Tasks are "assignments",
 * and Tools are "equipment". You can't give a task to a tool, and you can't
 * wire a tool directly to another tool without an agent in between.
 */
const rules: ConnectionRule[] = [
  // ── ALLOWED connections ────────────────────────────
  {
    from: "agent",
    to: "agent",
    allowed: true,
    reason:
      "Agent-to-agent connections create a relay chain. The first agent's output becomes the second agent's input — like handing off a baton.",
  },
  {
    from: "agent",
    to: "task",
    allowed: true,
    reason:
      "You've assigned a task to this agent. The agent will process the task using its tools and skills.",
  },
  {
    from: "task",
    to: "agent",
    allowed: true,
    reason:
      "This task's output will be passed to the next agent for further processing — a great way to build a pipeline.",
  },
  {
    from: "task",
    to: "task",
    allowed: true,
    reason:
      "Task chaining! The output of the first task flows directly into the second. This is powerful for multi-step workflows.",
  },
  {
    from: "tool",
    to: "agent",
    allowed: true,
    reason:
      "You've equipped this agent with a tool. The agent can now use it to complete tasks more effectively.",
  },

  // ── BLOCKED connections ────────────────────────────
  {
    from: "tool",
    to: "tool",
    allowed: false,
    reason:
      "Tools can't talk to each other directly — they need an agent to orchestrate them.",
    suggestion:
      "Place an Agent between these tools. The agent will decide when and how to use each one.",
  },
  {
    from: "tool",
    to: "task",
    allowed: false,
    reason:
      "A tool can't work on a task by itself — it needs an agent to wield it.",
    suggestion:
      "Connect the tool to an Agent first, then connect that agent to the task.",
  },
  {
    from: "agent",
    to: "tool",
    allowed: false,
    reason:
      "Tools are given *to* agents, not the other way around. Think of it like handing someone a screwdriver — the tool goes to the worker.",
    suggestion:
      "Reverse the connection: drag from the Tool to the Agent instead.",
  },
  {
    from: "task",
    to: "tool",
    allowed: false,
    reason:
      "Tasks produce output for agents or other tasks — they don't feed directly into tools.",
    suggestion:
      "Connect the task to an Agent who has this tool equipped.",
  },
];

export interface ValidationResult {
  allowed: boolean;
  rule: ConnectionRule | null;
  compatibilityWarning?: string;
}

/**
 * Validate whether a connection between two nodes is allowed.
 * Also checks tool-agent compatibility for extra educational hints.
 */
export function validateConnection(
  sourceNode: VyneNode,
  targetNode: VyneNode
): ValidationResult {
  const sourceType = (sourceNode.data as VyneNodeData).type;
  const targetType = (targetNode.data as VyneNodeData).type;

  // Find the matching rule
  const rule = rules.find(
    (r) => r.from === sourceType && r.to === targetType
  );

  if (!rule) {
    return {
      allowed: false,
      rule: null,
    };
  }

  // Extra check: tool-agent compatibility
  let compatibilityWarning: string | undefined;
  if (
    rule.allowed &&
    sourceType === "tool" &&
    targetType === "agent"
  ) {
    const toolData = sourceNode.data as unknown as ToolNodeData;
    const agentTemplateId = (targetNode.data as VyneNodeData & { templateId: string }).templateId;

    if (
      toolData.compatibleWith.length > 0 &&
      !toolData.compatibleWith.includes(agentTemplateId)
    ) {
      compatibilityWarning = `"${toolData.name}" isn't typically used by this agent type, but the connection is still allowed. Some tools work best with specific agents — check the tool's description for ideal pairings.`;
    }
  }

  return {
    allowed: rule.allowed,
    rule,
    compatibilityWarning,
  };
}

/**
 * Prevent duplicate edges between the same pair of nodes.
 */
export function isDuplicateConnection(
  sourceId: string,
  targetId: string,
  existingEdges: { source: string; target: string }[]
): boolean {
  return existingEdges.some(
    (e) => e.source === sourceId && e.target === targetId
  );
}

/**
 * Prevent self-connections.
 */
export function isSelfConnection(sourceId: string, targetId: string): boolean {
  return sourceId === targetId;
}
