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

// ── Trigger Templates (n8n-style workflow entry points) ─────────────
import type { TriggerTemplate, ActionTemplate, OutputTemplate } from "./types";

export const triggerTemplates: TriggerTemplate[] = [
  { id: "cron-trigger", name: "Cron Schedule", description: "Run on a recurring schedule (every hour, daily, weekly).", icon: "Clock", color: "#6c5ce7", category: "schedule" },
  { id: "webhook-trigger", name: "Webhook", description: "Trigger when an external service sends data to a URL.", icon: "Webhook", color: "#e17055", category: "webhook" },
  { id: "api-trigger", name: "API Endpoint", description: "Expose a REST endpoint that triggers this workflow.", icon: "Globe", color: "#0984e3", category: "webhook" },
  { id: "rss-trigger", name: "RSS Feed", description: "Monitor an RSS feed and trigger on new items.", icon: "Rss", color: "#fdcb6e", category: "event" },
  { id: "email-trigger", name: "Email Received", description: "Trigger when a new email arrives in the inbox.", icon: "Mail", color: "#e84393", category: "event" },
  { id: "manual-trigger", name: "Manual Trigger", description: "Run manually from the dashboard or via button click.", icon: "Play", color: "#4a7c59", category: "manual" },
  { id: "schedule-trigger", name: "Date/Time", description: "Run at a specific date and time.", icon: "CalendarClock", color: "#a29bfe", category: "schedule" },
  { id: "file-trigger", name: "File Upload", description: "Trigger when a file is uploaded or modified.", icon: "Upload", color: "#00b894", category: "event" },
];

export const triggerCategoryLabels: Record<TriggerTemplate["category"], string> = {
  schedule: "Scheduled",
  webhook: "Webhooks & APIs",
  event: "Event-Based",
  manual: "Manual",
};

export const triggerCategoryOrder: TriggerTemplate["category"][] = ["schedule", "webhook", "event", "manual"];

// ── Action Templates (n8n-style integrations) ───────────────────────

export const actionTemplates: ActionTemplate[] = [
  // Integrations
  { id: "http-request", name: "HTTP Request", description: "Make a request to any API endpoint.", icon: "Globe", color: "#0984e3", category: "integration" },
  { id: "slack-message", name: "Slack Message", description: "Send a message to a Slack channel.", icon: "MessageSquare", color: "#e84393", category: "notification" },
  { id: "discord-message", name: "Discord Message", description: "Send a message to a Discord channel.", icon: "MessageCircle", color: "#6c5ce7", category: "notification" },
  { id: "twitter-post", name: "X / Twitter Post", description: "Post a tweet or thread to X.", icon: "Twitter", color: "#1DA1F2", category: "notification" },
  { id: "linkedin-post", name: "LinkedIn Post", description: "Publish a post to LinkedIn.", icon: "Linkedin", color: "#0077B5", category: "notification" },
  // Data
  { id: "database-query", name: "Database Query", description: "Run SQL queries against PostgreSQL, MySQL, or SQLite.", icon: "Database", color: "#4a7c59", category: "data" },
  { id: "spreadsheet-append", name: "Spreadsheet Append", description: "Add rows to Google Sheets or Excel.", icon: "Table", color: "#00b894", category: "data" },
  { id: "json-transform", name: "JSON Transform", description: "Parse, filter, or transform JSON data between steps.", icon: "Braces", color: "#fdcb6e", category: "data" },
  { id: "data-filter", name: "Filter", description: "Filter data based on conditions before passing to next node.", icon: "Filter", color: "#b8694a", category: "data" },
  // Flow control
  { id: "if-condition", name: "IF Condition", description: "Branch the workflow based on a condition.", icon: "GitBranch", color: "#e17055", category: "flow" },
  { id: "switch-node", name: "Switch", description: "Route to different branches based on a value.", icon: "GitFork", color: "#a29bfe", category: "flow" },
  { id: "wait-node", name: "Wait / Delay", description: "Pause execution for a specified duration.", icon: "Timer", color: "#636e72", category: "flow" },
  { id: "loop-node", name: "Loop", description: "Repeat a section of the workflow for each item in a list.", icon: "Repeat", color: "#00cec9", category: "flow" },
  { id: "merge-node", name: "Merge", description: "Combine data from multiple branches into one.", icon: "GitMerge", color: "#5a9e6f", category: "flow" },
];

export const actionCategoryLabels: Record<ActionTemplate["category"], string> = {
  integration: "Integrations",
  data: "Data & Transform",
  notification: "Social & Notifications",
  flow: "Flow Control",
};

export const actionCategoryOrder: ActionTemplate["category"][] = ["flow", "integration", "data", "notification"];

// ── Output Templates ────────────────────────────────────────────────

export const outputTemplates: OutputTemplate[] = [
  { id: "output-preview", name: "Output Preview", description: "Display the final result in a preview panel on the canvas.", icon: "Eye", color: "#4a7c59", category: "preview" },
  { id: "output-file", name: "Save to File", description: "Export the result as a downloadable file (PDF, MD, CSV, JSON).", icon: "Download", color: "#0984e3", category: "storage" },
  { id: "output-email", name: "Send Email", description: "Email the workflow output to one or more recipients.", icon: "Send", color: "#e84393", category: "delivery" },
  { id: "output-webhook", name: "Webhook Delivery", description: "POST the result to an external webhook URL.", icon: "Webhook", color: "#e17055", category: "delivery" },
  { id: "output-database", name: "Save to Database", description: "Insert the result into a database table.", icon: "Database", color: "#5a9e6f", category: "storage" },
  { id: "output-api-response", name: "API Response", description: "Return the result as the API trigger response.", icon: "ArrowUpRight", color: "#d4a84b", category: "delivery" },
  { id: "output-slack", name: "Post to Slack", description: "Send the output to a Slack channel.", icon: "MessageSquare", color: "#e84393", category: "delivery" },
  { id: "output-dashboard", name: "Dashboard Widget", description: "Display output as a live widget on the Vyne dashboard.", icon: "LayoutDashboard", color: "#6c5ce7", category: "preview" },
];

export const outputCategoryLabels: Record<OutputTemplate["category"], string> = {
  delivery: "Delivery",
  storage: "Storage",
  preview: "Preview & Display",
};

export const outputCategoryOrder: OutputTemplate["category"][] = ["preview", "delivery", "storage"];
