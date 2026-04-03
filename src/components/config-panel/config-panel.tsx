"use client";

import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Trash2 } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import { AgentConfigPanel } from "./agent-config-panel";
import { TaskConfigPanel } from "./task-config-panel";
import { ToolConfigPanel } from "./tool-config-panel";
import type { VyneNodeData } from "@/lib/types";

const TYPE_LABELS: Record<VyneNodeData["type"], string> = {
  agent: "Configure Agent",
  task: "Configure Task",
  tool: "Tool Details",
};

const TYPE_COLORS: Record<VyneNodeData["type"], string> = {
  agent: "var(--vyne-accent)",
  task: "var(--vyne-task)",
  tool: "var(--vyne-tool)",
};

export function ConfigPanel() {
  const configPanelNodeId = useWorkflowStore((s) => s.configPanelNodeId);
  const closeConfigPanel = useWorkflowStore((s) => s.closeConfigPanel);
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const node = useWorkflowStore((s) =>
    s.configPanelNodeId ? s.nodes.find((n) => n.id === s.configPanelNodeId) : null
  );

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && configPanelNodeId) {
        closeConfigPanel();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [configPanelNodeId, closeConfigPanel]);

  const isOpen = !!configPanelNodeId && !!node;
  const nodeData = node ? (node.data as unknown as VyneNodeData) : null;

  return (
    <AnimatePresence>
      {isOpen && nodeData && configPanelNodeId && (
        <>
          {/* Backdrop — click to dismiss */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-40"
            onClick={closeConfigPanel}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: 420, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 420, opacity: 0 }}
            transition={{ type: "spring", stiffness: 340, damping: 32 }}
            className="fixed right-0 top-0 bottom-0 z-50 w-[400px] bg-white
                       border-l border-[var(--vyne-border)] shadow-[-8px_0_24px_rgba(26,23,21,0.06)]
                       flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="shrink-0 px-5 pt-5 pb-4 border-b border-[var(--vyne-border)]">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${(nodeData as VyneNodeData & { color: string }).color}14` }}
                  >
                    <DynamicIcon
                      name={(nodeData as VyneNodeData & { icon: string }).icon}
                      size={16}
                      style={{ color: (nodeData as VyneNodeData & { color: string }).color }}
                    />
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--vyne-text-primary)]">
                      {TYPE_LABELS[nodeData.type]}
                    </h3>
                    <p className="text-[11px] text-[var(--vyne-text-tertiary)]">
                      {(nodeData as VyneNodeData & { name: string }).name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      removeNode(configPanelNodeId);
                    }}
                    className="w-7 h-7 rounded-lg flex items-center justify-center
                               text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)]
                               hover:bg-red-50 transition-colors"
                    title="Delete node"
                  >
                    <Trash2 size={13} />
                  </button>
                  <button
                    onClick={closeConfigPanel}
                    className="w-7 h-7 rounded-lg flex items-center justify-center
                               text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                               hover:bg-[var(--vyne-bg-warm)] transition-colors"
                    title="Close (Esc)"
                  >
                    <X size={14} />
                  </button>
                </div>
              </div>

              {/* Colored accent bar */}
              <div
                className="h-0.5 rounded-full"
                style={{ backgroundColor: TYPE_COLORS[nodeData.type] }}
              />
            </div>

            {/* Scrollable body */}
            <div className="flex-1 overflow-y-auto px-5 py-5">
              <AnimatePresence mode="wait">
                <motion.div
                  key={configPanelNodeId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                >
                  {nodeData.type === "agent" && (
                    <AgentConfigPanel nodeId={configPanelNodeId} />
                  )}
                  {nodeData.type === "task" && (
                    <TaskConfigPanel nodeId={configPanelNodeId} />
                  )}
                  {nodeData.type === "tool" && (
                    <ToolConfigPanel nodeId={configPanelNodeId} />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Footer with educational hint */}
            <div className="shrink-0 px-5 py-3 border-t border-[var(--vyne-border)] bg-[var(--vyne-bg-warm)]">
              <p className="text-[10px] text-[var(--vyne-text-tertiary)] leading-snug text-center">
                {nodeData.type === "agent"
                  ? "Changes are saved automatically. This configuration becomes the agent's system prompt."
                  : nodeData.type === "task"
                  ? "Changes are saved automatically. This configuration defines the task instructions."
                  : "Tool configuration is automatic. Connect it to an agent to put it to work."}
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
