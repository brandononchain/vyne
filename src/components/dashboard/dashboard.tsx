"use client";

import { motion } from "framer-motion";
import {
  Plus,
  ArrowLeft,
  Search,
  BarChart3,
  Zap,
  Users,
  Clock,
  Globe,
  Webhook,
  Pause,
  Play,
  Trash2,
  ExternalLink,
  TrendingUp,
  CheckCircle2,
  XCircle,
  Activity,
  CreditCard,
} from "lucide-react";
import {
  useDeployStore,
  type DeployedWorkflow,
  type WorkflowStatus,
} from "@/store/deploy-store";
import { CreditTracker } from "../billing/credit-tracker";
import { UserDropdown } from "../auth/user-dropdown";
import { UsageHistory } from "../billing/usage-history";
import { Sparkline } from "./sparkline";
import { useState } from "react";

// ── Status badge ─────────────────────────────────────────────────────
function StatusBadge({ status }: { status: WorkflowStatus }) {
  const config = {
    live: {
      label: "Live",
      bg: "bg-emerald-50",
      text: "text-emerald-700",
      dot: "bg-[var(--vyne-success)]",
      pulse: true,
    },
    paused: {
      label: "Paused",
      bg: "bg-amber-50",
      text: "text-amber-700",
      dot: "bg-amber-400",
      pulse: false,
    },
    draft: {
      label: "Draft",
      bg: "bg-[var(--vyne-bg)]",
      text: "text-[var(--vyne-text-tertiary)]",
      dot: "bg-[var(--vyne-text-tertiary)]",
      pulse: false,
    },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full ${config.bg}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot} ${config.pulse ? "animate-pulse" : ""}`} />
      <span className={`text-[10px] font-semibold ${config.text}`}>{config.label}</span>
    </span>
  );
}

// ── Trigger badge ────────────────────────────────────────────────────
function TriggerBadge({ type }: { type: string }) {
  const icon =
    type === "webhook" ? <Webhook size={10} /> :
    type === "schedule" ? <Clock size={10} /> :
    <Globe size={10} />;

  const label =
    type === "webhook" ? "Webhook" :
    type === "schedule" ? "Scheduled" : "API";

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--vyne-bg)] text-[10px] font-medium text-[var(--vyne-text-secondary)]">
      {icon}
      {label}
    </span>
  );
}

// ── Metric pill ──────────────────────────────────────────────────────
function MetricPill({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="text-[var(--vyne-text-tertiary)]">{icon}</div>
      <div>
        <p className="text-[14px] font-bold text-[var(--vyne-text-primary)]" style={{ color }}>
          {value}
        </p>
        <p className="text-[9px] text-[var(--vyne-text-tertiary)] uppercase tracking-wider font-semibold">
          {label}
        </p>
      </div>
    </div>
  );
}

// ── Workflow card ─────────────────────────────────────────────────────
function WorkflowCard({ workflow }: { workflow: DeployedWorkflow }) {
  const { toggleWorkflowStatus, removeDeployedWorkflow } = useDeployStore();

  const successRate =
    workflow.metrics.totalRuns > 0
      ? Math.round((workflow.metrics.successfulRuns / workflow.metrics.totalRuns) * 100)
      : 0;

  const avgDuration = (workflow.metrics.avgDurationMs / 1000).toFixed(1);
  const deployedDate = new Date(workflow.deployedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const lastRun = workflow.lastRunAt
    ? formatRelativeTime(workflow.lastRunAt)
    : "Never";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl border border-[var(--vyne-border)] shadow-[var(--shadow-sm)]
                 hover:shadow-[var(--shadow-md)] transition-shadow duration-200 overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-[14px] font-bold text-[var(--vyne-text-primary)] truncate">
              {workflow.name}
            </h3>
            <StatusBadge status={workflow.status} />
          </div>
          <p className="text-[11px] text-[var(--vyne-text-tertiary)] truncate">
            {workflow.description}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1 ml-3">
          <button
            onClick={() => toggleWorkflowStatus(workflow.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center
                       text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                       hover:bg-[var(--vyne-bg-warm)] transition-colors"
            title={workflow.status === "live" ? "Pause workflow" : "Resume workflow"}
          >
            {workflow.status === "live" ? <Pause size={13} /> : <Play size={13} />}
          </button>
          <button
            onClick={() => removeDeployedWorkflow(workflow.id)}
            className="w-7 h-7 rounded-lg flex items-center justify-center
                       text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)]
                       hover:bg-red-50 transition-colors"
            title="Delete workflow"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Meta row */}
      <div className="px-5 pb-3 flex items-center gap-3 flex-wrap">
        <TriggerBadge type={workflow.triggerType} />
        <span className="text-[10px] text-[var(--vyne-text-tertiary)]">
          {workflow.agentCount} agent{workflow.agentCount !== 1 ? "s" : ""} &middot;{" "}
          {workflow.taskCount} task{workflow.taskCount !== 1 ? "s" : ""}
        </span>
        <span className="text-[10px] text-[var(--vyne-text-tertiary)]">
          Deployed {deployedDate}
        </span>
      </div>

      {/* Divider */}
      <div className="border-t border-[var(--vyne-border)]" />

      {/* Metrics row */}
      <div className="px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <MetricPill
            label="Total Runs"
            value={workflow.metrics.totalRuns.toLocaleString()}
            icon={<Activity size={13} />}
          />
          <MetricPill
            label="Success Rate"
            value={`${successRate}%`}
            icon={<CheckCircle2 size={13} />}
            color={successRate >= 95 ? "var(--vyne-success)" : successRate >= 80 ? "var(--vyne-warning)" : "var(--vyne-error)"}
          />
          <MetricPill
            label="Avg Duration"
            value={`${avgDuration}s`}
            icon={<Clock size={13} />}
          />
          <MetricPill
            label="Last Run"
            value={lastRun}
            icon={<TrendingUp size={13} />}
          />
        </div>

        {/* Sparkline */}
        <div className="flex flex-col items-end">
          <span className="text-[9px] text-[var(--vyne-text-tertiary)] uppercase tracking-wider font-semibold mb-1">
            Last 7 days
          </span>
          <Sparkline
            data={workflow.metrics.last7Days}
            color={workflow.status === "live" ? "var(--vyne-success)" : "var(--vyne-text-tertiary)"}
            width={100}
            height={28}
          />
        </div>
      </div>
    </motion.div>
  );
}

// ── Time formatter ───────────────────────────────────────────────────
function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ── Stats summary bar ────────────────────────────────────────────────
function StatsSummary({ workflows }: { workflows: DeployedWorkflow[] }) {
  const live = workflows.filter((w) => w.status === "live").length;
  const paused = workflows.filter((w) => w.status === "paused").length;
  const totalRuns = workflows.reduce((s, w) => s + w.metrics.totalRuns, 0);
  const totalSuccess = workflows.reduce((s, w) => s + w.metrics.successfulRuns, 0);
  const overallRate = totalRuns > 0 ? Math.round((totalSuccess / totalRuns) * 100) : 0;

  return (
    <div className="flex items-center gap-6 px-6 py-4 bg-white rounded-2xl border border-[var(--vyne-border)] shadow-[var(--shadow-sm)]">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
          <Zap size={15} className="text-[var(--vyne-success)]" />
        </div>
        <div>
          <p className="text-[18px] font-bold text-[var(--vyne-text-primary)]">{live}</p>
          <p className="text-[9px] text-[var(--vyne-text-tertiary)] uppercase tracking-wider font-semibold">Live</p>
        </div>
      </div>
      <div className="w-px h-8 bg-[var(--vyne-border)]" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
          <Pause size={15} className="text-amber-500" />
        </div>
        <div>
          <p className="text-[18px] font-bold text-[var(--vyne-text-primary)]">{paused}</p>
          <p className="text-[9px] text-[var(--vyne-text-tertiary)] uppercase tracking-wider font-semibold">Paused</p>
        </div>
      </div>
      <div className="w-px h-8 bg-[var(--vyne-border)]" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
          <BarChart3 size={15} className="text-[var(--vyne-accent)]" />
        </div>
        <div>
          <p className="text-[18px] font-bold text-[var(--vyne-text-primary)]">{totalRuns.toLocaleString()}</p>
          <p className="text-[9px] text-[var(--vyne-text-tertiary)] uppercase tracking-wider font-semibold">Total Runs</p>
        </div>
      </div>
      <div className="w-px h-8 bg-[var(--vyne-border)]" />
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center">
          <CheckCircle2 size={15} className="text-[var(--vyne-success)]" />
        </div>
        <div>
          <p className="text-[18px] font-bold text-[var(--vyne-success)]">{overallRate}%</p>
          <p className="text-[9px] text-[var(--vyne-text-tertiary)] uppercase tracking-wider font-semibold">Success Rate</p>
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ───────────────────────────────────────────────────
export function Dashboard() {
  const { deployedWorkflows, setCurrentView, openDeployModal } = useDeployStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | WorkflowStatus>("all");
  const [dashTab, setDashTab] = useState<"workflows" | "usage">("workflows");

  const filtered = deployedWorkflows.filter((w) => {
    const matchesSearch =
      w.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      w.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || w.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--vyne-bg)] overflow-hidden">
      {/* Header */}
      <header className="h-[var(--topbar-height)] bg-white border-b border-[var(--vyne-border)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView("canvas")}
            className="w-8 h-8 rounded-lg flex items-center justify-center
                       text-[var(--vyne-text-secondary)] hover:text-[var(--vyne-text-primary)]
                       hover:bg-[var(--vyne-bg-warm)] transition-colors"
            title="Back to canvas"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-6 bg-[var(--vyne-border)]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--vyne-accent)] flex items-center justify-center">
              <span className="text-white text-[11px] font-black">V</span>
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-[var(--vyne-text-primary)] leading-none">
                Vyne
              </h1>
              <p className="text-[10px] text-[var(--vyne-text-tertiary)]">Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <CreditTracker />
          <div className="w-px h-6 bg-[var(--vyne-border)]" />
          <button
            onClick={() => {
              setCurrentView("canvas");
              openDeployModal();
            }}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-[var(--vyne-accent)]
                       text-white text-[12px] font-semibold hover:opacity-90 transition-opacity shadow-sm"
          >
            <Plus size={14} />
            Deploy New
          </button>
          <div className="w-px h-6 bg-[var(--vyne-border)]" />
          <UserDropdown />
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[960px] mx-auto px-6 py-8 space-y-6">
          {/* Page title + tabs */}
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-[22px] font-bold text-[var(--vyne-text-primary)] mb-1">
                {dashTab === "workflows" ? "Active Workflows" : "Usage & Credits"}
              </h2>
              <p className="text-[13px] text-[var(--vyne-text-secondary)]">
                {dashTab === "workflows"
                  ? "Monitor, manage, and control your deployed agent workflows."
                  : "Track how your workflows consume credits and manage your plan."}
              </p>
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--vyne-bg-warm)]">
              <button
                onClick={() => setDashTab("workflows")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  dashTab === "workflows"
                    ? "bg-white text-[var(--vyne-text-primary)] shadow-sm border border-[var(--vyne-border)]"
                    : "text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]"
                }`}
              >
                <Activity size={12} />
                Workflows
              </button>
              <button
                onClick={() => setDashTab("usage")}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                  dashTab === "usage"
                    ? "bg-white text-[var(--vyne-text-primary)] shadow-sm border border-[var(--vyne-border)]"
                    : "text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]"
                }`}
              >
                <CreditCard size={12} />
                Usage
              </button>
            </div>
          </div>

          {dashTab === "workflows" && (
            <>
          {/* Stats bar */}
          <StatsSummary workflows={deployedWorkflows} />

          {/* Filters row */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1 max-w-[320px]">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vyne-text-tertiary)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search workflows..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[var(--vyne-border)]
                           text-[12px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                           focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                           transition-all"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--vyne-bg-warm)]">
              {(["all", "live", "paused"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setStatusFilter(f)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                    statusFilter === f
                      ? "bg-white text-[var(--vyne-text-primary)] shadow-sm border border-[var(--vyne-border)]"
                      : "text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]"
                  }`}
                >
                  {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Workflow list */}
          <div className="space-y-3">
            {filtered.length === 0 ? (
              <div className="text-center py-16">
                <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--vyne-bg-warm)] flex items-center justify-center">
                  <Zap size={24} className="text-[var(--vyne-text-tertiary)]" />
                </div>
                <h3 className="text-[14px] font-semibold text-[var(--vyne-text-primary)] mb-1">
                  No workflows found
                </h3>
                <p className="text-[12px] text-[var(--vyne-text-tertiary)]">
                  {searchQuery
                    ? "Try a different search term."
                    : "Deploy your first workflow from the canvas to see it here."}
                </p>
              </div>
            ) : (
              filtered.map((w) => <WorkflowCard key={w.id} workflow={w} />)
            )}
          </div>
            </>
          )}

          {dashTab === "usage" && <UsageHistory />}
        </div>
      </div>
    </div>
  );
}
