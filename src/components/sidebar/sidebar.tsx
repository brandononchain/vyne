"use client";

import { useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  Sparkles,
  GripVertical,
} from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import {
  agentTemplates,
  categoryLabels,
  categoryOrder,
} from "@/lib/agent-templates";
import type { AgentTemplate } from "@/lib/types";
import { useWorkflowStore } from "@/store/workflow-store";

function TemplateCard({ template }: { template: AgentTemplate }) {
  const onboardingStep = useWorkflowStore((s) => s.onboardingStep);

  const onDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData(
      "application/vyne-agent",
      JSON.stringify(template)
    );
    e.dataTransfer.effectAllowed = "move";
  };

  const isHighlighted =
    (onboardingStep === "welcome" || onboardingStep === "drag-agent") &&
    template.id === "web-researcher";

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        group relative flex items-start gap-3 p-3 rounded-xl cursor-grab
        active:cursor-grabbing transition-all duration-200
        border border-transparent
        hover:bg-white hover:border-[var(--vyne-border)] hover:shadow-[var(--shadow-sm)]
        ${isHighlighted ? "bg-[var(--vyne-accent-bg)] border-[var(--vyne-accent-light)] animate-pulse-glow" : ""}
      `}
    >
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical size={14} className="text-[var(--vyne-text-tertiary)]" />
      </div>

      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${template.color}14` }}
      >
        <DynamicIcon
          name={template.icon}
          size={18}
          style={{ color: template.color }}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate">
          {template.name}
        </h4>
        <p className="text-[11px] text-[var(--vyne-text-tertiary)] leading-snug line-clamp-2 mt-0.5">
          {template.description}
        </p>
      </div>
    </div>
  );
}

function CategorySection({
  category,
  templates,
}: {
  category: string;
  templates: AgentTemplate[];
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-3 py-2 text-[11px] font-semibold
                   uppercase tracking-wider text-[var(--vyne-text-tertiary)]
                   hover:text-[var(--vyne-text-secondary)] transition-colors"
      >
        <ChevronDown
          size={12}
          className={`transition-transform duration-200 ${
            expanded ? "" : "-rotate-90"
          }`}
        />
        {category}
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="space-y-0.5 pb-2">
              {templates.map((t) => (
                <TemplateCard key={t.id} template={t} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const sidebarOpen = useWorkflowStore((s) => s.sidebarOpen);

  const filteredTemplates = agentTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const grouped = categoryOrder
    .map((cat) => ({
      category: categoryLabels[cat],
      templates: filteredTemplates.filter((t) => t.category === cat),
    }))
    .filter((g) => g.templates.length > 0);

  return (
    <AnimatePresence>
      {sidebarOpen && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: "var(--sidebar-width)", opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="h-full bg-[var(--vyne-bg-warm)] border-r border-[var(--vyne-border)]
                     flex flex-col overflow-hidden shrink-0"
        >
          {/* Header */}
          <div className="p-4 pb-3">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-[var(--vyne-accent)]" />
              <h2 className="text-[13px] font-bold text-[var(--vyne-text-primary)]">
                Hire Your Team
              </h2>
            </div>
            <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-relaxed mb-3">
              Drag an agent onto the canvas to add them to your workflow team.
            </p>

            {/* Search */}
            <div className="relative">
              <Search
                size={14}
                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--vyne-text-tertiary)]"
              />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-[var(--vyne-border)]
                           text-[12px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                           focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                           transition-all"
              />
            </div>
          </div>

          {/* Templates list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {grouped.map((g) => (
              <CategorySection
                key={g.category}
                category={g.category}
                templates={g.templates}
              />
            ))}
          </div>

          {/* Footer hint */}
          <div className="p-3 border-t border-[var(--vyne-border)]">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[var(--vyne-accent-bg)]">
              <Sparkles size={12} className="text-[var(--vyne-accent)] shrink-0" />
              <p className="text-[10px] text-[var(--vyne-accent)] font-medium leading-snug">
                Pro tip: Connect agents together to create multi-step workflows
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
