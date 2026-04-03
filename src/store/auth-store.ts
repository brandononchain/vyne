import { create } from "zustand";

// ── Types ────────────────────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  provider: "google" | "github" | "magic-link";
  createdAt: string;
}

type AuthStep = "idle" | "loading" | "sending-magic-link" | "magic-link-sent";

interface AuthState {
  // ── User ────────────────────────────────────────
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  authStep: AuthStep;

  // ── Actions ─────────────────────────────────────
  loginWithGoogle: () => Promise<void>;
  loginWithGithub: () => Promise<void>;
  sendMagicLink: (email: string) => Promise<void>;
  confirmMagicLink: () => void;
  logout: () => void;
  setAuthStep: (step: AuthStep) => void;

  // ── User dropdown ───────────────────────────────
  userMenuOpen: boolean;
  toggleUserMenu: () => void;
  closeUserMenu: () => void;
}

// ── Mock user generator ──────────────────────────────────────────────

function createMockUser(provider: User["provider"], email?: string): User {
  return {
    id: `user_${Date.now().toString(36)}`,
    email: email || "alex@company.com",
    name: email ? email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : "Alex Chen",
    avatarUrl: null,
    provider,
    createdAt: new Date().toISOString(),
  };
}

// ── Store ────────────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: false,
  authStep: "idle",

  loginWithGoogle: async () => {
    set({ isLoading: true, authStep: "loading" });
    // Simulate OAuth redirect + callback
    await new Promise((r) => setTimeout(r, 1400));
    const user = createMockUser("google", "alex.chen@gmail.com");
    set({ user, isAuthenticated: true, isLoading: false, authStep: "idle" });
  },

  loginWithGithub: async () => {
    set({ isLoading: true, authStep: "loading" });
    await new Promise((r) => setTimeout(r, 1400));
    const user = createMockUser("github", "alexchen@github.dev");
    set({ user, isAuthenticated: true, isLoading: false, authStep: "idle" });
  },

  sendMagicLink: async (email: string) => {
    set({ authStep: "sending-magic-link" });
    await new Promise((r) => setTimeout(r, 1200));
    set({ authStep: "magic-link-sent" });
    // Store email for when they "confirm" the link
    (get() as AuthState & { _pendingEmail?: string })._pendingEmail = email;
  },

  confirmMagicLink: () => {
    const email = ((get() as AuthState & { _pendingEmail?: string })._pendingEmail) || "user@example.com";
    const user = createMockUser("magic-link", email);
    set({ user, isAuthenticated: true, isLoading: false, authStep: "idle" });
  },

  logout: () => {
    set({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      authStep: "idle",
      userMenuOpen: false,
    });
  },

  setAuthStep: (step) => set({ authStep: step }),

  userMenuOpen: false,
  toggleUserMenu: () => set({ userMenuOpen: !get().userMenuOpen }),
  closeUserMenu: () => set({ userMenuOpen: false }),
}));
