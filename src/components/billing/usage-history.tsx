"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Zap, Rocket, Play, Clock } from "lucide-react";
import { useBillingStore, type UsageEntry } from "@/store/billing-store";

// ── Stacked bar chart (credits per workflow) ─────────────────────────
function UsageBarChart({ entries }: { entries: UsageEntry[] }) {
  // Aggregate by workflow
  const byWorkflow = useMemo(() => {
    const map = new Map<string, { name: string; total: number; color: string }>();
    const colors = ["#6c5ce7", "#00b894", "#e17055", "#0984e3", "#fdcb6e", "#e84393"];
    let colorIdx = 0;

    for (const e of entries) {
      if (!map.has(e.workflowId)) {
        map.set(e.workflowId, { name: e.workflowName, total: 0, color: colors[colorIdx++ % colors.length] });
      }
      map.get(e.workflowId)!.total += e.creditsUsed;
    }

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [entries]);

  const maxCredits = Math.max(...byWorkflow.map((w) => w.total), 1);

  if (byWorkflow.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-[12px] text-[var(--vyne-text-tertiary)]">No usage data yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {byWorkflow.map((w, i) => {
        const pct = Math.round((w.total / maxCredits) * 100);
        return (
          <motion.div
            key={w.name}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px] font-semibold text-[var(--vyne-text-primary)] truncate max-w-[200px]">
                {w.name}
              </span>
              <span className="text-[11px] font-bold text-[var(--vyne-text-secondary)]">
                {w.total} credits
              </span>
            </div>
            <div className="h-2.5 rounded-full bg-[var(--vyne-bg)] overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, delay: i * 0.05, ease: "easeOut" }}
                className="h-full rounded-full"
                style={{ backgroundColor: w.color }}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Activity timeline ────────────────────────────────────────────────
function ActivityTimeline({ entries }: { entries: UsageEntry[] }) {
  const typeConfig = {
    simulation: { icon: Zap, label: "Simulation", color: "var(--vyne-accent)" },
    deployment: { icon: Rocket, label: "Deployed", color: "var(--vyne-success)" },
    run: { icon: Play, label: "Execution", color: "#0984e3" },
  };

  const recent = entries.slice(0, 10);

  return (
    <div className="space-y-1">
      {recent.map((entry, i) => {
        const config = typeConfig[entry.type];
        const Icon = config.icon;
        const time = formatTime(entry.timestamp);
        return (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.03 }}
            className="flex items-center gap-3 py-2 px-3 rounded-xl hover:bg-[var(--vyne-bg-warm)] transition-colors"
          >
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
              style={{ backgroundColor: `${config.color}14` }}
            >
              <Icon size={11} style={{ color: config.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[var(--vyne-text-primary)] truncate">
                <span className="font-semibold">{entry.workflowName}</span>
              </p>
              <p className="text-[9px] text-[var(--vyne-text-tertiary)]">
                {config.label}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[11px] font-bold text-[var(--vyne-text-secondary)]">
                -{entry.creditsUsed}
              </p>
              <p className="text-[9px] text-[var(--vyne-text-tertiary)]">{time}</p>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

function formatTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Main Usage History ───────────────────────────────────────────────
export function UsageHistory() {
  const { usageHistory, creditsUsed, creditsTotal, currentPlan } = useBillingStore();
  const remaining = creditsTotal - creditsUsed;

  // Breakdown by type
  const simCredits = usageHistory.filter((e) => e.type === "simulation").reduce((s, e) => s + e.creditsUsed, 0);
  const deployCredits = usageHistory.filter((e) => e.type === "deployment").reduce((s, e) => s + e.creditsUsed, 0);
  const runCredits = usageHistory.filter((e) => e.type === "run").reduce((s, e) => s + e.creditsUsed, 0);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: "Remaining", value: remaining.toLocaleString(), color: "var(--vyne-success)" },
          { label: "Simulations", value: simCredits.toString(), color: "var(--vyne-accent)" },
          { label: "Deployments", value: deployCredits.toString(), color: "var(--vyne-success)" },
          { label: "Executions", value: runCredits.toString(), color: "#0984e3" },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3.5 rounded-xl bg-white border border-[var(--vyne-border)] text-center"
          >
            <p className="text-[18px] font-bold" style={{ color: stat.color }}>
              {stat.value}
            </p>
            <p className="text-[9px] text-[var(--vyne-text-tertiary)] uppercase tracking-wider font-semibold mt-0.5">
              {stat.label}
            </p>
          </div>
        ))}
      </div>

      {/* Credits per workflow (stacked bars) */}
      <div className="p-5 rounded-2xl bg-white border border-[var(--vyne-border)]">
        <h3 className="text-[13px] font-bold text-[var(--vyne-text-primary)] mb-4">
          Credits by Workflow
        </h3>
        <UsageBarChart entries={usageHistory} />
      </div>

      {/* Recent activity */}
      <div className="p-5 rounded-2xl bg-white border border-[var(--vyne-border)]">
        <h3 className="text-[13px] font-bold text-[var(--vyne-text-primary)] mb-3">
          Recent Activity
        </h3>
        <ActivityTimeline entries={usageHistory} />
      </div>
    </div>
  );
}
