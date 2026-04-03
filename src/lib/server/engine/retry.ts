/**
 * ── Exponential Backoff Retry Utility ────────────────────────────────
 *
 * Wraps any async function with automatic retry logic, specifically
 * designed for LLM API calls that may hit rate limits (429) or
 * transient server errors (500, 502, 503).
 *
 * Uses jittered exponential backoff to avoid thundering herd.
 */

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number;
  /** Jitter factor 0-1 to randomize delay (default: 0.2) */
  jitter?: number;
  /** Optional callback fired on each retry */
  onRetry?: (attempt: number, error: Error, delayMs: number) => void;
}

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 529]);

function isRetryableError(error: unknown): boolean {
  if (error instanceof Error) {
    // Anthropic rate limit errors
    if (error.message.includes("429") || error.message.toLowerCase().includes("rate limit")) {
      return true;
    }
    // Anthropic overloaded
    if (error.message.includes("529") || error.message.toLowerCase().includes("overloaded")) {
      return true;
    }
    // Transient server errors
    if (error.message.includes("500") || error.message.includes("502") || error.message.includes("503")) {
      return true;
    }
    // Network errors
    if (error.message.includes("ECONNRESET") || error.message.includes("ETIMEDOUT") || error.message.includes("fetch failed")) {
      return true;
    }
    // Check for status property on Anthropic/LangChain errors
    const statusError = error as Error & { status?: number };
    if (statusError.status && RETRYABLE_STATUS_CODES.has(statusError.status)) {
      return true;
    }
  }
  return false;
}

function calculateDelay(attempt: number, opts: Required<RetryOptions>): number {
  // Exponential: baseDelay * 2^attempt
  const exponentialDelay = opts.baseDelayMs * Math.pow(2, attempt);
  const capped = Math.min(exponentialDelay, opts.maxDelayMs);

  // Add jitter: delay * (1 - jitter + random * 2 * jitter)
  const jitteredDelay = capped * (1 - opts.jitter + Math.random() * 2 * opts.jitter);

  return Math.round(jitteredDelay);
}

/**
 * Execute an async function with exponential backoff retries.
 *
 * @example
 * const result = await withRetry(
 *   () => model.invoke(messages),
 *   { maxRetries: 3, onRetry: (attempt, err) => console.warn(`Retry ${attempt}:`, err.message) }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts: Required<RetryOptions> = {
    maxRetries: options.maxRetries ?? 3,
    baseDelayMs: options.baseDelayMs ?? 1000,
    maxDelayMs: options.maxDelayMs ?? 30000,
    jitter: options.jitter ?? 0.2,
    onRetry: options.onRetry ?? (() => {}),
  };

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === opts.maxRetries || !isRetryableError(error)) {
        throw lastError;
      }

      const delayMs = calculateDelay(attempt, opts);
      opts.onRetry(attempt + 1, lastError, delayMs);

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError ?? new Error("Retry exhausted with no error captured");
}

/**
 * Extract the Retry-After header value from an Anthropic 429 error.
 * Returns delay in ms, or null if not present.
 */
export function extractRetryAfter(error: unknown): number | null {
  const apiError = error as Error & { headers?: Record<string, string> };
  const retryAfter = apiError.headers?.["retry-after"];
  if (!retryAfter) return null;

  const seconds = parseFloat(retryAfter);
  if (!isNaN(seconds)) return seconds * 1000;

  // Try parsing as date
  const date = Date.parse(retryAfter);
  if (!isNaN(date)) return Math.max(0, date - Date.now());

  return null;
}
