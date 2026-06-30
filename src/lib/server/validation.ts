/**
 * ── Request & AI-output validation schemas ───────────────────────────
 *
 * Centralized Zod schemas for API route bodies and for the JSON the
 * workflow-generator model returns. Routes were previously destructuring
 * untrusted `request.json()` with no validation.
 */

import { z } from "zod";

// ── Workflow persistence ─────────────────────────────────────────────

export const saveWorkflowSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional().nullable(),
  graphJson: z.record(z.string(), z.unknown()),
  triggerType: z.enum(["api", "webhook", "schedule", "API", "WEBHOOK", "SCHEDULE"]).optional().nullable(),
  agentCount: z.number().int().nonnegative().optional(),
  taskCount: z.number().int().nonnegative().optional(),
  status: z.enum(["DRAFT", "LIVE", "PAUSED", "ARCHIVED"]).optional(),
});

export const updateWorkflowSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional().nullable(),
  graphJson: z.record(z.string(), z.unknown()).optional(),
  triggerType: z.enum(["api", "webhook", "schedule", "API", "WEBHOOK", "SCHEDULE"]).optional().nullable(),
  agentCount: z.number().int().nonnegative().optional(),
  taskCount: z.number().int().nonnegative().optional(),
  status: z.enum(["DRAFT", "LIVE", "PAUSED", "ARCHIVED"]).optional(),
});

// ── Execution ────────────────────────────────────────────────────────

export const executeWorkflowSchema = z.object({
  workflowId: z.string().min(1),
  type: z.enum(["simulation", "run"]).default("run"),
  input: z.record(z.string(), z.unknown()).optional(),
});

// ── Chat ─────────────────────────────────────────────────────────────

export const chatMessageSchema = z.object({
  role: z.enum(["user", "vyne"]),
  content: z.string().min(1).max(20000),
  metadata: z.record(z.string(), z.unknown()).optional().nullable(),
});

// ── API keys ─────────────────────────────────────────────────────────

export const createApiKeySchema = z.object({
  name: z.string().min(1).max(120),
});

// ── Workflow generation (model output) ───────────────────────────────

export const generatedNodeSchema = z.object({
  type: z.enum(["agent", "task", "tool"]),
  name: z.string(),
  role: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  tools: z.array(z.string()).optional(),
  persona: z
    .object({
      goal: z.string().optional(),
      backstory: z.string().optional(),
      tone: z.enum(["professional", "casual", "analytical", "creative", "friendly", "concise"]).optional(),
    })
    .optional(),
  input: z.string().optional(),
  output: z.string().optional(),
  instructions: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
});

export const generatedWorkflowSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  nodes: z.array(generatedNodeSchema).min(2),
  edges: z.array(z.object({ from: z.number().int(), to: z.number().int() })).default([]),
});

export type GeneratedWorkflow = z.infer<typeof generatedWorkflowSchema>;

/**
 * Parse a JSON body and validate it against a schema. Returns a typed
 * result so route handlers can return a 400 with the issues on failure.
 */
export function parse<T>(schema: z.ZodType<T>, data: unknown):
  | { ok: true; data: T }
  | { ok: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { ok: true, data: result.data };
  const error = result.error.issues
    .map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("; ");
  return { ok: false, error };
}
