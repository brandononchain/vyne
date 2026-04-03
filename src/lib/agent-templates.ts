import type { AgentTemplate } from "./types";

export const agentTemplates: AgentTemplate[] = [
  {
    id: "web-researcher",
    name: "Web Researcher",
    role: "Research Specialist",
    description:
      "Searches the web, reads articles, and compiles research reports on any topic.",
    icon: "Globe",
    color: "#6c5ce7",
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
    color: "#e17055",
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
    color: "#00b894",
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
    color: "#fdcb6e",
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

export const categoryLabels: Record<AgentTemplate["category"], string> = {
  research: "Research & Discovery",
  creative: "Creative & Writing",
  technical: "Technical & Engineering",
  operations: "Operations & Management",
};

export const categoryOrder: AgentTemplate["category"][] = [
  "research",
  "creative",
  "technical",
  "operations",
];
