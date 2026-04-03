"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAuthStore } from "@/store/auth-store";
import { LoginPage } from "./login-page";

/**
 * Wraps the entire app. Shows the LoginPage if not authenticated,
 * otherwise renders children with a smooth crossfade transition.
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return (
    <AnimatePresence mode="wait">
      {!isAuthenticated ? (
        <motion.div
          key="login"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          <LoginPage />
        </motion.div>
      ) : (
        <motion.div
          key="app"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="h-screen w-screen"
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
