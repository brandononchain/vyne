/**
 * ── Project Store ───────────────────────────────────────────────────
 *
 * Manages the concept of "projects" (saved workflows).
 * Each project has its own canvas state, chat history, and name.
 *
 * When the user switches projects:
 *   1. Current canvas + chat is auto-saved
 *   2. New project's canvas + chat is restored
 *   3. Vyne AI remembers the conversation for that project
 */

import { create } from "zustand";
import type { VyneNode, VyneEdge } from "@/lib/types";

export interface Project {
  id: string;
  name: string;
  description: string;
  status: "draft" | "live" | "paused" | "archived";
  nodes: VyneNode[];
  edges: VyneEdge[];
  agentCount: number;
  taskCount: number;
  updatedAt: string;
  createdAt: string;
  // Server-side ID (null for unsaved new projects)
  serverId: string | null;
}

interface ProjectStore {
  // All user's projects
  projects: Project[];
  setProjects: (projects: Project[]) => void;

  // Active project
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;

  // Save status
  isSaving: boolean;
  lastSavedAt: string | null;
  hasUnsavedChanges: boolean;
  markUnsaved: () => void;
  markSaved: () => void;

  // Project CRUD
  createProject: (name: string) => Project;
  renameProject: (id: string, name: string) => void;
  deleteProject: (id: string) => void;
  updateProjectCanvas: (id: string, nodes: VyneNode[], edges: VyneEdge[]) => void;

  // Dropdown state
  isDropdownOpen: boolean;
  setDropdownOpen: (v: boolean) => void;
}

let projectCounter = 0;

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  setProjects: (projects) => set({ projects }),

  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),

  isSaving: false,
  lastSavedAt: null,
  hasUnsavedChanges: false,
  markUnsaved: () => set({ hasUnsavedChanges: true }),
  markSaved: () => set({ hasUnsavedChanges: false, lastSavedAt: new Date().toISOString() }),

  createProject: (name: string) => {
    const id = `project-${++projectCounter}-${Date.now().toString(36)}`;
    const project: Project = {
      id,
      name: name || "Untitled Workflow",
      description: "",
      status: "draft",
      nodes: [],
      edges: [],
      agentCount: 0,
      taskCount: 0,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      serverId: null,
    };
    set({ projects: [...get().projects, project], activeProjectId: id });
    return project;
  },

  renameProject: (id, name) => {
    set({
      projects: get().projects.map((p) =>
        p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p
      ),
      hasUnsavedChanges: true,
    });
  },

  deleteProject: (id) => {
    const { projects, activeProjectId } = get();
    const remaining = projects.filter((p) => p.id !== id);
    set({
      projects: remaining,
      activeProjectId: activeProjectId === id ? (remaining[0]?.id || null) : activeProjectId,
    });
  },

  updateProjectCanvas: (id, nodes, edges) => {
    set({
      projects: get().projects.map((p) =>
        p.id === id
          ? {
              ...p,
              nodes,
              edges,
              agentCount: nodes.filter((n) => (n.data as { type: string }).type === "agent").length,
              taskCount: nodes.filter((n) => (n.data as { type: string }).type === "task").length,
              updatedAt: new Date().toISOString(),
            }
          : p
      ),
      hasUnsavedChanges: true,
    });
  },

  isDropdownOpen: false,
  setDropdownOpen: (v) => set({ isDropdownOpen: v }),
}));
