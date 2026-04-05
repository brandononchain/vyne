"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { CanvasProvider } from "@/components/canvas/canvas-provider";
import { Dashboard } from "@/components/dashboard/dashboard";
import { TemplateGallery } from "@/components/templates/template-gallery";
import { SettingsPage } from "@/components/settings/settings-page";
import { DeployModal } from "@/components/deploy/deploy-modal";
import { UpgradeModal } from "@/components/billing/upgrade-modal";
import { PricingPage } from "@/components/billing/pricing-page";
import { ToastContainer } from "@/components/toast/toast-container";
import { useDeployStore } from "@/store/deploy-store";

function AppContent() {
  const currentView = useDeployStore((s) => s.currentView);

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
  return (
    <AuthGuard>
      <AppContent />
    </AuthGuard>
  );
}
