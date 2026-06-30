/**
 * ── SSRF guard for agent-driven HTTP ─────────────────────────────────
 *
 * Tools like url-reader and api-connector fetch URLs chosen by the LLM.
 * Without a guard, a prompt-injected agent could reach internal services
 * or cloud metadata endpoints (e.g. 169.254.169.254). This blocks
 * non-HTTP schemes and private / loopback / link-local / metadata hosts.
 *
 * Note: this is a best-effort literal-host check. It does not resolve DNS,
 * so it won't catch a public hostname that resolves to a private IP. For
 * stronger guarantees, run tool HTTP through an egress proxy/allowlist.
 */

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "metadata.google.internal",
]);

function isPrivateIPv4(host: string): boolean {
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!m) return false;
  const [a, b] = [Number(m[1]), Number(m[2])];
  if ([a, Number(m[3]), Number(m[4])].some((n) => n > 255)) return true; // malformed → block
  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 0) return true; // 0.0.0.0/8
  if (a === 169 && b === 254) return true; // link-local + cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
  return false;
}

function isPrivateHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, ""); // strip IPv6 brackets
  if (BLOCKED_HOSTNAMES.has(h)) return true;
  if (h.endsWith(".localhost") || h.endsWith(".internal") || h.endsWith(".local")) return true;
  if (h === "::1" || h === "::" || h.startsWith("fc") || h.startsWith("fd") || h.startsWith("fe80")) return true; // IPv6 loopback/ULA/link-local
  if (isPrivateIPv4(h)) return true;
  return false;
}

/**
 * Validate a URL is safe to fetch from a tool. Returns a parsed URL or
 * throws an Error describing why it was rejected.
 */
export function assertPublicUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(`Invalid URL: ${raw}`);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error(`Blocked URL scheme: ${url.protocol}`);
  }
  if (isPrivateHost(url.hostname)) {
    throw new Error(`Blocked request to non-public host: ${url.hostname}`);
  }
  return url;
}

/** Fetch with the SSRF guard, a timeout, and a capped response size. */
export async function safeFetch(
  raw: string,
  init: RequestInit = {},
  opts: { timeoutMs?: number; maxBytes?: number } = {}
): Promise<{ status: number; headers: Record<string, string>; text: string }> {
  const url = assertPublicUrl(raw);
  const timeoutMs = opts.timeoutMs ?? 15000;
  const maxBytes = opts.maxBytes ?? 1_000_000; // 1 MB

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...init,
      signal: controller.signal,
      redirect: "manual", // don't silently follow redirects to internal hosts
    });
    const headers: Record<string, string> = {};
    res.headers.forEach((v, k) => { headers[k] = v; });
    const buf = await res.arrayBuffer();
    const text = new TextDecoder().decode(buf.slice(0, maxBytes));
    return { status: res.status, headers, text };
  } finally {
    clearTimeout(timer);
  }
}
