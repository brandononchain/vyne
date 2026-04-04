"use client";

import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion } from "framer-motion";
import { Trash2, Settings, ChevronRight, Leaf } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import type { AgentNodeData } from "@/lib/types";

function AgentNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const openConfigPanel = useWorkflowStore((s) => s.openConfigPanel);
  const isSimulating = useWorkflowStore((s) => s.isSimulating);
  const isActiveInSim = useWorkflowStore((s) => s.simulationActiveNodeId === id);

  const isComplete = nodeData.status === "complete";

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: isActiveInSim ? 1.03 : 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`
        group relative w-[272px] rounded-[20px] overflow-hidden
        transition-all duration-300 cursor-grab active:cursor-grabbing
        ${isActiveInSim ? "shadow-[0_0_28px_rgba(74,124,89,0.30)] ring-2 ring-[var(--vyne-accent)]/25" : ""}
        ${isComplete && isSimulating ? "shadow-[0_0_20px_rgba(90,158,111,0.20)]" : ""}
        ${!isActiveInSim && !isComplete && selected ? "shadow-[var(--shadow-glow)] ring-2 ring-[var(--vyne-accent)]/15" : ""}
        ${!isActiveInSim && !isComplete && !selected ? "shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]" : ""}
        ${isSimulating ? "cursor-default" : ""}
      `}
    >
      {/* Gradient border effect */}
      <div
        className="absolute inset-0 rounded-[20px] p-[1.5px]"
        style={{
          background: isActiveInSim || selected
            ? `linear-gradient(135deg, ${nodeData.color}80, ${nodeData.color}30, ${nodeData.color}60)`
            : "linear-gradient(135deg, var(--vyne-border), var(--vyne-border-hover))",
        }}
      >
        <div className="w-full h-full rounded-[19px] bg-white" />
      </div>

      <div className="relative z-10">
        {/* Tinted header */}
        <div
          className="px-4 pt-4 pb-3"
          style={{ background: `linear-gradient(180deg, ${nodeData.color}06 0%, transparent 100%)` }}
        >
          <div className="flex items-start gap-3">
            <div className="relative">
              <div
                className="w-11 h-11 rounded-[14px] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105"
                style={{
                  background: `linear-gradient(135deg, ${nodeData.color}18, ${nodeData.color}08)`,
                  boxShadow: `0 2px 8px ${nodeData.color}12`,
                }}
              >
                <DynamicIcon name={nodeData.icon} size={20} style={{ color: nodeData.color }} />
              </div>
              {isActiveInSim && (
                <div className="absolute inset-0 rounded-[14px] animate-ping opacity-20" style={{ backgroundColor: nodeData.color }} />
              )}
            </div>

            <div className="flex-1 min-w-0 pt-0.5">
              <h3 className="text-[13.5px] font-semibold text-[var(--vyne-text-primary)] truncate leading-tight tracking-[-0.01em]">
                {nodeData.name}
              </h3>
              <p className="text-[11px] text-[var(--vyne-text-tertiary)] font-medium mt-0.5">
                {nodeData.role}
              </p>
            </div>

            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all duration-200 -translate-y-0.5 group-hover:translate-y-0">
              <button
                className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-accent)] hover:bg-[var(--vyne-accent-bg)] transition-all"
                onClick={(e) => { e.stopPropagation(); openConfigPanel(id); }}
                title="Configure agent"
              >
                <Settings size={13} />
              </button>
              <button
                className="w-7 h-7 rounded-[10px] flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)] hover:bg-red-50/80 transition-all"
                onClick={(e) => { e.stopPropagation(); removeNode(id); }}
                title="Delete agent"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        </div>

        <div className="px-4 pb-3">
          <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-[1.55] line-clamp-2">{nodeData.description}</p>
        </div>

        {nodeData.persona.goal && (
          <div className="px-4 pb-2.5">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[10px] bg-[var(--vyne-accent-bg)]/60">
              <Leaf size={9} className="text-[var(--vyne-accent)]" />
              <span className="text-[9px] font-semibold text-[var(--vyne-accent)] uppercase tracking-wider">Persona configured</span>
            </div>
          </div>
        )}

        {nodeData.tools.length > 0 && (
          <div className="px-4 pb-3 flex flex-wrap gap-1.5">
            {nodeData.tools.map((tool) => (
              <span key={tool} className="inline-flex items-center px-2 py-[3px] rounded-lg bg-[var(--vyne-bg)] border border-[var(--vyne-border)] text-[9.5px] font-medium text-[var(--vyne-text-secondary)] hover:border-[var(--vyne-border-hover)] transition-colors">
                {tool}
              </span>
            ))}
          </div>
        )}

        {/* Status footer — inset card */}
        <div className="mx-3 mb-3 px-3 py-2 rounded-[12px] bg-[var(--vyne-bg)]/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative flex items-center justify-center w-4 h-4">
              <div className={`w-[6px] h-[6px] rounded-full ${nodeData.status === "idle" ? "bg-[var(--vyne-text-tertiary)]" : nodeData.status === "running" ? "bg-[var(--vyne-success)]" : nodeData.status === "complete" ? "bg-[var(--vyne-success)]" : "bg-[var(--vyne-error)]"}`} />
              {nodeData.status === "running" && <div className="absolute inset-0 rounded-full border-2 border-[var(--vyne-success)] animate-ping opacity-30" />}
            </div>
            <span className="text-[10px] text-[var(--vyne-text-tertiary)] capitalize font-medium">{nodeData.status}</span>
          </div>
          <button className="flex items-center gap-0.5 text-[10px] text-[var(--vyne-accent)] font-semibold opacity-0 group-hover:opacity-100 transition-all hover:gap-1" onClick={(e) => { e.stopPropagation(); openConfigPanel(id); }}>
            Configure <ChevronRight size={10} />
          </button>
        </div>
      </div>

      <Handle type="target" position={Position.Left} className="!w-[10px] !h-[10px] !-left-[5px] !bg-[var(--vyne-border-hover)] !border-2 !border-white hover:!bg-[var(--vyne-accent)] !transition-colors" />
      <Handle type="source" position={Position.Right} className="!w-[10px] !h-[10px] !-right-[5px] !bg-[var(--vyne-border-hover)] !border-2 !border-white hover:!bg-[var(--vyne-accent)] !transition-colors" />
    </motion.div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
