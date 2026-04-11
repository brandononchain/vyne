"use client";

import { memo, useState } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, Settings, ChevronDown, ChevronUp, Copy, Check } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import type { OutputNodeData } from "@/lib/types";

function OutputNodeComponent({ id, data, selected }: NodeProps) {
  const nodeData = data as unknown as OutputNodeData;
  const removeNode = useWorkflowStore((s) => s.removeNode);
  const openConfigPanel = useWorkflowStore((s) => s.openConfigPanel);
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const hasOutput = nodeData.lastOutput && nodeData.lastOutput.length > 0;

  const copyOutput = () => {
    if (nodeData.lastOutput) {
      navigator.clipboard.writeText(nodeData.lastOutput);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: "spring", stiffness: 280, damping: 24 }}
      className={`group relative w-[260px] rounded-2xl transition-all duration-300 cursor-grab active:cursor-grabbing
        ${selected ? "shadow-[0_0_20px_rgba(74,124,89,0.25)] ring-2 ring-emerald-200/30" : "shadow-[var(--shadow-md)] hover:shadow-[var(--shadow-lg)]"}`}
    >
      <div className="absolute inset-0 rounded-2xl p-[1.5px]"
        style={{ background: selected ? `linear-gradient(135deg, ${nodeData.color}80, ${nodeData.color}30)` : `linear-gradient(135deg, ${nodeData.color}40, ${nodeData.color}15)` }}>
        <div className="w-full h-full rounded-[15px] bg-white" />
      </div>

      <div className="relative z-10 p-4">
        <div className="flex items-center gap-1.5 mb-3">
          <span className="text-[8px] font-black uppercase tracking-[0.15em] px-2 py-0.5 rounded-full"
            style={{ backgroundColor: nodeData.color + "15", color: nodeData.color }}>
            Output
          </span>
          {hasOutput && (
            <span className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600">
              Has Data
            </span>
          )}
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
            <p className="text-[9px] text-[var(--vyne-text-tertiary)]">{nodeData.outputType}</p>
          </div>
        </div>

        <p className="text-[10px] text-[var(--vyne-text-secondary)] leading-relaxed line-clamp-2">{nodeData.description}</p>

        {/* Output preview panel */}
        {hasOutput && (
          <div className="mt-3 border-t border-[var(--vyne-border)] pt-2">
            <button
              onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}
              className="w-full flex items-center justify-between text-[9px] font-semibold text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] transition-colors"
            >
              <span>Preview Output</span>
              {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
            </button>

            <AnimatePresence>
              {expanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="mt-2 relative">
                    <div className="max-h-[120px] overflow-y-auto rounded-lg bg-[var(--vyne-bg)] border border-[var(--vyne-border)] p-2.5">
                      <pre className="text-[9px] text-[var(--vyne-text-secondary)] whitespace-pre-wrap font-mono leading-relaxed">
                        {nodeData.lastOutput?.slice(0, 500)}{(nodeData.lastOutput?.length || 0) > 500 && "..."}
                      </pre>
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); copyOutput(); }}
                      className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center bg-white/80 border border-[var(--vyne-border)] text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] transition-colors">
                      {copied ? <Check size={9} /> : <Copy size={9} />}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Only input handle — outputs are endpoints */}
      <Handle type="target" position={Position.Left} className="!w-2.5 !h-2.5 !rounded-full !border-2"
        style={{ backgroundColor: "white", borderColor: nodeData.color, left: -5 }} />
    </motion.div>
  );
}

export const OutputNode = memo(OutputNodeComponent);
