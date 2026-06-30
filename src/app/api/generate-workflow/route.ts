import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { ANTHROPIC_MODEL } from "@/lib/server/engine/config";
import { parse, generatedWorkflowSchema } from "@/lib/server/validation";

const SYSTEM_PROMPT = `You are the Vyne Workflow Architect — an expert AI system that designs multi-agent workflows.

Given a user's goal, you output a precise JSON structure that defines agents, tasks, and connections for a visual workflow canvas.

RULES:
1. Every workflow MUST have at least 2 agents and 2 tasks.
2. Agents do the thinking (they have roles, tools, personas). Tasks are the work units they execute.
3. The flow must be logical: agents connect to the tasks they perform, tasks can feed into the next agent.
4. Use descriptive names, meaningful roles, and specific tool selections.
5. Position nodes in a clean left-to-right flow with ~400px horizontal gaps and ~160px vertical offsets.
6. Colors: agents use greens (#4a7c59, #5a9e6f), tasks use gold (#d4a84b), QA/review steps use teal (#5a9e6f), output/delivery use terracotta (#b8694a).
7. Available tools: web-search, url-reader, text-editor, grammar-checker, code-executor, csv-reader, chart-generator, email-client.
8. Icons: Globe, PenTool, FileSearch, FileEdit, FileText, ShieldCheck, Code2, Terminal, Send, ListChecks, Activity, BarChart3, Search, Mail, Wand2, Repeat.

OUTPUT FORMAT — respond with ONLY this JSON, no markdown fences, no explanation:
{
  "title": "Short workflow title",
  "description": "One sentence explaining what this workflow does",
  "nodes": [
    {
      "type": "agent",
      "name": "Agent Name",
      "role": "Role Title",
      "description": "What this agent does",
      "icon": "IconName",
      "color": "#hex",
      "tools": ["tool-id", "tool-id"],
      "persona": {
        "goal": "The agent's primary objective",
        "backstory": "Brief background that shapes behavior",
        "tone": "professional|casual|analytical|creative|friendly|concise"
      },
      "x": 100,
      "y": 160
    },
    {
      "type": "task",
      "name": "Task Name",
      "description": "What this task accomplishes",
      "icon": "IconName",
      "color": "#hex",
      "input": "What goes in",
      "output": "What comes out",
      "instructions": "Detailed step-by-step for the agent",
      "x": 500,
      "y": 280
    }
  ],
  "edges": [
    { "from": 0, "to": 1 }
  ]
}

IMPORTANT:
- "from" and "to" in edges are zero-based indexes into the nodes array.
- Vary your layouts — don't always use the same x/y pattern. Use branching, parallel paths, and convergence when appropriate.
- For complex goals, create 4-8 nodes. For simple goals, 3-5 nodes.
- Think step by step about what agents and tasks are truly needed to accomplish the goal effectively.`;

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { prompt, existingNodeCount } = await request.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Anthropic API key not configured" }, { status: 500 });
    }

    const userMessage = existingNodeCount > 0
      ? `The user already has ${existingNodeCount} nodes on their canvas. They want to EXPAND their workflow. Add new nodes that connect logically to what they might already have. Start x positions at ${existingNodeCount * 420 + 100}.\n\nUser request: ${prompt}`
      : `Create a new workflow from scratch.\n\nUser request: ${prompt}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Generate] Anthropic error:", err);
      return NextResponse.json({ error: "AI generation failed" }, { status: 502 });
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";

    // Parse the JSON from Claude's response
    let raw: unknown;
    try {
      // Strip any markdown fences if present
      const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
      raw = JSON.parse(clean);
    } catch {
      console.error("[Generate] Failed to parse JSON:", text.slice(0, 200));
      return NextResponse.json({ error: "Failed to parse workflow structure" }, { status: 500 });
    }

    // Validate the model's output against a strict schema (node/edge/tool
    // shape, tones, indices) instead of trusting arbitrary JSON.
    const validated = parse(generatedWorkflowSchema, raw);
    if (!validated.ok) {
      console.error("[Generate] Invalid workflow structure:", validated.error);
      return NextResponse.json({ error: "Invalid workflow structure", details: validated.error }, { status: 502 });
    }
    const workflow = validated.data;

    // Drop edges that reference out-of-range node indices.
    const safeEdges = workflow.edges.filter(
      (e) => e.from >= 0 && e.to >= 0 && e.from < workflow.nodes.length && e.to < workflow.nodes.length
    );

    return NextResponse.json({
      title: workflow.title || "Generated Workflow",
      description: workflow.description || "",
      nodes: workflow.nodes,
      edges: safeEdges,
    });
  } catch (error) {
    console.error("[Generate] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
