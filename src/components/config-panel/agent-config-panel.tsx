"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Leaf,
  Eye,
  EyeOff,
  Info,
} from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import {
  AGENT_TONE_OPTIONS,
  AVAILABLE_TOOLS,
  type AgentNodeData,
  type AgentPersona,
  type AgentTone,
} from "@/lib/types";
import { generateAgentPromptPreview } from "@/lib/prompt-preview";

// ── Reusable form primitives ─────────────────────────────────────────

function SectionHeader({
  number,
  title,
  subtitle,
}: {
  number: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-3">
      <div
        className="w-6 h-6 rounded-full bg-[var(--vyne-accent-bg)] text-[var(--vyne-accent)]
                    flex items-center justify-center text-[11px] font-bold shrink-0 mt-0.5"
      >
        {number}
      </div>
      <div>
        <h4 className="text-[13px] font-semibold text-[var(--vyne-text-primary)]">
          {title}
        </h4>
        <p className="text-[11px] text-[var(--vyne-text-tertiary)] leading-snug">
          {subtitle}
        </p>
      </div>
    </div>
  );
}

function NaturalLanguageInput({
  prefix,
  value,
  onChange,
  placeholder,
  multiline,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
}) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="relative">
      <span className="absolute left-3 top-2.5 text-[12px] font-medium text-[var(--vyne-accent)] select-none pointer-events-none">
        {prefix}
      </span>
      <Tag
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full pl-3 pr-3 pb-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
          text-[12px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
          focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
          transition-all resize-none
          ${multiline ? "min-h-[80px]" : "h-auto"}
        `}
        style={{ paddingTop: `${prefix ? 24 : 10}px` }}
        rows={multiline ? 3 : undefined}
      />
    </div>
  );
}

function ToneSelector({
  value,
  onChange,
}: {
  value: AgentTone;
  onChange: (v: AgentTone) => void;
}) {
  return (
    <div className="grid grid-cols-3 gap-1.5">
      {AGENT_TONE_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              relative flex flex-col items-center gap-1 px-2 py-2.5 rounded-xl
              border transition-all duration-150 text-center
              ${
                isActive
                  ? "bg-[var(--vyne-accent-bg)] border-[var(--vyne-accent)] shadow-sm"
                  : "bg-white border-[var(--vyne-border)] hover:border-[var(--vyne-border-hover)]"
              }
            `}
          >
            <span className="text-[16px]">{opt.emoji}</span>
            <span
              className={`text-[10px] font-semibold leading-tight ${
                isActive ? "text-[var(--vyne-accent)]" : "text-[var(--vyne-text-secondary)]"
              }`}
            >
              {opt.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function ToolToggle({
  tool,
  enabled,
  onToggle,
}: {
  tool: (typeof AVAILABLE_TOOLS)[number];
  enabled: boolean;
  onToggle: () => void;
}) {
  const [showTip, setShowTip] = useState(false);

  return (
    <div className="relative">
      <div
        className={`
          flex items-center gap-2.5 p-2.5 rounded-xl border transition-all duration-150 cursor-pointer
          ${
            enabled
              ? "bg-white border-[var(--vyne-accent)] shadow-sm"
              : "bg-[var(--vyne-bg)] border-transparent hover:bg-white hover:border-[var(--vyne-border)]"
          }
        `}
        onClick={onToggle}
      >
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${tool.color}14` }}
        >
          <DynamicIcon name={tool.icon} size={14} style={{ color: tool.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <span className="text-[11px] font-semibold text-[var(--vyne-text-primary)] block truncate">
            {tool.name}
          </span>
        </div>

        {/* Info icon */}
        <button
          className="w-5 h-5 rounded flex items-center justify-center text-[var(--vyne-text-tertiary)]
                     hover:text-[var(--vyne-text-secondary)] transition-colors"
          onClick={(e) => {
            e.stopPropagation();
            setShowTip(!showTip);
          }}
        >
          <Info size={11} />
        </button>

        {/* Toggle track */}
        <div
          className={`
            w-8 h-[18px] rounded-full relative transition-colors duration-200 shrink-0
            ${enabled ? "bg-[var(--vyne-accent)]" : "bg-[var(--vyne-border)]"}
          `}
        >
          <motion.div
            className="absolute top-[2px] w-[14px] h-[14px] rounded-full bg-white shadow-sm"
            animate={{ left: enabled ? 14 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </div>
      </div>

      {/* Educational tooltip */}
      <AnimatePresence>
        {showTip && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="flex items-start gap-2 px-3 py-2 mt-1 rounded-lg bg-[var(--vyne-bg-warm)] border border-[var(--vyne-border)]">
              <Leaf size={11} className="text-[var(--vyne-accent)] shrink-0 mt-0.5" />
              <p className="text-[10px] text-[var(--vyne-text-secondary)] leading-snug">
                {tool.description}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Main Agent Config Panel ──────────────────────────────────────────
export function AgentConfigPanel({ nodeId }: { nodeId: string }) {
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const pushSnapshot = useWorkflowStore((s) => s.pushSnapshot);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  if (!node) return null;
  const data = node.data as unknown as AgentNodeData;

  const updateField = (field: string, value: unknown) => {
    updateNodeData(nodeId, { [field]: value } as Partial<AgentNodeData>);
  };

  const updatePersona = (field: keyof AgentPersona, value: string) => {
    const newPersona = { ...data.persona, [field]: value };
    updateNodeData(nodeId, { persona: newPersona } as Partial<AgentNodeData>);
  };

  const toggleTool = (toolId: string) => {
    pushSnapshot();
    const tools = data.tools.includes(toolId)
      ? data.tools.filter((t) => t !== toolId)
      : [...data.tools, toolId];
    updateNodeData(nodeId, { tools } as Partial<AgentNodeData>);
  };

  const promptPreview = generateAgentPromptPreview(data);

  return (
    <div className="space-y-6">
      {/* ── Section 1: Identity ─────────────────────── */}
      <div>
        <SectionHeader
          number={1}
          title="Agent Identity"
          subtitle="Who is this agent? Give them a name and role."
        />
        <div className="space-y-2.5">
          <NaturalLanguageInput
            prefix="Name:"
            value={data.name}
            onChange={(v) => updateField("name", v)}
            placeholder="e.g., Research Assistant"
          />
          <NaturalLanguageInput
            prefix="Role:"
            value={data.role}
            onChange={(v) => updateField("role", v)}
            placeholder="e.g., Senior Research Analyst"
          />
        </div>
      </div>

      {/* ── Section 2: Goal & Backstory ─────────────── */}
      <div>
        <SectionHeader
          number={2}
          title="Mission Briefing"
          subtitle="What should this agent focus on? The more specific, the better."
        />
        <div className="space-y-2.5">
          <NaturalLanguageInput
            prefix="This agent's main goal is to..."
            value={data.persona.goal}
            onChange={(v) => updatePersona("goal", v)}
            placeholder="e.g., find and synthesize the latest research on a given topic"
            multiline
          />
          <NaturalLanguageInput
            prefix="Background context:"
            value={data.persona.backstory}
            onChange={(v) => updatePersona("backstory", v)}
            placeholder="e.g., This agent specializes in academic research with 10 years of experience in data synthesis"
            multiline
          />
        </div>
      </div>

      {/* ── Section 3: Tone ─────────────────────────── */}
      <div>
        <SectionHeader
          number={3}
          title="Communication Style"
          subtitle="How should this agent sound when it responds?"
        />
        <ToneSelector
          value={data.persona.tone}
          onChange={(v) => updatePersona("tone", v)}
        />
      </div>

      {/* ── Section 4: Tools ────────────────────────── */}
      <div>
        <SectionHeader
          number={4}
          title="Equip Tools"
          subtitle="Toggle on the tools this agent can use. Each tool extends their capabilities."
        />
        <div className="space-y-1.5">
          {AVAILABLE_TOOLS.map((tool) => (
            <ToolToggle
              key={tool.id}
              tool={tool}
              enabled={data.tools.includes(tool.id)}
              onToggle={() => toggleTool(tool.id)}
            />
          ))}
        </div>
      </div>

      {/* ── Section 5: Custom Instructions ──────────── */}
      <div>
        <SectionHeader
          number={5}
          title="Additional Instructions"
          subtitle="Anything else this agent should know? Free-form notes for power users."
        />
        <NaturalLanguageInput
          prefix=""
          value={data.persona.customInstructions}
          onChange={(v) => updatePersona("customInstructions", v)}
          placeholder="e.g., Always cite sources in APA format. Prioritize peer-reviewed articles. Limit responses to 500 words unless asked otherwise."
          multiline
        />
      </div>

      {/* ── Prompt Preview ──────────────────────────── */}
      <div className="border-t border-[var(--vyne-border)] pt-4">
        <button
          onClick={() => setShowPromptPreview(!showPromptPreview)}
          className="w-full flex items-center justify-between py-2 text-[11px] font-semibold
                     text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)] transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {showPromptPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>
              {showPromptPreview ? "Hide" : "Show"} generated prompt preview
            </span>
          </div>
          <ChevronDown
            size={12}
            className={`transition-transform duration-200 ${showPromptPreview ? "rotate-180" : ""}`}
          />
        </button>

        <AnimatePresence>
          {showPromptPreview && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-3 rounded-xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)]">
                <div className="flex items-center gap-1.5 mb-2">
                  <Leaf size={11} className="text-[var(--vyne-accent)]" />
                  <span className="text-[10px] font-semibold text-[var(--vyne-accent)]">
                    What the AI model actually sees
                  </span>
                </div>
                <pre className="text-[10px] text-[var(--vyne-text-secondary)] leading-relaxed whitespace-pre-wrap font-mono">
                  {promptPreview || "Configure the agent above to see the generated prompt."}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
