import type { Node, Edge } from "@xyflow/react";

// ── Agent Templates ──────────────────────────────────────────────────
export interface AgentTemplate {
  id: string;
  name: string;
  role: string;
  description: string;
  icon: string; // Lucide icon name
  color: string;
  defaultTools: string[];
  category: "research" | "creative" | "technical" | "operations";
}

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
  name: string;
  description: string;
  assignedAgent?: string;
  status: "pending" | "running" | "complete" | "error";
  [key: string]: unknown;
}

export interface ToolNodeData {
  type: "tool";
  name: string;
  description: string;
  icon: string;
  [key: string]: unknown;
}

export type VyneNodeData = AgentNodeData | TaskNodeData | ToolNodeData;
export type VyneNode = Node<VyneNodeData>;
export type VyneEdge = Edge;

// ── Onboarding ───────────────────────────────────────────────────────
export type OnboardingStep =
  | "welcome"
  | "drag-agent"
  | "configure-agent"
  | "add-task"
  | "connect"
  | "complete";
