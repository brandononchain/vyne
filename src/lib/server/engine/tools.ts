/**
 * ── Dynamic Tool Registry ────────────────────────────────────────────
 *
 * Maps Vyne's UI tool IDs (e.g., "web-search", "csv-reader") to
 * LangChain StructuredTool instances that the Anthropic model can
 * call via function calling.
 *
 * When a user toggles a tool ON in the Config Panel, the tool ID
 * is stored in the agent's `tools` array. This registry resolves
 * those IDs to executable tool instances at compile time.
 *
 * To add a new tool:
 * 1. Create a class extending StructuredTool
 * 2. Register it in TOOL_REGISTRY below
 * 3. The compiler will automatically bind it to any agent that has it
 */

import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { safeFetch } from "./net-guard";

// Strip HTML to readable text (no DOM dependency in the worker).
function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

// ── Tool Definitions ─────────────────────────────────────────────────
// Each tool is a LangChain tool that the Anthropic model can invoke.
//
// REAL: web_search (Tavily, via TAVILY_API_KEY), url_reader, api_connector
//       (both go through the SSRF-guarded safeFetch).
// SIMULATED (still return mock data — need a provider/sandbox to be real):
//       csv_reader, code_executor, email_client, text_editor,
//       grammar_checker, chart_generator.

const webSearchTool = tool(
  async ({ query }: { query: string }) => {
    const apiKey = process.env.TAVILY_API_KEY;
    if (!apiKey) {
      return JSON.stringify({
        error: "web_search is not configured. Set TAVILY_API_KEY to enable live search.",
        results: [],
      });
    }
    try {
      const res = await safeFetch(
        "https://api.tavily.com/search",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api_key: apiKey,
            query,
            max_results: 5,
            include_answer: true,
            search_depth: "basic",
          }),
        },
        { timeoutMs: 20000 }
      );
      const data = JSON.parse(res.text || "{}");
      return JSON.stringify({
        answer: data.answer ?? null,
        results: (data.results ?? []).map((r: { title?: string; url?: string; content?: string }) => ({
          title: r.title, url: r.url, snippet: r.content,
        })),
      });
    } catch (err) {
      return JSON.stringify({ error: `Search failed: ${err instanceof Error ? err.message : "unknown"}`, results: [] });
    }
  },
  {
    name: "web_search",
    description: "Search the internet for up-to-date information on any topic. Returns a list of relevant results with titles, URLs, and snippets.",
    schema: z.object({
      query: z.string().describe("The search query"),
    }),
  }
);

const urlReaderTool = tool(
  async ({ url }: { url: string }) => {
    try {
      const res = await safeFetch(url, { headers: { "User-Agent": "VyneBot/1.0" } });
      if (res.status >= 400) {
        return JSON.stringify({ error: `Request failed with status ${res.status}`, url });
      }
      const titleMatch = res.text.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const text = htmlToText(res.text).slice(0, 8000);
      return JSON.stringify({
        url,
        title: titleMatch ? htmlToText(titleMatch[1]) : url,
        text,
        wordCount: text ? text.split(/\s+/).length : 0,
      });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Failed to read URL", url });
    }
  },
  {
    name: "url_reader",
    description: "Read and extract the main content from a web page URL. Returns the page title and cleaned text content.",
    schema: z.object({
      url: z.string().url().describe("The URL to read"),
    }),
  }
);

const csvReaderTool = tool(
  async ({ filePath, query }: { filePath: string; query: string }) => {
    // TODO: Replace with actual CSV parsing (Papa Parse or fs-based)
    return JSON.stringify({
      columns: ["name", "value", "date"],
      rowCount: 150,
      sample: [
        { name: "Item A", value: 42, date: "2024-01-15" },
        { name: "Item B", value: 78, date: "2024-01-16" },
      ],
      summary: `Parsed CSV with 150 rows. Query: ${query}`,
    });
  },
  {
    name: "csv_reader",
    description: "Parse and analyze structured data from CSV files. Can filter and summarize data based on a query.",
    schema: z.object({
      filePath: z.string().describe("Path or identifier for the CSV file"),
      query: z.string().describe("What to look for or analyze in the data"),
    }),
  }
);

const codeExecutorTool = tool(
  async ({ code, language }: { code: string; language: string }) => {
    // TODO: Replace with sandboxed code execution (E2B, Modal, or Docker)
    return JSON.stringify({
      exitCode: 0,
      stdout: `[Mock] Executed ${language} code (${code.length} chars). Output: Success.`,
      stderr: "",
      executionTimeMs: 320,
    });
  },
  {
    name: "code_executor",
    description: "Run code in a sandboxed environment. Supports Python, JavaScript, and shell scripts.",
    schema: z.object({
      code: z.string().describe("The code to execute"),
      language: z.enum(["python", "javascript", "shell"]).describe("Programming language"),
    }),
  }
);

const emailClientTool = tool(
  async ({ to, subject, body }: { to: string; subject: string; body: string }) => {
    // TODO: Replace with actual email sending (Resend, SendGrid, or Nodemailer)
    return JSON.stringify({
      sent: true,
      messageId: `msg_${Date.now().toString(36)}`,
      to,
      subject,
      preview: body.slice(0, 100),
    });
  },
  {
    name: "email_client",
    description: "Send an email on behalf of the user. Requires recipient, subject, and body.",
    schema: z.object({
      to: z.string().email().describe("Recipient email address"),
      subject: z.string().describe("Email subject line"),
      body: z.string().describe("Email body content"),
    }),
  }
);

const apiConnectorTool = tool(
  async ({ url, method, body }: { url: string; method: string; body?: string }) => {
    const start = Date.now();
    try {
      const res = await safeFetch(url, {
        method,
        headers: { "Content-Type": "application/json", "User-Agent": "VyneBot/1.0" },
        ...(body && method !== "GET" ? { body } : {}),
      });
      let parsed: unknown = res.text;
      try { parsed = JSON.parse(res.text); } catch { /* keep raw text */ }
      return JSON.stringify({
        status: res.status,
        headers: res.headers,
        body: parsed,
        durationMs: Date.now() - start,
      });
    } catch (err) {
      return JSON.stringify({ error: err instanceof Error ? err.message : "Request failed", url });
    }
  },
  {
    name: "api_connector",
    description: "Make HTTP requests to external APIs. Supports GET, POST, PUT, DELETE methods.",
    schema: z.object({
      url: z.string().url().describe("The API endpoint URL"),
      method: z.enum(["GET", "POST", "PUT", "DELETE"]).describe("HTTP method"),
      body: z.string().optional().describe("Request body (for POST/PUT)"),
    }),
  }
);

const textEditorTool = tool(
  async ({ content, operation }: { content: string; operation: string }) => {
    return JSON.stringify({
      result: `Processed text (${content.length} chars) with operation: ${operation}`,
      wordCount: content.split(/\s+/).length,
    });
  },
  {
    name: "text_editor",
    description: "Create and edit long-form documents and content. Can format, restructure, or transform text.",
    schema: z.object({
      content: z.string().describe("The text content to process"),
      operation: z.enum(["format", "summarize", "expand", "restructure"]).describe("Operation to perform"),
    }),
  }
);

const grammarCheckerTool = tool(
  async ({ text }: { text: string }) => {
    return JSON.stringify({
      corrected: text,
      issuesFound: 0,
      readabilityScore: 85,
      suggestions: [],
    });
  },
  {
    name: "grammar_checker",
    description: "Review text for grammar, spelling, and style improvements. Returns corrected text and a readability score.",
    schema: z.object({
      text: z.string().describe("The text to check"),
    }),
  }
);

const chartGeneratorTool = tool(
  async ({ data, chartType, title }: { data: string; chartType: string; title: string }) => {
    return JSON.stringify({
      chartUrl: `https://charts.vyne.ai/mock/${Date.now().toString(36)}`,
      chartType,
      title,
      dataPoints: 12,
    });
  },
  {
    name: "chart_generator",
    description: "Create visual charts and graphs from data. Supports bar, line, pie, and scatter charts.",
    schema: z.object({
      data: z.string().describe("JSON-formatted data for the chart"),
      chartType: z.enum(["bar", "line", "pie", "scatter"]).describe("Type of chart"),
      title: z.string().describe("Chart title"),
    }),
  }
);

// ── Tool Registry ────────────────────────────────────────────────────
// Maps Vyne UI tool IDs → LangChain tool instances

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToolInstance = any;

const TOOL_REGISTRY: Record<string, ToolInstance> = {
  "web-search": webSearchTool,
  "url-reader": urlReaderTool,
  "csv-reader": csvReaderTool,
  "code-executor": codeExecutorTool,
  "email-client": emailClientTool,
  "api-connector": apiConnectorTool,
  "text-editor": textEditorTool,
  "grammar-checker": grammarCheckerTool,
  "chart-generator": chartGeneratorTool,
};

/**
 * Resolve a list of Vyne tool IDs to LangChain tool instances.
 * Unknown tool IDs are silently skipped.
 */
export function resolveTools(toolIds: string[]): ToolInstance[] {
  return toolIds
    .map((id) => TOOL_REGISTRY[id])
    .filter((t): t is ToolInstance => t !== undefined);
}

/**
 * Get all available tool IDs.
 */
export function getAvailableToolIds(): string[] {
  return Object.keys(TOOL_REGISTRY);
}
