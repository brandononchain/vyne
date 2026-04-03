"use client";

import {
  PanelLeftClose,
  PanelLeftOpen,
  Play,
  Save,
  Share2,
  Settings,
  Undo2,
  Redo2,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { VyneNodeData } from "@/lib/types";

function TopBarButton({
  children,
  onClick,
  variant = "ghost",
  label,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: "ghost" | "primary" | "success";
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
  const { sidebarOpen, toggleSidebar, nodes, edges, undoStack, redoStack, undo, redo } =
    useWorkflowStore();

  // Count by node type
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
      className="h-[var(--topbar-height)] bg-white border-b border-[var(--vyne-border)]
                    flex items-center justify-between px-4 shrink-0"
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="w-8 h-8 rounded-lg flex items-center justify-center
                     text-[var(--vyne-text-secondary)] hover:text-[var(--vyne-text-primary)]
                     hover:bg-[var(--vyne-bg-warm)] transition-colors"
          title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}
        >
          {sidebarOpen ? (
            <PanelLeftClose size={16} />
          ) : (
            <PanelLeftOpen size={16} />
          )}
        </button>

        <div className="w-px h-6 bg-[var(--vyne-border)]" />

        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--vyne-accent)] flex items-center justify-center">
            <span className="text-white text-[11px] font-black">V</span>
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-[var(--vyne-text-primary)] leading-none">
              Vyne
            </h1>
            <p className="text-[10px] text-[var(--vyne-text-tertiary)]">
              Untitled Workflow
            </p>
          </div>
        </div>

        <div className="w-px h-6 bg-[var(--vyne-border)]" />

        {/* Functional undo/redo */}
        <div className="flex items-center gap-0.5">
          <TopBarButton label="Undo (Ctrl+Z)" onClick={undo} disabled={undoStack.length === 0}>
            <Undo2 size={14} />
          </TopBarButton>
          <TopBarButton label="Redo (Ctrl+Shift+Z)" onClick={redo} disabled={redoStack.length === 0}>
            <Redo2 size={14} />
          </TopBarButton>
        </div>
      </div>

      {/* Center status */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[var(--vyne-text-tertiary)] font-medium">
          {summary}
        </span>
      </div>

      {/* Right section */}
      <div className="flex items-center gap-1.5">
        <TopBarButton label="Save workflow">
          <Save size={14} />
          <span>Save</span>
        </TopBarButton>

        <TopBarButton label="Share">
          <Share2 size={14} />
        </TopBarButton>

        <TopBarButton label="Settings">
          <Settings size={14} />
        </TopBarButton>

        <div className="w-px h-6 bg-[var(--vyne-border)] mx-1" />

        <TopBarButton
          variant="success"
          label="Run workflow"
          disabled={nodes.length === 0}
        >
          <Play size={13} />
          <span>Run Workflow</span>
        </TopBarButton>
      </div>
    </header>
  );
}
