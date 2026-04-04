"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { Trash2, Wrench, Settings } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import type { ToolNodeData } from "@/lib/types";

function ToolNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as ToolNodeData;
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const openConfigPanel = useWorkflowStore((s) => s.openConfigPanel);

  return (
    <motion.div
      initial={{ scale: 0.75, opacity: 0, rotate: -3 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 340, damping: 20 }}
      className={`
        group relative w-[192px] rounded-[16px] overflow-hidden
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${selected
          ? "shadow-[0_0_22px_rgba(122,158,126,0.25)] ring-2 ring-[var(--vyne-tool)]/20"
          : "shadow-[var(--shadow-sm)] hover:shadow-[var(--shadow-md)]"}
      `}
    >
      {/* Gradient border */}
      <div
        className="absolute inset-0 rounded-[16px] p-[1.5px]"
        style={{
          background: selected
            ? `linear-gradient(135deg, ${nodeData.color}70, ${nodeData.color}25, ${nodeData.color}50)`
            : "linear-gradient(135deg, var(--vyne-border), var(--vyne-border-hover))",
        }}
      >
        <div className="w-full h-full rounded-[15px] bg-white" />
      </div>

      <div className="relative z-10">
        <div className="p-3.5 flex items-center gap-2.5">
          <div
            className="w-9 h-9 rounded-[12px] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
            style={{
              background: `linear-gradient(135deg, ${nodeData.color}18, ${nodeData.color}08)`,
              boxShadow: `0 1px 4px ${nodeData.color}10`,
            }}
          >
            <DynamicIcon name={nodeData.icon} size={16} style={{ color: nodeData.color }} />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 mb-0.5">
              <Wrench size={8} className="text-[var(--vyne-tool)]" />
              <span className="text-[8.5px] font-bold uppercase tracking-[0.08em] text-[var(--vyne-tool)]">
                Tool
              </span>
            </div>
            <h3 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate leading-tight">
              {nodeData.name}
            </h3>
          </div>

          <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200">
            <button
              className="w-6 h-6 rounded-[8px] flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-tool)] hover:bg-[var(--vyne-tool-bg)] transition-all"
              onClick={(e) => { e.stopPropagation(); openConfigPanel(id); }}
              title="Tool details"
            >
              <Settings size={11} />
            </button>
            <button
              className="w-6 h-6 rounded-[8px] flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)] hover:bg-red-50/80 transition-all"
              onClick={(e) => { e.stopPropagation(); removeNode(id); }}
              title="Delete tool"
            >
              <Trash2 size={10} />
            </button>
          </div>
        </div>

        <div className="px-3.5 pb-3">
          <p className="text-[10px] text-[var(--vyne-text-tertiary)] leading-[1.5] line-clamp-2">
            {nodeData.description}
          </p>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="!w-[9px] !h-[9px] !-right-[4.5px] !bg-[var(--vyne-border-hover)] !border-2 !border-white hover:!bg-[var(--vyne-tool)] !transition-colors" />
    </motion.div>
  );
}

export const ToolNode = memo(ToolNodeComponent);
