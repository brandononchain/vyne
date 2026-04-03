"use client";

import { CanvasProvider } from "@/components/canvas/canvas-provider";
import { Dashboard } from "@/components/dashboard/dashboard";
import { DeployModal } from "@/components/deploy/deploy-modal";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { PricingPage } from "@/components/billing/pricing-page";
import { ToastContainer } from "@/components/toast/toast-container";
import { useDeployStore } from "@/store/deploy-store";

export default function Home() {
  const currentView = useDeployStore((s) => s.currentView);

  return (
    <>
      {currentView === "dashboard" ? <Dashboard /> : <CanvasProvider />}
      {/* Global overlays — available regardless of view */}
      <UpgradeModal />
      <PricingPage />
      {currentView === "dashboard" && (
        <>
          <DeployModal />
          <ToastContainer />
        </>
      )}
    </>
  );
}
