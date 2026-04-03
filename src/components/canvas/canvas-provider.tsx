"use client";

import { useEffect } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowCanvas } from "./workflow-canvas";
import { Sidebar } from "../sidebar/sidebar";
import { TopBar } from "../topbar/topbar";
import { ToastContainer } from "../toast/toast-container";
import { ConfigPanel } from "../config-panel/config-panel";
import { DeployModal } from "../deploy/deploy-modal";
import { useWorkflowStore } from "@/store/workflow-store";

function KeyboardShortcuts() {
  const { undo, redo } = useWorkflowStore();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMod = e.metaKey || e.ctrlKey;
      if (isMod && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      }
      if (isMod && e.key === "z" && e.shiftKey) {
        e.preventDefault();
        redo();
      }
      if (isMod && e.key === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo]);

  return null;
}

export function CanvasProvider() {
  return (
    <ReactFlowProvider>
      <KeyboardShortcuts />
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <WorkflowCanvas />
        </div>
      </div>
      <ConfigPanel />
      <DeployModal />
      <ToastContainer />
    </ReactFlowProvider>
  );
}
