"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  Send,
  Check,
  X,
  RotateCcw,
  Loader2,
  Command,
  Sprout,
  Zap,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "@/lib/types";
import type { VyneNode, VyneEdge, AgentNodeData, TaskNodeData } from "@/lib/types";

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

type OmnibarPhase =
  | "idle"          // Collapsed pill
  | "input"         // Expanded input field
  | "generating"    // Calling API, skeleton preview
  | "preview"       // Accept/reject state
  | "blooming";     // Nodes animating onto canvas

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
        name: n.name, description: n.description, icon: n.icon, color: n.color,
        expectedInput: n.input || "", expectedOutput: n.output || "",
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

// ── Suggestions ──────────────────────────────────────────────────────

const SUGGESTIONS = [
  { text: "Research trending topics and write a blog post", icon: "📝" },
  { text: "Analyze customer support tickets and draft responses", icon: "🎫" },
  { text: "Build an automated email outreach pipeline", icon: "📧" },
  { text: "Create a code review and testing workflow", icon: "🧪" },
];

// ── Component ────────────────────────────────────────────────────────

export function CopilotOmnibar() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<OmnibarPhase>("idle");
  const [prompt, setPrompt] = useState("");
  const [generated, setGenerated] = useState<GeneratedWorkflow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [bloomIndex, setBloomIndex] = useState(-1);
  const { nodes, edges, loadTemplate } = useWorkflowStore();

  // Keyboard shortcut: CMD+K or Ctrl+K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (phase === "idle") {
          setPhase("input");
        } else if (phase === "input") {
          setPhase("idle");
        }
      }
      if (e.key === "Escape" && phase === "input") {
        setPhase("idle");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [phase]);

  // Auto-focus input
  useEffect(() => {
    if (phase === "input") {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [phase]);

  // ── Generate workflow ──────────────────────────────────────────

  const handleGenerate = useCallback(async (text?: string) => {
    const p = (text || prompt).trim();
    if (!p) return;

    setPrompt(p);
    setPhase("generating");
    setError(null);

    try {
      const res = await fetch("/api/generate-workflow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, existingNodeCount: nodes.length }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Generation failed");
      }

      const workflow: GeneratedWorkflow = await res.json();
      setGenerated(workflow);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setPhase("input");
    }
  }, [prompt, nodes.length]);

  // ── Accept workflow ────────────────────────────────────────────

  const handleAccept = useCallback(() => {
    if (!generated) return;

    setPhase("blooming");
    const { nodes: newNodes, edges: newEdges } = toVyneNodes(generated);

    // Merge with existing or replace
    const finalNodes = nodes.length > 0 ? [...nodes, ...newNodes] : newNodes;
    const finalEdges = nodes.length > 0 ? [...edges, ...newEdges] : newEdges;

    // Staggered bloom — reveal nodes one by one
    setBloomIndex(0);
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setBloomIndex(i);
      if (i >= newNodes.length) {
        clearInterval(interval);
        // Load all at once after bloom completes
        setTimeout(() => {
          loadTemplate(finalNodes, finalEdges);
          setPhase("idle");
          setGenerated(null);
          setPrompt("");
          setBloomIndex(-1);
        }, 400);
      }
    }, 280);
  }, [generated, nodes, edges, loadTemplate]);

  // ── Discard ────────────────────────────────────────────────────

  const handleDiscard = () => {
    setGenerated(null);
    setPhase("input");
    setPrompt("");
  };

  // ── Refine ─────────────────────────────────────────────────────

  const handleRefine = () => {
    setPhase("input");
    // Keep the prompt for editing
  };

  const hasNodes = nodes.length > 0;

  return (
    <>
      {/* ─── Backdrop overlay for input/preview ─── */}
      <AnimatePresence>
        {(phase === "input" || phase === "generating" || phase === "preview") && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-[#1a2316]/10 backdrop-blur-[2px]"
            onClick={() => phase === "input" && setPhase("idle")}
          />
        )}
      </AnimatePresence>

      {/* ─── Main floating panel ─── */}
      <AnimatePresence mode="wait">
        {phase !== "idle" && phase !== "blooming" && (
          <motion.div
            key="omnibar"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 400, damping: 28 }}
            className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50
                       w-[600px] bg-white rounded-[20px] border border-[var(--vyne-border)]
                       shadow-[0_20px_60px_rgba(26,35,22,0.14),0_0_0_1px_rgba(74,124,89,0.06)]
                       overflow-hidden"
          >
            {/* ── Input phase ── */}
            {(phase === "input" || phase === "generating") && (
              <>
                {/* Input row */}
                <div className="flex items-center gap-3 px-5 py-4">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[var(--vyne-accent)] to-[var(--vyne-accent-light)] flex items-center justify-center shrink-0 shadow-sm">
                    {phase === "generating"
                      ? <Loader2 size={15} className="text-white animate-spin" />
                      : <Leaf size={15} className="text-white" />
                    }
                  </div>
                  <input
                    ref={inputRef}
                    type="text"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && prompt.trim()) handleGenerate();
                      if (e.key === "Escape") setPhase("idle");
                    }}
                    placeholder={hasNodes ? "Describe how to expand your workflow..." : "Describe the workflow you want to build..."}
                    disabled={phase === "generating"}
                    className="flex-1 text-[15px] font-medium text-[var(--vyne-text-primary)]
                               placeholder:text-[var(--vyne-text-tertiary)] bg-transparent
                               focus:outline-none disabled:opacity-50"
                  />
                  <div className="flex items-center gap-2 shrink-0">
                    {prompt.trim() && phase !== "generating" && (
                      <motion.button
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        onClick={() => handleGenerate()}
                        className="w-8 h-8 rounded-xl bg-[var(--vyne-accent)] text-white flex items-center justify-center hover:opacity-90 transition-opacity"
                      >
                        <Send size={14} />
                      </motion.button>
                    )}
                    <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-[var(--vyne-bg)] border border-[var(--vyne-border)] text-[10px] text-[var(--vyne-text-tertiary)] font-mono">
                      esc
                    </kbd>
                  </div>
                </div>

                {/* Generating skeleton */}
                {phase === "generating" && (
                  <div className="px-5 pb-4 border-t border-[var(--vyne-border)]/50">
                    <div className="pt-3 space-y-2">
                      {[1, 2, 3].map((i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.15 }}
                          className="flex items-center gap-3"
                        >
                          <div className="w-6 h-6 rounded-lg bg-[var(--vyne-accent-bg)] animate-pulse" />
                          <div className="flex-1 space-y-1">
                            <div className="h-3 rounded-full bg-[var(--vyne-bg)] animate-pulse" style={{ width: `${60 + i * 10}%` }} />
                            <div className="h-2 rounded-full bg-[var(--vyne-bg)] animate-pulse" style={{ width: `${40 + i * 8}%` }} />
                          </div>
                          {i < 3 && (
                            <motion.div
                              initial={{ scaleX: 0 }}
                              animate={{ scaleX: 1 }}
                              transition={{ delay: i * 0.15 + 0.3, duration: 0.5 }}
                              className="w-8 h-px bg-[var(--vyne-accent)]/20 origin-left"
                            />
                          )}
                        </motion.div>
                      ))}
                    </div>
                    <p className="text-[11px] text-[var(--vyne-text-tertiary)] text-center mt-3 italic">
                      Vyne is architecting your workflow...
                    </p>
                  </div>
                )}

                {/* Suggestions (only when input is empty) */}
                {phase === "input" && !prompt && (
                  <div className="border-t border-[var(--vyne-border)]/50">
                    <div className="px-3 py-2">
                      {SUGGESTIONS.map((s) => (
                        <button
                          key={s.text}
                          onClick={() => { setPrompt(s.text); handleGenerate(s.text); }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl
                                     text-left text-[13px] text-[var(--vyne-text-secondary)]
                                     hover:bg-[var(--vyne-bg-warm)] hover:text-[var(--vyne-text-primary)]
                                     transition-colors"
                        >
                          <span className="text-[14px]">{s.icon}</span>
                          <span>{s.text}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="px-5 pb-3">
                    <p className="text-[11px] text-[var(--vyne-error)] bg-red-50 px-3 py-2 rounded-lg">{error}</p>
                  </div>
                )}
              </>
            )}

            {/* ── Preview phase ── */}
            {phase === "preview" && generated && (
              <>
                {/* Header */}
                <div className="px-5 pt-4 pb-3 flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--vyne-success)]/10 flex items-center justify-center shrink-0 mt-0.5">
                    <Sprout size={18} className="text-[var(--vyne-success)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[14px] font-semibold text-[var(--vyne-text-primary)] mb-0.5">
                      {generated.title}
                    </h3>
                    <p className="text-[12px] text-[var(--vyne-text-tertiary)] leading-relaxed">
                      {generated.description}
                    </p>
                  </div>
                </div>

                {/* Node preview list */}
                <div className="px-5 pb-3">
                  <div className="space-y-1.5">
                    {generated.nodes.map((n, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.08 }}
                        className="flex items-center gap-3 px-3 py-2 rounded-xl bg-[var(--vyne-bg)]/60"
                      >
                        <div
                          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${n.color}15` }}
                        >
                          <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: n.color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate">{n.name}</p>
                          <p className="text-[10px] text-[var(--vyne-text-tertiary)] truncate">{n.description}</p>
                        </div>
                        <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-white border border-[var(--vyne-border)] text-[var(--vyne-text-tertiary)]">
                          {n.type}
                        </span>
                        {i < generated.nodes.length - 1 && (
                          <motion.div
                            initial={{ scaleX: 0 }}
                            animate={{ scaleX: 1 }}
                            transition={{ delay: i * 0.08 + 0.2 }}
                            className="absolute right-3 w-0"
                          />
                        )}
                      </motion.div>
                    ))}
                  </div>

                  <p className="text-[11px] text-[var(--vyne-text-tertiary)] text-center mt-3">
                    {generated.nodes.length} nodes &middot; {generated.edges.length} connections &middot; {generated.nodes.filter(n => n.type === "agent").length} agents
                  </p>
                </div>

                {/* Action buttons */}
                <div className="px-5 pb-4 flex items-center gap-2">
                  <button
                    onClick={handleAccept}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                               bg-[var(--vyne-accent)] text-white text-[13px] font-semibold
                               hover:opacity-90 transition-opacity shadow-sm btn-press"
                  >
                    <Check size={15} /> Plant on canvas
                  </button>
                  <button
                    onClick={handleRefine}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl
                               bg-[var(--vyne-bg)] border border-[var(--vyne-border)] text-[12px] font-medium
                               text-[var(--vyne-text-secondary)] hover:border-[var(--vyne-border-hover)]
                               transition-colors"
                  >
                    <RotateCcw size={13} /> Refine
                  </button>
                  <button
                    onClick={handleDiscard}
                    className="w-9 h-9 rounded-xl flex items-center justify-center
                               bg-[var(--vyne-bg)] border border-[var(--vyne-border)]
                               text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)]
                               hover:border-red-200 transition-all"
                  >
                    <X size={14} />
                  </button>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Bloom animation overlay ─── */}
      <AnimatePresence>
        {phase === "blooming" && generated && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50"
          >
            <motion.div
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-white border border-[var(--vyne-accent)]/20 shadow-lg"
            >
              <motion.div
                animate={{ scale: [1, 1.3, 1] }}
                transition={{ duration: 0.6, repeat: Infinity }}
                className="w-6 h-6 rounded-lg bg-[var(--vyne-accent-bg)] flex items-center justify-center"
              >
                <Sprout size={14} className="text-[var(--vyne-accent)]" />
              </motion.div>
              <p className="text-[12px] font-medium text-[var(--vyne-text-secondary)]">
                Planting {bloomIndex + 1} of {generated.nodes.length} nodes...
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Collapsed trigger pill ─── */}
      <AnimatePresence>
        {phase === "idle" && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setPhase("input")}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-40
                       flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-2xl
                       bg-white/95 backdrop-blur-sm border border-[var(--vyne-border)]
                       shadow-[0_4px_20px_rgba(26,35,22,0.08)]
                       hover:shadow-[0_8px_32px_rgba(74,124,89,0.12)]
                       hover:border-[var(--vyne-accent)]/25 transition-all group"
          >
            <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-[var(--vyne-accent)] to-[var(--vyne-accent-light)] flex items-center justify-center shadow-sm">
              <Leaf size={14} className="text-white" />
            </div>
            <span className="text-[13px] font-medium text-[var(--vyne-text-secondary)] group-hover:text-[var(--vyne-text-primary)] transition-colors">
              {hasNodes ? "Ask Vyne to expand" : "Ask Vyne to build"}
            </span>
            <kbd className="hidden sm:flex items-center gap-0.5 ml-1 px-1.5 py-0.5 rounded-md bg-[var(--vyne-bg)] border border-[var(--vyne-border)] text-[10px] text-[var(--vyne-text-tertiary)] font-mono">
              <Command size={9} />K
            </kbd>
          </motion.button>
        )}
      </AnimatePresence>
    </>
  );
}
