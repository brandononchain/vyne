"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Clock, Users, Zap, Leaf, Search } from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import {
  workflowTemplates,
  templateCategories,
  type WorkflowTemplate,
} from "@/lib/workflow-templates";
import { useDeployStore } from "@/store/deploy-store";
import { TemplatePreviewModal } from "./template-preview-modal";

const complexityConfig = {
  beginner: { label: "Beginner", color: "var(--vyne-success)", bg: "bg-emerald-50" },
  intermediate: { label: "Intermediate", color: "var(--vyne-accent)", bg: "bg-[var(--vyne-accent-bg)]" },
  advanced: { label: "Advanced", color: "var(--vyne-error)", bg: "bg-red-50" },
};

function TemplateCard({
  template,
  onClick,
}: {
  template: WorkflowTemplate;
  onClick: () => void;
}) {
  const cx = complexityConfig[template.complexity];
  const agentCount = template.nodes.filter((n) => (n.data as { type: string }).type === "agent").length;
  const taskCount = template.nodes.filter((n) => (n.data as { type: string }).type === "task").length;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
      onClick={onClick}
      className="group bg-white rounded-2xl border border-[var(--vyne-border)] shadow-[var(--shadow-sm)]
                 hover:shadow-[var(--shadow-md)] hover:border-[var(--vyne-border-hover)]
                 transition-all duration-200 cursor-pointer overflow-hidden"
    >
      {/* Color accent */}
      <div className="h-1" style={{ backgroundColor: template.color }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${template.color}12` }}
          >
            <DynamicIcon name={template.icon} size={22} style={{ color: template.color }} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-[14px] font-bold text-[var(--vyne-text-primary)] mb-0.5 group-hover:text-[var(--vyne-accent)] transition-colors">
              {template.name}
            </h3>
            <div className="flex items-center gap-2">
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold ${cx.bg}`}
                style={{ color: cx.color }}
              >
                {cx.label}
              </span>
              <span className="inline-flex items-center gap-1 text-[9px] text-[var(--vyne-text-tertiary)]">
                <Clock size={9} />
                Saves {template.timeSaved}
              </span>
            </div>
          </div>
        </div>

        {/* Description */}
        <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-relaxed mb-3 line-clamp-2">
          {template.description}
        </p>

        {/* Footer stats */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--vyne-text-tertiary)]">
              <Users size={10} />
              {agentCount} agent{agentCount !== 1 ? "s" : ""}
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-[var(--vyne-text-tertiary)]">
              <Zap size={10} />
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </span>
          </div>
          <span className="flex items-center gap-1 text-[10px] font-semibold text-[var(--vyne-accent)] opacity-0 group-hover:opacity-100 transition-opacity">
            Preview <ArrowRight size={10} />
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export function TemplateGallery() {
  const { setCurrentView } = useDeployStore();
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [previewTemplate, setPreviewTemplate] = useState<WorkflowTemplate | null>(null);

  const filtered = workflowTemplates.filter((t) => {
    const matchesCategory = categoryFilter === "all" || t.category === categoryFilter;
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.tags.some((tag) => tag.includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--vyne-bg)] overflow-hidden">
      {/* Header */}
      <header className="h-[var(--topbar-height)] bg-white border-b border-[var(--vyne-border)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-[var(--vyne-accent)] flex items-center justify-center">
            <span className="text-white text-[11px] font-black">V</span>
          </div>
          <div>
            <h1 className="text-[13px] font-bold text-[var(--vyne-text-primary)] leading-none">Vyne</h1>
            <p className="text-[10px] text-[var(--vyne-text-tertiary)]">Templates</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentView("canvas")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-[var(--vyne-border)]
                       text-[12px] font-medium text-[var(--vyne-text-secondary)]
                       hover:bg-[var(--vyne-bg-warm)] transition-colors"
          >
            Start from Scratch
            <ArrowRight size={12} />
          </button>
          <button
            onClick={() => setCurrentView("dashboard")}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg
                       text-[12px] font-medium text-[var(--vyne-text-tertiary)]
                       hover:bg-[var(--vyne-bg-warm)] transition-colors"
          >
            Dashboard
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-[960px] mx-auto px-6 py-8">
          {/* Hero */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
              <Leaf size={24} className="text-[var(--vyne-accent)]" />
            </div>
            <h2 className="text-[26px] font-bold text-[var(--vyne-text-primary)] mb-2">
              Start with a Template
            </h2>
            <p className="text-[14px] text-[var(--vyne-text-secondary)] max-w-[480px] mx-auto leading-relaxed">
              Pre-built agent workflows you can customize and deploy in minutes. Choose one, preview the flow, and make it yours.
            </p>
          </div>

          {/* Search + filters */}
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1 max-w-[320px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--vyne-text-tertiary)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search templates..."
                className="w-full pl-9 pr-3 py-2 rounded-xl bg-white border border-[var(--vyne-border)]
                           text-[12px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                           focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                           transition-all"
              />
            </div>

            <div className="flex items-center gap-1 p-1 rounded-xl bg-[var(--vyne-bg-warm)]">
              {templateCategories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap ${
                    categoryFilter === cat.id
                      ? "bg-white text-[var(--vyne-text-primary)] shadow-sm border border-[var(--vyne-border)]"
                      : "text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 gap-4">
            {filtered.map((t, i) => (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <TemplateCard
                  template={t}
                  onClick={() => setPreviewTemplate(t)}
                />
              </motion.div>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-16">
              <p className="text-[13px] text-[var(--vyne-text-tertiary)]">
                No templates match your search. Try a different keyword.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Preview modal */}
      <TemplatePreviewModal
        template={previewTemplate}
        onClose={() => setPreviewTemplate(null)}
      />
    </div>
  );
}
