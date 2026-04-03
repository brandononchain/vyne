"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { Trash2, Settings, ChevronRight } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import type { AgentNodeData } from "@/lib/types";

function AgentNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const openConfigPanel = useWorkflowStore((s) => s.openConfigPanel);
  const isSimulating = useWorkflowStore((s) => s.isSimulating);
  const isActiveInSim = useWorkflowStore((s) => s.simulationActiveNodeId === id);

  const isRunning = nodeData.status === "running";
  const isComplete = nodeData.status === "complete";

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{
        scale: isActiveInSim ? 1.02 : 1,
        opacity: 1,
      }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`
        group relative w-[260px] rounded-2xl bg-white border-[1.5px]
        transition-all duration-300 cursor-grab active:cursor-grabbing
        ${isActiveInSim ? "border-[var(--vyne-accent)] shadow-[0_0_24px_rgba(108,92,231,0.25)] ring-2 ring-[var(--vyne-accent)]/20" : ""}
        ${isComplete && isSimulating ? "border-[var(--vyne-success)] shadow-[0_0_16px_rgba(0,184,148,0.15)]" : ""}
        ${!isActiveInSim && !isComplete && selected ? "border-[var(--vyne-accent)] shadow-[var(--shadow-glow)]" : ""}
        ${!isActiveInSim && !isComplete && !selected ? "border-[var(--vyne-border)] hover:border-[var(--vyne-border-hover)] shadow-[var(--shadow-md)]" : ""}
        ${isSimulating ? "cursor-default" : ""}
      `}
    >
      {/* Top color accent bar */}
      <div
        className="h-1 rounded-t-2xl"
        style={{ backgroundColor: nodeData.color }}
      />

      {/* Header */}
      <div className="px-4 pt-3 pb-2 flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${nodeData.color}14` }}
        >
          <DynamicIcon
            name={nodeData.icon}
            size={20}
            style={{ color: nodeData.color }}
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-[13px] font-semibold text-[var(--vyne-text-primary)] truncate">
            {nodeData.name}
          </h3>
          <p className="text-[11px] text-[var(--vyne-text-tertiary)] font-medium">
            {nodeData.role}
          </p>
        </div>

        {/* Actions - visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            className="w-6 h-6 rounded-lg flex items-center justify-center
                       text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-accent)]
                       hover:bg-[var(--vyne-accent-bg)] transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              openConfigPanel(id);
            }}
            title="Configure agent"
          >
            <Settings size={12} />
          </button>
          <button
            className="w-6 h-6 rounded-lg flex items-center justify-center
                       text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)]
                       hover:bg-red-50 transition-colors"
            onClick={(e) => {
              e.stopPropagation();
              removeNode(id);
            }}
            title="Delete agent"
          >
            <Trash2 size={12} />
          </button>
        </div>
      </div>

      {/* Description */}
      <div className="px-4 pb-3">
        <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-relaxed line-clamp-2">
          {nodeData.description}
        </p>
      </div>

      {/* Persona indicator (shows when configured) */}
      {nodeData.persona.goal && (
        <div className="px-4 pb-2">
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--vyne-accent-bg)]">
            <div className="w-1 h-1 rounded-full bg-[var(--vyne-accent)]" />
            <span className="text-[9px] font-semibold text-[var(--vyne-accent)] uppercase tracking-wide">
              Persona configured
            </span>
          </div>
        </div>
      )}

      {/* Tools section */}
      {nodeData.tools.length > 0 && (
        <div className="px-4 pb-3 flex flex-wrap gap-1.5">
          {nodeData.tools.map((tool) => (
            <span
              key={tool}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md
                         bg-[var(--vyne-bg-warm)] text-[10px] font-medium
                         text-[var(--vyne-text-secondary)]"
            >
              {tool}
            </span>
          ))}
        </div>
      )}

      {/* Status footer */}
      <div className="px-4 py-2 border-t border-[var(--vyne-border)] flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              nodeData.status === "idle"
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
        <button
          className="flex items-center gap-0.5 text-[10px] text-[var(--vyne-accent)] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            openConfigPanel(id);
          }}
        >
          Configure <ChevronRight size={10} />
        </button>
      </div>

      {/* Connection handles */}
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

export const AgentNode = memo(AgentNodeComponent);
