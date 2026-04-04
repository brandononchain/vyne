"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Leaf,
  ArrowRight,
  X,
  Sprout,
  Zap,
  Link,
  CheckCircle2,
  GripVertical,
} from "lucide-react";
import { useWorkflowStore } from "@/store/workflow-store";
import type { OnboardingStep } from "@/lib/types";

interface StepConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  hint: string;
  progress: number;
}

const stepConfigs: Record<OnboardingStep, StepConfig> = {
  welcome: {
    icon: <Leaf size={20} />,
    title: "Welcome to Vyne",
    description:
      "Cultivate powerful AI agent teams visually \u2014 no code required. Let\u2019s plant your first workflow in under 60 seconds.",
    hint: 'Drag the "Web Researcher" from the Agents tab onto the canvas to begin.',
    progress: 0,
  },
  "drag-agent": {
    icon: <GripVertical size={20} />,
    title: "Plant Your First Agent",
    description:
      "Great start! Each agent has a specialized role. Think of them as seeds you\u2019re planting in your workflow garden.",
    hint: "Grab the highlighted agent card and drop it on the canvas.",
    progress: 20,
  },
  "configure-agent": {
    icon: <Sprout size={20} />,
    title: "Agent Planted!",
    description:
      "Your agent is on the canvas. Each agent comes with default tools \u2014 like a seedling with its own root system.",
    hint: 'Now switch to the Tasks tab and drag a "Research Report" task onto the canvas.',
    progress: 40,
  },
  "add-task": {
    icon: <Zap size={20} />,
    title: "Assign a Task",
    description:
      "Tasks tell agents exactly what to do. Each task defines an input (what it needs) and an output (what it produces).",
    hint: "Drag a task from the Tasks tab and drop it next to your agent.",
    progress: 60,
  },
  connect: {
    icon: <Link size={20} />,
    title: "Connect the Branches",
    description:
      "When you connect two nodes, data flows between them like water through vines. The first node\u2019s output becomes the next node\u2019s input.",
    hint: "Drag from the right handle (\u25CF) of your agent to the left handle of the task.",
    progress: 80,
  },
  complete: {
    icon: <CheckCircle2 size={20} />,
    title: "Your Workflow Has Sprouted!",
    description:
      "You\u2019ve cultivated your first multi-agent pipeline. Agents, tasks, and tools work together, passing information like nutrients through a vine network.",
    hint: "Keep growing \u2014 try adding tools from the Tools tab, or connect two agents in a relay chain.",
    progress: 100,
  },
};

function ProgressDots({ current }: { current: OnboardingStep }) {
  const steps: OnboardingStep[] = [
    "welcome",
    "drag-agent",
    "configure-agent",
    "add-task",
    "connect",
    "complete",
  ];
  const currentIdx = steps.indexOf(current);

  return (
    <div className="flex items-center gap-1.5">
      {steps.map((step, i) => (
        <div
          key={step}
          className={`h-1 rounded-full transition-all duration-300 ${
            i <= currentIdx
              ? "w-5 bg-[var(--vyne-accent)]"
              : "w-1.5 bg-[var(--vyne-border)]"
          }`}
        />
      ))}
    </div>
  );
}

export function OnboardingWizard() {
  const { onboardingStep, onboardingDismissed, dismissOnboarding, setOnboardingStep } =
    useWorkflowStore();

  if (onboardingDismissed) return null;

  const config = stepConfigs[onboardingStep];
  const isComplete = onboardingStep === "complete";

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={onboardingStep}
        initial={{ opacity: 0, y: 16, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: -8, scale: 0.96 }}
        transition={{ type: "spring", stiffness: 400, damping: 30 }}
        className="absolute bottom-6 left-1/2 -translate-x-1/2 z-50
                   w-[460px] bg-white rounded-2xl border border-[var(--vyne-border)]
                   shadow-[var(--shadow-lg)] overflow-hidden"
      >
        {/* Progress bar */}
        <div className="h-0.5 bg-[var(--vyne-border)]">
          <motion.div
            className="h-full bg-[var(--vyne-accent)]"
            initial={{ width: 0 }}
            animate={{ width: `${config.progress}%` }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </div>

        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center
                  ${isComplete ? "bg-green-50 text-[var(--vyne-success)]" : "bg-[var(--vyne-accent-bg)] text-[var(--vyne-accent)]"}`}
              >
                {config.icon}
              </div>
              <div>
                <h3 className="text-[14px] font-bold text-[var(--vyne-text-primary)]">
                  {config.title}
                </h3>
                <ProgressDots current={onboardingStep} />
              </div>
            </div>

            <button
              onClick={dismissOnboarding}
              className="w-7 h-7 rounded-lg flex items-center justify-center
                         text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                         hover:bg-[var(--vyne-bg-warm)] transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Body */}
          <p className="text-[12px] text-[var(--vyne-text-secondary)] leading-relaxed mb-3">
            {config.description}
          </p>

          {/* Hint box */}
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-[var(--vyne-bg-warm)] border border-[var(--vyne-border)]">
            <Leaf
              size={13}
              className="text-[var(--vyne-accent)] shrink-0 mt-0.5"
            />
            <p className="text-[11px] text-[var(--vyne-text-secondary)] leading-snug font-medium">
              {config.hint}
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={dismissOnboarding}
              className="text-[11px] text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)]
                         font-medium transition-colors"
            >
              Skip tutorial
            </button>

            {isComplete ? (
              <button
                onClick={dismissOnboarding}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                           bg-[var(--vyne-success)] text-white text-[12px] font-semibold
                           hover:opacity-90 transition-opacity"
              >
                Start Building
                <ArrowRight size={13} />
              </button>
            ) : (
              <button
                onClick={() => {
                  const steps: OnboardingStep[] = [
                    "welcome",
                    "drag-agent",
                    "configure-agent",
                    "add-task",
                    "connect",
                    "complete",
                  ];
                  const idx = steps.indexOf(onboardingStep);
                  if (idx < steps.length - 1) {
                    setOnboardingStep(steps[idx + 1]);
                  }
                }}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl
                           bg-[var(--vyne-accent)] text-white text-[12px] font-semibold
                           hover:opacity-90 transition-opacity"
              >
                Next
                <ArrowRight size={13} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
