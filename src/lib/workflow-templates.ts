import type { VyneNode, VyneEdge, AgentNodeData, TaskNodeData, ToolNodeData } from "./types";
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "./types";

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  complexity: "beginner" | "intermediate" | "advanced";
  timeSaved: string;
  category: "content" | "research" | "automation" | "data" | "enterprise";
  tags: string[];
  nodes: VyneNode[];
  edges: VyneEdge[];
  tools: string[];
}

export const workflowTemplates: WorkflowTemplate[] = [
  {
    id: "research-to-blog",
    name: "Research to Blog Post",
    description:
      "A Web Researcher gathers information on a topic, then a Content Writer drafts a polished blog post from the findings.",
    icon: "PenTool",
    color: "#b8694a",
    complexity: "beginner",
    timeSaved: "~2 hours",
    category: "content",
    tags: ["writing", "research", "blogging"],
    tools: ["web-search", "url-reader", "text-editor", "grammar-checker"],
    nodes: [
      {
        id: "t-n1",
        type: "agentNode",
        position: { x: 80, y: 120 },
        data: {
          type: "agent", templateId: "web-researcher", name: "Web Researcher", role: "Research Specialist",
          description: "Searches the web and compiles research reports.", icon: "Globe", color: "#4a7c59",
          tools: ["web-search", "url-reader"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Find comprehensive, recent information on the given topic" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n2",
        type: "taskNode",
        position: { x: 420, y: 80 },
        data: {
          type: "task", templateId: "research-report", name: "Research Report", description: "Compile a detailed research report with citations.",
          icon: "FileSearch", color: "#4a7c59", expectedInput: "Topic or question", expectedOutput: "Structured report with sources",
          config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: "Search for 5+ recent sources. Summarize key findings. Include citations." }, status: "pending",
        } as TaskNodeData,
      },
      {
        id: "t-n3",
        type: "agentNode",
        position: { x: 750, y: 120 },
        data: {
          type: "agent", templateId: "content-writer", name: "Content Writer", role: "Creative Writer",
          description: "Drafts blog posts and marketing copy.", icon: "PenTool", color: "#b8694a",
          tools: ["text-editor", "grammar-checker"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Write an engaging, SEO-friendly blog post", tone: "friendly" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n4",
        type: "taskNode",
        position: { x: 1080, y: 80 },
        data: {
          type: "task", templateId: "draft-content", name: "Draft Blog Post", description: "Write original content based on the research.",
          icon: "FileEdit", color: "#b8694a", expectedInput: "Research report", expectedOutput: "Polished blog post",
          config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: "Write a 1000-word blog post. Use an engaging introduction. Include subheadings.", outputFormat: "markdown" }, status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "t-e1", source: "t-n1", target: "t-n2", type: "vyneEdge", animated: true },
      { id: "t-e2", source: "t-n2", target: "t-n3", type: "vyneEdge", animated: true },
      { id: "t-e3", source: "t-n3", target: "t-n4", type: "vyneEdge", animated: true },
    ],
  },
  {
    id: "lead-scraper",
    name: "B2B Lead Scraper",
    description:
      "Automatically research companies, enrich with contact data, and compile a qualified lead list in CSV format.",
    icon: "Search",
    color: "#0984e3",
    complexity: "intermediate",
    timeSaved: "~4 hours",
    category: "research",
    tags: ["sales", "leads", "data"],
    tools: ["web-search", "url-reader", "csv-reader", "api-connector"],
    nodes: [
      {
        id: "t-n1",
        type: "agentNode",
        position: { x: 80, y: 100 },
        data: {
          type: "agent", templateId: "web-researcher", name: "Company Researcher", role: "Research Specialist",
          description: "Searches for companies matching the target criteria.", icon: "Globe", color: "#4a7c59",
          tools: ["web-search", "url-reader"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Find B2B companies matching the ideal customer profile" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n2",
        type: "agentNode",
        position: { x: 420, y: 100 },
        data: {
          type: "agent", templateId: "data-analyst", name: "Data Enricher", role: "Analytics Expert",
          description: "Enriches company data with contact information.", icon: "BarChart3", color: "#0984e3",
          tools: ["api-connector", "csv-reader"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Enrich each company record with decision-maker contacts" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n3",
        type: "taskNode",
        position: { x: 750, y: 100 },
        data: {
          type: "task", templateId: "transform-format", name: "Export Lead List", description: "Format and export the enriched data as a CSV.",
          icon: "Repeat", color: "#5a9e6f", expectedInput: "Enriched company data", expectedOutput: "CSV lead list",
          config: { ...DEFAULT_TASK_CONFIG, outputFormat: "csv", detailedInstructions: "Include: Company, Website, Contact Name, Title, Email. Sort by company size." }, status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "t-e1", source: "t-n1", target: "t-n2", type: "vyneEdge", animated: true },
      { id: "t-e2", source: "t-n2", target: "t-n3", type: "vyneEdge", animated: true },
    ],
  },
  {
    id: "support-triager",
    name: "Support Ticket Triager",
    description:
      "Reads incoming support messages, classifies urgency, drafts responses, and routes to the right team.",
    icon: "Mail",
    color: "#e84393",
    complexity: "advanced",
    timeSaved: "~6 hours/week",
    category: "automation",
    tags: ["support", "email", "automation"],
    tools: ["email-client", "web-search", "text-editor"],
    nodes: [
      {
        id: "t-n1",
        type: "agentNode",
        position: { x: 80, y: 80 },
        data: {
          type: "agent", templateId: "email-assistant", name: "Inbox Monitor", role: "Communications Specialist",
          description: "Reads and triages incoming support emails.", icon: "Mail", color: "#e84393",
          tools: ["email-client"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Read each support email and classify its urgency and category" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n2",
        type: "taskNode",
        position: { x: 400, y: 40 },
        data: {
          type: "task", templateId: "summarize-data", name: "Classify & Prioritize", description: "Categorize the ticket and assign priority.",
          icon: "ListChecks", color: "#0984e3", expectedInput: "Support email content", expectedOutput: "Category + Priority + Summary",
          config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: "Classify as: Bug, Feature Request, Billing, or General. Priority: Critical, High, Medium, Low.", outputFormat: "json" }, status: "pending",
        } as TaskNodeData,
      },
      {
        id: "t-n3",
        type: "agentNode",
        position: { x: 720, y: 80 },
        data: {
          type: "agent", templateId: "content-writer", name: "Response Drafter", role: "Creative Writer",
          description: "Drafts a helpful, empathetic response to the customer.", icon: "PenTool", color: "#b8694a",
          tools: ["text-editor", "web-search"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Write a helpful, empathetic response", tone: "friendly" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n4",
        type: "taskNode",
        position: { x: 1040, y: 40 },
        data: {
          type: "task", templateId: "review-and-refine", name: "Review & Send", description: "Quality-check the response and send it.",
          icon: "ShieldCheck", color: "#d4a84b", expectedInput: "Draft response", expectedOutput: "Sent email confirmation",
          config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: "Check for tone, accuracy, and completeness. Auto-send if quality passes.", constraints: "Must be under 200 words. Must include next steps." }, status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "t-e1", source: "t-n1", target: "t-n2", type: "vyneEdge", animated: true },
      { id: "t-e2", source: "t-n2", target: "t-n3", type: "vyneEdge", animated: true },
      { id: "t-e3", source: "t-n3", target: "t-n4", type: "vyneEdge", animated: true },
    ],
  },
  {
    id: "data-pipeline",
    name: "CSV Data Pipeline",
    description:
      "Reads a CSV file, analyzes the data for patterns, and generates a summary report with key insights.",
    icon: "BarChart3",
    color: "#5a9e6f",
    complexity: "beginner",
    timeSaved: "~1 hour",
    category: "data",
    tags: ["analytics", "csv", "reporting"],
    tools: ["csv-reader", "chart-generator", "code-executor"],
    nodes: [
      {
        id: "t-n1",
        type: "agentNode",
        position: { x: 80, y: 100 },
        data: {
          type: "agent", templateId: "data-analyst", name: "Data Analyst", role: "Analytics Expert",
          description: "Analyzes datasets and finds patterns.", icon: "BarChart3", color: "#0984e3",
          tools: ["csv-reader", "chart-generator"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Analyze the uploaded data and identify key trends", tone: "analytical" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n2",
        type: "taskNode",
        position: { x: 420, y: 100 },
        data: {
          type: "task", templateId: "summarize-data", name: "Generate Insights", description: "Produce a concise summary with charts.",
          icon: "ListChecks", color: "#0984e3", expectedInput: "Raw CSV data", expectedOutput: "Insight report with highlights",
          config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: "Identify top 5 trends. Include percentage changes. Highlight anomalies.", outputFormat: "markdown" }, status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "t-e1", source: "t-n1", target: "t-n2", type: "vyneEdge", animated: true },
    ],
  },
  {
    id: "code-review",
    name: "Automated Code Review",
    description:
      "A developer agent reviews code changes, checks for bugs and style issues, and writes a detailed review.",
    icon: "Code2",
    color: "#1a1715",
    complexity: "intermediate",
    timeSaved: "~30 min/PR",
    category: "automation",
    tags: ["code", "review", "development"],
    tools: ["code-executor", "web-search"],
    nodes: [
      {
        id: "t-n1",
        type: "agentNode",
        position: { x: 80, y: 100 },
        data: {
          type: "agent", templateId: "code-developer", name: "Code Reviewer", role: "Software Engineer",
          description: "Reviews code for bugs, style issues, and best practices.", icon: "Code2", color: "#5a9e6f",
          tools: ["code-executor"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Review the code diff for bugs, security issues, and style violations", tone: "analytical" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n2",
        type: "taskNode",
        position: { x: 420, y: 60 },
        data: {
          type: "task", templateId: "review-and-refine", name: "Write Review", description: "Compile findings into a structured code review.",
          icon: "ShieldCheck", color: "#d4a84b", expectedInput: "Code diff", expectedOutput: "Review with comments",
          config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: "List each issue with file, line number, severity, and suggested fix.", outputFormat: "markdown" }, status: "pending",
        } as TaskNodeData,
      },
      {
        id: "t-n3",
        type: "taskNode",
        position: { x: 750, y: 60 },
        data: {
          type: "task", templateId: "send-output", name: "Post Review", description: "Send the review as a PR comment.",
          icon: "Send", color: "#e84393", expectedInput: "Formatted review", expectedOutput: "Posted comment",
          config: { ...DEFAULT_TASK_CONFIG }, status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "t-e1", source: "t-n1", target: "t-n2", type: "vyneEdge", animated: true },
      { id: "t-e2", source: "t-n2", target: "t-n3", type: "vyneEdge", animated: true },
    ],
  },
  {
    id: "meeting-summarizer",
    name: "Meeting Note Summarizer",
    description:
      "Takes raw meeting notes and produces a structured summary with action items, decisions, and follow-ups.",
    icon: "ListChecks",
    color: "#4a7c59",
    complexity: "beginner",
    timeSaved: "~20 min",
    category: "automation",
    tags: ["meetings", "notes", "productivity"],
    tools: ["text-editor", "grammar-checker"],
    nodes: [
      {
        id: "t-n1",
        type: "agentNode",
        position: { x: 80, y: 100 },
        data: {
          type: "agent", templateId: "content-writer", name: "Note Processor", role: "Creative Writer",
          description: "Processes raw meeting notes into structured summaries.", icon: "PenTool", color: "#b8694a",
          tools: ["text-editor", "grammar-checker"], persona: { ...DEFAULT_AGENT_PERSONA, goal: "Transform raw meeting notes into a clear, actionable summary", tone: "professional" }, status: "idle",
        } as AgentNodeData,
      },
      {
        id: "t-n2",
        type: "taskNode",
        position: { x: 420, y: 100 },
        data: {
          type: "task", templateId: "summarize-data", name: "Extract Action Items", description: "Pull out key decisions, action items, and deadlines.",
          icon: "ListChecks", color: "#0984e3", expectedInput: "Raw meeting notes", expectedOutput: "Structured summary",
          config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: "Sections: Summary (3 sentences), Key Decisions, Action Items (with owners + deadlines), Follow-ups.", outputFormat: "markdown" }, status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "t-e1", source: "t-n1", target: "t-n2", type: "vyneEdge", animated: true },
    ],
  },
];

export const templateCategories = [
  { id: "all", label: "All Templates" },
  { id: "enterprise", label: "⚡ Enterprise" },
  { id: "content", label: "Content & Writing" },
  { id: "research", label: "Research & Data" },
  { id: "automation", label: "Automation" },
  { id: "data", label: "Data Analysis" },
];

// Re-export with enterprise templates merged (enterprise first for visibility)
import { enterpriseTemplates } from "./enterprise-templates";
export const allWorkflowTemplates: WorkflowTemplate[] = [
  ...enterpriseTemplates,
  ...workflowTemplates,
];
