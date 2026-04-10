"use client";

import { useState, useRef } from "react";
import { motion } from "framer-motion";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Square,
  Save,
  Share2,
  Settings,
  Undo2,
  Redo2,
  Loader2,
  Rocket,
  LayoutDashboard,
  Leaf,
  Zap,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useDeployStore } from "@/store/deploy-store";
import { useBillingStore, CREDIT_COSTS } from "@/store/billing-store";
import { CreditTracker } from "../billing/credit-tracker";
import { UserDropdown } from "../auth/user-dropdown";
import type { VyneNodeData } from "@/lib/types";
import { compileGraphToJSON, type CompiledWorkflow } from "@/lib/graph-compiler";
import { useStreamExecutionStore } from "@/store/stream-execution-store";
import { useProjectStore } from "@/store/project-store";
import { RunWithAIModal } from "../simulation/run-with-ai-modal";
import { WorkflowSwitcher } from "./workflow-switcher";

function TopBarButton({
  children,
  onClick,
  variant = "ghost",
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "primary" | "success" | "danger";
  label: string;
  disabled?: boolean;
}) {
  const base =
    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-medium transition-all duration-150";
  const variants = {
    ghost:
      "text-[var(--vyne-text-secondary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)]",
    primary:
      "bg-[var(--vyne-accent)] text-white hover:opacity-90 shadow-sm",
    success:
      "bg-[var(--vyne-success)] text-white hover:opacity-90 shadow-sm",
    danger:
      "bg-[var(--vyne-error)] text-white hover:opacity-90 shadow-sm",
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${variants[variant]} ${disabled ? "opacity-30 pointer-events-none" : ""}`}
      title={label}
    >
      {children}
    </button>
  );
}

export function TopBar() {
  const [showRunModal, setShowRunModal] = useState(false);
  const {
    sidebarOpen,
    toggleSidebar,
    nodes,
    edges,
    undoStack,
    redoStack,
    undo,
    redo,
    isSimulating,
    simulationProgress,
    startSimulation,
    stopSimulation,
  } = useWorkflowStore();
  const { openDeployModal, setCurrentView, deployedWorkflows } = useDeployStore();
  const { canAffordSimulation, canAffordDeployment, openUpgradeModal } = useBillingStore();
  const { execute: executeWithAI, isRunning: isStreamRunning, cancel: cancelStream } = useStreamExecutionStore();
  const compiledRef = useRef<CompiledWorkflow | null>(null);

  const agentCount = nodes.filter((n) => (n.data as VyneNodeData).type === "agent").length;
  const taskCount = nodes.filter((n) => (n.data as VyneNodeData).type === "task").length;
  const toolCount = nodes.filter((n) => (n.data as VyneNodeData).type === "tool").length;

  const parts: string[] = [];
  if (agentCount > 0) parts.push(`${agentCount} agent${agentCount !== 1 ? "s" : ""}`);
  if (taskCount > 0) parts.push(`${taskCount} task${taskCount !== 1 ? "s" : ""}`);
  if (toolCount > 0) parts.push(`${toolCount} tool${toolCount !== 1 ? "s" : ""}`);

  const summary = parts.length > 0
    ? `${parts.join(", ")} · ${edges.length} connection${edges.length !== 1 ? "s" : ""}`
    : "Empty canvas";

  return (
    <header
      className={`
        h-[var(--topbar-height)] border-b border-[var(--vyne-border)]
        flex items-center justify-between px-4 shrink-0 transition-colors duration-300
        ${isSimulating ? "bg-[var(--vyne-bg-warm)]" : "bg-white"}
      `}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          disabled={isSimulating}
          className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors
            ${isSimulating ? "text-[var(--vyne-text-tertiary)] cursor-not-allowed" : "text-[var(--vyne-text-secondary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)]"}`}
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? <PanelLeftClose size={16} /> : <PanelLeftOpen size={16} />}
        </button>

        <div className="w-px h-6 bg-[var(--vyne-border)]" />

        {/* Logo + Workflow Switcher */}
        <div className="flex items-center gap-2.5">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-300 ${
            isSimulating ? "bg-[var(--vyne-success)]" : "bg-[var(--vyne-accent)]"
          }`}>
            <span className="text-white text-[15px] font-black tracking-tight">V</span>
          </div>
          {isSimulating ? (
            <div>
              <h1 className="text-[15px] font-extrabold text-[var(--vyne-text-primary)] leading-none tracking-tight">Vyne</h1>
              <p className="text-[10px] text-[var(--vyne-text-tertiary)]">Executing...</p>
            </div>
          ) : (
            <WorkflowSwitcher />
          )}
        </div>

        {isSimulating && (
          <>
            <div className="w-px h-6 bg-[var(--vyne-border)]" />
            {/* Simulation progress indicator */}
            <div className="flex items-center gap-2">
              <div className="w-24 h-1.5 rounded-full bg-[var(--vyne-border)] overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-[var(--vyne-success)]"
                  animate={{ width: `${simulationProgress}%` }}
                  transition={{ duration: 0.3, ease: "easeOut" }}
                />
              </div>
              <span className="text-[10px] font-semibold text-[var(--vyne-success)]">
                {simulationProgress}%
              </span>
            </div>
          </>
        )}

        {!isSimulating && (
          <>
            <div className="w-px h-6 bg-[var(--vyne-border)]" />
            <div className="flex items-center gap-0.5">
              <TopBarButton label="Undo (Ctrl+Z)" onClick={undo} disabled={undoStack.length === 0}>
                <Undo2 size={14} />
              </TopBarButton>
              <TopBarButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={redoStack.length === 0}>
                <Redo2 size={14} />
              </TopBarButton>
            </div>
          </>
        )}
      </div>

      {/* Center status */}
      <div className="flex items-center gap-2">
        {isSimulating ? (
          <div className="flex items-center gap-2">
            <Loader2 size={12} className="text-[var(--vyne-accent)] animate-spin" />
            <span className="text-[11px] text-[var(--vyne-accent)] font-semibold">
              Simulating workflow...
            </span>
          </div>
        ) : (
          <span className="text-[11px] text-[var(--vyne-text-tertiary)] font-medium">
            {summary}
          </span>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5">
        {!isSimulating && (
          <>
            <CreditTracker />
            <div className="w-px h-6 bg-[var(--vyne-border)] mx-0.5" />
            <TopBarButton label="Templates" onClick={() => setCurrentView("templates")}>
              <Leaf size={14} />
            </TopBarButton>
            <TopBarButton label="Dashboard" onClick={() => setCurrentView("dashboard")}>
              <LayoutDashboard size={14} />
              <span>Dashboard</span>
              {deployedWorkflows.filter((w) => w.status === "live").length > 0 && (
                <span className="text-[9px] px-1 py-px rounded bg-emerald-50 text-[var(--vyne-success)] font-bold">
                  {deployedWorkflows.filter((w) => w.status === "live").length}
                </span>
              )}
            </TopBarButton>
            <TopBarButton
              label="Save workflow (Ctrl+S)"
              onClick={async () => {
                const { activeProjectId, projects, markSaved, updateProjectCanvas } = useProjectStore.getState();
                if (!activeProjectId) return;

                const project = projects.find((p) => p.id === activeProjectId);
                if (!project) return;

                // Update local state
                updateProjectCanvas(activeProjectId, nodes, edges);

                // Save to database
                try {
                  useProjectStore.setState({ isSaving: true });
                  const compiled = compileGraphToJSON(nodes, edges);
                  const res = await fetch("/api/workflows/save", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      id: project.serverId || undefined,
                      name: project.name,
                      description: project.description,
                      nodes,
                      edges,
                      compiled,
                    }),
                  });

                  if (res.ok) {
                    const data = await res.json();
                    // Update serverId if this was a new save
                    if (data.isNew && data.id) {
                      useProjectStore.setState({
                        projects: useProjectStore.getState().projects.map((p) =>
                          p.id === activeProjectId ? { ...p, serverId: data.id } : p
                        ),
                      });
                    }
                    markSaved();
                    useWorkflowStore.getState().addToast({
                      type: "success",
                      title: "Saved!",
                      message: `"${project.name}" saved successfully.`,
                      duration: 3000,
                    });
                  }
                } catch (err) {
                  useWorkflowStore.getState().addToast({
                    type: "error",
                    title: "Save failed",
                    message: "Could not save workflow. Try again.",
                    duration: 5000,
                  });
                } finally {
                  useProjectStore.setState({ isSaving: false });
                }
              }}
              disabled={nodes.length === 0}
            >
              <Save size={14} />
              <span className="hidden sm:inline">Save</span>
            </TopBarButton>
            <div className="w-px h-6 bg-[var(--vyne-border)] mx-1" />
            <TopBarButton
              variant="primary"
              label="Deploy workflow"
              disabled={nodes.length === 0}
              onClick={() => {
                // Check if this project is already deployed
                const { activeProjectId, projects } = useProjectStore.getState();
                const project = projects.find((p) => p.id === activeProjectId);
                const { deployedWorkflows } = useDeployStore.getState();
                const existingDeployment = project?.serverId
                  ? deployedWorkflows.find((dw) =>
                      dw.id === project.serverId || dw.name === project.name
                    )
                  : null;

                if (existingDeployment && existingDeployment.status === "live") {
                  // Already deployed — open manage view
                  useDeployStore.getState().setDeployModalStep("manage");
                  openDeployModal();
                  return;
                }

                if (!canAffordDeployment()) {
                  openUpgradeModal(
                    `Deploying a workflow costs ${CREDIT_COSTS.deployment} credits. You don't have enough credits remaining.`
                  );
                  return;
                }
                openDeployModal();
              }}
            >
              <Rocket size={13} />
              <span>Deploy</span>
            </TopBarButton>
          </>
        )}

        {isSimulating ? (
          <TopBarButton
            variant="danger"
            label="Stop execution"
            onClick={() => {
              stopSimulation();
              cancelStream();
            }}
          >
            <Square size={11} />
            <span>Stop</span>
          </TopBarButton>
        ) : (
          <>
            <TopBarButton
              variant="success"
              label="Simulate workflow (mocked)"
              disabled={nodes.length === 0}
              onClick={() => {
                if (!canAffordSimulation()) {
                  openUpgradeModal(
                    `Running a simulation costs ${CREDIT_COSTS.simulation} credits. You don't have enough credits remaining.`
                  );
                  return;
                }
                startSimulation();
              }}
            >
              <Play size={13} />
              <span>Simulate</span>
            </TopBarButton>
            <TopBarButton
              variant="primary"
              label="Run with real AI models"
              disabled={nodes.length === 0 || isStreamRunning}
              onClick={() => {
                const compiled = compileGraphToJSON(nodes, edges);
                compiledRef.current = compiled;
                setShowRunModal(true);
              }}
            >
              <Zap size={13} />
              <span>Run with AI</span>
            </TopBarButton>
          </>
        )}

        {/* User menu — always visible */}
        <div className="w-px h-6 bg-[var(--vyne-border)] mx-1" />
        <UserDropdown />
      </div>

      {/* Run with AI Modal */}
      <RunWithAIModal
        isOpen={showRunModal}
        onClose={() => setShowRunModal(false)}
        onRun={(userInput) => {
          if (compiledRef.current) {
            executeWithAI(compiledRef.current, userInput || undefined);
          }
        }}
        compiledWorkflow={compiledRef.current}
      />
    </header>
  );
}
