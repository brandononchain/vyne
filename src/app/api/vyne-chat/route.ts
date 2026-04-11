/**
 * ── POST /api/vyne-chat ─────────────────────────────────────────────
 *
 * Vyne AI Master Agent — a real agentic system with canvas tools.
 *
 * Uses Claude's native tool use to give Vyne AI actual capabilities:
 * - create_workflow: Generate and add nodes + edges to canvas
 * - configure_node: Update any node's properties (name, persona, tools, etc.)
 * - delete_node: Remove a node from the canvas
 * - add_connection: Wire two nodes together
 * - remove_connection: Disconnect two nodes
 *
 * The frontend parses tool_use blocks from the response and executes
 * them against the Zustand store. This makes Vyne AI a real agent,
 * not a chatbot.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

// ── Tool definitions for Claude ──────────────────────────────────────

const VYNE_TOOLS = [
  {
    name: "create_workflow",
    description: "Create new agents, tasks, and connections on the canvas. Use this when the user wants to build a new workflow or add nodes to their existing canvas.",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Short title for the workflow being created" },
        description: { type: "string", description: "One-line description of what this workflow does" },
        nodes: {
          type: "array",
          items: {
            type: "object",
            properties: {
              type: { type: "string", enum: ["agent", "task"], description: "Node type" },
              name: { type: "string", description: "Display name" },
              role: { type: "string", description: "Agent role title (agents only)" },
              description: { type: "string", description: "What this node does" },
              icon: { type: "string", description: "Icon name: Globe, PenTool, FileSearch, FileEdit, FileText, ShieldCheck, Code2, Terminal, Send, ListChecks, Activity, BarChart3, Search, Mail, Wand2, Repeat" },
              color: { type: "string", description: "Hex color: #4a7c59 (green), #0984e3 (blue), #b8694a (terracotta), #d4a84b (gold), #5a9e6f (teal), #e84393 (pink)" },
              tools: { type: "array", items: { type: "string" }, description: "Tool IDs for agents: web-search, url-reader, text-editor, grammar-checker, code-executor, csv-reader, chart-generator, email-client, api-connector, linter, task-tracker, calendar, contact-book" },
              persona: {
                type: "object",
                properties: {
                  goal: { type: "string" },
                  backstory: { type: "string" },
                  tone: { type: "string", enum: ["professional", "casual", "analytical", "creative", "friendly", "concise"] },
                },
              },
              input: { type: "string", description: "Expected input (tasks only)" },
              output: { type: "string", description: "Expected output (tasks only)" },
              instructions: { type: "string", description: "Detailed instructions (tasks only)" },
              x: { type: "number", description: "Canvas X position" },
              y: { type: "number", description: "Canvas Y position" },
            },
            required: ["type", "name", "description", "icon", "color", "x", "y"],
          },
        },
        edges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              from: { type: "number", description: "Source node index (0-based)" },
              to: { type: "number", description: "Target node index (0-based)" },
            },
            required: ["from", "to"],
          },
        },
      },
      required: ["title", "nodes", "edges"],
    },
  },
  {
    name: "configure_node",
    description: "Update the configuration of an existing node on the canvas. Use this to change a node's name, role, persona, tools, description, task instructions, or any other property. The user might say 'make this agent more analytical' or 'add web search to the researcher' or 'change the output format to JSON'.",
    input_schema: {
      type: "object",
      properties: {
        node_name: { type: "string", description: "The current name of the node to configure (must match exactly)" },
        updates: {
          type: "object",
          description: "Key-value pairs to update. Can include: name, role, description, tools (array), persona.goal, persona.backstory, persona.tone, persona.customInstructions, config.detailedInstructions, config.outputFormat, config.constraints, expectedInput, expectedOutput",
          properties: {
            name: { type: "string" },
            role: { type: "string" },
            description: { type: "string" },
            tools: { type: "array", items: { type: "string" } },
            "persona.goal": { type: "string" },
            "persona.backstory": { type: "string" },
            "persona.tone": { type: "string", enum: ["professional", "casual", "analytical", "creative", "friendly", "concise"] },
            "persona.customInstructions": { type: "string" },
            "config.detailedInstructions": { type: "string" },
            "config.outputFormat": { type: "string", enum: ["text", "json", "markdown", "csv", "custom"] },
            "config.constraints": { type: "string" },
            expectedInput: { type: "string" },
            expectedOutput: { type: "string" },
          },
        },
      },
      required: ["node_name", "updates"],
    },
  },
  {
    name: "delete_node",
    description: "Remove a node from the canvas and all its connections. Use when the user wants to remove an agent or task.",
    input_schema: {
      type: "object",
      properties: {
        node_name: { type: "string", description: "Name of the node to delete" },
      },
      required: ["node_name"],
    },
  },
  {
    name: "add_connection",
    description: "Create a connection (edge) between two nodes on the canvas.",
    input_schema: {
      type: "object",
      properties: {
        from_node: { type: "string", description: "Name of the source node" },
        to_node: { type: "string", description: "Name of the target node" },
      },
      required: ["from_node", "to_node"],
    },
  },
  {
    name: "remove_connection",
    description: "Remove a connection between two nodes.",
    input_schema: {
      type: "object",
      properties: {
        from_node: { type: "string", description: "Name of the source node" },
        to_node: { type: "string", description: "Name of the target node" },
      },
      required: ["from_node", "to_node"],
    },
  },
];

// ── Main handler ─────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not set" }, { status: 500 });
    }

    const body = await request.json();
    const { messages, systemPrompt } = body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: "Messages required" }, { status: 400 });
    }

    // Call Claude WITH tools
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemPrompt || "You are Vyne AI, an intelligent workflow copilot.",
        tools: VYNE_TOOLS,
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Vyne Agent] Anthropic error:", err);
      return NextResponse.json({ error: "AI response failed" }, { status: 502 });
    }

    const data = await response.json();

    // Extract text content and tool uses
    const textBlocks: string[] = [];
    const actions: Array<{ tool: string; input: Record<string, unknown>; id: string }> = [];

    for (const block of data.content || []) {
      if (block.type === "text") {
        textBlocks.push(block.text);
      } else if (block.type === "tool_use") {
        actions.push({
          tool: block.name,
          input: block.input,
          id: block.id,
        });
      }
    }

    return NextResponse.json({
      content: textBlocks.join("\n"),
      actions,
      stopReason: data.stop_reason,
    });
  } catch (error) {
    console.error("[Vyne Agent] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
