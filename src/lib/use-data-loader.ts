"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useBillingStore } from "@/store/billing-store";
import { useDeployStore } from "@/store/deploy-store";
import type { DeployedWorkflow } from "@/store/deploy-store";

/**
 * Fetches real user data and workflows from the API
 * and hydrates the Zustand stores. Called once on app mount.
 */
export function useDataLoader() {
  const { isSignedIn, isLoaded } = useUser();
  const loaded = useRef(false);
  const { setCredits, setPlan } = useBillingStore();
  const { setDeployedWorkflows } = useDeployStore();

  useEffect(() => {
    if (!isLoaded || !isSignedIn || loaded.current) return;
    loaded.current = true;

    // Load user profile + credits
    fetch("/api/user")
      .then((r) => r.json())
      .then((data) => {
        if (data.plan) {
          setPlan(data.plan);
        }
        if (typeof data.creditsUsed === "number") {
          setCredits(data.creditsUsed, data.creditsTotal);
        }
      })
      .catch((err) => console.error("[DataLoader] Failed to load user:", err));

    // Load workflows
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((data) => {
        if (data.workflows && Array.isArray(data.workflows)) {
          const mapped: DeployedWorkflow[] = data.workflows.map((w: Record<string, unknown>) => ({
            id: w.id as string,
            name: w.name as string,
            description: w.description as string || "",
            triggerType: ((w.triggerType as string) || "api").toLowerCase(),
            status: ((w.status as string) || "draft").toLowerCase(),
            endpointUrl: w.endpointUrl as string || "",
            apiKey: w.apiKey as string || "",
            webhookSecret: w.webhookSecret as string || "",
            deployedAt: w.deployedAt as string || w.createdAt as string,
            lastRunAt: null,
            agentCount: w.agentCount as number || 0,
            taskCount: w.taskCount as number || 0,
            compiledWorkflow: null,
            sourceNodes: (w.graphJson as Record<string, unknown>)?.sourceNodes as [] || [],
            sourceEdges: (w.graphJson as Record<string, unknown>)?.sourceEdges as [] || [],
            metrics: {
              totalRuns: (w._count as Record<string, number>)?.executionLogs || 0,
              successfulRuns: 0,
              failedRuns: 0,
              avgDurationMs: 0,
              last7Days: [0, 0, 0, 0, 0, 0, 0],
            },
          }));
          setDeployedWorkflows(mapped);
        }
      })
      .catch((err) => console.error("[DataLoader] Failed to load workflows:", err));
  }, [isLoaded, isSignedIn, setCredits, setPlan, setDeployedWorkflows]);
}
