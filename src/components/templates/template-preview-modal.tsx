"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  Clock,
  Users,
  Zap,
  Wrench,
  Sparkles,
} from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import type { WorkflowTemplate } from "@/lib/workflow-templates";
import type { VyneNodeData, AgentNodeData, TaskNodeData } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflow-store";
import { useDeployStore } from "@/store/deploy-store";

// ── Miniature node graph preview (read-only) ─────────────────────────
function MiniGraph({ template }: { template: WorkflowTemplate }) {
  // Scale down positions to fit in preview
  const allX = template.nodes.map((n) => n.position.x);
  const allY = template.nodes.map((n) => n.position.y);
  const minX = Math.min(...allX);
  const maxX = Math.max(...allX);
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;

  const width = 400;
  const height = 140;
  const padX = 50;
  const padY = 30;

  const scaled = template.nodes.map((n) => ({
    ...n,
    sx: padX + ((n.position.x - minX) / rangeX) * (width - padX * 2),
    sy: padY + ((n.position.y - minY) / rangeY) * (height - padY * 2),
  }));

  const nodeMap = new Map(scaled.map((n) => [n.id, n]));

  return (
    <svg width={width} height={height} className="w-full">
      {/* Edges */}
      {template.edges.map((edge) => {
        const src = nodeMap.get(edge.source);
        const tgt = nodeMap.get(edge.target);
        if (!src || !tgt) return null;
        return (
          <g key={edge.id}>
            <line
              x1={src.sx + 20}
              y1={src.sy}
              x2={tgt.sx - 20}
              y2={tgt.sy}
              stroke="var(--vyne-border-hover)"
              strokeWidth={1.5}
              strokeDasharray="4 3"
            />
            {/* Arrow head */}
            <circle
              cx={tgt.sx - 20}
              cy={tgt.sy}
              r={2.5}
              fill="var(--vyne-accent)"
            />
          </g>
        );
      })}

      {/* Nodes */}
      {scaled.map((n) => {
        const data = n.data as VyneNodeData;
        const isAgent = data.type === "agent";
        return (
          <g key={n.id}>
            <rect
              x={n.sx - 20}
              y={n.sy - 14}
              width={40}
              height={28}
              rx={8}
              fill="white"
              stroke={(data as AgentNodeData).color || "var(--vyne-border)"}
              strokeWidth={1.5}
            />
            <text
              x={n.sx}
              y={n.sy + 3}
              textAnchor="middle"
              fontSize={8}
              fontWeight={600}
              fill="var(--vyne-text-secondary)"
            >
              {data.name.split(" ")[0]}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Node list ────────────────────────────────────────────────────────
function NodeList({ template }: { template: WorkflowTemplate }) {
  return (
    <div className="space-y-1.5">
      {template.nodes.map((n, i) => {
        const data = n.data as VyneNodeData;
        const nd = data as AgentNodeData | TaskNodeData;
        return (
          <div key={n.id} className="flex items-center gap-2.5 p-2 rounded-lg bg-[var(--vyne-bg)]">
            <div className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold text-[var(--vyne-text-tertiary)] bg-white border border-[var(--vyne-border)]">
              {i + 1}
            </div>
            <div
              className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: `${nd.color}14` }}
            >
              <DynamicIcon name={nd.icon} size={12} style={{ color: nd.color }} />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[11px] font-semibold text-[var(--vyne-text-primary)]">{nd.name}</span>
              <span className="text-[9px] text-[var(--vyne-text-tertiary)] ml-1.5 uppercase tracking-wider font-bold">
                {data.type}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────
export function TemplatePreviewModal({
  template,
  onClose,
}: {
  template: WorkflowTemplate | null;
  onClose: () => void;
}) {
  const loadTemplate = useWorkflowStore((s) => s.loadTemplate);
  const { setCurrentView } = useDeployStore();

  if (!template) return null;

  const agentCount = template.nodes.filter((n) => (n.data as VyneNodeData).type === "agent").length;
  const taskCount = template.nodes.filter((n) => (n.data as VyneNodeData).type === "task").length;
  const cx = {
    beginner: { label: "Beginner", color: "var(--vyne-success)" },
    intermediate: { label: "Intermediate", color: "var(--vyne-accent)" },
    advanced: { label: "Advanced", color: "var(--vyne-error)" },
  }[template.complexity];

  const handleUse = () => {
    loadTemplate(template.nodes, template.edges);
    onClose();
    setCurrentView("canvas");
  };

  return (
    <AnimatePresence>
      {template && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61]
                       w-[520px] bg-white rounded-2xl border border-[var(--vyne-border)]
                       shadow-[var(--shadow-lg)] overflow-hidden"
          >
            {/* Color bar */}
            <div className="h-1" style={{ backgroundColor: template.color }} />

            {/* Header */}
            <div className="px-6 pt-5 pb-3 flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${template.color}12` }}
                >
                  <DynamicIcon name={template.icon} size={22} style={{ color: template.color }} />
                </div>
                <div>
                  <h3 className="text-[16px] font-bold text-[var(--vyne-text-primary)] mb-1">
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ color: cx.color, backgroundColor: `${cx.color}14` }}>
                      {cx.label}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-[var(--vyne-text-tertiary)]">
                      <Clock size={9} /> Saves {template.timeSaved}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-[var(--vyne-text-tertiary)]">
                      <Users size={9} /> {agentCount} agents
                    </span>
                    <span className="inline-flex items-center gap-1 text-[9px] text-[var(--vyne-text-tertiary)]">
                      <Zap size={9} /> {taskCount} tasks
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Description */}
            <div className="px-6 pb-4">
              <p className="text-[12px] text-[var(--vyne-text-secondary)] leading-relaxed">
                {template.description}
              </p>
            </div>

            {/* Mini graph preview */}
            <div className="mx-6 mb-4 p-4 rounded-xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)]">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--vyne-text-tertiary)] mb-2">
                Workflow Preview
              </p>
              <MiniGraph template={template} />
            </div>

            {/* Node list */}
            <div className="px-6 pb-3">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--vyne-text-tertiary)] mb-2">
                Workflow Steps
              </p>
              <NodeList template={template} />
            </div>

            {/* Tools required */}
            <div className="px-6 pb-4">
              <p className="text-[9px] font-semibold uppercase tracking-wider text-[var(--vyne-text-tertiary)] mb-2">
                Tools Used
              </p>
              <div className="flex flex-wrap gap-1.5">
                {template.tools.map((tool) => (
                  <span
                    key={tool}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[var(--vyne-tool-bg)] text-[10px] font-medium text-[var(--vyne-text-secondary)]"
                  >
                    <Wrench size={9} className="text-[var(--vyne-tool)]" />
                    {tool}
                  </span>
                ))}
              </div>
            </div>

            {/* Action */}
            <div className="px-6 pb-5">
              <button
                onClick={handleUse}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                           bg-[var(--vyne-accent)] text-white text-[13px] font-semibold
                           hover:opacity-90 transition-opacity shadow-md"
              >
                <Sparkles size={15} />
                Use This Template
                <ArrowRight size={14} />
              </button>
              <p className="text-[10px] text-[var(--vyne-text-tertiary)] text-center mt-2">
                This will load the template onto your canvas. You can fully customize it afterward.
              </p>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
