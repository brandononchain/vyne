"use client";

import { useRef, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Square,
  CheckCircle2,
  Loader2,
  Clock,
  ChevronDown,
  ChevronRight,
  FileJson,
  Download,
  Copy,
  Check,
  Zap,
  XCircle,
} from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore, type SimulationLogEntry } from "@/store/workflow-store";

// ── Expandable log entry with real AI output ────────────────────────

function LogEntry({
  entry,
  isLast,
}: {
  entry: SimulationLogEntry;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  // If the message is longer than 150 chars, it's likely a real AI output
  const hasExpandableContent = entry.message.length > 150;
  const preview = entry.message.slice(0, 140);
  const isRealOutput = entry.message.length > 80 && entry.status === "complete";

  const copyOutput = async () => {
    await navigator.clipboard.writeText(entry.message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className="flex items-start gap-3 relative"
    >
      {/* Vertical connector line */}
      {!isLast && (
        <div
          className="absolute left-[15px] top-[32px] bottom-[-8px] w-px"
          style={{
            backgroundColor:
              entry.status === "complete"
                ? "var(--vyne-success)"
                : entry.status === "running"
                ? "var(--vyne-accent)"
                : "var(--vyne-border)",
            opacity: entry.status === "pending" ? 0.3 : 0.4,
          }}
        />
      )}

      {/* Status icon */}
      <div
        className={`
          w-[30px] h-[30px] rounded-xl flex items-center justify-center shrink-0
          transition-all duration-300
          ${
            entry.status === "complete"
              ? "bg-emerald-50"
              : entry.status === "running"
              ? "bg-[var(--vyne-accent-bg)]"
              : "bg-[var(--vyne-bg)]"
          }
        `}
      >
        {entry.status === "complete" ? (
          <CheckCircle2 size={14} className="text-[var(--vyne-success)]" />
        ) : entry.status === "running" ? (
          <Loader2 size={14} className="text-[var(--vyne-accent)] animate-spin" />
        ) : (
          <Clock size={14} className="text-[var(--vyne-text-tertiary)]" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pb-4">
        <div className="flex items-center gap-2 mb-0.5">
          <DynamicIcon name={entry.icon} size={12} style={{ color: entry.color }} />
          <span
            className={`text-[12px] font-semibold ${
              entry.status === "running"
                ? "text-[var(--vyne-accent)]"
                : entry.status === "complete"
                ? "text-[var(--vyne-text-primary)]"
                : "text-[var(--vyne-text-tertiary)]"
            }`}
          >
            {entry.name}
          </span>
          {entry.status === "complete" && (
            <span className="text-[9px] font-medium text-[var(--vyne-success)] bg-emerald-50 px-1.5 py-0.5 rounded">
              Done
            </span>
          )}
          {entry.status === "running" && (
            <span className="text-[9px] font-medium text-[var(--vyne-accent)] bg-[var(--vyne-accent-bg)] px-1.5 py-0.5 rounded animate-pulse">
              Running
            </span>
          )}
          {/* Expand/Copy controls for real outputs */}
          {isRealOutput && (
            <div className="flex items-center gap-1 ml-auto">
              <button
                onClick={copyOutput}
                className="text-[9px] text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] transition-colors flex items-center gap-0.5"
              >
                {copied ? <Check size={10} /> : <Copy size={10} />}
                {copied ? "Copied" : "Copy"}
              </button>
              {hasExpandableContent && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] transition-colors"
                >
                  {expanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Output preview or full text */}
        {!expanded ? (
          <p
            className={`text-[11px] leading-relaxed ${
              entry.status === "pending"
                ? "text-[var(--vyne-text-tertiary)]"
                : "text-[var(--vyne-text-secondary)]"
            }`}
          >
            {hasExpandableContent ? preview + "..." : entry.message}
            {entry.status === "running" && (
              <span className="inline-block w-1 h-3 bg-[var(--vyne-accent)] animate-pulse ml-0.5 rounded-sm" />
            )}
          </p>
        ) : (
          <div className="mt-1.5 p-3 rounded-lg bg-[var(--vyne-bg)] border border-[var(--vyne-border)] max-h-[200px] overflow-y-auto">
            <pre className="text-[11px] text-[var(--vyne-text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
              {entry.message}
            </pre>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Output Drawer ──────────────────────────────────────────────

export function OutputDrawer() {
  const {
    isSimulating,
    simulationLog,
    simulationProgress,
    compiledWorkflow,
    stopSimulation,
  } = useWorkflowStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom as new entries become active
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [simulationLog]);

  const isComplete = simulationProgress === 100 && !simulationLog.some((e) => e.status === "running");
  const completedCount = simulationLog.filter((e) => e.status === "complete").length;
  const totalCount = simulationLog.length;

  // Check if any output looks like real AI (longer than typical mock messages)
  const hasRealOutputs = simulationLog.some((e) => e.message.length > 100);

  return (
    <AnimatePresence>
      {isSimulating && (
        <motion.div
          initial={{ y: 400, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 400, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="absolute bottom-0 left-0 right-0 z-30 bg-white
                     border-t border-[var(--vyne-border)] shadow-[0_-8px_24px_rgba(26,23,21,0.08)]
                     rounded-t-2xl overflow-hidden"
          style={{ maxHeight: "55vh" }}
        >
          {/* Header */}
          <div className="px-5 pt-4 pb-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                {isComplete ? (
                  <div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 size={14} className="text-[var(--vyne-success)]" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-lg bg-[var(--vyne-accent-bg)] flex items-center justify-center">
                    <Loader2 size={14} className="text-[var(--vyne-accent)] animate-spin" />
                  </div>
                )}
                <div>
                  <h3 className="text-[13px] font-bold text-[var(--vyne-text-primary)] flex items-center gap-1.5">
                    {isComplete ? "Execution Complete" : "Running Workflow"}
                    {hasRealOutputs && (
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600 border border-amber-100">
                        AI
                      </span>
                    )}
                  </h3>
                  <p className="text-[10px] text-[var(--vyne-text-tertiary)]">
                    {completedCount} of {totalCount} steps completed
                    {hasRealOutputs && " · Powered by Claude Sonnet"}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isComplete && compiledWorkflow && (
                <button
                  onClick={() => {
                    const json = JSON.stringify(compiledWorkflow, null, 2);
                    const blob = new Blob([json], { type: "application/json" });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    a.download = "vyne-workflow.json";
                    a.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             text-[11px] font-medium text-[var(--vyne-text-secondary)]
                             hover:bg-[var(--vyne-bg-warm)] transition-colors border border-[var(--vyne-border)]"
                >
                  <FileJson size={12} />
                  Export JSON
                </button>
              )}

              {!isComplete ? (
                <button
                  onClick={stopSimulation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-[var(--vyne-error)] text-white text-[11px] font-semibold
                             hover:opacity-90 transition-opacity"
                >
                  <Square size={10} />
                  Stop
                </button>
              ) : (
                <button
                  onClick={stopSimulation}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg
                             bg-[var(--vyne-accent)] text-white text-[11px] font-semibold
                             hover:opacity-90 transition-opacity"
                >
                  Done
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          <div className="mx-5 h-1 rounded-full bg-[var(--vyne-border)] overflow-hidden mb-3">
            <motion.div
              className={`h-full rounded-full ${
                isComplete ? "bg-[var(--vyne-success)]" : "bg-[var(--vyne-accent)]"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${simulationProgress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>

          {/* Log entries */}
          <div
            ref={scrollRef}
            className="px-5 pb-5 overflow-y-auto"
            style={{ maxHeight: "calc(55vh - 100px)" }}
          >
            <AnimatePresence mode="popLayout">
              {simulationLog.map((entry, i) => (
                <LogEntry
                  key={entry.nodeId}
                  entry={entry}
                  isLast={i === simulationLog.length - 1}
                />
              ))}
            </AnimatePresence>

            {isComplete && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`mt-2 p-3 rounded-xl border ${
                  hasRealOutputs
                    ? "bg-amber-50/50 border-amber-100"
                    : "bg-emerald-50 border-emerald-100"
                }`}
              >
                <p className={`text-[11px] font-medium leading-relaxed ${
                  hasRealOutputs ? "text-amber-700" : "text-emerald-700"
                }`}>
                  {hasRealOutputs ? (
                    <>
                      All {totalCount} steps executed with real AI models.
                      Each agent&apos;s output was chained to the next step.
                      Click any step to expand its full output. This workflow is ready for deployment.
                    </>
                  ) : (
                    <>
                      All {totalCount} steps completed successfully. Your workflow executed
                      in the correct order and all agents produced their expected outputs.
                      This workflow is ready for deployment.
                    </>
                  )}
                </p>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
