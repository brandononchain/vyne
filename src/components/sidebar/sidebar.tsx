"use client";

import { useState, type DragEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  ChevronDown,
  Leaf,
  GripVertical,
  Users,
  Zap,
  Wrench,
  Radio,
  Bolt,
  FileOutput,
} from "lucide-react";
import { DynamicIcon } from "@/lib/icons";
import {
  agentTemplates,
  agentCategoryLabels,
  agentCategoryOrder,
  taskTemplates,
  taskCategoryLabels,
  taskCategoryOrder,
  toolTemplates,
  toolCategoryLabels,
  toolCategoryOrder,
  triggerTemplates,
  triggerCategoryLabels,
  triggerCategoryOrder,
  actionTemplates,
  actionCategoryLabels,
  actionCategoryOrder,
  outputTemplates,
  outputCategoryLabels,
  outputCategoryOrder,
} from "@/lib/agent-templates";
import type {
  AgentTemplate,
  TaskTemplate,
  ToolTemplate,
  TriggerTemplate,
  ActionTemplate,
  OutputTemplate,
  DragPayload,
} from "@/lib/types";
import { useWorkflowStore } from "@/store/workflow-store";

// ── Drag data serializer ─────────────────────────────────────────────
const DRAG_KEY = "application/vyne-node";

function encodeDrag(payload: DragPayload): string {
  return JSON.stringify(payload);
}

// ── Generic draggable card ───────────────────────────────────────────
function DraggableCard({
  label: _label,
  name,
  description,
  icon,
  color,
  badge,
  badgeColor,
  highlighted,
  onDragStart,
}: {
  label?: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  badge?: string;
  badgeColor?: string;
  highlighted?: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      className={`
        group relative flex items-start gap-3 p-3 rounded-xl cursor-grab
        active:cursor-grabbing transition-all duration-200
        border border-transparent
        hover:bg-white hover:border-[var(--vyne-border)] hover:shadow-[var(--shadow-sm)]
        active:scale-[0.97] active:shadow-md
        ${highlighted ? "bg-[var(--vyne-accent-bg)] border-[var(--vyne-accent-light)] animate-pulse-glow" : ""}
      `}
    >
      <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-40 transition-opacity">
        <GripVertical size={14} className="text-[var(--vyne-text-tertiary)]" />
      </div>

      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}14` }}
      >
        <DynamicIcon name={icon} size={18} style={{ color }} />
      </div>

      <div className="flex-1 min-w-0">
        {badge && (
          <span
            className="inline-block text-[8px] font-bold uppercase tracking-widest mb-0.5 px-1.5 py-px rounded"
            style={{ color: badgeColor, backgroundColor: `${badgeColor}14` }}
          >
            {badge}
          </span>
        )}
        <h4 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate">
          {name}
        </h4>
        <p className="text-[11px] text-[var(--vyne-text-tertiary)] leading-snug line-clamp-2 mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}

// ── Collapsible category section ─────────────────────────────────────
function CategorySection({
  category,
  children,
}: {
  category: string;
  children: React.ReactNode;
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
            <div className="space-y-0.5 pb-2">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Tab content: Agents ──────────────────────────────────────────────
function AgentsTab({ query }: { query: string }) {
  const onboardingStep = useWorkflowStore((s) => s.onboardingStep);

  const filtered = agentTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = agentCategoryOrder
    .map((cat) => ({
      category: agentCategoryLabels[cat],
      templates: filtered.filter((t) => t.category === cat),
    }))
    .filter((g) => g.templates.length > 0);

  return (
    <>
      {grouped.map((g) => (
        <CategorySection key={g.category} category={g.category}>
          {g.templates.map((t) => (
            <DraggableCard
              key={t.id}
              name={t.name}
              description={t.description}
              icon={t.icon}
              color={t.color}
              highlighted={
                (onboardingStep === "welcome" || onboardingStep === "drag-agent") &&
                t.id === "web-researcher"
              }
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_KEY, encodeDrag({ kind: "agent", template: t }));
                e.dataTransfer.effectAllowed = "move";
              }}
            />
          ))}
        </CategorySection>
      ))}
    </>
  );
}

// ── Tab content: Tasks ───────────────────────────────────────────────
function TasksTab({ query }: { query: string }) {
  const filtered = taskTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = taskCategoryOrder
    .map((cat) => ({
      category: taskCategoryLabels[cat],
      templates: filtered.filter((t) => t.category === cat),
    }))
    .filter((g) => g.templates.length > 0);

  return (
    <>
      {grouped.map((g) => (
        <CategorySection key={g.category} category={g.category}>
          {g.templates.map((t) => (
            <DraggableCard
              key={t.id}
              name={t.name}
              description={t.description}
              icon={t.icon}
              color={t.color}
              badge="Task"
              badgeColor="var(--vyne-task)"
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_KEY, encodeDrag({ kind: "task", template: t }));
                e.dataTransfer.effectAllowed = "move";
              }}
            />
          ))}
        </CategorySection>
      ))}
    </>
  );
}

// ── Tab content: Tools ───────────────────────────────────────────────
function ToolsTab({ query }: { query: string }) {
  const filtered = toolTemplates.filter(
    (t) =>
      t.name.toLowerCase().includes(query.toLowerCase()) ||
      t.description.toLowerCase().includes(query.toLowerCase())
  );

  const grouped = toolCategoryOrder
    .map((cat) => ({
      category: toolCategoryLabels[cat],
      templates: filtered.filter((t) => t.category === cat),
    }))
    .filter((g) => g.templates.length > 0);

  return (
    <>
      {grouped.map((g) => (
        <CategorySection key={g.category} category={g.category}>
          {g.templates.map((t) => (
            <DraggableCard
              key={t.id}
              name={t.name}
              description={t.description}
              icon={t.icon}
              color={t.color}
              badge="Tool"
              badgeColor="var(--vyne-tool)"
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_KEY, encodeDrag({ kind: "tool", template: t }));
                e.dataTransfer.effectAllowed = "move";
              }}
            />
          ))}
        </CategorySection>
      ))}
    </>
  );
}

// ── Tab button ───────────────────────────────────────────────────────
function TabButton({
  active,
  icon,
  label,
  count,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  count: number;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg
        text-[11px] font-semibold transition-all duration-150
        ${
          active
            ? "bg-white text-[var(--vyne-text-primary)] shadow-[var(--shadow-sm)] border border-[var(--vyne-border)]"
            : "text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]"
        }
      `}
    >
      {icon}
      {label}
      <span
        className={`text-[9px] px-1 py-px rounded ${
          active
            ? "bg-[var(--vyne-accent-bg)] text-[var(--vyne-accent)]"
            : "bg-[var(--vyne-bg-warm)] text-[var(--vyne-text-tertiary)]"
        }`}
      >
        {count}
      </span>
    </button>
  );
}

// ── Tab content: Triggers ────────────────────────────────────────────
function TriggersTab({ query }: { query: string }) {
  const filtered = triggerTemplates.filter(
    (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.description.toLowerCase().includes(query.toLowerCase())
  );
  const grouped = triggerCategoryOrder
    .map((cat) => ({ category: triggerCategoryLabels[cat], templates: filtered.filter((t) => t.category === cat) }))
    .filter((g) => g.templates.length > 0);

  return (
    <>
      {grouped.map((g) => (
        <CategorySection key={g.category} category={g.category}>
          {g.templates.map((t) => (
            <DraggableNodeCard key={t.id} name={t.name} description={t.description} icon={t.icon} color={t.color}
              badge="Trigger" badgeColor="#6c5ce7"
              onDragStart={(e) => { e.dataTransfer.setData(DRAG_KEY, encodeDrag({ kind: "trigger", template: t })); e.dataTransfer.effectAllowed = "move"; }} />
          ))}
        </CategorySection>
      ))}
    </>
  );
}

// ── Tab content: Actions ─────────────────────────────────────────────
function ActionsTab({ query }: { query: string }) {
  const filtered = actionTemplates.filter(
    (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.description.toLowerCase().includes(query.toLowerCase())
  );
  const grouped = actionCategoryOrder
    .map((cat) => ({ category: actionCategoryLabels[cat], templates: filtered.filter((t) => t.category === cat) }))
    .filter((g) => g.templates.length > 0);

  return (
    <>
      {grouped.map((g) => (
        <CategorySection key={g.category} category={g.category}>
          {g.templates.map((t) => (
            <DraggableNodeCard key={t.id} name={t.name} description={t.description} icon={t.icon} color={t.color}
              badge="Action" badgeColor="#0984e3"
              onDragStart={(e) => { e.dataTransfer.setData(DRAG_KEY, encodeDrag({ kind: "action", template: t })); e.dataTransfer.effectAllowed = "move"; }} />
          ))}
        </CategorySection>
      ))}
    </>
  );
}

// ── Tab content: Outputs ─────────────────────────────────────────────
function OutputsTab({ query }: { query: string }) {
  const filtered = outputTemplates.filter(
    (t) => t.name.toLowerCase().includes(query.toLowerCase()) || t.description.toLowerCase().includes(query.toLowerCase())
  );
  const grouped = outputCategoryOrder
    .map((cat) => ({ category: outputCategoryLabels[cat], templates: filtered.filter((t) => t.category === cat) }))
    .filter((g) => g.templates.length > 0);

  return (
    <>
      {grouped.map((g) => (
        <CategorySection key={g.category} category={g.category}>
          {g.templates.map((t) => (
            <DraggableNodeCard key={t.id} name={t.name} description={t.description} icon={t.icon} color={t.color}
              badge="Output" badgeColor="#4a7c59"
              onDragStart={(e) => { e.dataTransfer.setData(DRAG_KEY, encodeDrag({ kind: "output", template: t })); e.dataTransfer.effectAllowed = "move"; }} />
          ))}
        </CategorySection>
      ))}
    </>
  );
}

// ── Sidebar tips per tab ─────────────────────────────────────────────
const tabTips: Record<string, string> = {
  agents: "Pro tip: Connect agents together to create multi-step relay workflows.",
  tasks: "Pro tip: Chain tasks between agents to define exactly what each team member does.",
  tools: "Pro tip: Connect a tool to an agent to expand their capabilities.",
  triggers: "Triggers are workflow entry points — they start execution automatically.",
  actions: "Actions integrate with external services and control workflow flow.",
  outputs: "Outputs deliver your results — preview, email, save, or send anywhere.",
};

// ── Main Sidebar component ───────────────────────────────────────────
export function Sidebar() {
  const [searchQuery, setSearchQuery] = useState("");
  const { sidebarOpen, sidebarTab, setSidebarTab } = useWorkflowStore();

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
              <Leaf size={16} className="text-[var(--vyne-accent)]" />
              <h2 className="text-[13px] font-bold text-[var(--vyne-text-primary)]">
                Build Your Workflow
              </h2>
            </div>

            {/* Tab bar — two rows */}
            <div className="space-y-1 mb-3">
              <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--vyne-bg)]">
                <TabButton active={sidebarTab === "agents"} icon={<Users size={11} />} label="Agents"
                  count={agentTemplates.length} onClick={() => setSidebarTab("agents")} />
                <TabButton active={sidebarTab === "tasks"} icon={<Zap size={11} />} label="Tasks"
                  count={taskTemplates.length} onClick={() => setSidebarTab("tasks")} />
                <TabButton active={sidebarTab === "tools"} icon={<Wrench size={11} />} label="Tools"
                  count={toolTemplates.length} onClick={() => setSidebarTab("tools")} />
              </div>
              <div className="flex gap-1 p-0.5 rounded-xl bg-[var(--vyne-bg)]">
                <TabButton active={sidebarTab === "triggers"} icon={<Radio size={11} />} label="Triggers"
                  count={triggerTemplates.length} onClick={() => setSidebarTab("triggers")} />
                <TabButton active={sidebarTab === "actions"} icon={<Bolt size={11} />} label="Actions"
                  count={actionTemplates.length} onClick={() => setSidebarTab("actions")} />
                <TabButton active={sidebarTab === "outputs"} icon={<FileOutput size={11} />} label="Outputs"
                  count={outputTemplates.length} onClick={() => setSidebarTab("outputs")} />
              </div>
            </div>

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
                placeholder={`Search ${sidebarTab}...`}
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-white border border-[var(--vyne-border)]
                           text-[12px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                           focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                           transition-all"
              />
            </div>
          </div>

          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            <AnimatePresence mode="wait">
              <motion.div
                key={sidebarTab}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={{ duration: 0.15 }}
              >
                {sidebarTab === "agents" && <AgentsTab query={searchQuery} />}
                {sidebarTab === "tasks" && <TasksTab query={searchQuery} />}
                {sidebarTab === "tools" && <ToolsTab query={searchQuery} />}
                {sidebarTab === "triggers" && <TriggersTab query={searchQuery} />}
                {sidebarTab === "actions" && <ActionsTab query={searchQuery} />}
                {sidebarTab === "outputs" && <OutputsTab query={searchQuery} />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer hint */}
          <div className="p-3 border-t border-[var(--vyne-border)]">
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-[var(--vyne-accent-bg)]">
              <Leaf size={12} className="text-[var(--vyne-accent)] shrink-0" />
              <p className="text-[10px] text-[var(--vyne-accent)] font-medium leading-snug">
                {tabTips[sidebarTab]}
              </p>
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
