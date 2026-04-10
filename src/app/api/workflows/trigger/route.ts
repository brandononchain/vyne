/**
 * ── POST /api/workflows/trigger ────────────────────────────────────
 *
 * External API endpoint for triggering deployed workflows autonomously.
 * This is what makes "Deploy → Run without human" work.
 *
 * Auth: API key in Authorization header (Bearer vyne_xxx)
 * No Clerk session required — this is for external systems, cron jobs,
 * webhooks, and programmatic access.
 *
 * Flow:
 * 1. Validate API key → find workflow
 * 2. Execute all steps sequentially via Claude
 * 3. Return full results as JSON
 *
 * Usage:
 *   curl -X POST https://your-app.railway.app/api/workflows/trigger \
 *     -H "Authorization: Bearer vyne_xxx" \
 *     -H "Content-Type: application/json" \
 *     -d '{"input": "Analyze competitors in the CRM space"}'
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { ChatAnthropic } from "@langchain/anthropic";
import { resolveTools } from "@/lib/server/engine/tools";
import { buildMessageArray } from "@/lib/server/engine/prompts";

// ── Persona extractor ────────────────────────────────────────────────

function extractPersona(systemPrompt: string) {
  return {
    goal: "",
    backstory: "",
    tone: "professional" as const,
    customInstructions: systemPrompt,
  };
}

// ── Main handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ── 1. Extract API key ────────────────────────────
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Missing Authorization header. Use: Bearer vyne_xxx" },
      { status: 401 }
    );
  }
  const apiKeyRaw = authHeader.slice(7).trim();

  if (!apiKeyRaw.startsWith("vyne_")) {
    return NextResponse.json(
      { error: "Invalid API key format. Keys start with vyne_" },
      { status: 401 }
    );
  }

  // ── 2. Find workflow by API key ───────────────────
  // The deploy system stores the API key directly on the workflow record
  const workflow = await db.workflow.findFirst({
    where: {
      apiKey: apiKeyRaw,
      status: "LIVE",
    },
    include: { user: true },
  });

  if (!workflow) {
    return NextResponse.json(
      { error: "Workflow not found or not deployed. Check your API key." },
      { status: 404 }
    );
  }

  // ── 3. Check credits ──────────────────────────────
  const creditCost = 10;
  const remaining = workflow.user.creditsTotal - workflow.user.creditsUsed;
  if (remaining < creditCost) {
    return NextResponse.json(
      { error: "Insufficient credits", remaining, required: creditCost },
      { status: 402 }
    );
  }

  // ── 4. Parse the workflow graph ───────────────────
  const graphJson = workflow.graphJson as Record<string, unknown>;
  const compiled = (graphJson as { compiled?: Record<string, unknown> }).compiled || graphJson;

  const agents = (compiled.agents || []) as Array<{
    id: string; name: string; role: string; systemPrompt: string; tools: string[];
  }>;
  const tasks = (compiled.tasks || []) as Array<{
    id: string; name: string; description: string; instructions: string;
    expectedInput: string; expectedOutput: string; outputFormat: string;
    assignedAgentId: string | null;
  }>;
  const executionOrder = (compiled.executionOrder || []) as Array<{
    nodeId: string; nodeType: string; name: string;
  }>;
  const connections = (compiled.connections || []) as Array<{
    from: string; to: string;
  }>;

  if (executionOrder.length === 0) {
    return NextResponse.json(
      { error: "Workflow has no executable steps" },
      { status: 400 }
    );
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Server misconfigured: ANTHROPIC_API_KEY not set" },
      { status: 500 }
    );
  }

  // ── 5. Parse user input ───────────────────────────
  let userInput = "";
  try {
    const body = await request.json();
    userInput = body.input || body.userInput || "";
  } catch {
    // No body is fine — first step will get the default prompt
  }

  // ── 6. Execute each step ──────────────────────────
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  let previousOutput = userInput;
  const stepOutputs: Record<string, { name: string; output: string; durationMs: number }> = {};
  const errors: string[] = [];

  // Create execution log
  const executionLog = await db.executionLog.create({
    data: {
      workflowId: workflow.id,
      userId: workflow.user.id,
      type: "RUN",
      status: "RUNNING",
      stepsTotal: executionOrder.length,
      inputJson: { input: userInput },
      startedAt: new Date(),
    },
  });

  for (let i = 0; i < executionOrder.length; i++) {
    const step = executionOrder[i];
    const stepStart = Date.now();

    // Resolve agent and task
    let agent = step.nodeType === "agent"
      ? agentMap.get(step.nodeId)
      : (() => {
          const conn = connections.find((c) => c.to === step.nodeId);
          return conn ? agentMap.get(conn.from) : undefined;
        })();

    const task = step.nodeType === "task"
      ? taskMap.get(step.nodeId)
      : tasks.find((t) => t.assignedAgentId === step.nodeId);

    if (!agent) {
      agent = {
        id: `generic_${i}`,
        name: step.name,
        role: "General Purpose Agent",
        systemPrompt: "You are a helpful assistant executing a workflow task.",
        tools: [],
      };
    }

    // Build messages
    const messages = buildMessageArray(
      { name: agent.name, role: agent.role, tools: agent.tools, persona: extractPersona(agent.systemPrompt) },
      task ? { name: task.name, description: task.description, instructions: task.instructions, expectedInput: task.expectedInput, expectedOutput: task.expectedOutput, outputFormat: task.outputFormat } : null,
      previousOutput || null
    );

    // Execute with tool call loop
    const llm = new ChatAnthropic({ model: "claude-sonnet-4-20250514", anthropicApiKey: apiKey, temperature: 0.7, maxTokens: 2048 });
    const tools = resolveTools(agent.tools);
    const model = tools.length > 0 ? llm.bindTools(tools) : llm;

    let fullOutput = "";
    try {
      const conversationMessages = [...messages];
      for (let round = 0; round < 5; round++) {
        const response = await model.invoke(conversationMessages);

        const textContent = typeof response.content === "string"
          ? response.content
          : Array.isArray(response.content)
          ? response.content
              .filter((b): b is { type: "text"; text: string } => typeof b === "object" && b !== null && "type" in b && b.type === "text")
              .map((b) => b.text).join("\n")
          : "";

        if (textContent) fullOutput += (fullOutput ? "\n" : "") + textContent;

        const toolCalls = response.tool_calls;
        if (!toolCalls || toolCalls.length === 0) break;

        conversationMessages.push(response);
        for (const tc of toolCalls) {
          const matched = tools.find((t: { name: string }) => t.name === tc.name);
          let result = "";
          try {
            result = matched ? await matched.invoke(tc.args) : JSON.stringify({ error: `Unknown tool: ${tc.name}` });
          } catch (e) {
            result = JSON.stringify({ error: e instanceof Error ? e.message : "Tool failed" });
          }
          const { ToolMessage } = await import("@langchain/core/messages");
          conversationMessages.push(new ToolMessage({ content: result, tool_call_id: tc.id || `call_${round}_${tc.name}` }));
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "LLM call failed";
      errors.push(`Step ${i + 1} (${step.name}): ${msg}`);
      fullOutput = `[Error: ${msg}]`;
    }

    const stepDuration = Date.now() - stepStart;
    stepOutputs[step.nodeId] = { name: step.name, output: fullOutput, durationMs: stepDuration };
    previousOutput = fullOutput;

    // Update execution log progress
    await db.executionLog.update({
      where: { id: executionLog.id },
      data: { stepsCompleted: i + 1 },
    });
  }

  // ── 7. Finalize ───────────────────────────────────
  const totalDuration = Date.now() - startTime;
  const success = errors.length === 0;

  // Update execution log
  await db.executionLog.update({
    where: { id: executionLog.id },
    data: {
      status: success ? "COMPLETED" : "FAILED",
      completedAt: new Date(),
      durationMs: totalDuration,
      creditsUsed: creditCost,
      stepsCompleted: executionOrder.length,
      outputJson: { stepOutputs, finalOutput: previousOutput, errors },
      errorMessage: errors.length > 0 ? errors.join("; ") : null,
    },
  });

  // Deduct credits
  await db.user.update({
    where: { id: workflow.user.id },
    data: { creditsUsed: { increment: creditCost } },
  });

  return NextResponse.json({
    success,
    executionId: executionLog.id,
    workflowName: workflow.name,
    stepsCompleted: executionOrder.length,
    totalDurationMs: totalDuration,
    creditsUsed: creditCost,
    finalOutput: previousOutput,
    stepOutputs: Object.fromEntries(
      Object.entries(stepOutputs).map(([id, data]) => [data.name, { output: data.output, durationMs: data.durationMs }])
    ),
    errors: errors.length > 0 ? errors : undefined,
  });
}
