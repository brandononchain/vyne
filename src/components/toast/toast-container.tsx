"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Info,
  X,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { Toast } from "@/lib/types";

const iconMap = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
  info: Info,
};

const colorMap = {
  success: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: "text-[var(--vyne-success)]",
    title: "text-emerald-900",
    text: "text-emerald-700",
  },
  warning: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: "text-amber-500",
    title: "text-amber-900",
    text: "text-amber-700",
  },
  error: {
    bg: "bg-red-50",
    border: "border-red-200",
    icon: "text-[var(--vyne-error)]",
    title: "text-red-900",
    text: "text-red-700",
  },
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: "text-blue-500",
    title: "text-blue-900",
    text: "text-blue-700",
  },
};

function ToastCard({ toast }: { toast: Toast }) {
  const removeToast = useWorkflowStore((s) => s.removeToast);
  const Icon = iconMap[toast.type];
  const colors = colorMap[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 400, damping: 28 }}
      className={`
        relative w-[340px] rounded-xl border ${colors.bg} ${colors.border}
        shadow-[var(--shadow-lg)] overflow-hidden
      `}
    >
      {/* Accent line on left */}
      <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${
        toast.type === "success" ? "bg-[var(--vyne-success)]" :
        toast.type === "error" ? "bg-[var(--vyne-error)]" :
        toast.type === "warning" ? "bg-amber-400" :
        "bg-blue-400"
      }`} />

      <div className="flex items-start gap-2.5 p-3.5 pl-4">
        <Icon size={16} className={`${colors.icon} shrink-0 mt-0.5`} />

        <div className="flex-1 min-w-0">
          <h4 className={`text-[12px] font-semibold ${colors.title} mb-0.5`}>
            {toast.title}
          </h4>
          <p className={`text-[11px] ${colors.text} leading-relaxed`}>
            {toast.message}
          </p>
        </div>

        <button
          onClick={() => removeToast(toast.id)}
          className="w-5 h-5 rounded flex items-center justify-center
                     text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                     transition-colors shrink-0"
        >
          <X size={12} />
        </button>
      </div>
    </motion.div>
  );
}

export function ToastContainer() {
  const toasts = useWorkflowStore((s) => s.toasts);

  return (
    <div className="fixed top-[calc(var(--topbar-height)+12px)] right-4 z-[100] flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} />
        ))}
      </AnimatePresence>
    </div>
  );
}
