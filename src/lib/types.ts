import type { Node, Edge } from "@xyflow/react";

// ── Template Types ───────────────────────────────────────────────────
export interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  color: string;
  defaultTools: string[];
  category: "research" | "creative" | "technical" | "operations";
}

export interface TaskTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  expectedInput: string;
  expectedOutput: string;
  category: "generation" | "analysis" | "transformation" | "output";
}

export interface ToolTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  compatibleWith: string[]; // agent template IDs that can use this tool (empty = all)
  category: "data" | "communication" | "search" | "code";
}

// ── Drag payload discriminated union ─────────────────────────────────
export type DragPayload =
  | { kind: "agent"; template: AgentTemplate }
  | { kind: "task"; template: TaskTemplate }
  | { kind: "tool"; template: ToolTemplate };

// ── Workflow Node Data ───────────────────────────────────────────────
export interface AgentNodeData {
  type: "agent";
  templateId: string;
  name: string;
  role: string;
  description: string;
  icon: string;
  color: string;
  tools: string[];
  status: "idle" | "running" | "complete" | "error";
  [key: string]: unknown;
}

export interface TaskNodeData {
  type: "task";
  templateId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  expectedInput: string;
  expectedOutput: string;
  assignedAgent?: string;
  status: "pending" | "running" | "complete" | "error";
  [key: string]: unknown;
}

export interface ToolNodeData {
  type: "tool";
  templateId: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  compatibleWith: string[];
  [key: string]: unknown;
}

export type VyneNodeData = AgentNodeData | TaskNodeData | ToolNodeData;
export type VyneNode = Node<VyneNodeData>;
export type VyneEdge = Edge;

// ── Connection Validation ────────────────────────────────────────────
export interface ConnectionRule {
  from: VyneNodeData["type"];
  to: VyneNodeData["type"];
  allowed: boolean;
  reason: string; // educational explanation shown to user
  suggestion?: string; // what the user should do instead
}

// ── Toast ────────────────────────────────────────────────────────────
export interface Toast {
  id: string;
  type: "success" | "error" | "info" | "warning";
  title: string;
  message: string;
  duration?: number;
}

// ── Onboarding ───────────────────────────────────────────────────────
export type OnboardingStep =
  | "welcome"
  | "drag-agent"
  | "configure-agent"
  | "add-task"
  | "connect"
  | "complete";
