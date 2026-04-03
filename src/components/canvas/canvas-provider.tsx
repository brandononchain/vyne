"use client";

import { ReactFlowProvider } from "@xyflow/react";
import { WorkflowCanvas } from "./workflow-canvas";
import { Sidebar } from "../sidebar/sidebar";
import { TopBar } from "../topbar/topbar";

export function CanvasProvider() {
  return (
    <ReactFlowProvider>
      <div className="h-screen w-screen flex flex-col overflow-hidden">
        <TopBar />
        <div className="flex flex-1 min-h-0">
          <Sidebar />
          <WorkflowCanvas />
        </div>
      </div>
    </ReactFlowProvider>
  );
}
