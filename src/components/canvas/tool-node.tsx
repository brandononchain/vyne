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
      initial={{ scale: 0.7, opacity: 0, rotate: -4 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      transition={{ type: "spring", stiffness: 350, damping: 20 }}
      className={`
        group relative w-[180px] rounded-xl bg-white border-[1.5px]
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${
          selected
            ? "border-[var(--vyne-tool)] shadow-[0_0_20px_rgba(253,203,110,0.25)]"
            : "border-[var(--vyne-border)] hover:border-[var(--vyne-border-hover)] shadow-[var(--shadow-sm)]"
        }
      `}
    >
      <div className="p-3 flex items-center gap-2.5">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${nodeData.color}14` }}
        >
          <DynamicIcon name={nodeData.icon} size={15} style={{ color: nodeData.color }} />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1 mb-0.5">
            <Wrench size={8} className="text-[var(--vyne-tool)]" />
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--vyne-tool)]">
              Tool
            </span>
          </div>
          <h3 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate leading-tight">
            {nodeData.name}
          </h3>
        </div>

        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-5 h-5 rounded flex items-center justify-center
                       text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-tool)]
                       hover:bg-[var(--vyne-tool-bg)] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openConfigPanel(id);
            }}
            title="Tool details"
          >
            <Settings size={10} />
          </button>
          <button
            className="w-5 h-5 rounded flex items-center justify-center
                       text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)]
                       hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              removeNode(id);
            }}
            title="Delete tool"
          >
            <Trash2 size={10} />
          </button>
        </div>
      </div>

      <div className="px-3 pb-2.5">
        <p className="text-[10px] text-[var(--vyne-text-tertiary)] leading-snug line-clamp-2">
          {nodeData.description}
        </p>
      </div>

      <Handle type="source" position={Position.Right} className="!-right-[5px]" />
    </motion.div>
  );
}

export const ToolNode = memo(ToolNodeComponent);
