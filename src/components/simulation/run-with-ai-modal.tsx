/**
 * ── RunWithAIModal ──────────────────────────────────────────────────
 *
 * Modal that appears when the user clicks "Run with AI".
 * Lets them provide context/input before the workflow executes.
 *
 * Examples:
 * - "Research Acme Corp competitors in the CRM market"
 * - Paste an RFP URL for the RFP Response Pipeline
 * - "Analyze the Q3 sales data for EMEA region"
 */

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Zap, Sparkles, AlertCircle } from "lucide-react";
import type { CompiledWorkflow } from "@/lib/graph-compiler";

interface RunWithAIModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRun: (userInput: string) => void;
  compiledWorkflow: CompiledWorkflow | null;
}

export function RunWithAIModal({
  isOpen,
  onClose,
  onRun,
  compiledWorkflow,
}: RunWithAIModalProps) {
  const [input, setInput] = useState("");

  if (!compiledWorkflow) return null;

  const agentNames = compiledWorkflow.agents.map((a) => a.name);
  const taskNames = compiledWorkflow.tasks.map((t) => t.name);

  const handleRun = () => {
    onRun(input);
    setInput("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", duration: 0.3, bounce: 0.15 }}
            className="fixed inset-0 flex items-center justify-center z-50 pointer-events-none"
          >
            <div className="bg-white rounded-2xl shadow-2xl border border-[var(--vyne-border)] w-full max-w-[520px] pointer-events-auto">
              {/* Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--vyne-border)]">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
                    <Zap size={18} className="text-[var(--vyne-accent)]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[var(--vyne-text-primary)]">
                      Run with AI
                    </h2>
                    <p className="text-[11px] text-[var(--vyne-text-tertiary)]">
                      Real language model execution
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg flex items-center justify-center
                             text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)]
                             hover:bg-[var(--vyne-bg-warm)] transition-colors"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-5">
                {/* Workflow summary */}
                <div className="flex items-center gap-2 mb-4 p-3 rounded-xl bg-[var(--vyne-bg-warm)] border border-[var(--vyne-border)]">
                  <Sparkles size={14} className="text-[var(--vyne-accent)] shrink-0" />
                  <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-snug">
                    This will execute <strong>{agentNames.length} agent{agentNames.length !== 1 ? "s" : ""}</strong>
                    {" "}({agentNames.join(", ")}) across{" "}
                    <strong>{taskNames.length} task{taskNames.length !== 1 ? "s" : ""}</strong>{" "}
                    using real AI models. Each step&apos;s output feeds into the next.
                  </p>
                </div>

                {/* Input field */}
                <label className="block mb-1.5">
                  <span className="text-[12px] font-semibold text-[var(--vyne-text-primary)]">
                    Context / Input
                  </span>
                  <span className="text-[11px] text-[var(--vyne-text-tertiary)] ml-2">
                    (optional)
                  </span>
                </label>
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder='e.g., "Analyze Stripe competitors in the payment infrastructure space" or paste a document URL...'
                  rows={4}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--vyne-border)]
                             text-[13px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                             bg-white focus:outline-none focus:ring-2 focus:ring-[var(--vyne-accent)]/20
                             focus:border-[var(--vyne-accent)] transition-all resize-none leading-relaxed"
                />

                {/* Cost notice */}
                <div className="flex items-start gap-2 mt-3 text-[10px] text-[var(--vyne-text-tertiary)]">
                  <AlertCircle size={12} className="shrink-0 mt-0.5" />
                  <span>
                    Execution uses Claude Sonnet for each step. Typical workflow: 10-30 seconds, ~2K-8K tokens.
                    Results stream in real time.
                  </span>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[var(--vyne-border)] bg-[var(--vyne-bg-warm)]/50 rounded-b-2xl">
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-[12px] font-medium text-[var(--vyne-text-secondary)]
                             hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRun}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-[12px] font-semibold
                             bg-[var(--vyne-accent)] text-white hover:opacity-90 transition-all shadow-sm"
                >
                  <Zap size={13} />
                  Execute Workflow
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
