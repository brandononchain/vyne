import type { AgentNodeData, TaskNodeData } from "./types";

/**
 * Generates a human-readable preview of what the "hidden" system prompt
 * would look like for an agent, based on their persona configuration.
 *
 * This is educational — the user sees that their friendly form inputs
 * translate into a structured prompt behind the scenes.
 */
export function generateAgentPromptPreview(data: AgentNodeData): string {
  const lines: string[] = [];

  lines.push(`You are a ${data.role} named "${data.name}".`);

  if (data.persona.goal) {
    lines.push(`\nYour primary goal is: ${data.persona.goal}`);
  }

  if (data.persona.backstory) {
    lines.push(`\nBackground: ${data.persona.backstory}`);
  }

  const toneMap: Record<string, string> = {
    professional: "Respond in a formal, structured, and business-appropriate manner.",
    casual: "Respond in a relaxed, conversational, and approachable tone.",
    analytical: "Respond with data-driven precision, using methodical reasoning and clear evidence.",
    creative: "Respond with imagination and expressiveness, thinking outside the box.",
    friendly: "Respond warmly and encouragingly, making complex topics feel approachable.",
    concise: "Respond briefly and to the point. No unnecessary words.",
  };

  if (data.persona.tone && toneMap[data.persona.tone]) {
    lines.push(`\nCommunication style: ${toneMap[data.persona.tone]}`);
  }

  if (data.tools.length > 0) {
    lines.push(`\nYou have access to the following tools: ${data.tools.join(", ")}.`);
    lines.push("Use these tools when they would help you accomplish your tasks more effectively.");
  }

  if (data.persona.customInstructions) {
    lines.push(`\nAdditional instructions:\n${data.persona.customInstructions}`);
  }

  return lines.join("\n");
}

/**
 * Generates a preview of the task instruction payload.
 */
export function generateTaskPromptPreview(data: TaskNodeData): string {
  const lines: string[] = [];

  lines.push(`Task: ${data.name}`);
  lines.push(`\nDescription: ${data.description}`);
  lines.push(`\nExpected Input: ${data.expectedInput}`);
  lines.push(`Expected Output: ${data.expectedOutput}`);

  if (data.config.detailedInstructions) {
    lines.push(`\nDetailed Instructions:\n${data.config.detailedInstructions}`);
  }

  if (data.config.constraints) {
    lines.push(`\nConstraints & Requirements:\n${data.config.constraints}`);
  }

  const formatLabels: Record<string, string> = {
    text: "Plain text",
    json: "Structured JSON",
    markdown: "Markdown formatted",
    csv: "CSV / Tabular",
    custom: data.config.outputFormatCustom || "Custom format",
  };

  lines.push(`\nOutput Format: ${formatLabels[data.config.outputFormat] || "Plain text"}`);

  return lines.join("\n");
}
