/**
 * ── POST /api/vyne-chat ─────────────────────────────────────────────
 *
 * Conversational AI endpoint for Vyne's copilot chat.
 * Uses Claude to have real conversations about workflow building,
 * AI agents, and automation — with canvas context awareness.
 *
 * Can also generate workflow JSON when the user asks to build something.
 */

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";

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

    // Call Claude
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
        system: systemPrompt || "You are Vyne AI, a helpful workflow building copilot.",
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role === "user" ? "user" : "assistant",
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("[Vyne Chat] Anthropic error:", err);
      return NextResponse.json({ error: "AI response failed" }, { status: 502 });
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || "I'm sorry, I couldn't generate a response.";

    return NextResponse.json({ content });
  } catch (error) {
    console.error("[Vyne Chat] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
