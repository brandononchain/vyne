# Vyne — AI Agent Workflow Builder

> **No-code platform for building, testing, and deploying multi-agent AI workflows.**
> Drag agents onto a canvas, connect them, and execute with real language models — all from your browser.

![TechEx Hackathon](https://img.shields.io/badge/TechEx_Hackathon-2026-blue?style=for-the-badge) ![Next.js 16](https://img.shields.io/badge/Next.js-16-black?style=flat-square) ![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?style=flat-square) ![LangGraph](https://img.shields.io/badge/LangGraph-Agents-green?style=flat-square)

---

## What is Vyne?

Vyne turns enterprise AI workflows from code into a **visual canvas**. Non-technical users can build multi-agent systems by dragging and connecting nodes — then execute them with real LLMs in real time.

### The Problem
Enterprises want AI agents but lack the engineering bandwidth. Building a multi-agent workflow today requires Python, LangChain expertise, and weeks of iteration. Business teams can describe what they want but can't build it.

### The Solution
Vyne gives every team the power to:
1. **Design** — Drag agents, tasks, and tools onto a visual canvas
2. **Configure** — Set personas, goals, tone, and tool access per agent
3. **Execute** — Run with real AI (Claude Sonnet) and watch results stream live
4. **Deploy** — Ship as an API endpoint, webhook, or scheduled job

---

## Key Features

### Visual Workflow Canvas
React Flow-powered canvas with three node types: **Agents** (the thinkers), **Tasks** (the work units), and **Tools** (the capabilities). Connection validation ensures only logical workflows get built.

### Real AI Execution
Every workflow step calls Claude Sonnet via LangGraph. Results stream to the browser via Server-Sent Events — you literally watch agents think in real time. No mocks, no fake data.

### Enterprise Templates
Pre-built workflows for real business problems:
- **AI RFP Response Pipeline** — Analyzes RFPs, builds compliance matrices, drafts proposals
- **Customer Onboarding Intelligence** — Generates personalized 14-day plans from customer research
- **Competitive Intelligence Radar** — Monitors competitors and generates sales battle cards
- **Incident Response Autopilot** — Triages, investigates root cause, drafts status updates

### Graph Compiler
Topological sort (Kahn's algorithm) compiles visual graphs into executable LangGraph state machines. Each node becomes a step with proper message chaining, tool binding, and error handling.

### Production Infrastructure
- **Clerk** authentication with org-level workspaces
- **Prisma + PostgreSQL** with full schema (users, workflows, execution logs, versions)
- **BullMQ + Redis** job queue for background execution
- **Railway** deployment with Docker and nixpacks
- **Credits system** with usage tracking per execution

---

## Architecture

```
Browser (Next.js 16)
  Canvas (React Flow) ←→ Zustand Store ←→ Output Panel
                              |
                         SSE Stream
                              |
                    /api/workflows/stream
                              |
                    LangGraph Compiler
                   Step1 → Step2 → Step3
                     |        |       |
                  Claude   Claude   Claude
                  Sonnet   Sonnet   Sonnet
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16, React 19, React Flow, Framer Motion, Tailwind 4 |
| State | Zustand (workflow, deploy, billing stores) |
| AI Engine | LangChain, LangGraph, Claude Sonnet (Anthropic) |
| Auth | Clerk (user + org management) |
| Database | PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Deployment | Railway, Docker, nixpacks |
| Tools | Web Search (Tavily/DDG), URL Reader, API Connector, Code Executor |

---

## Getting Started

### Prerequisites
- Node.js 22.12+
- PostgreSQL database
- Redis (optional, for background jobs)

### Setup

```bash
git clone https://github.com/brandononchain/vyne.git
cd vyne
npm install
cp .env.example .env
# Fill in: DATABASE_URL, ANTHROPIC_API_KEY, CLERK keys
npx prisma db push
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```env
DATABASE_URL=postgresql://...
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
REDIS_URL=redis://... (optional)
TAVILY_API_KEY=tvly-... (optional, enhances web search)
```

---

## Project Structure

```
src/
├── app/api/
│   ├── workflows/stream/       # SSE real-time execution
│   ├── workflows/execute/      # BullMQ queue execution
│   ├── generate-workflow/      # AI workflow generation
│   └── chat/                   # Vyne copilot
├── components/
│   ├── canvas/                 # React Flow + custom nodes
│   ├── simulation/             # Live execution panel
│   ├── config-panel/           # Agent/task configuration
│   ├── templates/              # Template gallery
│   └── billing/                # Credits & pricing
├── lib/
│   ├── server/engine/          # LangGraph compiler + tools
│   ├── enterprise-templates.ts # Enterprise workflows
│   └── use-stream-execution.ts # SSE streaming hook
└── store/                      # Zustand state
```

---

## Hackathon

**Event:** TechEx Intelligent Enterprise Solutions Hackathon
**Dates:** May 11–19, 2026
**Venue:** AI & Big Data Expo NA, San Jose

| Criteria | How Vyne Delivers |
|----------|------------------|
| Model Integration | Multi-agent LLM orchestration via LangGraph with SSE streaming |
| Presentation | Live demo: goal → agents thinking → outputs cascading |
| Business Impact | Enterprise templates solving $100K+ pain points |
| Uniqueness | No-code agent builder with real execution |

---

## License

MIT

Built with 🌿 by [@brandononchain](https://github.com/brandononchain)
