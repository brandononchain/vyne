"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { Trash2, ChevronRight, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import type { TaskNodeData } from "@/lib/types";

function TaskNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as TaskNodeData;
  const removeNode = useWorkflowStore((s) => s.removeNode);

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0, y: 12 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 320, damping: 22 }}
      className={`
        group relative w-[240px] rounded-2xl bg-white border-[1.5px]
        transition-all duration-200 cursor-grab active:cursor-grabbing
        ${
          selected
            ? "border-[var(--vyne-task)] shadow-[0_0_20px_rgba(0,184,148,0.15)]"
            : "border-[var(--vyne-border)] hover:border-[var(--vyne-border-hover)] shadow-[var(--shadow-md)]"
        }
      `}
    >
      {/* Top accent — dashed to differentiate from agents */}
      <div
        className="h-1 rounded-t-2xl"
        style={{
          background: `repeating-linear-gradient(90deg, ${nodeData.color} 0px, ${nodeData.color} 8px, transparent 8px, transparent 12px)`,
        }}
      />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${nodeData.color}14` }}
        >
          <DynamicIcon
            name={nodeData.icon}
            size={18}
            style={{ color: nodeData.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--vyne-task)]">
              Task
            </span>
          </div>
          <h3 className="text-[13px] font-semibold text-[var(--vyne-text-primary)] truncate">
            {nodeData.name}
          </h3>
        </div>

        <button
          className="w-6 h-6 rounded-lg flex items-center justify-center
                     text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)]
                     hover:bg-red-50 transition-colors
                     opacity-0 group-hover:opacity-100"
          onClick={(e) => {
            e.stopPropagation();
            removeNode(id);
          }}
        >
          <Trash2 size={12} />
        </button>
      </div>

      {/* Description */}
      <div className="px-4 pb-2">
        <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-relaxed line-clamp-2">
          {nodeData.description}
        </p>
      </div>

      {/* Input/Output badges */}
      <div className="px-4 pb-3 space-y-1.5">
        <div className="flex items-center gap-1.5">
          <ArrowDownToLine size={10} className="text-[var(--vyne-text-tertiary)]" />
          <span className="text-[10px] text-[var(--vyne-text-tertiary)]">
            In: {nodeData.expectedInput}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <ArrowUpFromLine size={10} className="text-[var(--vyne-text-tertiary)]" />
          <span className="text-[10px] text-[var(--vyne-text-tertiary)]">
            Out: {nodeData.expectedOutput}
          </span>
        </div>
      </div>

      {/* Status footer */}
      <div className="px-4 py-2 border-t border-[var(--vyne-border)] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              nodeData.status === "pending"
                ? "bg-[var(--vyne-text-tertiary)]"
                : nodeData.status === "running"
                ? "bg-[var(--vyne-success)] animate-pulse"
                : nodeData.status === "complete"
                ? "bg-[var(--vyne-success)]"
                : "bg-[var(--vyne-error)]"
            }`}
          />
          <span className="text-[10px] text-[var(--vyne-text-tertiary)] capitalize">
            {nodeData.status}
          </span>
        </div>
        <button className="flex items-center gap-0.5 text-[10px] text-[var(--vyne-task)] font-medium opacity-0 group-hover:opacity-100 transition-opacity">
          Edit Task <ChevronRight size={10} />
        </button>
      </div>

      {/* Handles */}
      <Handle
        type="target"
        position={Position.Left}
        className="!-left-[5px]"
      />
      <Handle
        type="source"
        position={Position.Right}
        className="!-right-[5px]"
      />
    </motion.div>
  );
}

export const TaskNode = memo(TaskNodeComponent);
