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
  return `You are Vyne AI — the intelligent copilot built into Vyne, an enterprise visual AI agent workflow builder.

IDENTITY:
- You are Vyne AI, a specialized AI assistant for designing and orchestrating multi-agent workflows
- You live inside the Vyne canvas interface and can see everything the user has built
- You are a collaborative partner — warm, knowledgeable, and proactive
- You reference the user's actual nodes and connections by name when relevant
- You speak concisely and precisely — no filler, no excessive verbosity

CORE CAPABILITIES (via tools):
1. \`create_workflow\` — Build new agents, tasks, and connections on the canvas
2. \`configure_node\` — Update ANY property of an existing node: name, role, persona, tools, instructions, output format, constraints
3. \`delete_node\` — Remove a node and its connections from the canvas
4. \`add_connection\` — Wire two nodes together
5. \`remove_connection\` — Disconnect two nodes

ADDITIONAL CAPABILITIES (conversational):
6. EXPLAIN — Teach concepts about AI agents, LLMs, prompt engineering
7. DEBUG — Diagnose why a workflow isn't producing expected results
8. OPTIMIZE — Suggest improvements to execution order, personas, tools

CANVAS AWARENESS:
You can see the user's current canvas state below. When they click a node, you see its full configuration.
When the user's message starts with [Referring to node: "..."], they clicked that node and are asking about it specifically.

${canvasContext ? `CURRENT CANVAS STATE:\n${canvasContext}` : "The canvas is currently empty."}

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
Available tones: professional, casual, analytical, creative, friendly, concise
Agent colors: greens (#4a7c59, #5a9e6f), blue (#0984e3), terracotta (#b8694a)
Task colors: gold (#d4a84b), teal (#5a9e6f)

RULES:
- Only include the vyne-workflow block when the user is asking you to BUILD or MODIFY something
- For questions, debugging, or conversation — just respond naturally
- When referencing a node the user selected, use its name and offer specific actionable advice
- Keep responses focused and actionable — enterprise users value precision over padding
- When suggesting improvements, explain WHY each change matters

CONVERSATION STYLE — THIS IS CRITICAL:
- Talk like a smart colleague, NOT a chatbot or documentation page
- NEVER use ** markdown headers ** as section titles in conversational replies
- Instead of "**What Happens:**" followed by bullet points, just explain it naturally in 2-3 sentences
- Use short paragraphs (2-3 sentences max), not walls of text
- Use bullet points sparingly — only for actual lists of 3+ distinct items
- Be direct and warm: "Here's the thing..." or "So what you want is..." or "Good call — here's how I'd set that up:"
- Show personality — you're an expert who genuinely enjoys helping build great workflows
- If the answer is simple, keep it to 1-2 sentences. Don't over-explain
- Use backticks for technical terms like \`web-search\` or \`agent\`, not bold
- Contractions are fine: "you'll", "it's", "that's", "here's"
- NEVER start a response with "Great question!" or "Absolutely!" — just answer`;
}

function getCanvasContext(nodes: VyneNode[], edges: VyneEdge[], selectedNodeId: string | null): string {
  if (nodes.length === 0) return "";

  const nodeDescriptions = nodes.map((n) => {
    const d = n.data as VyneNodeData;
    const isSelected = n.id === selectedNodeId;
    const prefix = isSelected ? "→ " : "  ";

    if (d.type === "agent") {
      const ad = d as AgentNodeData;
      return `${prefix}${ad.name} (agent, ${ad.role}) — tools: [${ad.tools.join(", ")}]${ad.persona.goal ? `, goal: "${ad.persona.goal}"` : ""}`;
    } else if (d.type === "task") {
      const td = d as TaskNodeData;
      return `${prefix}${td.name} (task) — in: "${td.expectedInput}", out: "${td.expectedOutput}"`;
    }
    return `${prefix}${d.name} (${d.type})`;
  }).join("\n");

  const edgeDescriptions = edges.map((e) => {
    const src = nodes.find((n) => n.id === e.source);
    const tgt = nodes.find((n) => n.id === e.target);
    return `  ${(src?.data as VyneNodeData)?.name || "?"} → ${(tgt?.data as VyneNodeData)?.name || "?"}`;
  }).join("\n");

  let context = `${nodes.length} nodes, ${edges.length} connections:\n${nodeDescriptions}\n\nConnections:\n${edgeDescriptions}`;

  // Add detailed info for selected node
  if (selectedNodeId) {
    const sn = nodes.find((n) => n.id === selectedNodeId);
    if (sn) {
      const sd = sn.data as VyneNodeData;
      context += `\n\nCURRENTLY SELECTED NODE (user is asking about this):\n`;
      context += `Name: ${sd.name}\nType: ${sd.type}\n`;
      if (sd.type === "agent") {
        const ad = sd as AgentNodeData;
        context += `Role: ${ad.role}\nDescription: ${ad.description}\nTools: ${ad.tools.join(", ")}\n`;
        if (ad.persona.goal) context += `Goal: ${ad.persona.goal}\n`;
        if (ad.persona.backstory) context += `Backstory: ${ad.persona.backstory}\n`;
        context += `Tone: ${ad.persona.tone}\n`;
      } else if (sd.type === "task") {
        const td = sd as TaskNodeData;
        context += `Description: ${td.description}\nExpected Input: ${td.expectedInput}\nExpected Output: ${td.expectedOutput}\n`;
        if (td.config.detailedInstructions) context += `Instructions: ${td.config.detailedInstructions}\n`;
      }
    }
  }

  return context;
}

// ── Simple Markdown Renderer ─────────────────────────────────────────

function RenderMarkdown({ text }: { text: string }) {
  // Convert markdown to styled HTML-like React elements
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line → spacer
    if (!line.trim()) {
      elements.push(<div key={i} className="h-2" />);
      i++;
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      elements.push(
        <p key={i} className="text-[12px] font-bold text-[var(--vyne-text-primary)] mt-2 mb-1">
          {processInline(line.slice(4))}
        </p>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      elements.push(
        <p key={i} className="text-[13px] font-bold text-[var(--vyne-text-primary)] mt-2.5 mb-1">
          {processInline(line.slice(3))}
        </p>
      );
      i++;
      continue;
    }

    // Bullet points (- or *)
    if (/^[\s]*[-*]\s/.test(line)) {
      const indent = line.match(/^(\s*)/)?.[1]?.length || 0;
      const content = line.replace(/^[\s]*[-*]\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 mt-0.5" style={{ paddingLeft: `${Math.min(indent * 4, 24)}px` }}>
          <span className="text-[var(--vyne-accent)] mt-[3px] text-[8px]">●</span>
          <span className="text-[12.5px] leading-[1.6] text-[var(--vyne-text-secondary)]">
            {processInline(content)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Numbered lists
    if (/^\d+\.\s/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1];
      const content = line.replace(/^\d+\.\s/, "");
      elements.push(
        <div key={i} className="flex gap-2 mt-0.5">
          <span className="text-[11px] font-bold text-[var(--vyne-accent)] mt-[1px] w-4 shrink-0 text-right">{num}.</span>
          <span className="text-[12.5px] leading-[1.6] text-[var(--vyne-text-secondary)]">
            {processInline(content)}
          </span>
        </div>
      );
      i++;
      continue;
    }

    // Code blocks
    if (line.startsWith("```")) {
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      elements.push(
        <pre key={`code-${i}`} className="mt-1.5 mb-1.5 p-2.5 rounded-lg bg-[#1a2316] text-[11px] text-emerald-300 font-mono leading-relaxed overflow-x-auto">
          {codeLines.join("\n")}
        </pre>
      );
      continue;
    }

    // Regular paragraph
    elements.push(
      <p key={i} className="text-[12.5px] leading-[1.7] text-[var(--vyne-text-secondary)]">
        {processInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{elements}</div>;
}

// Process inline markdown: **bold**, *italic*, `code`, [links]
function processInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let key = 0;

  while (remaining.length > 0) {
    // Bold
    const boldMatch = remaining.match(/\*\*(.+?)\*\*/);
    // Inline code
    const codeMatch = remaining.match(/`([^`]+)`/);
    // Italic
    const italicMatch = remaining.match(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/);

    // Find earliest match
    const matches = [
      boldMatch ? { type: "bold", match: boldMatch, index: boldMatch.index! } : null,
      codeMatch ? { type: "code", match: codeMatch, index: codeMatch.index! } : null,
      italicMatch ? { type: "italic", match: italicMatch, index: italicMatch.index! } : null,
    ].filter(Boolean).sort((a, b) => a!.index - b!.index);

    if (matches.length === 0) {
      parts.push(remaining);
      break;
    }

    const first = matches[0]!;
    // Text before match
    if (first.index > 0) {
      parts.push(remaining.slice(0, first.index));
    }

    if (first.type === "bold") {
      parts.push(
        <strong key={key++} className="font-semibold text-[var(--vyne-text-primary)]">
          {first.match![1]}
        </strong>
      );
    } else if (first.type === "code") {
      parts.push(
        <code key={key++} className="px-1 py-0.5 rounded bg-[var(--vyne-bg)] text-[11px] font-mono text-[var(--vyne-accent)]">
          {first.match![1]}
        </code>
      );
    } else if (first.type === "italic") {
      parts.push(
        <em key={key++} className="italic text-[var(--vyne-text-secondary)]">
          {first.match![1]}
        </em>
      );
    }

    remaining = remaining.slice(first.index + first.match![0].length);
  }

  return parts.length === 1 && typeof parts[0] === "string" ? parts[0] : <>{parts}</>;
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
            <div className="flex items-center gap-2.5 py-1">
              <div className="flex gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--vyne-accent)] animate-bounce" style={{ animationDelay: "0ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--vyne-accent)] animate-bounce" style={{ animationDelay: "150ms" }} />
                <div className="w-1.5 h-1.5 rounded-full bg-[var(--vyne-accent)] animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          ) : (
            <RenderMarkdown text={textContent} />
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

      const canvasContext = getCanvasContext(nodes, edges, selectedNodeId || null);

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
      const responseText = data.content || "";
      const actions = data.actions || [];

      // ── Execute canvas actions ──────────────────────
      const actionSummaries: string[] = [];

      for (const action of actions) {
        try {
          const store = useWorkflowStore.getState();

          switch (action.tool) {
            case "create_workflow": {
              const wf = action.input as GeneratedWorkflow;
              const { nodes: newNodes, edges: newEdges } = toVyneNodes(wf);
              store.loadTemplate(
                [...store.nodes, ...newNodes],
                [...store.edges, ...newEdges]
              );
              actionSummaries.push(`✅ Added "${wf.title}" — ${wf.nodes.length} nodes`);
              break;
            }

            case "configure_node": {
              const { node_name, updates } = action.input as { node_name: string; updates: Record<string, unknown> };
              const targetNode = store.nodes.find(
                (n) => (n.data as VyneNodeData).name.toLowerCase() === node_name.toLowerCase()
              );
              if (targetNode) {
                const currentData = targetNode.data as Record<string, unknown>;
                const newData = { ...currentData };

                // Handle dot-notation updates (persona.goal, config.detailedInstructions)
                for (const [key, value] of Object.entries(updates)) {
                  if (key.includes(".")) {
                    const [parent, child] = key.split(".");
                    const parentObj = (newData[parent] || {}) as Record<string, unknown>;
                    newData[parent] = { ...parentObj, [child]: value };
                  } else {
                    newData[key] = value;
                  }
                }

                store.updateNodeData(targetNode.id, newData as Partial<VyneNodeData>);
                actionSummaries.push(`✅ Updated "${node_name}"`);
              } else {
                actionSummaries.push(`⚠️ Node "${node_name}" not found`);
              }
              break;
            }

            case "delete_node": {
              const { node_name } = action.input as { node_name: string };
              const target = store.nodes.find(
                (n) => (n.data as VyneNodeData).name.toLowerCase() === node_name.toLowerCase()
              );
              if (target) {
                store.removeNode(target.id);
                actionSummaries.push(`✅ Removed "${node_name}"`);
              } else {
                actionSummaries.push(`⚠️ Node "${node_name}" not found`);
              }
              break;
            }

            case "add_connection": {
              const { from_node, to_node } = action.input as { from_node: string; to_node: string };
              const src = store.nodes.find((n) => (n.data as VyneNodeData).name.toLowerCase() === from_node.toLowerCase());
              const tgt = store.nodes.find((n) => (n.data as VyneNodeData).name.toLowerCase() === to_node.toLowerCase());
              if (src && tgt) {
                const newEdge = {
                  id: `vyne-edge-${Date.now()}`,
                  source: src.id,
                  target: tgt.id,
                  type: "vyneEdge" as const,
                  animated: true,
                };
                useWorkflowStore.setState({ edges: [...store.edges, newEdge] });
                actionSummaries.push(`✅ Connected "${from_node}" → "${to_node}"`);
              }
              break;
            }

            case "remove_connection": {
              const { from_node, to_node } = action.input as { from_node: string; to_node: string };
              const src = store.nodes.find((n) => (n.data as VyneNodeData).name.toLowerCase() === from_node.toLowerCase());
              const tgt = store.nodes.find((n) => (n.data as VyneNodeData).name.toLowerCase() === to_node.toLowerCase());
              if (src && tgt) {
                useWorkflowStore.setState({
                  edges: store.edges.filter((e) => !(e.source === src.id && e.target === tgt.id)),
                });
                actionSummaries.push(`✅ Disconnected "${from_node}" → "${to_node}"`);
              }
              break;
            }
          }
        } catch (err) {
          actionSummaries.push(`❌ Action failed: ${action.tool}`);
        }
      }

      // Build final message with action results
      let finalContent = responseText;
      if (actionSummaries.length > 0) {
        finalContent += (finalContent ? "\n\n" : "") + actionSummaries.join("\n");

        // Show toast for actions
        useWorkflowStore.getState().addToast({
          type: "success",
          title: "Canvas updated",
          message: `Vyne AI performed ${actionSummaries.length} action${actionSummaries.length > 1 ? "s" : ""}.`,
          duration: 4000,
        });
      }

      updateMessage(vyneMsgId, {
        content: finalContent || "Done — I've made the changes to your canvas.",
        status: "complete",
        builtNodes: actions.filter((a: { tool: string }) => a.tool === "create_workflow").length > 0
          ? actions.reduce((sum: number, a: { tool: string; input: { nodes?: unknown[] } }) =>
              a.tool === "create_workflow" ? sum + (a.input.nodes?.length || 0) : sum, 0)
          : undefined,
      });

      // Save vyne response to DB
      fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "vyne", content: finalContent, workflowId: serverId }),
      }).catch(() => {});

    } catch (err) {
      updateMessage(vyneMsgId, {
        content: "Sorry, I hit an error. Please try again.",
        status: "error",
      });
    } finally {
      setIsProcessing(false);
    }
  }, [input, isProcessing, messages, nodes, edges, addMessage, updateMessage, setIsProcessing, activeProject, selectedNodeData, selectedNodeId]);

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
