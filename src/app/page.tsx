"use client";

import { CanvasProvider } from "@/components/canvas/canvas-provider";
import { Dashboard } from "@/components/dashboard/dashboard";
import { DeployModal } from "@/components/deploy/deploy-modal";
import { ToastContainer } from "@/components/toast/toast-container";
import { useDeployStore } from "@/store/deploy-store";

export default function Home() {
  const currentView = useDeployStore((s) => s.currentView);

  if (currentView === "dashboard") {
    return (
      <>
        <Dashboard />
        <DeployModal />
        <ToastContainer />
      </>
    );
  }

  return <CanvasProvider />;
}
