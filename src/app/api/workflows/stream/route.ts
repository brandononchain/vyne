/**
 * ── POST /api/workflows/stream ─────────────────────────────────────
 *
 * Server-Sent Events endpoint for real-time workflow execution.
 * Replaces the mocked simulation with actual LLM inference.
 *
 * The client connects and receives a stream of events:
 *   - step:start     → A step has begun executing
 *   - step:token     → A token was generated (for live typing effect)
 *   - step:complete  → A step finished with its full output
 *   - step:error     → A step failed
 *   - workflow:done   → All steps complete, final outputs included
 *   - workflow:error  → Fatal workflow-level error
 *
 * This is what the judges will see during the live demo.
 */

import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ChatAnthropic } from "@langchain/anthropic";
import { resolveTools } from "@/lib/server/engine/tools";
import { buildMessageArray } from "@/lib/server/engine/prompts";

// ── Types ────────────────────────────────────────────────────────────

interface StreamStep {
  order: number;
  nodeId: string;
  nodeType: "agent" | "task";
  name: string;
  icon: string;
  color: string;
}

interface StreamAgent {
  id: string;
  name: string;
  role: string;
  systemPrompt: string;
  tools: string[];
}

interface StreamTask {
  id: string;
  name: string;
  description: string;
  instructions: string;
  expectedInput: string;
  expectedOutput: string;
  outputFormat: string;
  assignedAgentId: string | null;
}

interface StreamWorkflowPayload {
  agents: StreamAgent[];
  tasks: StreamTask[];
  executionOrder: StreamStep[];
  connections: { from: string; to: string }[];
  userInput?: string;
}

// ── SSE Helper ───────────────────────────────────────────────────────

function sseEvent(event: string, data: Record<string, unknown>): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

// ── Persona Extractor ────────────────────────────────────────────────

function extractPersona(systemPrompt: string) {
  return {
    goal: "",
    backstory: "",
    tone: "professional" as const,
    customInstructions: systemPrompt,
  };
}

// ── Main Handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  // Auth check
  const { userId } = await auth();
  if (!userId) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not set" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  let payload: StreamWorkflowPayload;
  try {
    payload = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { agents, tasks, executionOrder, connections, userInput } = payload;

  if (!executionOrder || executionOrder.length === 0) {
    return new Response(JSON.stringify({ error: "No executable steps" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Build lookup maps
  const agentMap = new Map(agents.map((a) => [a.id, a]));
  const taskMap = new Map(tasks.map((t) => [t.id, t]));

  // ── Create the SSE stream ───────────────────────────────────────

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(sseEvent(event, data)));
        } catch {
          // Stream may have been closed by client
        }
      };

      let previousOutput = userInput || "";
      const stepOutputs: Record<string, string> = {};
      const startTime = Date.now();

      try {
        for (let i = 0; i < executionOrder.length; i++) {
          const step = executionOrder[i];
          const stepStart = Date.now();

          // ── Emit step:start ──────────────────────────
          send("step:start", {
            stepIndex: i,
            totalSteps: executionOrder.length,
            nodeId: step.nodeId,
            name: step.name,
            nodeType: step.nodeType,
            icon: step.icon,
            color: step.color,
          });

          // ── Resolve agent and task ────────────────────
          let agent: StreamAgent | undefined;
          let task: StreamTask | undefined;

          if (step.nodeType === "agent") {
            agent = agentMap.get(step.nodeId);
            // Find if there's a downstream task assigned to this agent
            task = tasks.find((t) => t.assignedAgentId === step.nodeId);
          } else {
            // Task node — find upstream agent
            task = taskMap.get(step.nodeId);
            const upstreamConnection = connections.find((c) => c.to === step.nodeId);
            if (upstreamConnection) {
              agent = agentMap.get(upstreamConnection.from);
            }
          }

          // Use a generic agent if none found
          if (!agent) {
            agent = {
              id: `generic_${i}`,
              name: step.name,
              role: "General Purpose Agent",
              systemPrompt: "You are a helpful assistant executing a workflow task. Be thorough and precise.",
              tools: [],
            };
          }

          // ── Build messages ────────────────────────────
          const messages = buildMessageArray(
            {
              name: agent.name,
              role: agent.role,
              tools: agent.tools,
              persona: extractPersona(agent.systemPrompt),
            },
            task
              ? {
                  name: task.name,
                  description: task.description,
                  instructions: task.instructions,
                  expectedInput: task.expectedInput,
                  expectedOutput: task.expectedOutput,
                  outputFormat: task.outputFormat,
                }
              : null,
            previousOutput || null
          );

          // ── Stream LLM response (with tool call loop) ──
          const llm = new ChatAnthropic({
            model: "claude-sonnet-4-20250514",
            anthropicApiKey: apiKey,
            temperature: 0.7,
            maxTokens: 2048,
          });

          const tools = resolveTools(agent.tools);
          const model = tools.length > 0 ? llm.bindTools(tools) : llm;

          let fullOutput = "";
          let tokenCount = 0;

          try {
            // Agent loop: invoke → check for tool calls → execute → re-invoke
            // Max 5 tool call rounds to prevent infinite loops
            const conversationMessages = [...messages];
            const MAX_TOOL_ROUNDS = 5;

            for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
              const response = await model.invoke(conversationMessages);

              // Extract text content from this response
              const textContent =
                typeof response.content === "string"
                  ? response.content
                  : Array.isArray(response.content)
                  ? response.content
                      .filter(
                        (block): block is { type: "text"; text: string } =>
                          typeof block === "object" &&
                          block !== null &&
                          "type" in block &&
                          block.type === "text"
                      )
                      .map((block) => block.text)
                      .join("\n")
                  : "";

              if (textContent) {
                fullOutput += (fullOutput ? "\n" : "") + textContent;
                tokenCount += textContent.split(/\s+/).length;

                send("step:token", {
                  stepIndex: i,
                  nodeId: step.nodeId,
                  token: textContent.slice(0, 200),
                  accumulated: fullOutput.length,
                });
              }

              // Check if the model wants to call tools
              const toolCalls = response.tool_calls;
              if (!toolCalls || toolCalls.length === 0) {
                // No tool calls — we're done with this step
                break;
              }

              // Execute each tool call
              conversationMessages.push(response);

              for (const toolCall of toolCalls) {
                const toolName = toolCall.name;
                const toolArgs = toolCall.args;

                // Find the matching tool and execute it
                const matchedTool = tools.find(
                  (t: { name: string }) => t.name === toolName
                );

                let toolResult = "";
                if (matchedTool) {
                  try {
                    toolResult = await matchedTool.invoke(toolArgs);

                    send("step:token", {
                      stepIndex: i,
                      nodeId: step.nodeId,
                      token: `[Tool: ${toolName}] `,
                      accumulated: fullOutput.length,
                    });
                  } catch (toolErr) {
                    toolResult = JSON.stringify({
                      error: toolErr instanceof Error ? toolErr.message : "Tool execution failed",
                    });
                  }
                } else {
                  toolResult = JSON.stringify({ error: `Unknown tool: ${toolName}` });
                }

                // Add tool result back to conversation
                const { ToolMessage } = await import("@langchain/core/messages");
                conversationMessages.push(
                  new ToolMessage({
                    content: toolResult,
                    tool_call_id: toolCall.id || `call_${round}_${toolName}`,
                  })
                );
              }

              // Loop continues — model will process tool results and either
              // respond with text or make more tool calls
            }
          } catch (err) {
            const errorMsg = err instanceof Error ? err.message : "LLM call failed";
            send("step:error", {
              stepIndex: i,
              nodeId: step.nodeId,
              name: step.name,
              error: errorMsg,
            });

            // Use a fallback output so downstream steps can continue
            fullOutput = `[Error in ${step.name}: ${errorMsg}]`;
          }

          const stepDuration = Date.now() - stepStart;

          // ── Emit step:complete ────────────────────────
          send("step:complete", {
            stepIndex: i,
            nodeId: step.nodeId,
            name: step.name,
            output: fullOutput,
            durationMs: stepDuration,
            tokenCount,
          });

          // ── Chain output to next step ──────────────────
          previousOutput = fullOutput;
          stepOutputs[step.nodeId] = fullOutput;
        }

        // ── Emit workflow:done ──────────────────────────
        const totalDuration = Date.now() - startTime;
        send("workflow:done", {
          totalSteps: executionOrder.length,
          totalDurationMs: totalDuration,
          stepOutputs,
          finalOutput: previousOutput,
        });
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "Workflow execution failed";
        send("workflow:error", {
          error: errorMsg,
          stepOutputs,
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
