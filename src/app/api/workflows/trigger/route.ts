/**
 * ── POST /api/workflows/trigger ────────────────────────────────────
 *
 * External API endpoint for triggering deployed workflows.
 * Supports two modes:
 *
 * 1. ASYNC (default): Enqueues to BullMQ worker for background execution.
 *    Returns immediately with executionId for polling.
 *
 * 2. SYNC (fallback): If Redis is unavailable, executes inline.
 *    Returns full results when complete.
 *
 * Auth: API key in Authorization header (Bearer vyne_xxx)
 * No Clerk session required.
 *
 * Usage:
 *   curl -X POST https://your-app.railway.app/api/workflows/trigger \
 *     -H "Authorization: Bearer vyne_xxx" \
 *     -H "Content-Type: application/json" \
 *     -d '{"input": "Analyze competitors in the CRM space"}'
 *
 * Response (async):
 *   { "executionId": "xxx", "status": "queued", "pollUrl": "/api/workflows/status/xxx" }
 *
 * Response (sync):
 *   { "success": true, "finalOutput": "...", "stepOutputs": {...} }
 */

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/server/db";
import { enqueueWorkflowExecution } from "@/lib/server/queue";
import { ChatAnthropic } from "@langchain/anthropic";
import { resolveTools } from "@/lib/server/engine/tools";
import { buildMessageArray } from "@/lib/server/engine/prompts";

// ── Main handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const startTime = Date.now();

  // ── 1. Auth ────────────────────────────────────────
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

  // ── 2. Find workflow ───────────────────────────────
  const workflow = await db.workflow.findFirst({
    where: { apiKey: apiKeyRaw, status: "LIVE" },
    include: { user: true },
  });

  if (!workflow) {
    return NextResponse.json(
      { error: "Workflow not found or not deployed. Check your API key." },
      { status: 404 }
    );
  }

  // ── 3. Credits ─────────────────────────────────────
  const creditCost = 10;
  const remaining = workflow.user.creditsTotal - workflow.user.creditsUsed;
  if (remaining < creditCost) {
    return NextResponse.json(
      { error: "Insufficient credits", remaining, required: creditCost },
      { status: 402 }
    );
  }

  // ── 4. Parse input ─────────────────────────────────
  let userInput = "";
  let webhookUrl: string | null = null;
  try {
    const body = await request.json();
    userInput = body.input || body.userInput || "";
    webhookUrl = body.webhookUrl || null;
  } catch {
    // No body is fine
  }

  // ── 5. Create execution log ────────────────────────
  const graphJson = workflow.graphJson as Record<string, unknown>;
  const compiled = (graphJson as { compiled?: Record<string, unknown> }).compiled || graphJson;
  const executionOrder = (compiled.executionOrder || []) as Array<{ nodeId: string }>;

  const executionLog = await db.executionLog.create({
    data: {
      workflowId: workflow.id,
      userId: workflow.user.id,
      type: "RUN",
      status: "QUEUED",
      stepsTotal: executionOrder.length,
      inputJson: { input: userInput, webhookUrl },
      startedAt: new Date(),
    },
  });

  // ── 6. Try async (BullMQ) first ────────────────────
  const jobId = await enqueueWorkflowExecution({
    executionLogId: executionLog.id,
    workflowId: workflow.id,
    userId: workflow.user.id,
    graphJson: compiled as Record<string, unknown>,
    type: "run",
  });

  if (jobId) {
    // Async mode — return immediately
    const origin = request.nextUrl.origin;
    return NextResponse.json({
      executionId: executionLog.id,
      jobId,
      status: "queued",
      message: "Workflow queued for execution. Poll status or provide a webhookUrl.",
      pollUrl: `${origin}/api/workflows/status/${executionLog.id}`,
      workflowName: workflow.name,
      stepsTotal: executionOrder.length,
    }, { status: 202 });
  }

  // ── 7. Fallback: sync execution (no Redis) ─────────
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
  }

  await db.executionLog.update({
    where: { id: executionLog.id },
    data: { status: "RUNNING" },
  });

  const agents = (compiled.agents || []) as Array<{
    id: string; name: string; role: string; systemPrompt: string; tools: string[];
  }>;
  const tasks = (compiled.tasks || []) as Array<{
    id: string; name: string; description: string; instructions: string;
    expectedInput: string; expectedOutput: string; outputFormat: string;
    assignedAgentId: string | null;
  }>;
  const connections = (compiled.connections || []) as Array<{ from: string; to: string }>;

  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  let previousOutput = userInput;
  const stepOutputs: Record<string, { name: string; output: string; durationMs: number }> = {};
  const errors: string[] = [];

  for (let i = 0; i < executionOrder.length; i++) {
    const step = executionOrder[i] as { nodeId: string; nodeType: string; name: string };
    const stepStart = Date.now();

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
        id: `generic_${i}`, name: step.name, role: "General Purpose Agent",
        systemPrompt: "You are a helpful assistant executing a workflow task.", tools: [],
      };
    }

    const messages = buildMessageArray(
      { name: agent.name, role: agent.role, tools: agent.tools, persona: { goal: "", backstory: "", tone: "professional", customInstructions: agent.systemPrompt } },
      task ? { name: task.name, description: task.description, instructions: task.instructions, expectedInput: task.expectedInput, expectedOutput: task.expectedOutput, outputFormat: task.outputFormat } : null,
      previousOutput || null
    );

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

    stepOutputs[step.nodeId] = { name: step.name, output: fullOutput, durationMs: Date.now() - stepStart };
    previousOutput = fullOutput;

    await db.executionLog.update({
      where: { id: executionLog.id },
      data: { stepsCompleted: i + 1 },
    });
  }

  // ── 8. Finalize ────────────────────────────────────
  const totalDuration = Date.now() - startTime;
  const success = errors.length === 0;

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

  await db.user.update({
    where: { id: workflow.user.id },
    data: { creditsUsed: { increment: creditCost } },
  });

  // ── 9. Webhook callback ────────────────────────────
  if (webhookUrl) {
    fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        executionId: executionLog.id,
        workflowName: workflow.name,
        status: success ? "completed" : "failed",
        finalOutput: previousOutput,
        totalDurationMs: totalDuration,
      }),
    }).catch(() => {});
  }

  return NextResponse.json({
    success,
    executionId: executionLog.id,
    workflowName: workflow.name,
    stepsCompleted: executionOrder.length,
    totalDurationMs: totalDuration,
    creditsUsed: creditCost,
    finalOutput: previousOutput,
    stepOutputs: Object.fromEntries(
      Object.entries(stepOutputs).map(([, data]) => [data.name, { output: data.output, durationMs: data.durationMs }])
    ),
    errors: errors.length > 0 ? errors : undefined,
  });
}
