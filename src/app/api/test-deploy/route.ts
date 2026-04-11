import { NextResponse } from "next/server";
import { db } from "@/lib/server/db";

export async function POST() {
  try {
    let user = await db.user.findFirst();
    if (!user) {
      user = await db.user.create({
        data: { clerkId: "test_seed", email: "test@vyne.ai", plan: "HOBBY", creditsTotal: 1000, creditsUsed: 0 },
      });
    }

    const apiKey = `vyne_test-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

    const workflow = await db.workflow.create({
      data: {
        userId: user.id,
        name: "Test: AI Research Pipeline",
        description: "Autonomous research + summary",
        status: "LIVE",
        triggerType: "API",
        apiKey,
        agentCount: 1,
        taskCount: 1,
        deployedAt: new Date(),
        graphJson: {
          compiled: {
            name: "Test Research Pipeline",
            compiledAt: new Date().toISOString(),
            agents: [{
              id: "agent-1", name: "Research Agent", role: "Web Researcher",
              systemPrompt: "You are a research agent. Search the web and provide a comprehensive summary with key findings.",
              tools: ["web-search"], color: "#4a7c59", icon: "Globe",
            }],
            tasks: [{
              id: "task-1", name: "Write Report", description: "Summarize research into a report",
              instructions: "Write a structured report with: 1) Summary 2) Key Findings 3) Recommendations",
              expectedInput: "Raw research", expectedOutput: "Structured report",
              outputFormat: "markdown", assignedAgentId: null, color: "#d4a84b", icon: "FileText",
            }],
            executionOrder: [
              { order: 0, nodeId: "agent-1", nodeType: "agent", name: "Research Agent", description: "Search", icon: "Globe", color: "#4a7c59", simulationMessage: "Researching...", simulationDuration: 3000 },
              { order: 1, nodeId: "task-1", nodeType: "task", name: "Write Report", description: "Write", icon: "FileText", color: "#d4a84b", simulationMessage: "Writing...", simulationDuration: 2000 },
            ],
            connections: [{ from: "agent-1", to: "task-1", fromName: "Research Agent", toName: "Write Report" }],
            tools: [],
          },
          sourceNodes: [], sourceEdges: [],
        },
      },
    });

    return NextResponse.json({ success: true, workflowId: workflow.id, apiKey });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
