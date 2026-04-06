"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Leaf,
  Eye,
  EyeOff,
  ArrowDownToLine,
  ArrowUpFromLine,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import {
  TASK_OUTPUT_FORMAT_OPTIONS,
  type TaskNodeData,
  type TaskConfig,
  type TaskOutputFormat,
} from "@/lib/types";
import { generateTaskPromptPreview } from "@/lib/prompt-preview";

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
        className="w-6 h-6 rounded-full bg-[var(--vyne-task-bg)] text-[var(--vyne-task)]
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
  icon,
}: {
  prefix: string;
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  multiline?: boolean;
  icon?: React.ReactNode;
}) {
  const Tag = multiline ? "textarea" : "input";
  return (
    <div className="relative">
      {prefix && (
        <span className="absolute left-3 top-2.5 text-[12px] font-medium text-[var(--vyne-task)] select-none pointer-events-none flex items-center gap-1">
          {icon}
          {prefix}
        </span>
      )}
      <Tag
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`
          w-full pl-3 pr-3 pb-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
          text-[12px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
          focus:outline-none focus:border-[var(--vyne-task)] focus:ring-2 focus:ring-[rgba(0,184,148,0.12)]
          transition-all resize-none
          ${multiline ? "min-h-[80px]" : "h-auto"}
        `}
        style={{ paddingTop: `${prefix ? 24 : 10}px` }}
        rows={multiline ? 3 : undefined}
      />
    </div>
  );
}

function OutputFormatSelector({
  value,
  onChange,
}: {
  value: TaskOutputFormat;
  onChange: (v: TaskOutputFormat) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1.5">
      {TASK_OUTPUT_FORMAT_OPTIONS.map((opt) => {
        const isActive = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            className={`
              flex flex-col items-start gap-0.5 px-3 py-2.5 rounded-xl
              border transition-all duration-150 text-left
              ${
                isActive
                  ? "bg-[var(--vyne-task-bg)] border-[var(--vyne-task)] shadow-sm"
                  : "bg-white border-[var(--vyne-border)] hover:border-[var(--vyne-border-hover)]"
              }
            `}
          >
            <span
              className={`text-[11px] font-semibold ${
                isActive ? "text-[var(--vyne-task)]" : "text-[var(--vyne-text-secondary)]"
              }`}
            >
              {opt.label}
            </span>
            <span className="text-[9px] text-[var(--vyne-text-tertiary)] leading-tight">
              {opt.description}
            </span>
          </button>
        );
      })}
    </div>
  );
}

// ── Main Task Config Panel ───────────────────────────────────────────
export function TaskConfigPanel({ nodeId }: { nodeId: string }) {
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const updateNodeData = useWorkflowStore((s) => s.updateNodeData);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  if (!node) return null;
  const data = node.data as unknown as TaskNodeData;

  const updateField = (field: string, value: unknown) => {
    updateNodeData(nodeId, { [field]: value } as Partial<TaskNodeData>);
  };

  const updateConfig = (field: keyof TaskConfig, value: string) => {
    const newConfig = { ...data.config, [field]: value };
    updateNodeData(nodeId, { config: newConfig } as Partial<TaskNodeData>);
  };

  const promptPreview = generateTaskPromptPreview(data);

  return (
    <div className="space-y-6">
      {/* ── Section 1: Task Identity ──────────────── */}
      <div>
        <SectionHeader
          number={1}
          title="Task Details"
          subtitle="What is this task? Give it a clear name and description."
        />
        <div className="space-y-2.5">
          <NaturalLanguageInput
            prefix="Task name:"
            value={data.name}
            onChange={(v) => updateField("name", v)}
            placeholder="e.g., Research Report"
          />
          <NaturalLanguageInput
            prefix="Description:"
            value={data.description}
            onChange={(v) => updateField("description", v)}
            placeholder="e.g., Compile a detailed research report with citations"
            multiline
          />
        </div>
      </div>

      {/* ── Section 2: Input / Output ────────────── */}
      <div>
        <SectionHeader
          number={2}
          title="Data Flow"
          subtitle="What does this task need, and what does it produce?"
        />
        <div className="space-y-2.5">
          <NaturalLanguageInput
            prefix="This task expects..."
            value={data.expectedInput}
            onChange={(v) => updateField("expectedInput", v)}
            placeholder="e.g., A topic or research question"
            icon={<ArrowDownToLine size={10} />}
          />
          <NaturalLanguageInput
            prefix="This task produces..."
            value={data.expectedOutput}
            onChange={(v) => updateField("expectedOutput", v)}
            placeholder="e.g., A structured report with key findings"
            icon={<ArrowUpFromLine size={10} />}
          />
        </div>
      </div>

      {/* ── Section 3: Detailed Instructions ─────── */}
      <div>
        <SectionHeader
          number={3}
          title="Step-by-Step Instructions"
          subtitle="Tell the agent exactly how to complete this task. Be specific."
        />
        <NaturalLanguageInput
          prefix="Instructions:"
          value={data.config.detailedInstructions}
          onChange={(v) => updateConfig("detailedInstructions", v)}
          placeholder="e.g., 1. Search for recent articles on the topic&#10;2. Summarize key findings from at least 3 sources&#10;3. Include citations in APA format&#10;4. Highlight any conflicting viewpoints"
          multiline
        />
      </div>

      {/* ── Section 4: Output Format ─────────────── */}
      <div>
        <SectionHeader
          number={4}
          title="Output Format"
          subtitle="How should the result be structured?"
        />
        <OutputFormatSelector
          value={data.config.outputFormat}
          onChange={(v) => updateConfig("outputFormat", v)}
        />
        <AnimatePresence>
          {data.config.outputFormat === "custom" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden mt-2"
            >
              <NaturalLanguageInput
                prefix="Custom format:"
                value={data.config.outputFormatCustom}
                onChange={(v) => updateConfig("outputFormatCustom", v)}
                placeholder="e.g., A bulleted list with no more than 10 items, each under 50 words"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Section 5: Constraints ───────────────── */}
      <div>
        <SectionHeader
          number={5}
          title="Quality Constraints"
          subtitle="Any requirements for accuracy, length, or quality?"
        />
        <NaturalLanguageInput
          prefix="Requirements:"
          value={data.config.constraints}
          onChange={(v) => updateConfig("constraints", v)}
          placeholder="e.g., Maximum 500 words. Must include at least 3 credible sources. No Wikipedia."
          multiline
        />
      </div>

      {/* ── Prompt Preview ──────────────────────── */}
      <div className="border-t border-[var(--vyne-border)] pt-4">
        <button
          onClick={() => setShowPromptPreview(!showPromptPreview)}
          className="w-full flex items-center justify-between py-2 text-[11px] font-semibold
                     text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)] transition-colors"
        >
          <div className="flex items-center gap-1.5">
            {showPromptPreview ? <EyeOff size={12} /> : <Eye size={12} />}
            <span>
              {showPromptPreview ? "Hide" : "Show"} generated task payload
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
                  <Leaf size={11} className="text-[var(--vyne-task)]" />
                  <span className="text-[10px] font-semibold text-[var(--vyne-task)]">
                    What the task instruction looks like
                  </span>
                </div>
                <pre className="text-[10px] text-[var(--vyne-text-secondary)] leading-relaxed whitespace-pre-wrap font-mono">
                  {promptPreview}
                </pre>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
