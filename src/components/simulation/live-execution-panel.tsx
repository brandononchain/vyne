/**
 * ── LiveExecutionPanel ──────────────────────────────────────────────
 *
 * Right-side panel that shows streaming AI execution results.
 * Reads from the global useStreamExecutionStore.
 * Appears when a "Run with AI" execution is active or has results.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Copy,
  Check,
  Zap,
  Play,
  Square,
  X,
} from "lucide-react";
import { useStreamExecutionStore, type StepResult } from "@/store/stream-execution-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { compileGraphToJSON } from "@/lib/graph-compiler";

export function LiveExecutionPanel() {
  const {
    isRunning,
    stepResults,
    finalOutput,
    totalDurationMs,
    error,
    compiledWorkflow,
    execute,
    cancel,
    reset,
  } = useStreamExecutionStore();

  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  // Auto-open when execution starts, auto-scroll
  useEffect(() => {
    if (isRunning) setIsOpen(true);
  }, [isRunning]);

  useEffect(() => {
    if (scrollRef.current && isRunning) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stepResults, isRunning]);

  const completedSteps = stepResults.filter((s) => s.status === "complete").length;
  const totalSteps = stepResults.length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;
  const hasResults = stepResults.length > 0;

  // Don't render if nothing has happened yet
  if (!hasResults && !isRunning) return null;

  return (
    <AnimatePresence>
      {(hasResults || isRunning) && (
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: isOpen ? 380 : 48, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="relative h-full border-l border-[var(--vyne-border)] bg-white flex flex-col overflow-hidden shrink-0"
        >
          {/* Collapsed state — just a vertical tab */}
          {!isOpen && (
            <button
              onClick={() => setIsOpen(true)}
              className="flex flex-col items-center justify-center h-full w-full gap-2 hover:bg-[var(--vyne-bg-warm)] transition-colors"
            >
              <Zap size={16} className={isRunning ? "text-amber-500 animate-pulse" : "text-[var(--vyne-accent)]"} />
              <span
                className="text-[10px] font-bold text-[var(--vyne-text-tertiary)] uppercase tracking-widest"
                style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
              >
                AI Output
              </span>
              {isRunning && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          )}

          {/* Expanded state */}
          {isOpen && (
            <>
              {/* Header */}
              <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--vyne-border)] shrink-0">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-500" />
                  <span className="text-[12px] font-bold text-[var(--vyne-text-primary)]">
                    AI Execution
                  </span>
                  {isRunning && (
                    <span className="flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 border border-amber-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                      <span className="text-[9px] font-bold text-amber-600 uppercase tracking-wider">Live</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1">
                  {totalDurationMs && (
                    <span className="flex items-center gap-1 text-[10px] font-mono text-[var(--vyne-text-tertiary)] mr-1">
                      <Clock className="w-3 h-3" />
                      {(totalDurationMs / 1000).toFixed(1)}s
                    </span>
                  )}
                  {isRunning ? (
                    <button
                      onClick={cancel}
                      className="flex items-center gap-1 px-2 py-1 rounded-md bg-red-50 border border-red-100 text-red-500 text-[10px] font-semibold hover:bg-red-100 transition-colors"
                    >
                      <Square className="w-2.5 h-2.5" />
                      Stop
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        reset();
                        setIsOpen(false);
                      }}
                      className="w-6 h-6 rounded-md flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              {(isRunning || completedSteps > 0) && (
                <div className="px-4 py-2 border-b border-[var(--vyne-border)] shrink-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[9px] font-bold text-[var(--vyne-text-tertiary)] uppercase tracking-wider">
                      Progress
                    </span>
                    <span className="text-[9px] font-mono text-[var(--vyne-text-tertiary)]">
                      {completedSteps}/{totalSteps}
                    </span>
                  </div>
                  <div className="h-1 bg-[var(--vyne-border)] rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-[var(--vyne-success)]"
                      animate={{ width: `${progressPct}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Step results */}
              <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
                {stepResults.map((result) => (
                  <StepResultCard key={result.stepIndex} result={result} />
                ))}

                {error && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-100">
                    <div className="flex items-center gap-2 mb-1">
                      <XCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-[11px] font-semibold text-red-600">Error</span>
                    </div>
                    <p className="text-[10px] text-red-500 pl-5">{error}</p>
                  </div>
                )}
              </div>

              {/* Footer — completion summary */}
              {finalOutput && !isRunning && (
                <div className="border-t border-[var(--vyne-border)] px-4 py-3 shrink-0 bg-emerald-50/30">
                  <div className="flex items-center gap-2 mb-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--vyne-success)]" />
                    <span className="text-[11px] font-bold text-[var(--vyne-success)]">
                      Complete
                    </span>
                  </div>
                  <p className="text-[10px] text-[var(--vyne-text-secondary)] line-clamp-3 leading-relaxed">
                    {finalOutput.slice(0, 300)}{finalOutput.length > 300 && "..."}
                  </p>
                </div>
              )}
            </>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Step Result Card ─────────────────────────────────────────────────

function StepResultCard({ result }: { result: StepResult }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusIcon = {
    running: <Loader2 className="w-3.5 h-3.5 text-amber-500 animate-spin" />,
    complete: <CheckCircle2 className="w-3.5 h-3.5 text-[var(--vyne-success)]" />,
    error: <XCircle className="w-3.5 h-3.5 text-red-500" />,
  }[result.status];

  const displayText = result.liveText || result.output;
  const preview = displayText.slice(0, 120);
  const hasMore = displayText.length > 120;

  const copyOutput = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-xl border transition-all duration-200 ${
        result.status === "running"
          ? "bg-amber-50/50 border-amber-100"
          : result.status === "error"
          ? "bg-red-50/50 border-red-100"
          : "bg-white border-[var(--vyne-border)]"
      }`}
    >
      <button
        onClick={() => hasMore && setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left"
      >
        {statusIcon}
        <span className="flex-1 text-[11px] font-semibold text-[var(--vyne-text-primary)] truncate">
          {result.name}
        </span>
        {result.durationMs > 0 && (
          <span className="text-[9px] font-mono text-[var(--vyne-text-tertiary)]">
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
        )}
        {hasMore && (
          expanded
            ? <ChevronDown className="w-3 h-3 text-[var(--vyne-text-tertiary)]" />
            : <ChevronRight className="w-3 h-3 text-[var(--vyne-text-tertiary)]" />
        )}
      </button>

      {/* Preview */}
      {displayText && !expanded && (
        <div className="px-3 pb-2.5">
          <p className="text-[10px] text-[var(--vyne-text-secondary)] leading-relaxed line-clamp-2">
            {preview}{hasMore && "..."}
            {result.status === "running" && (
              <span className="inline-block w-1 h-3 bg-amber-400 animate-pulse ml-0.5 rounded-sm" />
            )}
          </p>
        </div>
      )}

      {/* Expanded */}
      {expanded && displayText && (
        <div className="px-3 pb-3 border-t border-[var(--vyne-border)]">
          <div className="flex items-center justify-end py-1.5">
            <button
              onClick={copyOutput}
              className="flex items-center gap-1 text-[9px] text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] transition-colors"
            >
              {copied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
            </button>
          </div>
          <div className="max-h-[200px] overflow-y-auto rounded-lg bg-[var(--vyne-bg)] border border-[var(--vyne-border)] p-3">
            <pre className="text-[10px] text-[var(--vyne-text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
              {displayText}
            </pre>
          </div>
        </div>
      )}

      {result.error && (
        <div className="px-3 pb-2.5">
          <p className="text-[10px] text-red-500">{result.error}</p>
        </div>
      )}
    </div>
  );
}
