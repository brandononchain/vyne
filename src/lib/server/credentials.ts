/**
 * ── Server-side credential generation ────────────────────────────────
 *
 * Deploy credentials (API key + webhook secret) MUST be generated on the
 * server with a CSPRNG. They were previously generated in the browser with
 * Math.random() and dictated by the client.
 */

import { randomBytes } from "crypto";

export function generateWorkflowApiKey(): string {
  return `vyne_sk_${randomBytes(24).toString("base64url")}`;
}

export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("base64url")}`;
}

/** Public endpoint URL for a deployed workflow. */
export function buildEndpointUrl(workflowId: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";
  return `${base}/api/run/${workflowId}`;
}
