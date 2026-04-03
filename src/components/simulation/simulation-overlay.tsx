"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useWorkflowStore } from "@/store/workflow-store";

/**
 * A subtle overlay that dims the canvas background during simulation,
 * visually signaling "you're in test mode — editing is paused."
 */
export function SimulationOverlay() {
  const isSimulating = useWorkflowStore((s) => s.isSimulating);

  return (
    <AnimatePresence>
      {isSimulating && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-[5] pointer-events-none bg-[var(--vyne-bg)]/40"
        />
      )}
    </AnimatePresence>
  );
}
