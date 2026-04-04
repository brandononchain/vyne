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
  compatibleWith: string[];
  category: "data" | "communication" | "search" | "code";
}

// ── Drag payload discriminated union ─────────────────────────────────
export type DragPayload =
  | { kind: "agent"; template: AgentTemplate }
  | { kind: "task"; template: TaskTemplate }
  | { kind: "tool"; template: ToolTemplate };

// ── Agent Persona Configuration ──────────────────────────────────────
export type AgentTone =
  | "professional"
  | "casual"
  | "analytical"
  | "creative"
  | "friendly"
  | "concise";

export interface AgentPersona {
  goal: string;
  backstory: string;
  tone: AgentTone;
  customInstructions: string;
}

export const DEFAULT_AGENT_PERSONA: AgentPersona = {
  goal: "",
  backstory: "",
  tone: "professional",
  customInstructions: "",
};

export const AGENT_TONE_OPTIONS: {
  value: AgentTone;
  label: string;
  description: string;
  emoji: string;
}[] = [
  {
    value: "professional",
    label: "Professional",
    description: "Formal, structured, business-appropriate",
    emoji: "\uD83D\uDC54",
  },
  {
    value: "casual",
    label: "Casual",
    description: "Relaxed, conversational, approachable",
    emoji: "\uD83D\uDE0A",
  },
  {
    value: "analytical",
    label: "Analytical",
    description: "Data-driven, precise, methodical",
    emoji: "\uD83D\uDD2C",
  },
  {
    value: "creative",
    label: "Creative",
    description: "Imaginative, expressive, out-of-the-box",
    emoji: "\uD83C\uDFA8",
  },
  {
    value: "friendly",
    label: "Friendly",
    description: "Warm, helpful, encouraging",
    emoji: "\uD83D\uDC4B",
  },
  {
    value: "concise",
    label: "Concise",
    description: "Brief, to-the-point, no fluff",
    emoji: "\u26A1",
  },
];

// ── Task Configuration ───────────────────────────────────────────────
export type TaskOutputFormat = "text" | "json" | "markdown" | "csv" | "custom";

export interface TaskConfig {
  detailedInstructions: string;
  constraints: string;
  outputFormat: TaskOutputFormat;
  outputFormatCustom: string;
}

export const DEFAULT_TASK_CONFIG: TaskConfig = {
  detailedInstructions: "",
  constraints: "",
  outputFormat: "text",
  outputFormatCustom: "",
};

export const TASK_OUTPUT_FORMAT_OPTIONS: {
  value: TaskOutputFormat;
  label: string;
  description: string;
}[] = [
  { value: "text", label: "Plain Text", description: "Free-form text output" },
  { value: "json", label: "JSON", description: "Structured JSON data" },
  { value: "markdown", label: "Markdown", description: "Formatted with headings, lists, etc." },
  { value: "csv", label: "CSV / Table", description: "Tabular data in rows and columns" },
  { value: "custom", label: "Custom", description: "Define your own format" },
];

// ── Available Tool Definitions (for toggle UI) ───────────────────────
export interface AvailableTool {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
}

export const AVAILABLE_TOOLS: AvailableTool[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Lets this agent search the internet for up-to-date information.",
    icon: "Search",
    color: "#4a7c59",
  },
  {
    id: "url-reader",
    name: "URL Reader",
    description: "Reads and extracts content from web pages and articles.",
    icon: "LinkIcon",
    color: "#0984e3",
  },
  {
    id: "csv-reader",
    name: "CSV / Excel Reader",
    description: "Parses structured data from spreadsheets and CSV files.",
    icon: "Table",
    color: "#5a9e6f",
  },
  {
    id: "code-executor",
    name: "Code Executor",
    description: "Runs Python, JavaScript, or shell code in a sandbox.",
    icon: "Terminal",
    color: "#1a1715",
  },
  {
    id: "email-client",
    name: "Email Client",
    description: "Sends and receives emails on the user's behalf.",
    icon: "Mail",
    color: "#e84393",
  },
  {
    id: "api-connector",
    name: "API Connector",
    description: "Makes HTTP requests to external APIs and processes responses.",
    icon: "Plug",
    color: "#d4a84b",
  },
  {
    id: "text-editor",
    name: "Text Editor",
    description: "Creates and edits long-form documents and content.",
    icon: "FileEdit",
    color: "#b8694a",
  },
  {
    id: "grammar-checker",
    name: "Grammar Checker",
    description: "Reviews text for grammar, spelling, and style improvements.",
    icon: "ShieldCheck",
    color: "#5a9e6f",
  },
  {
    id: "chart-generator",
    name: "Chart Generator",
    description: "Creates visual charts and graphs from data.",
    icon: "BarChart3",
    color: "#0984e3",
  },
];

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
  persona: AgentPersona;
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
  config: TaskConfig;
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
  reason: string;
  suggestion?: string;
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
