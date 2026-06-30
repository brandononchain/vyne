/**
 * ── Engine Configuration ─────────────────────────────────────────────
 *
 * Single source of truth for the Anthropic model used across Vyne.
 * Both the LangGraph execution engine and the workflow-generation route
 * import from here so the model id is never hardcoded in two places.
 *
 * Override per-environment with ANTHROPIC_MODEL.
 */

/** Default model — overridable via env for staged rollouts / per-plan tuning. */
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6";

/** Max tokens for a single agent/task generation. */
export const MAX_TOKENS = Number(process.env.ANTHROPIC_MAX_TOKENS ?? 4096);

/** Default sampling temperature for agent nodes. */
export const DEFAULT_TEMPERATURE = 0.7;

/** Hard ceiling on agent⇄tool iterations to prevent runaway loops. */
export const MAX_TOOL_ITERATIONS = Number(process.env.MAX_TOOL_ITERATIONS ?? 6);

/** Flat credit cost per execution type (until token-based metering lands). */
export const CREDIT_COSTS = { simulation: 5, run: 10 } as const;
