import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { prompt, index } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not set" }, { status: 500 });
    }

    const fullPrompt = prompt || `Design a modern, premium tech startup logo for "Vyne" - an AI agent workflow builder platform. The logo should be similar in quality and style to Flora AI's logo (florafauna.ai). Requirements: clean minimalist icon mark paired with a modern wordmark spelling "Vyne". Use forest green (#4a7c59) as the primary color. The icon should subtly reference connected nodes, vine growth, or AI workflows. Professional SaaS aesthetic similar to Linear, Vercel, Notion, or Flora logos. White/light background. The logo must look like it was designed by a top-tier branding agency. NO clip art, NO generic shapes. Make it distinctive and memorable. Variation #${index || 1}.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: fullPrompt }] }],
          generationConfig: {
            responseModalities: ["TEXT", "IMAGE"],
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("[Logo] Gemini error:", err);
      return NextResponse.json({ error: "Gemini API failed", details: err }, { status: 502 });
    }

    const data = await response.json();

    // Extract image
    for (const candidate of data.candidates || []) {
      for (const part of candidate.content?.parts || []) {
        if (part.inlineData) {
          return NextResponse.json({
            image: part.inlineData.data,
            mimeType: part.inlineData.mimeType || "image/png",
          });
        }
      }
    }

    // No image returned
    const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || "No output";
    return NextResponse.json({ error: "No image generated", text: textResponse }, { status: 500 });
  } catch (error) {
    console.error("[Logo] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
