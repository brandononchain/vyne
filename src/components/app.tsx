"use client";

import { CanvasProvider } from "@/components/canvas/canvas-provider";
import { Dashboard } from "@/components/dashboard/dashboard";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { SettingsPage } from "@/components/settings/settings-page";
import { DeployModal } from "@/components/deploy/deploy-modal";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { PricingPage } from "@/components/billing/pricing-page";
import { ToastContainer } from "@/components/toast/toast-container";
import { useDeployStore } from "@/store/deploy-store";
import { useDataLoader } from "@/lib/use-data-loader";

function AppContent() {
  const currentView = useDeployStore((s) => s.currentView);

  // Load real data from DB on mount
  useDataLoader();

  return (
    <>
      {currentView === "dashboard" && <Dashboard />}
      {currentView === "templates" && <TemplateGallery />}
      {currentView === "canvas" && <CanvasProvider />}
      {currentView === "settings" && <SettingsPage />}
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

export default function App() {
  return <AppContent />;
}
