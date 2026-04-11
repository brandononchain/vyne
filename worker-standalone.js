#!/usr/bin/env node

/**
 * ── Vyne BullMQ Worker (Standalone) ─────────────────────────────────
 *
 * Background job processor for autonomous workflow execution.
 * Runs alongside Next.js, picks up jobs from the Redis queue,
 * executes all workflow steps via Claude, saves results to DB.
 *
 * This file uses CommonJS and dynamic imports so it works with
 * plain `node` after the Next.js build (no tsx needed).
 */

const QUEUE_NAME = "workflow-execution";

async function startWorker() {
  // Dynamic imports (ESM modules)
  const { Worker } = await import("bullmq");
  const IORedis = (await import("ioredis")).default;

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.error("[Worker] REDIS_URL not set — cannot start worker");
    process.exit(1);
  }

  const connection = new IORedis(redisUrl, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  });

  console.log(`[Worker] 🚀 Starting BullMQ worker on queue "${QUEUE_NAME}"...`);

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const { executionLogId, workflowId, graphJson } = job.data;
      const startTime = Date.now();
      console.log(`[Worker] ⚙️  Processing job ${job.id} — workflow ${workflowId}`);

      // Import DB client dynamically
      const { PrismaClient } = await import("./src/generated/prisma/client.js");
      const db = new PrismaClient();

      try {
        await db.executionLog.update({
          where: { id: executionLogId },
          data: { status: "RUNNING", startedAt: new Date() },
        });

        // Import execution dependencies
        const { ChatAnthropic } = await import("@langchain/anthropic");
        const { resolveTools } = await import("./src/lib/server/engine/tools.js");
        const { buildMessageArray } = await import("./src/lib/server/engine/prompts.js");
        const { ToolMessage } = await import("@langchain/core/messages");

        const compiled = graphJson;
        const agents = (compiled.agents || []);
        const tasks = (compiled.tasks || []);
        const executionOrder = (compiled.executionOrder || []);
        const connections = (compiled.connections || []);

        const agentMap = new Map(agents.map((a) => [a.id, a]));
        const taskMap = new Map(tasks.map((t) => [t.id, t]));

        let previousOutput = (job.data.input || "");
        const stepOutputs = {};
        const errors = [];
        const apiKey = process.env.ANTHROPIC_API_KEY;

        for (let i = 0; i < executionOrder.length; i++) {
          const step = executionOrder[i];
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
            agent = { id: `generic_${i}`, name: step.name, role: "Agent", systemPrompt: "You are a helpful assistant.", tools: [] };
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
                ? response.content.filter((b) => b.type === "text").map((b) => b.text).join("\n")
                : "";
              if (textContent) fullOutput += (fullOutput ? "\n" : "") + textContent;

              const toolCalls = response.tool_calls;
              if (!toolCalls || toolCalls.length === 0) break;

              conversationMessages.push(response);
              for (const tc of toolCalls) {
                const matched = tools.find((t) => t.name === tc.name);
                let result = "";
                try {
                  result = matched ? await matched.invoke(tc.args) : JSON.stringify({ error: `Unknown tool: ${tc.name}` });
                } catch (e) {
                  result = JSON.stringify({ error: e.message || "Tool failed" });
                }
                conversationMessages.push(new ToolMessage({ content: result, tool_call_id: tc.id || `call_${round}` }));
              }
            }
          } catch (err) {
            errors.push(`Step ${i + 1} (${step.name}): ${err.message}`);
            fullOutput = `[Error: ${err.message}]`;
          }

          stepOutputs[step.nodeId] = { name: step.name, output: fullOutput, durationMs: Date.now() - stepStart };
          previousOutput = fullOutput;

          await db.executionLog.update({ where: { id: executionLogId }, data: { stepsCompleted: i + 1 } });
          await job.updateProgress(Math.round(((i + 1) / executionOrder.length) * 100));
          console.log(`[Worker]   ✅ Step ${i + 1}/${executionOrder.length}: ${step.name} (${Date.now() - stepStart}ms)`);
        }

        const totalDuration = Date.now() - startTime;
        const success = errors.length === 0;

        await db.executionLog.update({
          where: { id: executionLogId },
          data: {
            status: success ? "COMPLETED" : "FAILED",
            completedAt: new Date(),
            durationMs: totalDuration,
            creditsUsed: 10,
            stepsCompleted: executionOrder.length,
            outputJson: { stepOutputs, finalOutput: previousOutput, errors },
            errorMessage: errors.length > 0 ? errors.join("; ") : null,
          },
        });

        // Deduct credits
        const log = await db.executionLog.findUnique({ where: { id: executionLogId }, select: { userId: true } });
        if (log) {
          await db.user.update({ where: { id: log.userId }, data: { creditsUsed: { increment: 10 } } });
        }

        console.log(`[Worker] ✅ Job ${job.id} completed in ${totalDuration}ms`);
        await db.$disconnect();
        return { stepsCompleted: executionOrder.length, durationMs: totalDuration };
      } catch (error) {
        await db.executionLog.update({
          where: { id: executionLogId },
          data: { status: "FAILED", completedAt: new Date(), durationMs: Date.now() - startTime, errorMessage: error.message },
        }).catch(() => {});
        console.error(`[Worker] ❌ Job ${job.id} failed:`, error.message);
        await db.$disconnect();
        throw error;
      }
    },
    {
      connection,
      concurrency: 3,
      limiter: { max: 10, duration: 60000 },
    }
  );

  worker.on("completed", (job) => console.log(`[Worker] ✅ Job ${job.id} done`));
  worker.on("failed", (job, err) => console.error(`[Worker] ❌ Job ${job?.id} failed:`, err.message));
  worker.on("error", (err) => console.error("[Worker] Error:", err));

  console.log("[Worker] 🟢 Listening for jobs...");

  process.on("SIGTERM", async () => { await worker.close(); process.exit(0); });
  process.on("SIGINT", async () => { await worker.close(); process.exit(0); });
}

startWorker().catch((err) => {
  console.error("[Worker] Fatal:", err);
  process.exit(1);
});
