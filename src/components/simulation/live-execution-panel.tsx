/**
 * ── LiveExecutionPanel ──────────────────────────────────────────────
 *
 * Real-time execution output panel that displays streaming LLM responses
 * during workflow execution. Replaces the mocked output drawer.
 *
 * Features:
 * - Step-by-step progress with pulsing active indicator
 * - Live typing effect as tokens stream in
 * - Expandable step outputs with copy-to-clipboard
 * - Total execution time and token count
 * - Error display with retry suggestion
 */

"use client";

import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import type { StepResult } from "@/lib/use-stream-execution";
import type { CompiledWorkflow } from "@/lib/graph-compiler";

interface LiveExecutionPanelProps {
  isRunning: boolean;
  stepResults: StepResult[];
  finalOutput: string | null;
  totalDurationMs: number | null;
  error: string | null;
  compiledWorkflow: CompiledWorkflow | null;
  onExecute: () => void;
  onCancel: () => void;
}

export function LiveExecutionPanel({
  isRunning,
  stepResults,
  finalOutput,
  totalDurationMs,
  error,
  compiledWorkflow,
  onExecute,
  onCancel,
}: LiveExecutionPanelProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active step
  useEffect(() => {
    if (scrollRef.current && isRunning) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stepResults, isRunning]);

  const completedSteps = stepResults.filter((s) => s.status === "complete").length;
  const totalSteps = stepResults.length;
  const progressPct = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="flex flex-col h-full bg-[#0a0d12] border-l border-white/[0.06]">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-amber-400" />
          <span className="text-sm font-semibold text-white/90">
            Live Execution
          </span>
          {isRunning && (
            <span className="flex items-center gap-1.5 ml-2 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">
                Streaming
              </span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {totalDurationMs && (
            <span className="flex items-center gap-1 text-[11px] font-mono text-white/40">
              <Clock className="w-3 h-3" />
              {(totalDurationMs / 1000).toFixed(1)}s
            </span>
          )}

          {isRunning ? (
            <button
              onClick={onCancel}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors"
            >
              <Square className="w-3 h-3" />
              Stop
            </button>
          ) : (
            <button
              onClick={onExecute}
              disabled={!compiledWorkflow}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium hover:bg-emerald-500/20 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Play className="w-3 h-3" />
              Run with AI
            </button>
          )}
        </div>
      </div>

      {/* ── Progress Bar ───────────────────────────────────── */}
      {(isRunning || completedSteps > 0) && (
        <div className="px-4 py-2 border-b border-white/[0.04]">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] font-mono text-white/40 uppercase tracking-wider">
              Progress
            </span>
            <span className="text-[10px] font-mono text-white/50">
              {completedSteps}/{totalSteps} steps
            </span>
          </div>
          <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700 ease-out"
              style={{
                width: `${progressPct}%`,
                background:
                  "linear-gradient(90deg, #10b981, #34d399)",
              }}
            />
          </div>
        </div>
      )}

      {/* ── Step Results ───────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {stepResults.length === 0 && !isRunning && (
          <div className="flex flex-col items-center justify-center h-full text-center px-6">
            <div className="w-12 h-12 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-white/20" />
            </div>
            <p className="text-sm text-white/30 mb-1">
              No execution yet
            </p>
            <p className="text-xs text-white/20 max-w-[240px]">
              Build a workflow on the canvas, then click &quot;Run with AI&quot;
              to execute it with real language models.
            </p>
          </div>
        )}

        {stepResults.map((result) => (
          <StepResultCard key={result.stepIndex} result={result} />
        ))}

        {error && (
          <div className="p-3 rounded-lg bg-red-500/5 border border-red-500/10">
            <div className="flex items-center gap-2 mb-1">
              <XCircle className="w-3.5 h-3.5 text-red-400" />
              <span className="text-xs font-medium text-red-400">
                Execution Error
              </span>
            </div>
            <p className="text-xs text-red-300/70 pl-5.5">{error}</p>
          </div>
        )}
      </div>

      {/* ── Final Output Summary ───────────────────────────── */}
      {finalOutput && (
        <div className="border-t border-white/[0.06] px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">
              Workflow Complete
            </span>
          </div>
          <p className="text-[11px] text-white/50 line-clamp-3">
            {finalOutput.slice(0, 300)}
            {finalOutput.length > 300 && "..."}
          </p>
        </div>
      )}
    </div>
  );
}

// ── Step Result Card ─────────────────────────────────────────────────

function StepResultCard({ result }: { result: StepResult }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const statusIcon = {
    running: <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />,
    complete: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
    error: <XCircle className="w-3.5 h-3.5 text-red-400" />,
  }[result.status];

  const displayText = result.liveText || result.output;
  const preview = displayText.slice(0, 150);
  const hasMore = displayText.length > 150;

  const copyOutput = async () => {
    await navigator.clipboard.writeText(displayText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={`rounded-lg border transition-all duration-300 ${
        result.status === "running"
          ? "bg-amber-500/[0.03] border-amber-500/10"
          : result.status === "error"
          ? "bg-red-500/[0.03] border-red-500/10"
          : "bg-white/[0.02] border-white/[0.04]"
      }`}
    >
      {/* Card Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left"
      >
        {statusIcon}

        <span className="flex-1 text-xs font-medium text-white/80 truncate">
          {result.name}
        </span>

        {result.durationMs > 0 && (
          <span className="text-[10px] font-mono text-white/30">
            {(result.durationMs / 1000).toFixed(1)}s
          </span>
        )}

        {hasMore || result.output ? (
          expanded ? (
            <ChevronDown className="w-3 h-3 text-white/20" />
          ) : (
            <ChevronRight className="w-3 h-3 text-white/20" />
          )
        ) : null}
      </button>

      {/* Preview (always visible when there's text) */}
      {displayText && !expanded && (
        <div className="px-3 pb-2.5">
          <p className="text-[11px] text-white/40 leading-relaxed line-clamp-2">
            {preview}
            {hasMore && "..."}
          </p>
        </div>
      )}

      {/* Expanded Output */}
      {expanded && displayText && (
        <div className="px-3 pb-3 border-t border-white/[0.04] mt-0">
          <div className="flex items-center justify-end py-1.5">
            <button
              onClick={copyOutput}
              className="flex items-center gap-1 text-[10px] text-white/30 hover:text-white/60 transition-colors"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3" /> Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3" /> Copy
                </>
              )}
            </button>
          </div>
          <div className="max-h-[300px] overflow-y-auto rounded-md bg-black/30 p-3">
            <pre className="text-[11px] text-white/60 whitespace-pre-wrap font-mono leading-relaxed">
              {displayText}
              {result.status === "running" && (
                <span className="inline-block w-1.5 h-3.5 bg-amber-400/60 animate-pulse ml-0.5" />
              )}
            </pre>
          </div>
        </div>
      )}

      {/* Error Message */}
      {result.error && (
        <div className="px-3 pb-2.5">
          <p className="text-[11px] text-red-300/60">{result.error}</p>
        </div>
      )}
    </div>
  );
}
