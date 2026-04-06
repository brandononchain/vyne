import { create } from "zustand";

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

interface VyneMemoryState {
  messages: ChatMessage[];
  addMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  clearMessages: () => void;

  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

// ── Store — in-memory for session, API calls handle persistence ─────

export const useVyneMemory = create<VyneMemoryState>((set, get) => ({
  messages: [],

  addMessage: (msg) => set({ messages: [...get().messages, msg] }),

  updateMessage: (id, updates) =>
    set({ messages: get().messages.map((m) => (m.id === id ? { ...m, ...updates } : m)) }),

  clearMessages: () => set({ messages: [] }),

  isOpen: false,
  setIsOpen: (v) => set({ isOpen: v }),
  isProcessing: false,
  setIsProcessing: (v) => set({ isProcessing: v }),
}));
