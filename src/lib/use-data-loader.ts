"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useBillingStore } from "@/store/billing-store";
import { useDeployStore } from "@/store/deploy-store";
import { useProjectStore } from "@/store/project-store";
import { useWorkflowStore } from "@/store/workflow-store";
import { useVyneMemory } from "@/store/vyne-memory";
import type { DeployedWorkflow } from "@/store/deploy-store";
import type { Project } from "@/store/project-store";
import type { VyneNode, VyneEdge } from "@/lib/types";

/**
 * Fetches real user data, workflows, and chat history from the API
 * and hydrates all Zustand stores. Called once on app mount.
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
        if (data.plan) setPlan(data.plan);
        if (typeof data.creditsUsed === "number") setCredits(data.creditsUsed, data.creditsTotal);
      })
      .catch((err) => console.error("[DataLoader] Failed to load user:", err));

    // Load workflows → hydrate both deploy store AND project store
    fetch("/api/workflows")
      .then((r) => r.json())
      .then((data) => {
        if (!data.workflows || !Array.isArray(data.workflows)) return;

        // Hydrate deployed workflows (for dashboard)
        const deployed: DeployedWorkflow[] = data.workflows
          .filter((w: Record<string, unknown>) => w.status === "LIVE")
          .map((w: Record<string, unknown>) => ({
            id: w.id as string,
            name: w.name as string,
            description: w.description as string || "",
            triggerType: ((w.triggerType as string) || "api").toLowerCase(),
            status: "live",
            endpointUrl: w.endpointUrl as string || "",
            apiKey: w.apiKey as string || "",
            webhookSecret: w.webhookSecret as string || "",
            deployedAt: w.deployedAt as string || w.createdAt as string,
            lastRunAt: null,
            agentCount: w.agentCount as number || 0,
            taskCount: w.taskCount as number || 0,
            compiledWorkflow: null,
            sourceNodes: [],
            sourceEdges: [],
            metrics: { totalRuns: 0, successfulRuns: 0, failedRuns: 0, avgDurationMs: 0, last7Days: [0,0,0,0,0,0,0] },
          }));
        setDeployedWorkflows(deployed);

        // Hydrate project store
        const projects: Project[] = data.workflows.map((w: Record<string, unknown>) => {
          const graphJson = (w.graphJson || {}) as Record<string, unknown>;
          return {
            id: `saved-${w.id}`,
            name: w.name as string,
            description: w.description as string || "",
            status: ((w.status as string) || "draft").toLowerCase(),
            nodes: (graphJson.sourceNodes || []) as VyneNode[],
            edges: (graphJson.sourceEdges || []) as VyneEdge[],
            agentCount: w.agentCount as number || 0,
            taskCount: w.taskCount as number || 0,
            updatedAt: w.updatedAt as string || new Date().toISOString(),
            createdAt: w.createdAt as string || new Date().toISOString(),
            serverId: w.id as string,
          };
        });

        const projectStore = useProjectStore.getState();

        if (projects.length > 0) {
          projectStore.setProjects(projects);

          // Load the most recently updated project
          const latest = projects.sort((a, b) =>
            new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
          )[0];

          projectStore.setActiveProjectId(latest.id);

          // Restore canvas
          useWorkflowStore.setState({
            nodes: latest.nodes || [],
            edges: latest.edges || [],
          });

          // Load chat for this workflow
          if (latest.serverId) {
            fetch(`/api/chat?workflowId=${latest.serverId}`)
              .then((r) => r.json())
              .then((chatData) => {
                if (chatData.messages?.length > 0) {
                  const memStore = useVyneMemory.getState();
                  memStore.clearMessages();
                  for (const msg of chatData.messages) {
                    memStore.addMessage({
                      id: msg.id,
                      role: msg.role,
                      content: msg.content,
                      timestamp: msg.timestamp,
                      status: "complete",
                    });
                  }
                }
              })
              .catch(() => {});
          }
        } else {
          // No saved workflows — create a default new project
          projectStore.createProject("Untitled Workflow");
        }
      })
      .catch((err) => console.error("[DataLoader] Failed to load workflows:", err));
  }, [isLoaded, isSignedIn, setCredits, setPlan, setDeployedWorkflows]);
}
