"use client";

import { DynamicIcon } from "@/lib/icons";
import { useWorkflowStore } from "@/store/workflow-store";
import { agentTemplates } from "@/lib/agent-templates";
import type { ToolNodeData, VyneNodeData } from "@/lib/types";
import { Sparkles, Check, ArrowRight } from "lucide-react";

export function ToolConfigPanel({ nodeId }: { nodeId: string }) {
  const node = useWorkflowStore((s) => s.nodes.find((n) => n.id === nodeId));
  const nodes = useWorkflowStore((s) => s.nodes);
  const edges = useWorkflowStore((s) => s.edges);

  if (!node) return null;
  const data = node.data as unknown as ToolNodeData;

  // Find agents this tool is connected to
  const connectedAgentIds = edges
    .filter((e) => e.source === nodeId)
    .map((e) => e.target);
  const connectedAgents = nodes.filter(
    (n) =>
      connectedAgentIds.includes(n.id) &&
      (n.data as VyneNodeData).type === "agent"
  );

  // Compatible agent templates
  const compatibleAgents =
    data.compatibleWith.length > 0
      ? agentTemplates.filter((a) => data.compatibleWith.includes(a.id))
      : agentTemplates;

  return (
    <div className="space-y-6">
      {/* Tool info card */}
      <div className="p-4 rounded-xl bg-[var(--vyne-tool-bg)] border border-[var(--vyne-tool)]/20">
        <div className="flex items-center gap-3 mb-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${data.color}20` }}
          >
            <DynamicIcon name={data.icon} size={20} style={{ color: data.color }} />
          </div>
          <div>
            <h4 className="text-[13px] font-semibold text-[var(--vyne-text-primary)]">
              {data.name}
            </h4>
            <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--vyne-tool)]">
              Tool
            </span>
          </div>
        </div>
        <p className="text-[12px] text-[var(--vyne-text-secondary)] leading-relaxed">
          {data.description}
        </p>
      </div>

      {/* Connected agents */}
      <div>
        <h4 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-2">
          Connected Agents
        </h4>
        {connectedAgents.length === 0 ? (
          <div className="p-3 rounded-xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)] text-center">
            <p className="text-[11px] text-[var(--vyne-text-tertiary)]">
              Not connected to any agents yet.
            </p>
            <p className="text-[10px] text-[var(--vyne-text-tertiary)] mt-1">
              Drag from this tool's handle to an agent to equip it.
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {connectedAgents.map((agent) => {
              const agentData = agent.data as VyneNodeData & { name: string; icon: string; color: string };
              return (
                <div
                  key={agent.id}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-white border border-[var(--vyne-border)]"
                >
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${agentData.color}14` }}
                  >
                    <DynamicIcon name={agentData.icon} size={14} style={{ color: agentData.color }} />
                  </div>
                  <span className="text-[11px] font-semibold text-[var(--vyne-text-primary)] flex-1">
                    {agentData.name}
                  </span>
                  <Check size={12} className="text-[var(--vyne-success)]" />
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Compatible agents */}
      <div>
        <h4 className="text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-1">
          {data.compatibleWith.length > 0 ? "Best Used With" : "Works With All Agents"}
        </h4>
        <p className="text-[10px] text-[var(--vyne-text-tertiary)] mb-2">
          {data.compatibleWith.length > 0
            ? "This tool works best with these agent types:"
            : "This is a universal tool that works well with any agent."}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {compatibleAgents.map((agent) => (
            <span
              key={agent.id}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[var(--vyne-bg)] border border-[var(--vyne-border)] text-[10px] font-medium text-[var(--vyne-text-secondary)]"
            >
              <DynamicIcon name={agent.icon} size={10} style={{ color: agent.color }} />
              {agent.name}
            </span>
          ))}
        </div>
      </div>

      {/* Usage tip */}
      <div className="p-3 rounded-xl bg-[var(--vyne-accent-bg)] border border-[var(--vyne-accent)]/10">
        <div className="flex items-start gap-2">
          <Sparkles size={12} className="text-[var(--vyne-accent)] shrink-0 mt-0.5" />
          <div>
            <p className="text-[11px] text-[var(--vyne-accent)] font-semibold mb-1">
              How tools work in Vyne
            </p>
            <p className="text-[10px] text-[var(--vyne-text-secondary)] leading-relaxed">
              Tools give agents new capabilities. Connect this tool to an agent by
              dragging from the <ArrowRight size={8} className="inline" /> handle on
              the right to an agent's left handle. The agent will then be able to use
              this tool when working on tasks.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
