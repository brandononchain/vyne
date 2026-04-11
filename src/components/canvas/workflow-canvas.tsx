"use client";

import { useCallback, useRef, useState, type DragEvent } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  BackgroundVariant,
  useReactFlow,
  type IsValidConnection,
} from "@xyflow/react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Leaf, Minus, Maximize, LocateFixed } from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import { useDeployStore } from "@/store/deploy-store";
import { AgentNode } from "./agent-node";
import { TaskNode } from "./task-node";
import { ToolNode } from "./tool-node";
import { TriggerNode } from "./trigger-node";
import { ActionNode } from "./action-node";
import { OutputNode } from "./output-node";
import { VyneEdge } from "./vyne-edge";
import { LiveMinimap } from "./live-minimap";
import { CopilotOmnibar } from "../vyne-chat/vyne-chat";
import { OnboardingWizard } from "../onboarding/onboarding-wizard";
import type { DragPayload, VyneNodeData } from "@/lib/types";

// ── Canvas zoom/pan controls (positioned under minimap) ──────────────
function CanvasControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute top-[140px] right-3 z-30 flex flex-col gap-0.5 bg-white/90 backdrop-blur-sm rounded-xl border border-[var(--vyne-border)] shadow-sm overflow-hidden">
      <button
        onClick={() => zoomIn({ duration: 200 })}
        className="w-8 h-8 flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
        title="Zoom in"
      >
        <Plus size={14} />
      </button>
      <div className="h-px bg-[var(--vyne-border)]" />
      <button
        onClick={() => zoomOut({ duration: 200 })}
        className="w-8 h-8 flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
        title="Zoom out"
      >
        <Minus size={14} />
      </button>
      <div className="h-px bg-[var(--vyne-border)]" />
      <button
        onClick={() => fitView({ duration: 300, padding: 0.15 })}
        className="w-8 h-8 flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
        title="Fit to view"
      >
        <Maximize size={13} />
      </button>
    </div>
  );
}

const DRAG_KEY = "application/vyne-node";

// Register all custom node types
const nodeTypes = {
  agentNode: AgentNode,
  taskNode: TaskNode,
  toolNode: ToolNode,
  triggerNode: TriggerNode,
  actionNode: ActionNode,
  outputNode: OutputNode,
};

// Register custom edge type
const edgeTypes = {
  vyneEdge: VyneEdge,
};

// ── Empty canvas placeholder ─────────────────────────────────────────
function EmptyCanvasPrompt() {
  const onboardingDismissed = useWorkflowStore((s) => s.onboardingDismissed);
  const setCurrentView = useDeployStore((s) => s.setCurrentView);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10">
      <div className="text-center animate-float">
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[var(--vyne-accent-bg)]
                      flex items-center justify-center"
        >
          <Plus size={28} strokeWidth={1.5} className="text-[var(--vyne-accent)]" />
        </div>
        <h3 className="text-[15px] font-semibold text-[var(--vyne-text-primary)] mb-1">
          {onboardingDismissed ? "Start building" : "Your canvas is ready"}
        </h3>
        <p className="text-[12px] text-[var(--vyne-text-tertiary)] max-w-[280px] leading-relaxed mb-3">
          Drag agents, tasks, or tools from the sidebar to build from scratch.
        </p>
        <button
          onClick={() => setCurrentView("templates")}
          className="pointer-events-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl
                     bg-[var(--vyne-accent)] text-white text-[12px] font-semibold
                     hover:opacity-90 transition-opacity shadow-sm"
        >
          <Leaf size={13} />
          Or start with a template
        </button>
      </div>
    </div>
  );
}

// ── Drop zone overlay (visible while dragging over canvas) ───────────
function DropZoneOverlay() {
  const isDraggingOver = useWorkflowStore((s) => s.isDraggingOver);

  return (
    <AnimatePresence>
      {isDraggingOver && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute inset-0 z-20 pointer-events-none"
        >
          {/* Subtle border pulse */}
          <div
            className="absolute inset-4 rounded-2xl border-2 border-dashed border-[var(--vyne-accent-light)]
                       bg-[var(--vyne-accent-bg)] opacity-30"
          />

          {/* Center prompt */}
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              initial={{ scale: 0.9, y: 8 }}
              animate={{ scale: 1, y: 0 }}
              className="flex items-center gap-2 px-5 py-3 rounded-2xl
                         bg-white/80 backdrop-blur-sm border border-[var(--vyne-accent-light)]
                         shadow-[var(--shadow-lg)]"
            >
              <div className="w-8 h-8 rounded-xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
                <Plus size={16} className="text-[var(--vyne-accent)]" />
              </div>
              <span className="text-[13px] font-semibold text-[var(--vyne-accent)]">
                Drop to add to canvas
              </span>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ── Contextual education tooltip (appears on first connection) ───────
function ContextualTooltip() {
  const { edges, nodes } = useWorkflowStore();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed || edges.length === 0 || edges.length > 2) return null;

  // Find what types are connected
  const firstEdge = edges[0];
  const sourceNode = nodes.find((n) => n.id === firstEdge.source);
  const targetNode = nodes.find((n) => n.id === firstEdge.target);
  if (!sourceNode || !targetNode) return null;

  const sourceType = (sourceNode.data as VyneNodeData).type;
  const targetType = (targetNode.data as VyneNodeData).type;

  let tip = "Data flows from left to right — the output of one node becomes the input of the next.";
  if (sourceType === "agent" && targetType === "agent") {
    tip =
      "Agent relay chain active! The first agent will complete its work, then hand the results to the second agent automatically.";
  } else if (sourceType === "agent" && targetType === "task") {
    tip =
      "Task assigned! This agent will work on the connected task using its equipped tools.";
  } else if (sourceType === "tool" && targetType === "agent") {
    tip =
      "Tool equipped! This agent can now use this tool when working on tasks. Think of it like giving a worker a new instrument.";
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="absolute top-4 left-1/2 -translate-x-1/2 z-40
                  px-4 py-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
                  shadow-[var(--shadow-md)] max-w-[380px] cursor-pointer"
      onClick={() => setDismissed(true)}
    >
      <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-snug">
        <span className="font-semibold text-[var(--vyne-accent)]">
          Connection made!{" "}
        </span>
        {tip}
      </p>
    </motion.div>
  );
}

// ── Main canvas ──────────────────────────────────────────────────────
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
    addTaskFromTemplate,
    addToolFromTemplate,
    addTriggerFromTemplate,
    addActionFromTemplate,
    addOutputFromTemplate,
    setIsDraggingOver,
    isSimulating,
    setSelectedNodeId,
  } = useWorkflowStore();

  // ── Drag enter/leave for drop zone overlay ──────────
  const onDragOver = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      setIsDraggingOver(true);
    },
    [setIsDraggingOver]
  );

  const onDragLeave = useCallback(
    (event: DragEvent) => {
      // Only trigger if leaving the canvas itself, not entering a child
      if (
        reactFlowWrapper.current &&
        !reactFlowWrapper.current.contains(event.relatedTarget as Node)
      ) {
        setIsDraggingOver(false);
      }
    },
    [setIsDraggingOver]
  );

  // ── Drop handler — routes to correct addX method ────
  const onDrop = useCallback(
    (event: DragEvent) => {
      event.preventDefault();
      setIsDraggingOver(false);

      // Try new unified key first, fall back to legacy key
      let raw = event.dataTransfer.getData(DRAG_KEY);
      if (!raw) {
        raw = event.dataTransfer.getData("application/vyne-agent");
        if (raw) {
          // Legacy: bare agent template
          const template = JSON.parse(raw);
          const position = screenToFlowPosition({
            x: event.clientX,
            y: event.clientY,
          });
          addAgentFromTemplate(template, position);
          return;
        }
        return;
      }

      const payload: DragPayload = JSON.parse(raw);
      const position = screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      switch (payload.kind) {
        case "agent":
          addAgentFromTemplate(payload.template, position);
          break;
        case "task":
          addTaskFromTemplate(payload.template, position);
          break;
        case "tool":
          addToolFromTemplate(payload.template, position);
          break;
        case "trigger":
          addTriggerFromTemplate(payload.template, position);
          break;
        case "action":
          addActionFromTemplate(payload.template, position);
          break;
        case "output":
          addOutputFromTemplate(payload.template, position);
          break;
      }
    },
    [
      screenToFlowPosition,
      addAgentFromTemplate,
      addTaskFromTemplate,
      addToolFromTemplate,
      addTriggerFromTemplate,
      addActionFromTemplate,
      addOutputFromTemplate,
      setIsDraggingOver,
    ]
  );

  // ── Connection validation at the React Flow level ───
  // (This provides immediate visual feedback — the edge turns red
  //  before they even release. The store's onConnect does the full
  //  validation with toast messages.)
  const isValidConnection: IsValidConnection = useCallback(
    (connection) => {
      if (connection.source === connection.target) return false;
      // Let the store handle detailed validation with toasts
      return true;
    },
    []
  );

  return (
    <div
      ref={reactFlowWrapper}
      className="relative flex-1 h-full"
      onDragLeave={onDragLeave}
    >
      {nodes.length === 0 && !isSimulating && <EmptyCanvasPrompt />}
      {!isSimulating && <DropZoneOverlay />}
      {!isSimulating && <ContextualTooltip />}

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={isSimulating ? undefined : onConnect}
        onDragOver={isSimulating ? undefined : onDragOver}
        onDrop={isSimulating ? undefined : onDrop}
        onNodeClick={(_event, node) => setSelectedNodeId(node.id)}
        onPaneClick={() => setSelectedNodeId(null)}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        isValidConnection={isValidConnection}
        nodesDraggable={!isSimulating}
        nodesConnectable={!isSimulating}
        elementsSelectable={!isSimulating}
        fitView
        snapToGrid
        snapGrid={[16, 16]}
        className={isSimulating ? "simulation-mode" : ""}
        defaultEdgeOptions={{
          type: "vyneEdge",
          animated: true,
        }}
        connectionLineStyle={{
          stroke: "var(--vyne-accent)",
          strokeWidth: 2,
          strokeDasharray: "5 5",
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={20}
          size={1}
          color="var(--vyne-border)"
        />
        <Controls showInteractive={false} position="bottom-right" className="!hidden" />
      </ReactFlow>

      {/* Custom live minimap + controls stacked together */}
      <LiveMinimap />
      <CanvasControls />

      {!isSimulating && <CopilotOmnibar />}
      {!isSimulating && <OnboardingWizard />}
    </div>
  );
}
