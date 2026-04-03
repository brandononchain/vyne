/**
 * ── System Prompt Formatter ──────────────────────────────────────────
 *
 * Transforms the user's natural language persona configuration from
 * the Vyne Config Panel into a structured SystemMessage that the
 * Anthropic model receives at the start of its context.
 *
 * The user never writes raw prompts — they fill in friendly fields like
 * "This agent's goal is..." and "Communication style: Professional".
 * This module converts those fields into an optimal system prompt.
 */

import { SystemMessage, HumanMessage, type BaseMessage } from "@langchain/core/messages";

// ── Types matching the frontend AgentNodeData shape ──────────────────

interface AgentPersona {
  goal: string;
  backstory: string;
  tone: string;
  customInstructions: string;
}

interface CompiledAgentData {
  name: string;
  role: string;
  systemPrompt?: string; // Pre-generated from frontend prompt-preview.ts
  tools: string[];
  persona?: AgentPersona;
}

interface CompiledTaskData {
  name: string;
  description: string;
  instructions?: string;
  expectedInput: string;
  expectedOutput: string;
  outputFormat?: string;
}

// ── Tone mapping ─────────────────────────────────────────────────────

const TONE_INSTRUCTIONS: Record<string, string> = {
  professional:
    "Respond in a formal, structured, and business-appropriate manner. Use clear headings and organized formatting.",
  casual:
    "Respond in a relaxed, conversational tone. Be approachable and easy to understand.",
  analytical:
    "Respond with data-driven precision. Use evidence, numbers, and methodical reasoning. Structure your analysis clearly.",
  creative:
    "Respond with imagination and expressiveness. Think outside the box and offer unique perspectives.",
  friendly:
    "Respond warmly and encouragingly. Make complex topics feel approachable and digestible.",
  concise:
    "Respond briefly and to the point. No unnecessary words, no filler. Every sentence should carry weight.",
};

// ── System Prompt Builder ────────────────────────────────────────────

/**
 * Build the system message for an agent node.
 * Combines role, goal, backstory, tone, tools, and custom instructions
 * into a single coherent system prompt.
 */
export function buildAgentSystemMessage(agent: CompiledAgentData): SystemMessage {
  const parts: string[] = [];

  // Identity
  parts.push(`You are "${agent.name}", a ${agent.role}.`);

  // Goal
  if (agent.persona?.goal) {
    parts.push(`\nYour primary objective: ${agent.persona.goal}`);
  }

  // Backstory / context
  if (agent.persona?.backstory) {
    parts.push(`\nBackground: ${agent.persona.backstory}`);
  }

  // Communication tone
  if (agent.persona?.tone && TONE_INSTRUCTIONS[agent.persona.tone]) {
    parts.push(`\nCommunication style: ${TONE_INSTRUCTIONS[agent.persona.tone]}`);
  }

  // Available tools
  if (agent.tools.length > 0) {
    parts.push(
      `\nYou have access to these tools: ${agent.tools.join(", ")}. ` +
      `Use them when they would help you accomplish your task more effectively. ` +
      `Always prefer using tools over guessing when factual accuracy matters.`
    );
  }

  // Custom instructions
  if (agent.persona?.customInstructions) {
    parts.push(`\nAdditional instructions:\n${agent.persona.customInstructions}`);
  }

  // Universal guardrails
  parts.push(
    `\nIMPORTANT: You are operating as part of a multi-agent workflow in Vyne. ` +
    `Your output will be passed to the next step in the pipeline. ` +
    `Be thorough but focused. Structure your output clearly so downstream agents can process it.`
  );

  return new SystemMessage(parts.join("\n"));
}

/**
 * Build the human message for a task node.
 * Formats the task instructions as a clear directive.
 */
export function buildTaskHumanMessage(
  task: CompiledTaskData,
  previousOutput: string | null
): HumanMessage {
  const parts: string[] = [];

  parts.push(`## Task: ${task.name}`);
  parts.push(`\n${task.description}`);

  if (task.instructions) {
    parts.push(`\n### Instructions\n${task.instructions}`);
  }

  parts.push(`\n### Expected Input\n${task.expectedInput}`);
  parts.push(`\n### Expected Output\n${task.expectedOutput}`);

  if (task.outputFormat && task.outputFormat !== "text") {
    parts.push(`\n### Output Format\nProvide your response in ${task.outputFormat} format.`);
  }

  if (previousOutput) {
    parts.push(`\n### Input from Previous Step\n${previousOutput}`);
  }

  return new HumanMessage(parts.join("\n"));
}

/**
 * Build the initial message array for a LangGraph agent node.
 * Combines the system prompt with any task context and previous output.
 */
export function buildMessageArray(
  agent: CompiledAgentData,
  task: CompiledTaskData | null,
  previousOutput: string | null
): BaseMessage[] {
  const messages: BaseMessage[] = [];

  // System prompt (always first)
  messages.push(buildAgentSystemMessage(agent));

  // Task-specific human message
  if (task) {
    messages.push(buildTaskHumanMessage(task, previousOutput));
  } else if (previousOutput) {
    // Agent-to-agent relay — just pass the previous output
    messages.push(
      new HumanMessage(
        `Process the following input from the previous agent in the workflow:\n\n${previousOutput}`
      )
    );
  } else {
    // Root agent with no upstream input
    messages.push(
      new HumanMessage(
        `Begin working on your assigned objective. You are the first step in this workflow.`
      )
    );
  }

  return messages;
}
