"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { Trash2, Settings } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import type { ActionNodeData } from "@/lib/types";

function ActionNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ActionNodeData;
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const openConfigPanel = useWorkflowStore((s) => s.openConfigPanel);

  const isFlowControl = ["if-condition", "switch-node", "loop-node", "merge-node", "wait-node"].includes(nodeData.templateId);

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`group relative w-[220px] rounded-2xl transition-all duration-300 cursor-grab active:cursor-grabbing
        ${selected ? "shadow-[0_0_20px_rgba(0,148,233,0.2)] ring-2 ring-blue-200/30" : "shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]"}`}
    >
      <div className="absolute inset-0 rounded-2xl p-[1.5px]"
        style={{ background: selected ? `linear-gradient(135deg, ${nodeData.color}80, ${nodeData.color}30)` : `linear-gradient(135deg, ${nodeData.color}40, ${nodeData.color}15)` }}>
        <div className="w-full h-full rounded-[15px] bg-white" />
      </div>

      <div className="relative z-10 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
            style={{ backgroundColor: nodeData.color + "15", color: nodeData.color }}>
            {isFlowControl ? "Flow" : "Action"}
          </span>
          <div className="flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={(e) => { e.stopPropagation(); openConfigPanel(id); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-accent)] hover:bg-[var(--vyne-accent-bg)] transition-all">
              <Settings size={11} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); removeNode(id); }}
              className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-red-500 hover:bg-red-50 transition-all">
              <Trash2 size={11} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{ background: `linear-gradient(135deg, ${nodeData.color}20, ${nodeData.color}08)` }}>
            <DynamicIcon name={nodeData.icon} size={18} style={{ color: nodeData.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate">{nodeData.name}</h3>
          </div>
        </div>

        <p className="text-[10px] text-[var(--vyne-text-secondary)] leading-relaxed line-clamp-2">{nodeData.description}</p>

        {/* Config preview */}
        {nodeData.config?.url && (
          <div className="mt-2 px-2 py-1 rounded-md bg-[var(--vyne-bg)] text-[9px] font-mono text-[var(--vyne-text-tertiary)] truncate">
            {nodeData.config.method || "GET"} {nodeData.config.url}
          </div>
        )}
      </div>

      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !rounded-full !border-2"
        style={{ backgroundColor: "white", borderColor: nodeData.color, left: -5 }} />
      <Handle type="source" position={Position.Right} className="!w-2.5 !h-2.5 !rounded-full !border-2"
        style={{ backgroundColor: "white", borderColor: nodeData.color, right: -5 }} />

      {/* Flow control nodes get a second output for branching */}
      {isFlowControl && (
        <Handle type="source" position={Position.Bottom} id="false" className="!w-2.5 !h-2.5 !rounded-full !border-2"
          style={{ backgroundColor: "white", borderColor: "#e17055", bottom: -5 }} />
      )}
    </motion.div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
