"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Rocket,
  Globe,
  Webhook,
  Clock,
  Copy,
  Check,
  Key,
  Link,
  Shield,
  Leaf,
  ArrowRight,
  Loader2,
  CheckCircle2,
  PartyPopper,
} from "lucide-react";
import {
  useDeployStore,
  deployWorkflow,
  type TriggerType,
} from "@/store/deploy-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { compileGraphToJSON } from "@/lib/graph-compiler";

// ── Copy button with feedback ────────────────────────────────────────
function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-semibold uppercase tracking-wider text-[var(--vyne-text-tertiary)]">
        {label}
      </label>
      <div
        className="flex items-center gap-2 p-2.5 rounded-xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)]
                    cursor-pointer hover:border-[var(--vyne-border-hover)] transition-colors group"
        onClick={copy}
      >
        <code className="flex-1 text-[11px] text-[var(--vyne-text-secondary)] font-mono truncate select-all">
          {text}
        </code>
        <button className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all">
          {copied ? (
            <Check size={13} className="text-[var(--vyne-success)]" />
          ) : (
            <Copy
              size={13}
              className="text-[var(--vyne-text-tertiary)] group-hover:text-[var(--vyne-accent)]"
            />
          )}
        </button>
      </div>
    </div>
  );
}

// ── Trigger type option ──────────────────────────────────────────────
function TriggerOption({
  type,
  icon,
  title,
  description,
  selected,
  onSelect,
}: {
  type: TriggerType;
  icon: React.ReactNode;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={`
        w-full flex items-start gap-3 p-3.5 rounded-xl border text-left transition-all duration-150
        ${
          selected
            ? "bg-[var(--vyne-accent-bg)] border-[var(--vyne-accent)] shadow-sm"
            : "bg-white border-[var(--vyne-border)] hover:border-[var(--vyne-border-hover)]"
        }
      `}
    >
      <div
        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
          selected ? "bg-[var(--vyne-accent)] text-white" : "bg-[var(--vyne-bg-warm)] text-[var(--vyne-text-secondary)]"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1">
        <h4
          className={`text-[12px] font-semibold ${
            selected ? "text-[var(--vyne-accent)]" : "text-[var(--vyne-text-primary)]"
          }`}
        >
          {title}
        </h4>
        <p className="text-[10px] text-[var(--vyne-text-tertiary)] leading-snug mt-0.5">
          {description}
        </p>
      </div>
      <div
        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
          selected ? "border-[var(--vyne-accent)] bg-[var(--vyne-accent)]" : "border-[var(--vyne-border)]"
        }`}
      >
        {selected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
      </div>
    </button>
  );
}

// ── Step 1: Configure ────────────────────────────────────────────────
function ConfigureStep({ onDeploy }: { onDeploy: () => void }) {
  const { deployModal, setDeployWorkflowName, setDeployTriggerType } = useDeployStore();
  const nodes = useWorkflowStore((s) => s.nodes);

  const canDeploy = deployModal.workflowName.trim().length > 0 && nodes.length > 0;

  return (
    <div className="space-y-5">
      {/* Workflow name */}
      <div>
        <label className="block text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-1.5">
          Workflow Name
        </label>
        <input
          type="text"
          value={deployModal.workflowName}
          onChange={(e) => setDeployWorkflowName(e.target.value)}
          placeholder="e.g., Daily Research Digest"
          className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
                     text-[13px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                     focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                     transition-all"
          autoFocus
        />
        <p className="text-[10px] text-[var(--vyne-text-tertiary)] mt-1">
          This name will appear on your dashboard and in API responses.
        </p>
      </div>

      {/* Trigger type */}
      <div>
        <label className="block text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-2">
          How should this workflow be triggered?
        </label>
        <div className="space-y-2">
          <TriggerOption
            type="api"
            icon={<Globe size={16} />}
            title="API Endpoint"
            description="Call this workflow on-demand from your app or script via a REST API."
            selected={deployModal.triggerType === "api"}
            onSelect={() => setDeployTriggerType("api")}
          />
          <TriggerOption
            type="webhook"
            icon={<Webhook size={16} />}
            title="Webhook Listener"
            description="Trigger automatically when an external service sends data (Zapier, Slack, etc)."
            selected={deployModal.triggerType === "webhook"}
            onSelect={() => setDeployTriggerType("webhook")}
          />
          <TriggerOption
            type="schedule"
            icon={<Clock size={16} />}
            title="Scheduled (Cron)"
            description="Runs automatically on a recurring schedule (daily, hourly, etc)."
            selected={deployModal.triggerType === "schedule"}
            onSelect={() => setDeployTriggerType("schedule")}
          />
        </div>
      </div>

      {/* Deploy button */}
      <button
        onClick={onDeploy}
        disabled={!canDeploy}
        className={`
          w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[13px] font-semibold
          transition-all duration-200
          ${
            canDeploy
              ? "bg-[var(--vyne-accent)] text-white hover:opacity-90 shadow-md"
              : "bg-[var(--vyne-border)] text-[var(--vyne-text-tertiary)] cursor-not-allowed"
          }
        `}
      >
        <Rocket size={15} />
        Deploy Workflow
        <ArrowRight size={14} />
      </button>
    </div>
  );
}

// ── Step 2: Deploying animation ──────────────────────────────────────
function DeployingStep() {
  return (
    <div className="py-8 flex flex-col items-center text-center">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        className="w-14 h-14 rounded-2xl bg-[var(--vyne-accent-bg)] flex items-center justify-center mb-5"
      >
        <Loader2 size={24} className="text-[var(--vyne-accent)]" />
      </motion.div>
      <h3 className="text-[16px] font-bold text-[var(--vyne-text-primary)] mb-2">
        Publishing your workflow...
      </h3>
      <p className="text-[12px] text-[var(--vyne-text-secondary)] max-w-[280px] leading-relaxed">
        Compiling agents, setting up your endpoint, and generating credentials. This only takes a moment.
      </p>
      <div className="flex items-center gap-3 mt-6">
        {["Compiling graph", "Creating endpoint", "Generating keys"].map((step, i) => (
          <motion.div
            key={step}
            initial={{ opacity: 0.3 }}
            animate={{ opacity: 1 }}
            transition={{ delay: i * 0.8, duration: 0.4 }}
            className="flex items-center gap-1.5"
          >
            <CheckCircle2 size={11} className="text-[var(--vyne-success)]" />
            <span className="text-[10px] text-[var(--vyne-text-tertiary)]">{step}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Step 3: Success ──────────────────────────────────────────────────
function SuccessStep({
  endpointUrl,
  apiKey,
  webhookSecret,
  triggerType,
}: {
  endpointUrl: string;
  apiKey: string;
  webhookSecret: string;
  triggerType: TriggerType;
}) {
  const { closeDeployModal, setCurrentView } = useDeployStore();

  return (
    <div className="space-y-5">
      {/* Celebration header */}
      <div className="text-center pt-2 pb-1">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
          className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 flex items-center justify-center mb-4"
        >
          <PartyPopper size={26} className="text-[var(--vyne-success)]" />
        </motion.div>
        <motion.h3
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-[18px] font-bold text-[var(--vyne-text-primary)] mb-1"
        >
          Workflow is Live!
        </motion.h3>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-[12px] text-[var(--vyne-text-secondary)]"
        >
          Your agents are ready and waiting for instructions.
        </motion.p>
      </div>

      {/* Credentials */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="space-y-3 p-4 rounded-2xl bg-[var(--vyne-bg-warm)] border border-[var(--vyne-border)]"
      >
        <CopyButton
          label={triggerType === "webhook" ? "Webhook URL" : "API Endpoint"}
          text={endpointUrl}
        />
        <CopyButton label="API Key" text={apiKey} />
        {triggerType === "webhook" && (
          <CopyButton label="Webhook Secret" text={webhookSecret} />
        )}
      </motion.div>

      {/* Security note */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-100"
      >
        <Shield size={12} className="text-amber-500 shrink-0 mt-0.5" />
        <p className="text-[10px] text-amber-700 leading-snug">
          Keep your API key private. Never expose it in client-side code. Use environment variables in your app.
        </p>
      </motion.div>

      {/* Actions */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex gap-2"
      >
        <button
          onClick={() => {
            closeDeployModal();
            setCurrentView("dashboard");
          }}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl
                     bg-[var(--vyne-accent)] text-white text-[12px] font-semibold
                     hover:opacity-90 transition-opacity"
        >
          View Dashboard
          <ArrowRight size={13} />
        </button>
        <button
          onClick={closeDeployModal}
          className="px-4 py-2.5 rounded-xl border border-[var(--vyne-border)]
                     text-[12px] font-medium text-[var(--vyne-text-secondary)]
                     hover:bg-[var(--vyne-bg-warm)] transition-colors"
        >
          Close
        </button>
      </motion.div>
    </div>
  );
}

// ── Main Modal ───────────────────────────────────────────────────────
export function DeployModal() {
  const {
    deployModal,
    closeDeployModal,
    setDeployModalStep,
    addDeployedWorkflow,
  } = useDeployStore();
  const { nodes, edges } = useWorkflowStore();
  const [deployedData, setDeployedData] = useState<{
    endpointUrl: string;
    apiKey: string;
    webhookSecret: string;
  } | null>(null);

  const handleDeploy = async () => {
    setDeployModalStep("deploying");

    // Compile & create deployed workflow
    const compiled = compileGraphToJSON(nodes, edges);
    const deployed = deployWorkflow(
      compiled,
      deployModal.workflowName,
      deployModal.triggerType,
      nodes,
      edges
    );

    // Save to database
    try {
      await fetch("/api/workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: deployed.name,
          description: deployed.description,
          graphJson: {
            compiled,
            sourceNodes: nodes,
            sourceEdges: edges,
          },
          triggerType: deployed.triggerType,
          agentCount: deployed.agentCount,
          taskCount: deployed.taskCount,
          status: "LIVE",
        }),
      });
    } catch (err) {
      console.error("[Deploy] Failed to save to DB:", err);
    }

    addDeployedWorkflow(deployed);
    setDeployedData({
      endpointUrl: deployed.endpointUrl,
      apiKey: deployed.apiKey,
      webhookSecret: deployed.webhookSecret,
    });
    setDeployModalStep("success");
  };

  // Reset on close
  useEffect(() => {
    if (!deployModal.isOpen) {
      setDeployedData(null);
    }
  }, [deployModal.isOpen]);

  return (
    <AnimatePresence>
      {deployModal.isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/20 backdrop-blur-[2px]"
            onClick={deployModal.step !== "deploying" ? closeDeployModal : undefined}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-[61]
                       w-[460px] bg-white rounded-2xl border border-[var(--vyne-border)]
                       shadow-[var(--shadow-lg)] overflow-hidden"
          >
            {/* Header */}
            {deployModal.step !== "deploying" && (
              <div className="px-6 pt-5 pb-4 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-[var(--vyne-accent-bg)] flex items-center justify-center">
                    <Rocket size={16} className="text-[var(--vyne-accent)]" />
                  </div>
                  <div>
                    <h2 className="text-[15px] font-bold text-[var(--vyne-text-primary)]">
                      {deployModal.step === "success" ? "Deployed!" : "Deploy Workflow"}
                    </h2>
                    <p className="text-[10px] text-[var(--vyne-text-tertiary)]">
                      {deployModal.step === "success"
                        ? "Your workflow is now live"
                        : "Publish your workflow to make it available"}
                    </p>
                  </div>
                </div>
                <button
                  onClick={closeDeployModal}
                  className="w-7 h-7 rounded-lg flex items-center justify-center
                             text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                             hover:bg-[var(--vyne-bg-warm)] transition-colors"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Body */}
            <div className="px-6 pb-6">
              <AnimatePresence mode="wait">
                {deployModal.step === "configure" && (
                  <motion.div
                    key="configure"
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 8 }}
                  >
                    <ConfigureStep onDeploy={handleDeploy} />
                  </motion.div>
                )}
                {deployModal.step === "deploying" && (
                  <motion.div
                    key="deploying"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <DeployingStep />
                  </motion.div>
                )}
                {deployModal.step === "success" && deployedData && (
                  <motion.div
                    key="success"
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -8 }}
                  >
                    <SuccessStep
                      {...deployedData}
                      triggerType={deployModal.triggerType}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
