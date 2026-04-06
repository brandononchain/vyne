"use client";

import { useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Leaf,
  Loader2,
  ChevronDown,
  Sprout,
  Zap,
  CheckCircle2,
  Wand2,
  Trash2,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useVyneMemory, type ChatMessage } from "@/store/vyne-memory";
import type { VyneNode, VyneEdge, VyneNodeData, AgentNodeData, TaskNodeData } from "@/lib/types";
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "@/lib/types";

// ── Workflow intelligence ────────────────────────────────────────────

interface PlannedNode {
  type: "agent" | "task";
  name: string;
  role?: string;
  description: string;
  icon: string;
  color: string;
  tools?: string[];
  input?: string;
  output?: string;
}

interface WorkflowPlan {
  action: "create" | "expand" | "modify";
  nodes: PlannedNode[];
  edges: [number, number][]; // index pairs within the plan
  connectToExisting?: { fromExisting: string; toNew: number }[];
  response: string;
}

function analyzePrompt(prompt: string, existingNodes: VyneNode[], existingEdges: VyneEdge[]): WorkflowPlan {
  const lower = prompt.toLowerCase();
  const hasExisting = existingNodes.length > 0;

  // Detect modification/expansion intent
  const isExpand = hasExisting && (
    lower.includes("add") || lower.includes("expand") || lower.includes("more") ||
    lower.includes("also") || lower.includes("then") || lower.includes("next") ||
    lower.includes("advance") || lower.includes("further") || lower.includes("improve") ||
    lower.includes("enhance") || lower.includes("extend") || lower.includes("another") ||
    lower.includes("step") || lower.includes("after") || lower.includes("follow")
  );

  if (isExpand) {
    return expandWorkflow(prompt, lower, existingNodes, existingEdges);
  }

  return createWorkflow(prompt, lower);
}

function expandWorkflow(prompt: string, lower: string, existingNodes: VyneNode[], existingEdges: VyneEdge[]): WorkflowPlan {
  // Find the last node in the chain (no outgoing edges)
  const sourcesSet = new Set(existingEdges.map((e) => e.source));
  const targetsSet = new Set(existingEdges.map((e) => e.target));
  const endNodes = existingNodes.filter((n) => !sourcesSet.has(n.id) || !targetsSet.has(n.id));
  const lastNode = endNodes.length > 0
    ? endNodes.reduce((a, b) => (a.position.x > b.position.x ? a : b))
    : existingNodes[existingNodes.length - 1];

  const lastNodeData = lastNode?.data as VyneNodeData;
  const existingNames = existingNodes.map((n) => (n.data as VyneNodeData).name).join(", ");

  // Determine what to add based on context
  const newNodes: PlannedNode[] = [];

  if (lower.includes("review") || lower.includes("check") || lower.includes("quality") || lower.includes("verify")) {
    newNodes.push(
      { type: "agent", name: "Quality Reviewer", role: "QA Specialist", description: "Reviews output for accuracy, completeness, and quality.", icon: "ShieldCheck", color: "#5a9e6f", tools: [] },
      { type: "task", name: "Quality Review", description: "Check the output against requirements and provide feedback.", icon: "FileSearch", color: "#d4a84b", input: "Previous output", output: "Review with score" },
    );
  } else if (lower.includes("email") || lower.includes("send") || lower.includes("deliver") || lower.includes("notify")) {
    newNodes.push(
      { type: "agent", name: "Email Agent", role: "Communications Specialist", description: "Handles email formatting and delivery.", icon: "Mail", color: "#b8694a", tools: ["email-client"] },
      { type: "task", name: "Send Delivery", description: "Format and send the final output via email.", icon: "Send", color: "#d4a84b", input: "Final content", output: "Delivery confirmation" },
    );
  } else if (lower.includes("summary") || lower.includes("summarize") || lower.includes("report") || lower.includes("format")) {
    newNodes.push(
      { type: "agent", name: "Report Writer", role: "Technical Writer", description: "Creates formatted reports and summaries.", icon: "FileText", color: "#b8694a", tools: ["text-editor"] },
      { type: "task", name: "Generate Report", description: "Compile and format a comprehensive report from all outputs.", icon: "FileEdit", color: "#d4a84b", input: "Accumulated outputs", output: "Formatted report" },
    );
  } else if (lower.includes("data") || lower.includes("analyz") || lower.includes("chart") || lower.includes("insight")) {
    newNodes.push(
      { type: "agent", name: "Data Analyst", role: "Analytics Expert", description: "Analyzes data patterns and generates insights.", icon: "BarChart3", color: "#4a7c59", tools: ["csv-reader", "chart-generator"] },
      { type: "task", name: "Analyze Results", description: "Process outputs and extract actionable insights.", icon: "Activity", color: "#d4a84b", input: "Raw results", output: "Insights dashboard" },
    );
  } else if (lower.includes("schedule") || lower.includes("automat") || lower.includes("repeat") || lower.includes("cron")) {
    newNodes.push(
      { type: "task", name: "Schedule Trigger", description: "Set up automated recurring execution.", icon: "Repeat", color: "#5a9e6f", input: "Trigger config", output: "Next run time" },
      { type: "task", name: "Log & Archive", description: "Store execution results for history tracking.", icon: "FileText", color: "#d4a84b", input: "Run results", output: "Archived entry" },
    );
  } else {
    // Generic expansion — add a refinement + delivery step
    newNodes.push(
      { type: "agent", name: "Refinement Agent", role: "Quality Specialist", description: "Refines and polishes the previous output.", icon: "Wand2" as string, color: "#5a9e6f", tools: ["text-editor", "grammar-checker"] },
      { type: "task", name: "Polish Output", description: "Review, improve, and finalize the deliverable.", icon: "ShieldCheck", color: "#d4a84b", input: "Draft output", output: "Polished deliverable" },
      { type: "task", name: "Final Delivery", description: "Package and deliver the final result.", icon: "Send", color: "#d4a84b", input: "Polished deliverable", output: "Delivery confirmation" },
    );
  }

  const response = `I've extended your workflow with ${newNodes.length} new nodes, connected after "${lastNodeData?.name || "your last step"}". The new steps ${newNodes.map((n) => n.name).join(", ")} will process the output from your existing pipeline.`;

  return {
    action: "expand",
    nodes: newNodes,
    edges: newNodes.length >= 2
      ? Array.from({ length: newNodes.length - 1 }, (_, i) => [i, i + 1] as [number, number])
      : [],
    connectToExisting: lastNode ? [{ fromExisting: lastNode.id, toNew: 0 }] : [],
    response,
  };
}

function createWorkflow(prompt: string, lower: string): WorkflowPlan {
  const nodes: PlannedNode[] = [];
  const edges: [number, number][] = [];

  if (lower.includes("research") && (lower.includes("blog") || lower.includes("write") || lower.includes("content"))) {
    nodes.push(
      { type: "agent", name: "Web Researcher", role: "Research Specialist", description: "Searches the web and compiles research reports.", icon: "Globe", color: "#4a7c59", tools: ["web-search", "url-reader"] },
      { type: "task", name: "Research Topic", description: "Search and compile information from multiple sources.", icon: "FileSearch", color: "#d4a84b", input: "Topic or question", output: "Research notes with sources" },
      { type: "agent", name: "Content Writer", role: "Creative Writer", description: "Drafts polished articles and blog posts.", icon: "PenTool", color: "#b8694a", tools: ["text-editor", "grammar-checker"] },
      { type: "task", name: "Write Article", description: "Draft a polished, engaging article from research.", icon: "FileEdit", color: "#d4a84b", input: "Research notes", output: "Finished article" },
    );
    edges.push([0, 1], [1, 2], [2, 3]);
    return { action: "create", nodes, edges, response: `I've planted a research-to-content pipeline with ${nodes.length} nodes. A Web Researcher gathers sources, hands them to a Content Writer who crafts your article. Each step flows naturally into the next.` };
  }

  if (lower.includes("support") || lower.includes("ticket") || lower.includes("customer")) {
    nodes.push(
      { type: "agent", name: "Ticket Analyzer", role: "Support Analyst", description: "Reads and categorizes incoming support tickets.", icon: "FileSearch", color: "#4a7c59", tools: ["web-search"] },
      { type: "task", name: "Categorize Issue", description: "Classify the ticket by type, priority, and urgency.", icon: "ListChecks", color: "#d4a84b", input: "Customer ticket", output: "Category and priority" },
      { type: "agent", name: "Response Writer", role: "Support Agent", description: "Writes empathetic, helpful customer responses.", icon: "PenTool", color: "#b8694a", tools: ["text-editor"] },
      { type: "task", name: "Draft Reply", description: "Write a thorough, friendly response.", icon: "FileEdit", color: "#d4a84b", input: "Ticket + category", output: "Draft response" },
      { type: "task", name: "Quality Check", description: "Verify tone, accuracy, and completeness.", icon: "ShieldCheck", color: "#5a9e6f", input: "Draft response", output: "Approved response" },
    );
    edges.push([0, 1], [1, 2], [2, 3], [3, 4]);
    return { action: "create", nodes, edges, response: `Your support workflow is growing with ${nodes.length} nodes! A Ticket Analyzer categorizes issues, a Response Writer drafts replies, and a Quality Check ensures everything is polished before sending.` };
  }

  if (lower.includes("email") || lower.includes("outreach") || lower.includes("campaign")) {
    nodes.push(
      { type: "agent", name: "Lead Researcher", role: "Research Specialist", description: "Finds and enriches prospect data.", icon: "Globe", color: "#4a7c59", tools: ["web-search", "url-reader"] },
      { type: "task", name: "Find Prospects", description: "Research and identify target contacts.", icon: "Search", color: "#d4a84b", input: "Target criteria", output: "Prospect list with details" },
      { type: "agent", name: "Email Copywriter", role: "Creative Writer", description: "Writes personalized outreach emails.", icon: "PenTool", color: "#b8694a", tools: ["text-editor"] },
      { type: "task", name: "Personalize Emails", description: "Write tailored outreach for each prospect.", icon: "FileEdit", color: "#d4a84b", input: "Prospect data", output: "Personalized email drafts" },
      { type: "task", name: "Send Campaign", description: "Queue and send the email batch.", icon: "Send", color: "#5a9e6f", input: "Email drafts", output: "Send confirmations" },
    );
    edges.push([0, 1], [1, 2], [2, 3], [3, 4]);
    return { action: "create", nodes, edges, response: `Your outreach pipeline is ready with ${nodes.length} nodes. A Lead Researcher finds prospects, an Email Copywriter personalizes each message, and the campaign sends automatically.` };
  }

  if (lower.includes("data") || lower.includes("analyz") || lower.includes("report")) {
    nodes.push(
      { type: "agent", name: "Data Analyst", role: "Analytics Expert", description: "Analyzes datasets and finds patterns.", icon: "BarChart3", color: "#4a7c59", tools: ["csv-reader", "chart-generator"] },
      { type: "task", name: "Analyze Data", description: "Process and find patterns in the dataset.", icon: "Activity", color: "#d4a84b", input: "Raw dataset", output: "Key insights and charts" },
      { type: "agent", name: "Report Writer", role: "Technical Writer", description: "Creates formatted analysis reports.", icon: "PenTool", color: "#b8694a", tools: ["text-editor"] },
      { type: "task", name: "Generate Report", description: "Compile a formatted analysis report.", icon: "FileText", color: "#d4a84b", input: "Insights", output: "Final report" },
    );
    edges.push([0, 1], [1, 2], [2, 3]);
    return { action: "create", nodes, edges, response: `Data pipeline planted with ${nodes.length} nodes! A Data Analyst processes your dataset, then a Report Writer compiles everything into a formatted report.` };
  }

  if (lower.includes("code") || lower.includes("develop") || lower.includes("review") || lower.includes("pr")) {
    nodes.push(
      { type: "agent", name: "Code Developer", role: "Software Engineer", description: "Writes and tests code.", icon: "Code2", color: "#4a7c59", tools: ["code-executor"] },
      { type: "task", name: "Write Code", description: "Implement the feature or fix.", icon: "Terminal", color: "#d4a84b", input: "Requirements", output: "Code implementation" },
      { type: "agent", name: "Code Reviewer", role: "Senior Engineer", description: "Reviews code for quality and correctness.", icon: "ShieldCheck", color: "#5a9e6f", tools: ["code-executor"] },
      { type: "task", name: "Review Code", description: "Check for bugs, style, and best practices.", icon: "FileSearch", color: "#d4a84b", input: "Code diff", output: "Review with comments" },
    );
    edges.push([0, 1], [1, 2], [2, 3]);
    return { action: "create", nodes, edges, response: `Dev workflow sprouted with ${nodes.length} nodes. A Code Developer writes the implementation, then a Code Reviewer checks quality and best practices.` };
  }

  // Default
  nodes.push(
    { type: "agent", name: "Research Agent", role: "Research Specialist", description: "Gathers and compiles relevant information.", icon: "Globe", color: "#4a7c59", tools: ["web-search", "url-reader"] },
    { type: "task", name: "Gather Info", description: "Research and collect relevant information.", icon: "FileSearch", color: "#d4a84b", input: "Topic or question", output: "Compiled findings" },
    { type: "agent", name: "Action Agent", role: "Task Executor", description: "Processes findings and produces deliverables.", icon: "Zap", color: "#b8694a", tools: ["text-editor"] },
    { type: "task", name: "Process & Deliver", description: "Process findings and produce final output.", icon: "FileEdit", color: "#d4a84b", input: "Research findings", output: "Final deliverable" },
  );
  edges.push([0, 1], [1, 2], [2, 3]);
  return { action: "create", nodes, edges, response: `I've cultivated a workflow with ${nodes.length} nodes. A Research Agent gathers information, then an Action Agent processes and delivers the results. You can ask me to expand it further!` };
}

// ── Build nodes from plan ────────────────────────────────────────────

function buildFromPlan(
  plan: WorkflowPlan,
  existingNodes: VyneNode[],
  existingEdges: VyneEdge[]
): { nodes: VyneNode[]; edges: VyneEdge[] } {
  const GAP_X = 400;
  const Y_CENTER = 200;
  const Y_AGENT = -40;
  const Y_TASK = 80;
  const ts = Date.now();

  // Find rightmost x position of existing nodes
  let startX = 120;
  if (plan.action === "expand" && existingNodes.length > 0) {
    startX = Math.max(...existingNodes.map((n) => n.position.x)) + GAP_X;
  }

  const newNodeIds: string[] = [];
  const newNodes: VyneNode[] = [];

  plan.nodes.forEach((pn, i) => {
    const id = `vyne-${pn.type}-${i}-${ts}`;
    newNodeIds.push(id);
    const x = startX + i * GAP_X;
    const y = Y_CENTER + (pn.type === "agent" ? Y_AGENT : Y_TASK);

    if (pn.type === "agent") {
      newNodes.push({
        id, type: "agentNode", position: { x, y },
        data: {
          type: "agent", templateId: pn.name.toLowerCase().replace(/\s+/g, "-"),
          name: pn.name, role: pn.role || "Agent", description: pn.description,
          icon: pn.icon, color: pn.color, tools: pn.tools || [],
          persona: { ...DEFAULT_AGENT_PERSONA }, status: "idle",
        } as AgentNodeData,
      });
    } else {
      newNodes.push({
        id, type: "taskNode", position: { x, y },
        data: {
          type: "task", templateId: pn.name.toLowerCase().replace(/\s+/g, "-"),
          name: pn.name, description: pn.description,
          icon: pn.icon, color: pn.color,
          expectedInput: pn.input || "Input", expectedOutput: pn.output || "Output",
          config: { ...DEFAULT_TASK_CONFIG }, status: "pending",
        } as TaskNodeData,
      });
    }
  });

  // Build edges within the new plan
  const newEdges: VyneEdge[] = plan.edges.map((e, i) => ({
    id: `vyne-edge-${i}-${ts}`,
    source: newNodeIds[e[0]],
    target: newNodeIds[e[1]],
    type: "vyneEdge" as const,
    animated: true,
  }));

  // Connect to existing nodes
  if (plan.connectToExisting) {
    plan.connectToExisting.forEach((conn, i) => {
      newEdges.push({
        id: `vyne-bridge-${i}-${ts}`,
        source: conn.fromExisting,
        target: newNodeIds[conn.toNew],
        type: "vyneEdge" as const,
        animated: true,
      });
    });
  }

  // Merge with existing or replace
  if (plan.action === "expand") {
    return {
      nodes: [...existingNodes, ...newNodes],
      edges: [...existingEdges, ...newEdges],
    };
  }

  return { nodes: newNodes, edges: newEdges };
}

// ── Suggestion chips ─────────────────────────────────────────────────

const suggestions = [
  "Research topics and write a blog post",
  "Analyze support tickets and draft responses",
  "Build an email outreach campaign",
  "Set up a code review pipeline",
];

// ── Main component ──────────────────────────────────────────────────

export function VyneChat() {
  const inputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { nodes, edges, loadTemplate } = useWorkflowStore();
  const {
    messages, addMessage, updateMessage, clearMessages,
    isOpen, setIsOpen, isProcessing, setIsProcessing,
  } = useVyneMemory();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 300);
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const prompt = (text || (inputRef.current?.value ?? "")).trim();
    if (!prompt || isProcessing) return;
    if (inputRef.current) inputRef.current.value = "";

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`, role: "user", content: prompt, timestamp: Date.now(),
    };
    addMessage(userMsg);
    setIsProcessing(true);

    // Phase 1: Thinking
    const vyneId = `msg-${Date.now()}-vyne`;
    addMessage({
      id: vyneId, role: "vyne", content: "Understanding your request...",
      timestamp: Date.now(), status: "thinking",
    });

    await new Promise((r) => setTimeout(r, 1000));

    // Phase 2: Planning
    const plan = analyzePrompt(prompt, nodes, edges);
    updateMessage(vyneId, {
      content: plan.action === "expand"
        ? "Extending your workflow with new steps..."
        : "Planting agents and connecting tasks...",
      status: "building",
      action: plan.action,
    });

    await new Promise((r) => setTimeout(r, 1200));

    // Phase 3: Build & load
    const result = buildFromPlan(plan, nodes, edges);
    loadTemplate(result.nodes, result.edges);

    updateMessage(vyneId, {
      content: plan.response,
      status: "complete",
      builtNodes: plan.nodes.length,
      action: plan.action,
    });

    setIsProcessing(false);
  };

  const hasNodes = nodes.length > 0;

  return (
    <>
      {/* Floating chat panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40
                       w-[560px] bg-white rounded-[22px] border border-[var(--vyne-border)]
                       shadow-[0_12px_48px_rgba(26,35,22,0.12)] flex flex-col"
            style={{ maxHeight: "440px" }}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[var(--vyne-border)] flex items-center justify-between shrink-0 bg-gradient-to-r from-[var(--vyne-accent-bg)]/40 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--vyne-accent)] to-[var(--vyne-accent-light)] flex items-center justify-center shadow-sm">
                  <Leaf size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--vyne-text-primary)] leading-tight">Vyne AI</h3>
                  <p className="text-[10px] text-[var(--vyne-text-tertiary)]">
                    {hasNodes ? `${nodes.length} nodes on canvas` : "Ready to build"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <button
                    onClick={clearMessages}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)] hover:bg-red-50/80 transition-all"
                    title="Clear history"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)] transition-all"
                >
                  <ChevronDown size={16} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 min-h-[120px]">
              {messages.length === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-3">
                  <div className="w-11 h-11 mx-auto mb-3 rounded-2xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
                    <Sprout size={20} className="text-[var(--vyne-accent)]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--vyne-text-primary)] mb-1">What would you like to build?</p>
                  <p className="text-[11px] text-[var(--vyne-text-tertiary)] max-w-[300px] mx-auto leading-relaxed mb-4">
                    Describe a workflow and I'll plant the agents, tasks, and connections. You can always ask me to expand it later.
                  </p>
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestions.map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)]
                                   text-[10px] font-medium text-[var(--vyne-text-secondary)]
                                   hover:border-[var(--vyne-accent)] hover:text-[var(--vyne-accent)] hover:bg-[var(--vyne-accent-bg)]/30 transition-all"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 ${
                    msg.role === "user"
                      ? "bg-[var(--vyne-accent)] text-white rounded-br-md"
                      : "bg-[var(--vyne-bg)] border border-[var(--vyne-border)] rounded-bl-md"
                  }`}>
                    {msg.role === "vyne" && msg.status && msg.status !== "complete" && (
                      <div className="flex items-center gap-2 mb-1">
                        {msg.status === "thinking" && <Loader2 size={11} className="text-[var(--vyne-accent)] animate-spin" />}
                        {msg.status === "building" && <Wand2 size={11} className="text-[var(--vyne-accent)] animate-pulse" />}
                        <span className="text-[9px] font-semibold text-[var(--vyne-accent)] uppercase tracking-wider">
                          {msg.status === "thinking" ? "Thinking..." : "Building..."}
                        </span>
                      </div>
                    )}

                    {msg.role === "vyne" && msg.status === "complete" && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <CheckCircle2 size={11} className="text-[var(--vyne-success)]" />
                        <span className="text-[9px] font-semibold text-[var(--vyne-success)] uppercase tracking-wider">
                          {msg.builtNodes} nodes {msg.action === "expand" ? "added" : "planted"}
                        </span>
                      </div>
                    )}

                    <p className={`text-[12px] leading-relaxed ${msg.role === "user" ? "text-white/95" : "text-[var(--vyne-text-secondary)]"}`}>
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="px-4 pb-4 pt-2 shrink-0">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)] focus-within:border-[var(--vyne-accent)] focus-within:ring-2 focus-within:ring-[var(--vyne-accent-glow)] transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder={hasNodes ? "Ask Vyne to expand or modify..." : "Describe your workflow..."}
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 bg-transparent text-[13px] text-[var(--vyne-text-primary)]
                             placeholder:text-[var(--vyne-text-tertiary)] focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={isProcessing}
                  className="w-9 h-9 rounded-xl bg-[var(--vyne-accent)] text-white flex items-center justify-center
                             hover:opacity-90 transition-all disabled:opacity-30 shrink-0 btn-press"
                >
                  {isProcessing ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setIsOpen(true)}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40
                       flex items-center gap-2.5 pl-4 pr-5 py-3 rounded-2xl
                       bg-white border border-[var(--vyne-border)] shadow-[var(--shadow-lg)]
                       hover:shadow-[0_8px_32px_rgba(74,124,89,0.15)] hover:border-[var(--vyne-accent)]/30
                       transition-all group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--vyne-accent)] to-[var(--vyne-accent-light)] flex items-center justify-center shadow-sm">
              <Leaf size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)] leading-tight group-hover:text-[var(--vyne-accent)] transition-colors">
                {hasNodes ? "Ask Vyne to expand" : "Tell Vyne what to build"}
              </p>
              <p className="text-[10px] text-[var(--vyne-text-tertiary)]">AI workflow builder</p>
            </div>
            {messages.length > 0 && (
              <div className="w-5 h-5 rounded-full bg-[var(--vyne-accent)] text-white text-[9px] font-bold flex items-center justify-center">
                {messages.filter((m) => m.role === "user").length}
              </div>
            )}
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
