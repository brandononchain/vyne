"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  X,
  Leaf,
  Loader2,
  ChevronDown,
  Sprout,
  Zap,
  CheckCircle2,
  Wand2,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useDeployStore } from "@/store/deploy-store";
import { workflowTemplates } from "@/lib/workflow-templates";
import type { VyneNode, VyneEdge, AgentNodeData, TaskNodeData } from "@/lib/types";
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: "user" | "vine";
  content: string;
  timestamp: number;
  status?: "thinking" | "building" | "complete" | "error";
  builtNodes?: number;
}

// ── Workflow builder logic ───────────────────────────────────────────

interface ParsedWorkflow {
  agents: { name: string; role: string; icon: string; color: string; tools: string[] }[];
  tasks: { name: string; description: string; icon: string; color: string; input: string; output: string }[];
  edges: { from: number; to: number; fromType: "agent" | "task"; toType: "agent" | "task" }[];
}

function parsePromptToWorkflow(prompt: string): ParsedWorkflow {
  const lower = prompt.toLowerCase();

  // Detect intent and build appropriate workflow
  if (lower.includes("research") && (lower.includes("blog") || lower.includes("write") || lower.includes("content"))) {
    return {
      agents: [
        { name: "Web Researcher", role: "Research Specialist", icon: "Globe", color: "#4a7c59", tools: ["web-search", "url-reader"] },
        { name: "Content Writer", role: "Creative Writer", icon: "PenTool", color: "#b8694a", tools: ["text-editor", "grammar-checker"] },
      ],
      tasks: [
        { name: "Research Topic", description: "Search and compile information on the topic.", icon: "FileSearch", color: "#d4a84b", input: "Topic or question", output: "Research notes with sources" },
        { name: "Write Article", description: "Draft a polished article from research.", icon: "FileEdit", color: "#d4a84b", input: "Research notes", output: "Finished article" },
      ],
      edges: [
        { from: 0, to: 0, fromType: "agent", toType: "task" },
        { from: 0, to: 1, fromType: "task", toType: "agent" },
        { from: 1, to: 1, fromType: "agent", toType: "task" },
      ],
    };
  }

  if (lower.includes("support") || lower.includes("ticket") || lower.includes("customer")) {
    return {
      agents: [
        { name: "Ticket Analyzer", role: "Support Analyst", icon: "FileSearch", color: "#4a7c59", tools: ["web-search"] },
        { name: "Response Writer", role: "Support Agent", icon: "PenTool", color: "#b8694a", tools: ["text-editor"] },
      ],
      tasks: [
        { name: "Categorize Issue", description: "Classify the ticket by type and priority.", icon: "ListChecks", color: "#d4a84b", input: "Customer ticket", output: "Category and priority" },
        { name: "Draft Reply", description: "Write an empathetic, helpful response.", icon: "FileEdit", color: "#d4a84b", input: "Ticket + category", output: "Draft response" },
        { name: "Quality Check", description: "Review response for tone and accuracy.", icon: "ShieldCheck", color: "#5a9e6f", input: "Draft response", output: "Approved response" },
      ],
      edges: [
        { from: 0, to: 0, fromType: "agent", toType: "task" },
        { from: 0, to: 1, fromType: "task", toType: "agent" },
        { from: 1, to: 1, fromType: "agent", toType: "task" },
        { from: 1, to: 2, fromType: "task", toType: "task" },
      ],
    };
  }

  if (lower.includes("email") || lower.includes("outreach") || lower.includes("campaign")) {
    return {
      agents: [
        { name: "Lead Researcher", role: "Research Specialist", icon: "Globe", color: "#4a7c59", tools: ["web-search", "url-reader"] },
        { name: "Email Copywriter", role: "Creative Writer", icon: "PenTool", color: "#b8694a", tools: ["text-editor"] },
      ],
      tasks: [
        { name: "Find Prospects", description: "Research and identify target contacts.", icon: "Search", color: "#d4a84b", input: "Target criteria", output: "Prospect list" },
        { name: "Personalize Email", description: "Write a tailored outreach email.", icon: "FileEdit", color: "#d4a84b", input: "Prospect data", output: "Personalized email draft" },
        { name: "Send Campaign", description: "Queue and send the email batch.", icon: "Send", color: "#5a9e6f", input: "Email drafts", output: "Send confirmation" },
      ],
      edges: [
        { from: 0, to: 0, fromType: "agent", toType: "task" },
        { from: 0, to: 1, fromType: "task", toType: "agent" },
        { from: 1, to: 1, fromType: "agent", toType: "task" },
        { from: 1, to: 2, fromType: "task", toType: "task" },
      ],
    };
  }

  if (lower.includes("data") || lower.includes("analyz") || lower.includes("report")) {
    return {
      agents: [
        { name: "Data Analyst", role: "Analytics Expert", icon: "BarChart3", color: "#4a7c59", tools: ["csv-reader", "chart-generator"] },
        { name: "Report Writer", role: "Technical Writer", icon: "PenTool", color: "#b8694a", tools: ["text-editor"] },
      ],
      tasks: [
        { name: "Analyze Data", description: "Process and find patterns in the dataset.", icon: "Activity", color: "#d4a84b", input: "Raw dataset", output: "Key insights and charts" },
        { name: "Generate Report", description: "Create a formatted analysis report.", icon: "FileText", color: "#d4a84b", input: "Insights", output: "Final report" },
      ],
      edges: [
        { from: 0, to: 0, fromType: "agent", toType: "task" },
        { from: 0, to: 1, fromType: "task", toType: "agent" },
        { from: 1, to: 1, fromType: "agent", toType: "task" },
      ],
    };
  }

  if (lower.includes("code") || lower.includes("develop") || lower.includes("review") || lower.includes("pr")) {
    return {
      agents: [
        { name: "Code Developer", role: "Software Engineer", icon: "Code2", color: "#4a7c59", tools: ["code-executor"] },
        { name: "Code Reviewer", role: "Senior Engineer", icon: "ShieldCheck", color: "#5a9e6f", tools: ["code-executor"] },
      ],
      tasks: [
        { name: "Write Code", description: "Implement the feature or fix.", icon: "Terminal", color: "#d4a84b", input: "Requirements", output: "Code diff" },
        { name: "Review Code", description: "Check for bugs, style, and best practices.", icon: "FileSearch", color: "#d4a84b", input: "Code diff", output: "Review comments" },
      ],
      edges: [
        { from: 0, to: 0, fromType: "agent", toType: "task" },
        { from: 0, to: 1, fromType: "task", toType: "agent" },
        { from: 1, to: 1, fromType: "agent", toType: "task" },
      ],
    };
  }

  // Default: generic research + action workflow
  return {
    agents: [
      { name: "Research Agent", role: "Research Specialist", icon: "Globe", color: "#4a7c59", tools: ["web-search", "url-reader"] },
      { name: "Action Agent", role: "Task Executor", icon: "Zap", color: "#b8694a", tools: ["text-editor"] },
    ],
    tasks: [
      { name: "Gather Info", description: "Research and collect relevant information.", icon: "FileSearch", color: "#d4a84b", input: "Topic or question", output: "Compiled findings" },
      { name: "Take Action", description: "Process findings and produce output.", icon: "FileEdit", color: "#d4a84b", input: "Research findings", output: "Final deliverable" },
    ],
    edges: [
      { from: 0, to: 0, fromType: "agent", toType: "task" },
      { from: 0, to: 1, fromType: "task", toType: "agent" },
      { from: 1, to: 1, fromType: "agent", toType: "task" },
    ],
  };
}

function buildWorkflowNodes(parsed: ParsedWorkflow): { nodes: VyneNode[]; edges: VyneEdge[] } {
  const AGENT_GAP = 420;
  const TASK_GAP = 380;
  const Y_CENTER = 200;
  const Y_OFFSET = 160;

  // Layout: agents and tasks alternate left-to-right
  const allItems: { type: "agent" | "task"; index: number }[] = [];
  // Interleave: first agent, first task, second agent, second task...
  const maxLen = Math.max(parsed.agents.length, parsed.tasks.length);
  for (let i = 0; i < maxLen; i++) {
    if (i < parsed.agents.length) allItems.push({ type: "agent", index: i });
    if (i < parsed.tasks.length) allItems.push({ type: "task", index: i });
  }

  const nodes: VyneNode[] = [];
  let xPos = 120;

  const agentNodeIds: string[] = [];
  const taskNodeIds: string[] = [];

  for (const item of allItems) {
    const id = `vine-${item.type}-${item.index}-${Date.now()}`;
    const yOffset = item.type === "task" ? Y_OFFSET * 0.5 : -Y_OFFSET * 0.3;

    if (item.type === "agent") {
      const a = parsed.agents[item.index];
      agentNodeIds.push(id);
      nodes.push({
        id,
        type: "agentNode",
        position: { x: xPos, y: Y_CENTER + yOffset },
        data: {
          type: "agent", templateId: a.name.toLowerCase().replace(/\s+/g, "-"), name: a.name, role: a.role,
          description: `${a.role} agent.`, icon: a.icon, color: a.color,
          tools: a.tools, persona: { ...DEFAULT_AGENT_PERSONA }, status: "idle",
        } as AgentNodeData,
      });
      xPos += AGENT_GAP;
    } else {
      const t = parsed.tasks[item.index];
      taskNodeIds.push(id);
      nodes.push({
        id,
        type: "taskNode",
        position: { x: xPos, y: Y_CENTER + yOffset },
        data: {
          type: "task", templateId: t.name.toLowerCase().replace(/\s+/g, "-"), name: t.name,
          description: t.description, icon: t.icon, color: t.color,
          expectedInput: t.input, expectedOutput: t.output,
          config: { ...DEFAULT_TASK_CONFIG }, status: "pending",
        } as TaskNodeData,
      });
      xPos += TASK_GAP;
    }
  }

  // Build edges
  const edges: VyneEdge[] = parsed.edges.map((e, i) => {
    const sourceId = e.fromType === "agent" ? agentNodeIds[e.from] : taskNodeIds[e.from];
    const targetId = e.toType === "agent" ? agentNodeIds[e.to] : taskNodeIds[e.to];
    return {
      id: `vine-edge-${i}-${Date.now()}`,
      source: sourceId,
      target: targetId,
      type: "vyneEdge" as const,
      animated: true,
    };
  }).filter((e) => e.source && e.target);

  return { nodes, edges };
}

// ── Vine response generator ──────────────────────────────────────────

function generateVineResponse(prompt: string, nodeCount: number): string {
  const lower = prompt.toLowerCase();
  if (lower.includes("research") && lower.includes("blog"))
    return `I've planted a research-to-content pipeline with ${nodeCount} nodes. A Web Researcher will gather sources, then a Content Writer will craft your article. The workflow flows left to right — each agent hands off to the next.`;
  if (lower.includes("support") || lower.includes("ticket"))
    return `Your support workflow is growing! I've set up ${nodeCount} nodes: a Ticket Analyzer to categorize incoming issues, a Response Writer to draft replies, and a Quality Check step to ensure tone and accuracy.`;
  if (lower.includes("email") || lower.includes("outreach"))
    return `Your outreach pipeline is ready with ${nodeCount} nodes. A Lead Researcher finds prospects, an Email Copywriter personalizes each message, and the Send Campaign task handles delivery.`;
  if (lower.includes("data") || lower.includes("analyz"))
    return `Data pipeline planted with ${nodeCount} nodes! A Data Analyst will process your dataset and find patterns, then a Report Writer compiles everything into a formatted report.`;
  if (lower.includes("code") || lower.includes("develop"))
    return `Dev workflow sprouted with ${nodeCount} nodes. A Code Developer writes the implementation, then a Code Reviewer checks for bugs and best practices.`;
  return `I've cultivated a workflow with ${nodeCount} nodes based on your request. The agents and tasks are connected in a left-to-right flow — feel free to customize by dragging new nodes from the sidebar or adjusting connections.`;
}

// ── Suggestion chips ─────────────────────────────────────────────────

const suggestions = [
  "Research trending topics and write a blog post",
  "Analyze customer support tickets and draft responses",
  "Build an email outreach campaign",
  "Analyze a dataset and create a report",
  "Set up a code review pipeline",
];

// ── Main component ──────────────────────────────────────────────────

export function VineChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { loadTemplate, nodes } = useWorkflowStore();

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || isProcessing) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: "user",
      content: prompt,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsProcessing(true);

    // Phase 1: Thinking
    const thinkingMsg: ChatMessage = {
      id: `msg-${Date.now()}-vine`,
      role: "vine",
      content: "Analyzing your request and planning the workflow...",
      timestamp: Date.now(),
      status: "thinking",
    };
    setMessages((prev) => [...prev, thinkingMsg]);

    await new Promise((r) => setTimeout(r, 1200));

    // Phase 2: Building
    setMessages((prev) =>
      prev.map((m) =>
        m.id === thinkingMsg.id
          ? { ...m, content: "Planting agents and connecting tasks...", status: "building" }
          : m
      )
    );

    await new Promise((r) => setTimeout(r, 1400));

    // Phase 3: Generate and load workflow
    const parsed = parsePromptToWorkflow(prompt);
    const { nodes: newNodes, edges: newEdges } = buildWorkflowNodes(parsed);
    loadTemplate(newNodes, newEdges);

    const totalNodes = newNodes.length;
    const response = generateVineResponse(prompt, totalNodes);

    setMessages((prev) =>
      prev.map((m) =>
        m.id === thinkingMsg.id
          ? { ...m, content: response, status: "complete", builtNodes: totalNodes }
          : m
      )
    );

    setIsProcessing(false);
  };

  const hasNodes = nodes.length > 0;

  return (
    <>
      {/* Floating chat box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 380, damping: 26 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-40
                       w-[560px] bg-white rounded-[22px] border border-[var(--vyne-border)]
                       shadow-[0_12px_48px_rgba(26,35,22,0.12)] overflow-hidden flex flex-col"
            style={{ maxHeight: "420px" }}
          >
            {/* Header */}
            <div className="px-5 py-3.5 border-b border-[var(--vyne-border)] flex items-center justify-between shrink-0 bg-gradient-to-r from-[var(--vyne-accent-bg)]/40 to-transparent">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[var(--vyne-accent)] flex items-center justify-center">
                  <Leaf size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold text-[var(--vyne-text-primary)] leading-tight">Vine</h3>
                  <p className="text-[10px] text-[var(--vyne-text-tertiary)]">AI Workflow Builder</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)] transition-all"
              >
                <ChevronDown size={16} />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 min-h-[120px]">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-4"
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
                    <Sprout size={22} className="text-[var(--vyne-accent)]" />
                  </div>
                  <p className="text-[13px] font-semibold text-[var(--vyne-text-primary)] mb-1">
                    Describe what you want to build
                  </p>
                  <p className="text-[11px] text-[var(--vyne-text-tertiary)] max-w-[320px] mx-auto leading-relaxed mb-4">
                    Tell me what workflow you need and I'll plant the agents, tasks, and connections for you.
                  </p>

                  {/* Suggestion chips */}
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {suggestions.slice(0, 3).map((s) => (
                      <button
                        key={s}
                        onClick={() => handleSend(s)}
                        className="px-3 py-1.5 rounded-xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)]
                                   text-[10px] font-medium text-[var(--vyne-text-secondary)]
                                   hover:border-[var(--vyne-accent)] hover:text-[var(--vyne-accent)] hover:bg-[var(--vyne-accent-bg)]/30
                                   transition-all"
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
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                      msg.role === "user"
                        ? "bg-[var(--vyne-accent)] text-white rounded-br-md"
                        : "bg-[var(--vyne-bg)] border border-[var(--vyne-border)] rounded-bl-md"
                    }`}
                  >
                    {msg.role === "vine" && msg.status && msg.status !== "complete" && (
                      <div className="flex items-center gap-2 mb-1.5">
                        {msg.status === "thinking" && <Loader2 size={12} className="text-[var(--vyne-accent)] animate-spin" />}
                        {msg.status === "building" && <Wand2 size={12} className="text-[var(--vyne-accent)] animate-pulse" />}
                        <span className="text-[9px] font-semibold text-[var(--vyne-accent)] uppercase tracking-wider">
                          {msg.status === "thinking" ? "Thinking..." : "Building..."}
                        </span>
                      </div>
                    )}

                    {msg.role === "vine" && msg.status === "complete" && (
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <CheckCircle2 size={12} className="text-[var(--vyne-success)]" />
                        <span className="text-[9px] font-semibold text-[var(--vyne-success)] uppercase tracking-wider">
                          {msg.builtNodes} nodes planted
                        </span>
                      </div>
                    )}

                    <p className={`text-[12px] leading-relaxed ${msg.role === "user" ? "text-white" : "text-[var(--vyne-text-secondary)]"}`}>
                      {msg.content}
                    </p>
                  </div>
                </motion.div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <div className="px-4 pb-4 pt-2 shrink-0">
              <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)] focus-within:border-[var(--vyne-accent)] focus-within:ring-2 focus-within:ring-[var(--vyne-accent-glow)] transition-all">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Describe your workflow..."
                  disabled={isProcessing}
                  className="flex-1 px-3 py-2 bg-transparent text-[13px] text-[var(--vyne-text-primary)]
                             placeholder:text-[var(--vyne-text-tertiary)] focus:outline-none disabled:opacity-50"
                />
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || isProcessing}
                  className="w-9 h-9 rounded-xl bg-[var(--vyne-accent)] text-white flex items-center justify-center
                             hover:opacity-90 transition-all disabled:opacity-30 disabled:cursor-not-allowed shrink-0 btn-press"
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
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
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
                {hasNodes ? "Ask Vine to modify" : "Tell Vine what to build"}
              </p>
              <p className="text-[10px] text-[var(--vyne-text-tertiary)]">
                AI workflow builder
              </p>
            </div>
            <div className="ml-1 w-5 h-5 rounded-full bg-[var(--vyne-accent-bg)] flex items-center justify-center">
              <Zap size={10} className="text-[var(--vyne-accent)]" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
