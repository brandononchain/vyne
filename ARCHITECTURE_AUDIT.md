# Vyne — Architecture Audit

_Full-stack review of frontend, backend, and AI architecture._

Stack: Next.js 16 (App Router) · React 19 · Clerk · Prisma 7 / PostgreSQL · BullMQ / Redis · LangChain + LangGraph (Anthropic) · Zustand · React Flow (`@xyflow/react`) · Tailwind 4.

---

## 1. Executive summary

Vyne is a visual multi-agent workflow builder. The **canvas/UX layer is genuinely strong** — React Flow nodes are memoized, the graph compiler (topological sort) is clean, connection rules are well modeled, and the AI workflow-generation route works. The **engine code (LangGraph compiler, retry, queue, worker) is also reasonably written in isolation.**

The core problem is **integration, not craft**: the product is a well-built *demo shell* wired to mostly-illusory backends. Several complete vertical slices exist on both ends but are never connected, and the one execution path that is wired would fail on a data-shape mismatch.

### The single most important finding: the execution pipeline is disconnected in three independent places

The headline feature — "run/deploy your agent workflow" — cannot work today, for three separate reasons, any one of which alone would break it:

1. **The UI never calls the executor.** No client code calls `POST /api/workflows/execute`. The only client → API calls are `/api/user`, `/api/workflows` (GET/POST), and `/api/generate-workflow`. What looks like "running" is a **client-side mock** with random timers (`graph-compiler.ts:237`, `simulationDuration: 2000 + Math.random()*2000`).
2. **Production never starts the worker.** `railway.toml` → `start.sh` → `node server.js` (Next standalone only). The worker bootstrap (`src/lib/server/worker.ts`) and `start.js` are **dead entrypoints**. Even if jobs were enqueued, nothing consumes the BullMQ queue.
3. **The saved data shape doesn't match what the executor reads.** Deploy saves `graphJson = { compiled, sourceNodes, sourceEdges }` (`deploy-modal.tsx:388`), but `execute/route.ts:54` and `worker.ts:74` read `graphJson.executionOrder` at the **top level** → always `0` steps → `executeWorkflow()` throws `"Workflow has no executable steps"`.

The same "built but unwired" pattern recurs across the app: credits, billing, chat persistence, API keys, settings, and workflow lifecycle (pause/delete) all have working backends or store methods that **no code path connects**.

### Severity scorecard

| Area | State |
|---|---|
| Visual canvas / React Flow editor | ✅ Solid |
| AI workflow generation (`/api/generate-workflow`) | ✅ Works |
| Graph compiler (topological sort) | ✅ Solid |
| **Workflow execution (end-to-end)** | ❌ Broken (3 independent breaks) |
| **AI agent runtime (tool use)** | ❌ No tool loop; all tools mocked |
| **Billing / credits enforcement** | ❌ Client-side illusion |
| **Deploy credentials & lifecycle** | ❌ Fake / not persisted |
| **Auth webhook security** | 🔴 No signature verification |
| Persistence of canvas/chat | ❌ None (lost on refresh) |

---

## 2. System map

```
Browser (everything is 'use client', ssr:false)
  ├─ Zustand: workflow · deploy · billing · vyne-memory   ← no persistence, no DB sync
  ├─ React Flow canvas → compileGraphToJSON()             ← good
  └─ fetch → /api/user, /api/workflows(GET/POST), /api/generate-workflow
                        │
Next.js API routes (Clerk session auth)
  ├─ /api/user, /api/workflows, /api/chat, /api/keys, /api/workflows/execute
  ├─ /api/generate-workflow (raw fetch → Anthropic)
  ├─ /api/generate-logo  ← PUBLIC + unauthenticated (Gemini)
  └─ /api/webhooks/clerk ← NO Svix verification
                        │
Prisma 7 / Postgres   ·   BullMQ → Redis ──X── Worker (never started in prod)
                                                  └─ LangGraph compiler → ChatAnthropic (single invoke, no tool loop)
```

**Orphaned/dead verticals:** `/api/workflows/execute` + queue + worker + LangGraph engine; `/api/chat` + `ChatMessage` table + `vyne-memory` store; `/api/keys` CRUD; `billing-store.consumeCredits`; deploy status/delete sync; `stepLogs` schema field; `start.js` and `worker.ts` entrypoints; `prompts.ts` structured prompt builder (bypassed by `extractPersona`).

---

## 3. AI architecture

The AI layer is the product's reason to exist, and it is the least finished.

### 3.1 No agent tool loop (ReAct) — agents can't actually use tools
`compiler.ts:181` binds tools (`baseLLM.bindTools(tools)`) but then calls `model.invoke(messages)` **exactly once** and extracts only text blocks (`:198-208`). If the model returns `tool_use` blocks, they are never executed and never fed back. There is no agent/tool iteration loop. LangGraph's prebuilt `createReactAgent` or a manual tool-execution sub-loop is required for tools to do anything.

### 3.2 Every tool is a mock
All nine tools in `tools.ts` return hardcoded fake data (`web_search`, `url_reader`, `code_executor`, `email_client`, `api_connector`, etc. — each marked `// TODO: Replace with…`). So even with a tool loop, results would be fiction.

### 3.3 The sophisticated prompt builder is dead code
`prompts.ts` has a structured `buildAgentSystemMessage` (goal / backstory / tone / tools / guardrails). But `compiler.ts:249` `extractPersona()` hardcodes `goal:""`, `backstory:""`, `tone:"professional"` and dumps the entire frontend-generated prompt string into `customInstructions`. So the structured branch never runs, and prompt generation is **duplicated** (`lib/prompt-preview.ts` on the client ≈ `prompts.ts` on the server, including a near-identical tone map). The frontend version wins; the backend's is bypassed and degraded.

### 3.4 DAGs are silently flattened to a linear chain
The canvas supports branching/convergence (`connection-rules.ts` allows agent→agent, task→task, fan-in). But `compiler.ts:346-361` topologically sorts then wires a strict `step_0 → step_1 → … → END` chain, and only forwards `state.previousOutput` (the immediately preceding step). A convergence node that should see multiple upstream outputs sees only one. Parallelism and branching are lost. `stepOutputs` accumulates all outputs but is never used for fan-in.

### 3.5 Inconsistent + outdated model usage
- Model hardcoded to `claude-sonnet-4-20250514` in two places (`compiler.ts:127`, `generate-workflow/route.ts:92`). Per project guidance this is not a current model; should be centralized in config and updated (e.g. `claude-sonnet-4-6`/latest), and made per-plan configurable.
- `/api/generate-workflow` uses **raw `fetch`** to the Anthropic REST API (no LangChain, no `withRetry`, no credit accounting), while the engine uses LangChain + retry. Two divergent integration styles.
- No streaming to the client anywhere. The worker logs progress to `console`; the `ExecutionLog.stepLogs` field exists but is **never written**, so there is no real-time or even post-hoc per-step visibility.

### 3.6 AI output is barely validated
`generate-workflow/route.ts:120` only checks `nodes` is an array of length ≥ 2. Node shape, edge indices, tool IDs, persona `tone`, and connection-rule legality are unchecked. The client (`vyne-chat.tsx` `toVyneNodes`) blind-casts `tone` and trusts `type/color/icon/tools/x/y`. AI-built graphs bypass the `connection-rules.ts` validation that manual edges must pass. Use a Zod schema (Zod is already a dependency) for the model output and reject/repair invalid graphs.

---

## 4. Backend / API

### 4.1 Missing CRUD — workflows can't be edited or deleted server-side
Routes exist only for `GET`/`POST /api/workflows`. There is **no `/api/workflows/[id]`** (GET/PUT/PATCH/DELETE) and **no execution-status route**. Consequences:
- A saved workflow can't be reopened to edit (`use-data-loader.ts:54` sets `compiledWorkflow: null` and never rehydrates the canvas).
- Deploy pause/delete are local-only and revert on refresh.
- Even if execution ran, the UI has no endpoint to poll `ExecutionLog` status/progress.

### 4.2 Credit enforcement is racy and bypassable
- `execute/route.ts:41-50` checks credits, but they are decremented later in the worker (`worker.ts:108`). Classic **TOCTOU**: many jobs can be enqueued before any completes. (Moot today since nothing runs, but it's the design.)
- Credit cost is a flat `5`/`10` regardless of step count or real token usage.
- The client-side `billing-store.consumeCredits` (`billing-store.ts:128`) — the only thing that decrements the displayed balance and records usage history — is **never called**. Credits are a cosmetic, client-derived gate.
- Org-level credits exist in the schema but the worker only increments `user.creditsUsed`.

### 4.3 Inconsistent, divergent user provisioning
Users are auto-created in **three** places with different logic: the Clerk webhook (`webhooks/clerk/route.ts`, creates org), `GET /api/user` (creates org), and `POST /api/workflows` (creates a user with a fake `${userId}@pending.vyne.ai` email and **no org**). These can race and produce inconsistent records. Consolidate into one idempotent `ensureUser()` helper.

### 4.4 No input validation layer
Zod is a dependency but unused in routes. Every handler does `const { ... } = await request.json()` and trusts it (`/api/workflows`, `/api/chat`, `/api/keys`). `graphJson` (arbitrary client JSON, including system prompts and tool lists) is stored and later fed to the LLM compiler unvalidated.

---

## 5. Frontend

The canvas editor itself is well built; the weakness is the UI↔backend boundary and render hygiene.

### 5.1 Writes are mostly client-side illusions
- **Billing:** `setPlan` (`billing-store.ts:117`) only mutates local state — no Stripe, no `/api/billing`, no persistence. `pricing-page.tsx:96` claims "You'll be charged the prorated difference immediately" (false). Prices are hardcoded in the bundle.
- **Deploy credentials:** generated client-side with `Math.random()` (`deploy-store.ts:66-78`), never sent to or stored by the server. The copyable API key/webhook secret authenticate nothing. A real generator (`/api/keys`, `randomBytes`+sha256) exists but is never called from the UI.
- **Deploy save swallows errors:** `deploy-modal.tsx:399-401` catches the POST failure, logs it, and unconditionally shows "Workflow is Live!" — false success, store/DB divergence.
- **Settings:** "Save Changes" just clears a dirty flag; Delete Account / Invite / Generate Key / Add Endpoint have no handlers; the API Keys tab never fetches `/api/keys` (always empty).
- **Lifecycle:** `toggleWorkflowStatus`/`removeDeployedWorkflow` mutate Zustand only; lost on reload; no confirmation on delete.

### 5.2 No persistence of canvas or chat → total loss on refresh
No store uses `persist` middleware. The entire working canvas (`workflow-store`) and chat (`vyne-memory`) are volatile. There is no autosave and no functional "Save" (the topbar "Save workflow" button has no `onClick`, `topbar.tsx:202`).

### 5.3 Render performance
- **Whole-store subscriptions** (`useWorkflowStore()` with no selector) in `sidebar.tsx:329`, `topbar.tsx:65`, `output-drawer.tsx:106`, `vyne-chat.tsx:118`, `live-minimap.tsx:17`, `tool-config-panel.tsx:11` — every node drag / simulation tick / toast re-renders them. `simulation-overlay.tsx:11` shows the correct selector pattern to follow.
- **Undebounced config edits:** every keystroke in agent/task panels calls `updateNodeData` → `nodes.map` returns a new array → all whole-store subscribers re-render (`agent-config-panel.tsx:228`, `task-config-panel.tsx:146`). Commit on blur or debounce.
- **Unmemoized derived data:** `StatsSummary` runs 5 filter/reduce passes per render (`dashboard.tsx:261`); gallery stagger delays re-fire entrance animations on each search keystroke.

### 5.4 SSR fully abandoned
`page.tsx` dynamic-imports the app with `ssr:false` and `layout.tsx:6` forces `dynamic="force-dynamic"` to dodge a framer-motion static-gen crash. ~33 files are `'use client'`. Even `landing/page.tsx` (the SEO-critical, LCP-sensitive page) is fully client just to run `setTimeout` fade-ins, and loads an autoplaying third-party iframe as the hero. View routing is a Zustand string (`deploy-store.currentView`) instead of the Next router — effectively one route.

### 5.5 Accessibility
No modal has a focus trap or `role="dialog"`/`aria-modal`; deploy-modal & user-dropdown lack Escape handlers; template-preview-modal is backdrop-close only. Clickable `div`s instead of buttons (dashboard cards, tool toggles with no `role="switch"`). Inputs without labels. Toasts have no `aria-live` and no auto-dismiss (and deploy/settings never emit them). No `prefers-reduced-motion`.

### 5.6 Smaller correctness bugs
- `template-preview-modal.tsx:148` returns `null` before `AnimatePresence` (`:166`) → exit animation never plays.
- `vyne-chat.tsx:192` `setInterval`+`setTimeout` "bloom" with no cleanup → setState on unmounted component; the `/api/generate-workflow` call has no `AbortController`.
- Division-by-zero risk in `user-dropdown.tsx:108` when `creditsTotal === 0`.
- Module-global counters (`nodeIdCounter` `workflow-store.ts:118`, usage `entryCounter`) reset on reload; mixed ID schemes (`gen-…-Date.now()`, static `t-n1`) risk collisions. Prefer UUIDs.

---

## 6. Data layer (Prisma)

- Reasonable schema with good indexes and cascade deletes. `User`/`Organization` both carry credits but only user credits are used.
- **`stepLogs` is never written** despite being the field intended for real-time streaming.
- `ApiKey` comment says "bcrypt hash" but code uses **SHA-256** (`keys/route.ts:6`). For API keys SHA-256 is acceptable (high-entropy secret), but the comment is misleading and should be corrected; consider HMAC with a server pepper.
- `Workflow.apiKey` / `webhookSecret` are stored as plaintext columns and currently populated client-side.
- No migration history: `start.sh` runs `prisma db push` on every boot (schema drift risk). `prisma.config.ts` points at a `migrations/` dir that the workflow doesn't use. Switch to `prisma migrate deploy`.

---

## 7. Security (prioritized)

| # | Severity | Issue | Location |
|---|---|---|---|
| 1 | 🔴 Critical | **Clerk webhook has no Svix signature verification** — anyone can POST to create/update/**delete** users. `CLERK_WEBHOOK_SECRET` is configured but unused. | `webhooks/clerk/route.ts:19` |
| 2 | 🔴 High | **`/api/generate-logo` is public + unauthenticated** and calls Gemini — open cost-abuse/DoS vector. | `middleware.ts:9`, `generate-logo/route.ts` |
| 3 | 🟠 High | Deploy secrets generated with `Math.random()` (not a CSPRNG) and dictated by the client. | `deploy-store.ts:66` |
| 4 | 🟠 High | No request-body validation (no Zod); `graphJson` (LLM-bound) stored unvalidated. | all routes |
| 5 | 🟠 Med | Credit check/decrement TOCTOU; credits bypassable client-side. | `execute/route.ts:41`, `worker.ts:108` |
| 6 | 🟡 Med | No rate limiting on any route, including LLM-calling ones. | — |
| 7 | 🟡 Low | `GEMINI_API_KEY` used but missing from `.env.example` (config drift). | `.env.example` |

---

## 8. Infrastructure / deploy

- **Worker never runs in production** (see §1.2). Either run `worker.ts` as the start command (or a second Railway service), or merge worker bootstrap into `server.js`.
- **`start.js` and `worker.ts` are both unused** given `start.sh` → `node server.js`. Three competing entrypoints; pick one.
- Dockerfile copies **all** `node_modules` into the runner, defeating the point of Next `output: "standalone"` (large image). Standalone already bundles required deps.
- `prisma db push` on every boot — no migration discipline (see §6).

---

## 9. Prioritized remediation roadmap

### P0 — Make the core product actually work
1. **Wire execution end-to-end:** call `/api/workflows/execute` from the UI; fix the `graphJson` shape so `executionOrder` is where the executor reads it (or have the executor read `graphJson.compiled`); **start the worker in production**.
2. **Implement a real agent runtime:** replace the single `invoke` with a tool loop (LangGraph `createReactAgent` or a manual loop); implement at least 1–2 real tools (e.g. Tavily web search) or clearly label tools as simulated.
3. **Secure the Clerk webhook** with Svix verification before anything else ships.
4. **Lock down `/api/generate-logo`** (auth + rate limit) or remove it.

### P1 — Close the "built but unwired" gaps
5. Add `/api/workflows/[id]` (GET/PUT/DELETE) + an execution-status route; rehydrate the canvas from saved workflows.
6. Make credits server-authoritative and atomic (decrement in the same transaction as enqueue, or reserve→settle); remove the client-side credit illusion.
7. Real billing (Stripe) or clearly mark plans as non-functional; stop showing "you'll be charged" copy.
8. Persist canvas (autosave / `persist`) and either wire `/api/chat` to `vyne-memory` or delete the dead chat vertical.
9. Generate deploy credentials server-side via `/api/keys`; persist and verify them.

### P2 — Hardening & quality
10. Add Zod validation to every route and to AI workflow output.
11. Fix DAG execution (honor real edges + fan-in via `stepOutputs`) or restrict the canvas to linear flows to match the engine.
12. Centralize and update the model id; unify Anthropic access on LangChain + `withRetry`; write `stepLogs` and stream progress.
13. Switch to `prisma migrate deploy`; slim the Docker image; collapse to one entrypoint.
14. Render hygiene: selector-based store subscriptions + debounced config writes.
15. Accessibility pass: focus traps, semantic buttons, labels, `aria-live` toasts, reduced-motion.
16. De-duplicate (config panels, pricing/plan cards, `formatRelativeTime`, sign-in/up, prompt builders).

### Quick wins (hours)
- Svix webhook verification · auth on `/api/generate-logo` · fix `graphJson` shape · add `GEMINI_API_KEY` to `.env.example` · fix `template-preview-modal` early-return · `AbortController` + timer cleanup in `vyne-chat` · guard `creditsTotal === 0` division · remove/standardize dead entrypoints.

---

## 10. Bottom line

Vyne has a polished editor and a thoughtfully structured codebase, but it is currently a **demo skin over disconnected systems**. The backend, queue, worker, and AI engine are written but not wired together (and would fail on a shape mismatch if they were); the AI agents can't use tools; and most "writes" (billing, credits, deploy credentials, settings, lifecycle) are client-side illusions. The highest-leverage work is **integration and a real agent runtime**, not new features — closing the gap between the many built-but-unconnected halves on each side of the API boundary.
