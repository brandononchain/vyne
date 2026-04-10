"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Send,
  X,
  Loader2,
  Command,
  MessageSquare,
  Minimize2,
  Maximize2,
  Trash2,
  Sparkles,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useVyneMemory, type ChatMessage } from "@/store/vyne-memory";
import { useProjectStore } from "@/store/project-store";
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "@/lib/types";
import type { VyneNode, VyneEdge, AgentNodeData, TaskNodeData, VyneNodeData } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────

interface GeneratedNode {
  type: "agent" | "task";
  name: string;
  role?: string;
  description: string;
  icon: string;
  color: string;
  tools?: string[];
  persona?: { goal: string; backstory: string; tone: string };
  input?: string;
  output?: string;
  instructions?: string;
  x: number;
  y: number;
}

interface GeneratedWorkflow {
  title: string;
  description: string;
  nodes: GeneratedNode[];
  edges: { from: number; to: number }[];
}

// ── Convert generated JSON to VyneNodes ──────────────────────────────

function toVyneNodes(gen: GeneratedWorkflow): { nodes: VyneNode[]; edges: VyneEdge[] } {
  const ts = Date.now();
  const nodeIds: string[] = [];

  const nodes: VyneNode[] = gen.nodes.map((n, i) => {
    const id = `gen-${n.type}-${i}-${ts}`;
    nodeIds.push(id);

    if (n.type === "agent") {
      return {
        id, type: "agentNode", position: { x: n.x, y: n.y },
        data: {
          type: "agent", templateId: n.name.toLowerCase().replace(/\s+/g, "-"),
          name: n.name, role: n.role || "Agent", description: n.description,
          icon: n.icon, color: n.color, tools: n.tools || [],
          persona: n.persona
            ? { goal: n.persona.goal, backstory: n.persona.backstory, tone: n.persona.tone as AgentNodeData["persona"]["tone"], customInstructions: "" }
            : { ...DEFAULT_AGENT_PERSONA },
          status: "idle",
        } as AgentNodeData,
      };
    }

    return {
      id, type: "taskNode", position: { x: n.x, y: n.y },
      data: {
        type: "task", templateId: n.name.toLowerCase().replace(/\s+/g, "-"),
        name: n.name, description: n.description,
        icon: n.icon, color: n.color,
        expectedInput: n.input || "Input from upstream", expectedOutput: n.output || "Processed output",
        config: { ...DEFAULT_TASK_CONFIG, detailedInstructions: n.instructions || "" },
        status: "pending",
      } as TaskNodeData,
    };
  });

  const edges: VyneEdge[] = gen.edges
    .filter((e) => nodeIds[e.from] && nodeIds[e.to])
    .map((e, i) => ({
      id: `gen-edge-${i}-${ts}`,
      source: nodeIds[e.from], target: nodeIds[e.to],
      type: "vyneEdge" as const, animated: true,
    }));

  return { nodes, edges };
}

// ── Chat System Prompt ───────────────────────────────────────────────

function buildSystemPrompt(canvasContext: string): string {
  return `You are Vyne AI — the intelligent copilot for Vyne, a visual AI agent workflow builder.

You help users design, build, debug, and optimize multi-agent AI workflows.

PERSONALITY:
- Warm, knowledgeable, and proactive
- You speak as a collaborative partner, not a tool
- Use concise, clear language
- Reference the user's actual workflow when relevant

CAPABILITIES:
1. CONVERSATION: Answer questions about AI agents, workflows, automation, best practices
2. WORKFLOW GENERATION: When the user wants to build/expand a workflow, generate it
3. CANVAS AWARENESS: You can see what's on the user's canvas right now
4. DEBUGGING: Help troubleshoot why a workflow isn't working
5. OPTIMIZATION: Suggest improvements to existing workflows

CURRENT CANVAS STATE:
${canvasContext || "Empty canvas — no nodes or edges yet."}

WORKFLOW GENERATION:
When the user wants to create or modify a workflow, respond with your explanation FIRST, then include a JSON block at the end wrapped in \`\`\`vyne-workflow markers:

\`\`\`vyne-workflow
{
  "title": "Workflow Title",
  "description": "What it does",
  "nodes": [
    {
      "type": "agent",
      "name": "Agent Name",
      "role": "Role",
      "description": "What it does",
      "icon": "Globe",
      "color": "#4a7c59",
      "tools": ["web-search"],
      "persona": { "goal": "...", "backstory": "...", "tone": "professional" },
      "x": 100, "y": 160
    },
    {
      "type": "task",
      "name": "Task Name",
      "description": "What it does",
      "icon": "FileText",
      "color": "#d4a84b",
      "input": "What goes in",
      "output": "What comes out",
      "instructions": "Detailed steps",
      "x": 500, "y": 280
    }
  ],
  "edges": [{ "from": 0, "to": 1 }]
}
\`\`\`

Available icons: Globe, PenTool, FileSearch, FileEdit, FileText, ShieldCheck, Code2, Terminal, Send, ListChecks, Activity, BarChart3, Search, Mail, Wand2, Repeat
Available tools: web-search, url-reader, text-editor, grammar-checker, code-executor, csv-reader, chart-generator, email-client, api-connector, linter, task-tracker, calendar, contact-book

Only include the vyne-workflow block when the user is asking you to BUILD or MODIFY something. For normal conversation, just respond naturally.`;
}

function getCanvasContext(nodes: VyneNode[], edges: VyneEdge[]): string {
  if (nodes.length === 0) return "";

  const nodeDescriptions = nodes.map((n) => {
    const d = n.data as VyneNodeData;
    return `- ${d.name} (${d.type}) [${(d as AgentNodeData).role || ""}]`;
  }).join("\n");

  const edgeDescriptions = edges.map((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    return `- ${(src?.data as VyneNodeData)?.name || "?"} → ${(tgt?.data as VyneNodeData)?.name || "?"}`;
  }).join("\n");

  return `${nodes.length} nodes, ${edges.length} connections:\n${nodeDescriptions}\n\nConnections:\n${edgeDescriptions}`;
}

// ── Message Bubble ───────────────────────────────────────────────────

function MessageBubble({ msg, onApplyWorkflow }: { msg: ChatMessage; onApplyWorkflow: (wf: GeneratedWorkflow) => void }) {
  const isUser = msg.role === "user";

  // Check for vyne-workflow blocks in assistant messages
  const workflowMatch = !isUser ? msg.content.match(/```vyne-workflow\n([\s\S]*?)\n```/) : null;
  const textContent = workflowMatch
    ? msg.content.replace(/```vyne-workflow\n[\s\S]*?\n```/, "").trim()
    : msg.content;

  let parsedWorkflow: GeneratedWorkflow | null = null;
  if (workflowMatch) {
    try { parsedWorkflow = JSON.parse(workflowMatch[1]); } catch { /* ignore */ }
  }

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div className={`max-w-[85%] ${isUser ? "order-2" : "order-1"}`}>
        {/* Avatar + name */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-1 ml-1">
            <div className="w-4 h-4 rounded-md bg-[var(--vyne-accent)] flex items-center justify-center">
              <Leaf size={9} className="text-white" />
            </div>
            <span className="text-[9px] font-bold text-[var(--vyne-text-tertiary)] uppercase tracking-wider">Vyne</span>
          </div>
        )}

        {/* Message bubble */}
        <div
          className={`px-3.5 py-2.5 rounded-2xl text-[13px] leading-relaxed ${
            isUser
              ? "bg-[var(--vyne-accent)] text-white rounded-br-md"
              : "bg-[var(--vyne-bg-warm)] text-[var(--vyne-text-primary)] rounded-bl-md border border-[var(--vyne-border)]"
          }`}
        >
          {msg.status === "thinking" ? (
            <div className="flex items-center gap-2">
              <Loader2 size={12} className="animate-spin" />
              <span className="text-[12px] opacity-70">Thinking...</span>
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{textContent}</div>
          )}
        </div>

        {/* Workflow action card */}
        {parsedWorkflow && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-2 p-3 rounded-xl bg-white border border-[var(--vyne-accent)]/20 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={12} className="text-[var(--vyne-accent)]" />
              <span className="text-[11px] font-bold text-[var(--vyne-text-primary)]">
                {parsedWorkflow.title}
              </span>
              <span className="text-[9px] text-[var(--vyne-text-tertiary)] ml-auto">
                {parsedWorkflow.nodes.length} nodes
              </span>
            </div>
            <p className="text-[10px] text-[var(--vyne-text-secondary)] mb-2.5 leading-relaxed">
              {parsedWorkflow.description}
            </p>
            <button
              onClick={() => onApplyWorkflow(parsedWorkflow!)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg
                         bg-[var(--vyne-accent)] text-white text-[11px] font-semibold
                         hover:opacity-90 transition-opacity"
            >
              <Leaf size={11} />
              Add to Canvas
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
}

// ── Main Chat Component ──────────────────────────────────────────────

export function CopilotOmnibar() {
  const {
    messages,
    addMessage,
    updateMessage,
    isOpen,
    setIsOpen,
    isProcessing,
    setIsProcessing,
  } = useVyneMemory();

  const { nodes, edges, loadTemplate } = useWorkflowStore();
  const selectedNodeId = useWorkflowStore((s) => s.selectedNodeId);
  const activeProjectId = useProjectStore((s) => s.activeProjectId);
  const activeProject = useProjectStore((s) => s.projects.find((p) => p.id === s.activeProjectId));

  // Get selected node data for context
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  const selectedNodeData = selectedNode ? selectedNode.data as VyneNodeData : null;

  const [input, setInput] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
  }, [isOpen]);

  // CMD+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, setIsOpen]);

  // ── Send message ──────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    let text = input.trim();
    if (!text || isProcessing) return;

    // If a node is selected, prepend context
    let nodeContext = "";
    if (selectedNodeData) {
      const nd = selectedNodeData;
      nodeContext = `[Referring to node: "${nd.name}" (${nd.type}${(nd as AgentNodeData).role ? `, ${(nd as AgentNodeData).role}` : ""})]\n`;
    }

    const fullMessage = nodeContext + text;

    setInput("");
    setIsProcessing(true);

    // Add user message
    const userMsgId = `user-${Date.now()}`;
    addMessage({
      id: userMsgId,
      role: "user",
      content: fullMessage,
      timestamp: Date.now(),
      status: "complete",
    });

    // Save user message to DB
    const serverId = activeProject?.serverId || null;
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: "user", content: fullMessage, workflowId: serverId }),
    }).catch(() => {});

    // Add thinking placeholder
    const vyneMsgId = `vyne-${Date.now()}`;
    addMessage({
      id: vyneMsgId,
      role: "vyne",
      content: "",
      timestamp: Date.now(),
      status: "thinking",
    });

    try {
      // Build conversation history (last 20 messages for context)
      const history = messages.slice(-20).map((m) => ({
        role: m.role === "user" ? "user" : "assistant",
        content: m.content,
      }));
      history.push({ role: "user", content: text });

      const canvasContext = getCanvasContext(nodes, edges);

      const res = await fetch("/api/vyne-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history,
          systemPrompt: buildSystemPrompt(canvasContext),
          existingNodeCount: nodes.length,
        }),
      });

      if (!res.ok) throw new Error("Chat failed");

      const data = await res.json();
      const responseText = data.content || "I'm sorry, I couldn't process that.";

      updateMessage(vyneMsgId, {
        content: responseText,
        status: "complete",
      });

      // Save vyne response to DB
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "vyne", content: responseText, workflowId: serverId }),
      }).catch(() => {});

    } catch (err) {
      updateMessage(vyneMsgId, {
        content: "Sorry, I hit an error. Please try again.",
        status: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, messages, nodes, edges, addMessage, updateMessage, setIsProcessing, activeProject, selectedNodeData]);

  // ── Apply workflow from chat ──────────────────────────────────

  const handleApplyWorkflow = useCallback((wf: GeneratedWorkflow) => {
    const { nodes: newNodes, edges: newEdges } = toVyneNodes(wf);
    loadTemplate(
      [...nodes, ...newNodes],
      [...edges, ...newEdges]
    );
    useWorkflowStore.getState().addToast({
      type: "success",
      title: `Added "${wf.title}"`,
      message: `${wf.nodes.length} nodes added to your canvas.`,
      duration: 4000,
    });
  }, [nodes, edges, loadTemplate]);

  const panelWidth = isExpanded ? "w-[480px]" : "w-[380px]";
  const panelHeight = isExpanded ? "h-[600px]" : "h-[460px]";

  return (
    <>
      {/* ─── Chat Panel ─── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className={`absolute bottom-4 right-4 z-50 ${panelWidth} ${panelHeight}
                       bg-white rounded-2xl border border-[var(--vyne-border)]
                       shadow-[0_20px_60px_rgba(26,35,22,0.14)]
                       flex flex-col overflow-hidden`}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--vyne-border)] shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[var(--vyne-accent)] to-[var(--vyne-accent-light)] flex items-center justify-center shadow-sm">
                  <Leaf size={13} className="text-white" />
                </div>
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--vyne-text-primary)] leading-none">
                    Vyne AI
                  </h3>
                  <p className="text-[9px] text-[var(--vyne-text-tertiary)] mt-0.5">
                    {activeProject?.name || "Workflow Copilot"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
                >
                  {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-6">
                  <div className="w-12 h-12 rounded-2xl bg-[var(--vyne-accent-bg)] flex items-center justify-center mb-4">
                    <Leaf size={22} className="text-[var(--vyne-accent)]" />
                  </div>
                  <h4 className="text-[14px] font-bold text-[var(--vyne-text-primary)] mb-1">
                    Hi! I&apos;m Vyne AI
                  </h4>
                  <p className="text-[11px] text-[var(--vyne-text-tertiary)] leading-relaxed max-w-[240px] mb-4">
                    I can help you build workflows, answer questions about AI agents, and optimize your automations.
                  </p>
                  <div className="w-full space-y-1.5">
                    {[
                      "Build me a content research pipeline",
                      "How do I connect agents to tasks?",
                      "Optimize my current workflow",
                    ].map((s) => (
                      <button
                        key={s}
                        onClick={() => { setInput(s); }}
                        className="w-full text-left px-3 py-2 rounded-lg text-[11px]
                                   text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)]
                                   hover:text-[var(--vyne-text-primary)] transition-colors"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} msg={msg} onApplyWorkflow={handleApplyWorkflow} />
              ))}
            </div>

            {/* Input */}
            <div className="border-t border-[var(--vyne-border)] px-3 py-2.5 shrink-0">
              {/* Selected node reference */}
              {selectedNodeData && (
                <div className="flex items-center gap-2 mb-2 px-1">
                  <div
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-medium"
                    style={{
                      backgroundColor: ((selectedNodeData as AgentNodeData).color || "#4a7c59") + "10",
                      borderColor: ((selectedNodeData as AgentNodeData).color || "#4a7c59") + "30",
                      color: (selectedNodeData as AgentNodeData).color || "#4a7c59",
                    }}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: (selectedNodeData as AgentNodeData).color || "#4a7c59" }} />
                    {selectedNodeData.name}
                    <span className="opacity-60">({selectedNodeData.type})</span>
                  </div>
                  <button
                    onClick={() => useWorkflowStore.getState().setSelectedNodeId(null)}
                    className="w-4 h-4 rounded flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] transition-colors"
                  >
                    <X size={10} />
                  </button>
                  <span className="text-[9px] text-[var(--vyne-text-tertiary)]">
                    Referenced in next message
                  </span>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  placeholder="Ask Vyne anything..."
                  rows={1}
                  className="flex-1 text-[13px] text-[var(--vyne-text-primary)]
                             placeholder:text-[var(--vyne-text-tertiary)] bg-[var(--vyne-bg)]
                             rounded-xl px-3.5 py-2.5 resize-none outline-none
                             focus:ring-1 focus:ring-[var(--vyne-accent)]/30 border border-[var(--vyne-border)]
                             max-h-[100px] leading-relaxed"
                  style={{ minHeight: "40px" }}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isProcessing}
                  className="w-9 h-9 rounded-xl bg-[var(--vyne-accent)] text-white flex items-center justify-center
                             hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed shrink-0"
                >
                  {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Floating trigger button ─── */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="absolute bottom-6 right-6 z-40
                       w-12 h-12 rounded-2xl
                       bg-gradient-to-br from-[var(--vyne-accent)] to-[var(--vyne-accent-light)]
                       text-white flex items-center justify-center
                       shadow-[0_4px_20px_rgba(74,124,89,0.3)]
                       hover:shadow-[0_8px_32px_rgba(74,124,89,0.4)]
                       transition-shadow"
          >
            <MessageSquare size={20} />
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
