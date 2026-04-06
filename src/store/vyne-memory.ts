import { create } from "zustand";
import type { VyneNode, VyneEdge } from "@/lib/types";

// ── Types ────────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "vyne";
  content: string;
  timestamp: number;
  status?: "thinking" | "building" | "complete" | "error";
  builtNodes?: number;
  action?: "create" | "modify" | "expand";
}

export interface WorkflowSnapshot {
  id: string;
  name: string;
  nodes: VyneNode[];
  edges: VyneEdge[];
  createdAt: number;
  prompt?: string;
}

interface VyneMemoryState {
  // ── Chat history (persisted) ──────────────────────
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  // ── Workflow snapshots (persisted) ────────────────
  snapshots: WorkflowSnapshot[];
  saveSnapshot: (snapshot: WorkflowSnapshot) => void;

  // ── Chat UI state ─────────────────────────────────
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

// ── Persistence helpers ──────────────────────────────────────────────

const STORAGE_KEY = "vyne-memory";

function loadFromStorage(): { messages: ChatMessage[]; snapshots: WorkflowSnapshot[] } {
  if (typeof window === "undefined") return { messages: [], snapshots: [] };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { messages: [], snapshots: [] };
    const data = JSON.parse(raw);
    return {
      messages: Array.isArray(data.messages) ? data.messages : [],
      snapshots: Array.isArray(data.snapshots) ? data.snapshots : [],
    };
  } catch {
    return { messages: [], snapshots: [] };
  }
}

function saveToStorage(messages: ChatMessage[], snapshots: WorkflowSnapshot[]) {
  if (typeof window === "undefined") return;
  try {
    // Keep last 100 messages and 20 snapshots
    const trimmedMessages = messages.slice(-100);
    const trimmedSnapshots = snapshots.slice(-20);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      messages: trimmedMessages,
      snapshots: trimmedSnapshots,
      savedAt: Date.now(),
    }));
  } catch {
    // Storage full — silently fail
  }
}

// ── Store ────────────────────────────────────────────────────────────

const persisted = loadFromStorage();

export const useVyneMemory = create<VyneMemoryState>((set, get) => ({
  messages: persisted.messages,
  snapshots: persisted.snapshots,

  addMessage: (msg) => {
    const messages = [...get().messages, msg];
    set({ messages });
    saveToStorage(messages, get().snapshots);
  },

  updateMessage: (id, updates) => {
    const messages = get().messages.map((m) =>
      m.id === id ? { ...m, ...updates } : m
    );
    set({ messages });
    saveToStorage(messages, get().snapshots);
  },

  clearMessages: () => {
    set({ messages: [] });
    saveToStorage([], get().snapshots);
  },

  saveSnapshot: (snapshot) => {
    const snapshots = [...get().snapshots, snapshot];
    set({ snapshots });
    saveToStorage(get().messages, snapshots);
  },

  isOpen: false,
  setIsOpen: (v) => set({ isOpen: v }),
  isProcessing: false,
  setIsProcessing: (v) => set({ isProcessing: v }),
}));
