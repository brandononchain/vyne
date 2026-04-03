"use client";

import { useCallback, useRef, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  BackgroundVariant,
  useReactFlow,
} from "@xyflow/react";
import { useWorkflowStore } from "@/store/workflow-store";
import { AgentNode } from "./agent-node";
import { OnboardingWizard } from "../onboarding/onboarding-wizard";
import type { AgentTemplate } from "@/lib/types";

const nodeTypes = {
  agentNode: AgentNode,
};

function EmptyCanvasPrompt() {
  const onboardingDismissed = useWorkflowStore((s) => s.onboardingDismissed);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center animate-float">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--vyne-accent-bg)]
                      flex items-center justify-center"
        >
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--vyne-accent)"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--vyne-text-primary)] mb-1">
          {onboardingDismissed ? "Start building" : "Your canvas is ready"}
        </h3>
        <p className="text-[12px] text-[var(--vyne-text-tertiary)] max-w-[240px] leading-relaxed">
          Drag agents from the sidebar to begin assembling your AI team.
        </p>
      </div>
    </div>
  );
}

function ContextualTooltip() {
  const { edges } = useWorkflowStore();

  if (edges.length === 0) return null;

  return (
    <div
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40
                  px-4 py-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
                  shadow-[var(--shadow-md)] max-w-[360px]"
    >
      <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-snug">
        <span className="font-semibold text-[var(--vyne-accent)]">
          Connection made!
        </span>{" "}
        Data will flow from the first agent to the second. The output of one
        becomes the input of the next — like passing a baton in a relay race.
      </p>
    </div>
  );
}

export function WorkflowCanvas() {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { screenToFlowPosition } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addAgentFromTemplate,
  } = useWorkflowStore();

  const onDragOver = useCallback((event: DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();

      const data = event.dataTransfer.getData("application/vyne-agent");
      if (!data) return;

      const template: AgentTemplate = JSON.parse(data);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      addAgentFromTemplate(template, position);
    },
    [screenToFlowPosition, addAgentFromTemplate]
  );

  return (
    <div ref={reactFlowWrapper} className="relative flex-1 h-full">
      {nodes.length === 0 && <EmptyCanvasPrompt />}
      <ContextualTooltip />

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: true,
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--vyne-border)"
        />
        <Controls
          showInteractive={false}
          position="bottom-right"
        />
        <MiniMap
          position="top-right"
          nodeColor={(node) => {
            const data = node.data as { color?: string };
            return data?.color || "var(--vyne-border)";
          }}
          maskColor="rgba(250, 249, 247, 0.7)"
          style={{ width: 140, height: 90 }}
        />
      </ReactFlow>

      <OnboardingWizard />
    </div>
  );
}
