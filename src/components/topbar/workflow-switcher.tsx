/**
 * ── WorkflowSwitcher ────────────────────────────────────────────────
 *
 * Dropdown in the topbar that lets users switch between saved workflows,
 * create new ones, and rename the current one.
 *
 * Replaces the static "Vyne / Untitled Workflow" text.
 */

"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  Plus,
  FileText,
  Check,
  Pencil,
  Trash2,
  Circle,
  Loader2,
} from "lucide-react";
import { useProjectStore, type Project } from "@/store/project-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { useVyneMemory } from "@/store/vyne-memory";
import type { VyneNodeData } from "@/lib/types";

export function WorkflowSwitcher() {
  const {
    projects,
    activeProjectId,
    setActiveProjectId,
    createProject,
    renameProject,
    deleteProject,
    updateProjectCanvas,
    isDropdownOpen,
    setDropdownOpen,
    hasUnsavedChanges,
    isSaving,
  } = useProjectStore();

  const { nodes, edges } = useWorkflowStore();
  const { clearMessages } = useVyneMemory();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeProject = projects.find((p) => p.id === activeProjectId);
  const displayName = activeProject?.name || "Untitled Workflow";

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
        setEditingId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [setDropdownOpen]);

  // Save current canvas to active project before switching
  const saveCurrentAndSwitch = (targetId: string) => {
    if (activeProjectId && activeProjectId !== targetId) {
      updateProjectCanvas(activeProjectId, nodes, edges);
    }

    // Load target project's canvas
    const target = projects.find((p) => p.id === targetId);
    if (target) {
      useWorkflowStore.setState({
        nodes: target.nodes || [],
        edges: target.edges || [],
      });

      // Load chat history for this workflow
      loadChatForWorkflow(target.serverId);
    }

    setActiveProjectId(targetId);
    setDropdownOpen(false);
  };

  const loadChatForWorkflow = async (serverId: string | null) => {
    clearMessages();
    if (!serverId) return;

    try {
      const res = await fetch(`/api/chat?workflowId=${serverId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.messages?.length > 0) {
          const { addMessage } = useVyneMemory.getState();
          for (const msg of data.messages) {
            addMessage({
              id: msg.id,
              role: msg.role,
              content: msg.content,
              timestamp: msg.timestamp,
              status: "complete",
            });
          }
        }
      }
    } catch {
      // Silently fail — chat will start fresh
    }
  };

  const handleCreate = () => {
    // Save current first
    if (activeProjectId) {
      updateProjectCanvas(activeProjectId, nodes, edges);
    }

    const project = createProject("New Workflow");
    useWorkflowStore.setState({ nodes: [], edges: [] });
    clearMessages();
    setDropdownOpen(false);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (projects.length <= 1) return; // Don't delete last project
    deleteProject(id);
  };

  const startRename = (project: Project, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(project.id);
    setEditName(project.name);
  };

  const commitRename = () => {
    if (editingId && editName.trim()) {
      renameProject(editingId, editName.trim());
    }
    setEditingId(null);
  };

  const statusColors: Record<string, string> = {
    draft: "var(--vyne-text-tertiary)",
    live: "var(--vyne-success)",
    paused: "var(--vyne-warning, #d4a84b)",
    archived: "var(--vyne-text-tertiary)",
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setDropdownOpen(!isDropdownOpen)}
        className="flex items-center gap-2 px-2 py-1 rounded-lg hover:bg-[var(--vyne-bg-warm)] transition-colors group"
      >
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="text-[15px] font-extrabold text-[var(--vyne-text-primary)] leading-none tracking-tight">
              Vyne
            </h1>
            {hasUnsavedChanges && (
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Unsaved changes" />
            )}
            {isSaving && (
              <Loader2 size={10} className="text-[var(--vyne-text-tertiary)] animate-spin" />
            )}
          </div>
          <p className="text-[10px] text-[var(--vyne-text-tertiary)] text-left truncate max-w-[140px]">
            {displayName}
          </p>
        </div>
        <ChevronDown
          size={12}
          className={`text-[var(--vyne-text-tertiary)] transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {isDropdownOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 mt-2 w-[280px] bg-white rounded-xl border shadow-lg overflow-hidden z-50"
            style={{ borderColor: "var(--vyne-border)", boxShadow: "0 12px 40px rgba(0,0,0,0.08)" }}
          >
            {/* Header */}
            <div className="px-3 py-2.5 border-b flex items-center justify-between" style={{ borderColor: "var(--vyne-border)" }}>
              <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: "var(--vyne-text-tertiary)" }}>
                Workflows
              </span>
              <button
                onClick={handleCreate}
                className="flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-semibold hover:bg-[var(--vyne-bg-warm)] transition-colors"
                style={{ color: "var(--vyne-accent)" }}
              >
                <Plus size={11} />
                New
              </button>
            </div>

            {/* Project list */}
            <div className="max-h-[300px] overflow-y-auto py-1">
              {projects.length === 0 && (
                <div className="px-3 py-6 text-center">
                  <p className="text-[11px]" style={{ color: "var(--vyne-text-tertiary)" }}>
                    No saved workflows yet
                  </p>
                </div>
              )}

              {projects.map((project) => (
                <div
                  key={project.id}
                  onClick={() => saveCurrentAndSwitch(project.id)}
                  className={`flex items-center gap-2.5 px-3 py-2 cursor-pointer transition-colors group/item ${
                    project.id === activeProjectId
                      ? "bg-[var(--vyne-accent-bg)]"
                      : "hover:bg-[var(--vyne-bg-warm)]"
                  }`}
                >
                  {/* Status dot */}
                  <Circle
                    size={6}
                    fill={statusColors[project.status] || statusColors.draft}
                    stroke="none"
                    className="shrink-0"
                  />

                  {/* Name (or edit input) */}
                  {editingId === project.id ? (
                    <input
                      autoFocus
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") commitRename();
                        if (e.key === "Escape") setEditingId(null);
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 text-[12px] font-medium px-1.5 py-0.5 rounded border outline-none focus:ring-1"
                      style={{
                        color: "var(--vyne-text-primary)",
                        borderColor: "var(--vyne-accent)",
                        ringColor: "var(--vyne-accent)",
                      }}
                    />
                  ) : (
                    <div className="flex-1 min-w-0">
                      <div className="text-[12px] font-medium truncate" style={{ color: "var(--vyne-text-primary)" }}>
                        {project.name}
                      </div>
                      <div className="text-[9px]" style={{ color: "var(--vyne-text-tertiary)" }}>
                        {project.agentCount}a · {project.taskCount}t
                      </div>
                    </div>
                  )}

                  {/* Active check */}
                  {project.id === activeProjectId && editingId !== project.id && (
                    <Check size={12} style={{ color: "var(--vyne-accent)" }} className="shrink-0" />
                  )}

                  {/* Actions (visible on hover) */}
                  {editingId !== project.id && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => startRename(project, e)}
                        className="w-5 h-5 rounded flex items-center justify-center hover:bg-white/80 transition-colors"
                      >
                        <Pencil size={10} style={{ color: "var(--vyne-text-tertiary)" }} />
                      </button>
                      {projects.length > 1 && (
                        <button
                          onClick={(e) => handleDelete(project.id, e)}
                          className="w-5 h-5 rounded flex items-center justify-center hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={10} className="text-red-400" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
