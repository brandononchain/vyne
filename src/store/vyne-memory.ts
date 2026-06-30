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
  loaded: boolean;
  addMessage: (msg: ChatMessage) => void;
  /** Add locally AND persist to the backend (POST /api/chat). */
  recordMessage: (msg: ChatMessage) => void;
  updateMessage: (id: string, updates: Partial<ChatMessage>) => void;
  /** Load persisted history once (GET /api/chat). */
  loadHistory: () => Promise<void>;
  clearMessages: () => void;

  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  isProcessing: boolean;
  setIsProcessing: (v: boolean) => void;
}

// ── Store — backed by /api/chat for persistence ─────────────────────

export const useVyneMemory = create<VyneMemoryState>((set, get) => ({
  messages: [],
  loaded: false,

  addMessage: (msg) => set({ messages: [...get().messages, msg] }),

  recordMessage: (msg) => {
    set({ messages: [...get().messages, msg] });
    // Fire-and-forget persistence — never block the UI on it.
    fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        role: msg.role,
        content: msg.content,
        metadata: {
          status: msg.status ?? null,
          builtNodes: msg.builtNodes ?? null,
          action: msg.action ?? null,
        },
      }),
    }).catch((err) => console.error("[VyneMemory] persist failed:", err));
  },

  updateMessage: (id, updates) =>
    set({ messages: get().messages.map((m) => (m.id === id ? { ...m, ...updates } : m)) }),

  loadHistory: async () => {
    if (get().loaded) return;
    set({ loaded: true });
    try {
      const res = await fetch("/api/chat");
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.messages)) {
        const messages: ChatMessage[] = data.messages.map(
          (m: { id: string; role: string; content: string; metadata: Record<string, unknown> | null; timestamp: number }) => ({
            id: m.id,
            role: m.role === "vyne" ? "vyne" : "user",
            content: m.content,
            timestamp: m.timestamp,
            status: (m.metadata?.status as ChatMessage["status"]) ?? undefined,
            builtNodes: (m.metadata?.builtNodes as number) ?? undefined,
            action: (m.metadata?.action as ChatMessage["action"]) ?? undefined,
          })
        );
        set({ messages });
      }
    } catch (err) {
      console.error("[VyneMemory] loadHistory failed:", err);
    }
  },

  clearMessages: () => {
    set({ messages: [] });
    fetch("/api/chat", { method: "DELETE" }).catch((err) =>
      console.error("[VyneMemory] clear failed:", err)
    );
  },

  isOpen: false,
  setIsOpen: (v) => set({ isOpen: v }),
  isProcessing: false,
  setIsProcessing: (v) => set({ isProcessing: v }),
}));
