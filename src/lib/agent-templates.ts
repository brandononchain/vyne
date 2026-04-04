import type { AgentTemplate, TaskTemplate, ToolTemplate } from "./types";

// ── Agent Templates ──────────────────────────────────────────────────
export const agentTemplates: AgentTemplate[] = [
  {
    id: "web-researcher",
    name: "Web Researcher",
    role: "Research Specialist",
    description:
      "Searches the web, reads articles, and compiles research reports on any topic.",
    icon: "Globe",
    color: "#4a7c59",
    defaultTools: ["web-search", "url-reader"],
    category: "research",
  },
  {
    id: "data-analyst",
    name: "Data Analyst",
    role: "Analytics Expert",
    description:
      "Analyzes datasets, finds patterns, and generates insights with charts and summaries.",
    icon: "BarChart3",
    color: "#0984e3",
    defaultTools: ["csv-reader", "chart-generator"],
    category: "technical",
  },
  {
    id: "content-writer",
    name: "Content Writer",
    role: "Creative Writer",
    description:
      "Drafts blog posts, marketing copy, emails, and other written content.",
    icon: "PenTool",
    color: "#b8694a",
    defaultTools: ["text-editor", "grammar-checker"],
    category: "creative",
  },
  {
    id: "code-developer",
    name: "Code Developer",
    role: "Software Engineer",
    description:
      "Writes, reviews, and debugs code across multiple programming languages.",
    icon: "Code2",
    color: "#5a9e6f",
    defaultTools: ["code-executor", "linter"],
    category: "technical",
  },
  {
    id: "project-manager",
    name: "Project Manager",
    role: "Team Coordinator",
    description:
      "Orchestrates other agents, delegates tasks, and ensures deadlines are met.",
    icon: "Users",
    color: "#d4a84b",
    defaultTools: ["task-tracker", "calendar"],
    category: "operations",
  },
  {
    id: "email-assistant",
    name: "Email Assistant",
    role: "Communications Specialist",
    description:
      "Drafts, summarizes, and manages email conversations on your behalf.",
    icon: "Mail",
    color: "#e84393",
    defaultTools: ["email-client", "contact-book"],
    category: "operations",
  },
];

// ── Task Templates ───────────────────────────────────────────────────
export const taskTemplates: TaskTemplate[] = [
  {
    id: "research-report",
    name: "Research Report",
    description:
      "Compile a detailed research report from gathered sources with citations and key findings.",
    icon: "FileSearch",
    color: "#4a7c59",
    expectedInput: "Topic or question to research",
    expectedOutput: "Structured report with sources",
    category: "generation",
  },
  {
    id: "summarize-data",
    name: "Summarize Data",
    description:
      "Analyze and distill complex data or long text into clear, actionable summaries.",
    icon: "ListChecks",
    color: "#0984e3",
    expectedInput: "Raw data or long-form text",
    expectedOutput: "Concise summary with highlights",
    category: "analysis",
  },
  {
    id: "draft-content",
    name: "Draft Content",
    description:
      "Write original content like blog posts, emails, or social media copy based on a brief.",
    icon: "FileEdit",
    color: "#b8694a",
    expectedInput: "Content brief or topic outline",
    expectedOutput: "Polished written content",
    category: "generation",
  },
  {
    id: "transform-format",
    name: "Transform Format",
    description:
      "Convert data between formats (e.g., CSV to JSON, text to structured data, translate).",
    icon: "Repeat",
    color: "#5a9e6f",
    expectedInput: "Data in original format",
    expectedOutput: "Data in target format",
    category: "transformation",
  },
  {
    id: "review-and-refine",
    name: "Review & Refine",
    description:
      "Quality-check and improve content, code, or data produced by another agent in the chain.",
    icon: "ShieldCheck",
    color: "#d4a84b",
    expectedInput: "Draft content or code",
    expectedOutput: "Reviewed and refined version",
    category: "analysis",
  },
  {
    id: "send-output",
    name: "Send Output",
    description:
      "Deliver the final result via email, webhook, file export, or API call.",
    icon: "Send",
    color: "#e84393",
    expectedInput: "Final processed content",
    expectedOutput: "Delivery confirmation",
    category: "output",
  },
];

// ── Tool Templates ───────────────────────────────────────────────────
export const toolTemplates: ToolTemplate[] = [
  {
    id: "web-search",
    name: "Web Search",
    description: "Search the internet for up-to-date information on any topic.",
    icon: "Search",
    color: "#4a7c59",
    compatibleWith: ["web-researcher", "content-writer"],
    category: "search",
  },
  {
    id: "url-reader",
    name: "URL Reader",
    description:
      "Read and extract content from web pages, articles, and documents.",
    icon: "LinkIcon",
    color: "#0984e3",
    compatibleWith: ["web-researcher", "data-analyst"],
    category: "search",
  },
  {
    id: "csv-reader",
    name: "CSV / Excel Reader",
    description:
      "Parse and analyze structured data from CSV, Excel, and tabular files.",
    icon: "Table",
    color: "#5a9e6f",
    compatibleWith: ["data-analyst", "code-developer"],
    category: "data",
  },
  {
    id: "code-executor",
    name: "Code Executor",
    description:
      "Run Python, JavaScript, or shell code in a sandboxed environment.",
    icon: "Terminal",
    color: "#1a1715",
    compatibleWith: ["code-developer", "data-analyst"],
    category: "code",
  },
  {
    id: "email-client",
    name: "Email Client",
    description:
      "Send and receive emails on behalf of the user via connected accounts.",
    icon: "Mail",
    color: "#e84393",
    compatibleWith: ["email-assistant", "project-manager"],
    category: "communication",
  },
  {
    id: "api-connector",
    name: "API Connector",
    description:
      "Make HTTP requests to external APIs and process the responses.",
    icon: "Plug",
    color: "#d4a84b",
    compatibleWith: [],
    category: "data",
  },
];

// ── Category metadata ────────────────────────────────────────────────
export const agentCategoryLabels: Record<AgentTemplate["category"], string> = {
  research: "Research & Discovery",
  creative: "Creative & Writing",
  technical: "Technical & Engineering",
  operations: "Operations & Management",
};

export const agentCategoryOrder: AgentTemplate["category"][] = [
  "research",
  "creative",
  "technical",
  "operations",
];

export const taskCategoryLabels: Record<TaskTemplate["category"], string> = {
  generation: "Content Generation",
  analysis: "Analysis & Review",
  transformation: "Data Transformation",
  output: "Output & Delivery",
};

export const taskCategoryOrder: TaskTemplate["category"][] = [
  "generation",
  "analysis",
  "transformation",
  "output",
];

export const toolCategoryLabels: Record<ToolTemplate["category"], string> = {
  search: "Search & Browse",
  data: "Data & APIs",
  code: "Code & Execution",
  communication: "Communication",
};

export const toolCategoryOrder: ToolTemplate["category"][] = [
  "search",
  "data",
  "code",
  "communication",
];
