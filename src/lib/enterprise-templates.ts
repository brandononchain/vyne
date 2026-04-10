/**
 * ── Enterprise Workflow Templates ───────────────────────────────────
 *
 * Production-ready workflow templates designed for the TechEx
 * Intelligent Enterprise Solutions Hackathon.
 *
 * Each template targets a specific enterprise use case that resonates
 * with Fortune 500 judges at AI & Big Data Expo North America.
 *
 * Judging criteria targeted:
 * - Model Integration: Deep multi-agent LLM orchestration
 * - Business Impact: Real enterprise pain points with measurable ROI
 * - Uniqueness: Novel agent architectures and tool combinations
 * - Presentation: Visually stunning canvas layouts
 */

import type { VyneNode, VyneEdge, AgentNodeData, TaskNodeData } from "./types";
import { DEFAULT_AGENT_PERSONA, DEFAULT_TASK_CONFIG } from "./types";
import type { WorkflowTemplate } from "./workflow-templates";

export const enterpriseTemplates: WorkflowTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════
  // 1. AUTOMATED RFP RESPONSE PIPELINE
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "enterprise-rfp-response",
    name: "AI RFP Response Pipeline",
    description:
      "Analyzes incoming RFPs, matches requirements against your capabilities, drafts a professional proposal, and sends it for review — reducing 40 hours of manual work to 15 minutes.",
    icon: "FileText",
    color: "#4a7c59",
    complexity: "advanced",
    timeSaved: "~40 hours",
    category: "enterprise",
    tags: ["enterprise", "sales", "rfp", "proposal", "automation"],
    tools: [
      "web-search",
      "url-reader",
      "text-editor",
      "grammar-checker",
      "email-client",
    ],
    nodes: [
      // Agent 1: RFP Analyst
      {
        id: "ent-rfp-1",
        type: "agentNode",
        position: { x: 80, y: 180 },
        data: {
          type: "agent",
          templateId: "web-researcher",
          name: "RFP Analyst",
          role: "Requirements Extraction Specialist",
          description:
            "Reads and deconstructs RFP documents, extracting key requirements, evaluation criteria, deadlines, and compliance needs.",
          icon: "FileSearch",
          color: "#4a7c59",
          tools: ["url-reader"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Extract every requirement, deadline, and evaluation criterion from the RFP with zero misses",
            backstory:
              "Former procurement officer who has reviewed 500+ RFPs and knows exactly what buyers look for in responses",
            tone: "analytical",
          },
          status: "idle",
        } as AgentNodeData,
      },
      // Task 1: Requirements Matrix
      {
        id: "ent-rfp-2",
        type: "taskNode",
        position: { x: 460, y: 100 },
        data: {
          type: "task",
          templateId: "research-report",
          name: "Requirements Matrix",
          description:
            "Build a structured requirements compliance matrix mapping each RFP requirement to our capabilities.",
          icon: "ListChecks",
          color: "#d4a84b",
          expectedInput: "Extracted RFP requirements and evaluation criteria",
          expectedOutput:
            "JSON compliance matrix with requirement, capability match, gap analysis, and confidence score",
          config: {
            ...DEFAULT_TASK_CONFIG,
            detailedInstructions:
              "For each requirement: 1) State the requirement verbatim, 2) Rate compliance (Full/Partial/Gap), 3) Provide evidence from our capabilities, 4) Note any gaps that need addressing. Output as structured JSON.",
            outputFormat: "json",
          },
          status: "pending",
        } as TaskNodeData,
      },
      // Agent 2: Proposal Writer
      {
        id: "ent-rfp-3",
        type: "agentNode",
        position: { x: 800, y: 180 },
        data: {
          type: "agent",
          templateId: "content-writer",
          name: "Proposal Writer",
          role: "Senior Proposal Manager",
          description:
            "Crafts compelling, professional RFP responses that address every requirement with persuasive language.",
          icon: "PenTool",
          color: "#b8694a",
          tools: ["text-editor", "grammar-checker"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Write a winning proposal that directly addresses every requirement with concrete evidence and persuasive framing",
            backstory:
              "Award-winning proposal writer with a 78% win rate on enterprise deals over $1M",
            tone: "professional",
          },
          status: "idle",
        } as AgentNodeData,
      },
      // Task 2: Draft Proposal
      {
        id: "ent-rfp-4",
        type: "taskNode",
        position: { x: 1140, y: 100 },
        data: {
          type: "task",
          templateId: "blog-post",
          name: "Draft Executive Proposal",
          description:
            "Write the complete proposal document with executive summary, technical approach, team qualifications, and pricing framework.",
          icon: "FileEdit",
          color: "#d4a84b",
          expectedInput: "Requirements compliance matrix with gap analysis",
          expectedOutput:
            "Complete proposal document in markdown with sections: Executive Summary, Technical Approach, Compliance Matrix, Team & Qualifications, Timeline, Pricing Framework",
          config: {
            ...DEFAULT_TASK_CONFIG,
            detailedInstructions:
              "Structure: 1) Executive Summary (2 paragraphs), 2) Understanding of Requirements, 3) Technical Approach (address each requirement), 4) Team Qualifications, 5) Implementation Timeline, 6) Pricing Framework. Use confident, active voice. Reference specific compliance scores.",
            outputFormat: "markdown",
          },
          status: "pending",
        } as TaskNodeData,
      },
      // Agent 3: QA Reviewer
      {
        id: "ent-rfp-5",
        type: "agentNode",
        position: { x: 1480, y: 180 },
        data: {
          type: "agent",
          templateId: "project-manager",
          name: "Compliance Reviewer",
          role: "Quality Assurance Lead",
          description:
            "Reviews the proposal for completeness, compliance gaps, tone consistency, and competitive positioning.",
          icon: "ShieldCheck",
          color: "#5a9e6f",
          tools: ["grammar-checker"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Ensure the proposal is 100% compliant, error-free, and competitively positioned to win",
            backstory:
              "ISO 9001 certified quality manager who catches the details others miss",
            tone: "concise",
          },
          status: "idle",
        } as AgentNodeData,
      },
      // Task 3: QA Report
      {
        id: "ent-rfp-6",
        type: "taskNode",
        position: { x: 1820, y: 100 },
        data: {
          type: "task",
          templateId: "qa-review",
          name: "Compliance QA Report",
          description:
            "Final quality check with compliance score, risk flags, and recommended improvements.",
          icon: "Activity",
          color: "#5a9e6f",
          expectedInput: "Draft proposal document",
          expectedOutput:
            "QA report with overall compliance score (%), list of issues found, severity ratings, and the final polished proposal",
          config: {
            ...DEFAULT_TASK_CONFIG,
            detailedInstructions:
              "Check: 1) All RFP requirements addressed, 2) No grammar/spelling errors, 3) Consistent tone, 4) Competitive differentiators highlighted, 5) Pricing is realistic. Output a compliance score and the corrected proposal.",
            outputFormat: "markdown",
          },
          status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      {
        id: "ent-rfp-e1",
        source: "ent-rfp-1",
        target: "ent-rfp-2",
        type: "vyneEdge",
        animated: true,
      },
      {
        id: "ent-rfp-e2",
        source: "ent-rfp-2",
        target: "ent-rfp-3",
        type: "vyneEdge",
        animated: true,
      },
      {
        id: "ent-rfp-e3",
        source: "ent-rfp-3",
        target: "ent-rfp-4",
        type: "vyneEdge",
        animated: true,
      },
      {
        id: "ent-rfp-e4",
        source: "ent-rfp-4",
        target: "ent-rfp-5",
        type: "vyneEdge",
        animated: true,
      },
      {
        id: "ent-rfp-e5",
        source: "ent-rfp-5",
        target: "ent-rfp-6",
        type: "vyneEdge",
        animated: true,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 2. CUSTOMER ONBOARDING INTELLIGENCE
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "enterprise-customer-onboarding",
    name: "AI Customer Onboarding Pipeline",
    description:
      "Generates personalized onboarding sequences, welcome documentation, and training plans based on customer profile analysis — turning 90-day ramp to 14 days.",
    icon: "Wand2",
    color: "#0984e3",
    complexity: "advanced",
    timeSaved: "~76 days",
    category: "enterprise",
    tags: ["enterprise", "onboarding", "customer-success", "personalization"],
    tools: [
      "web-search",
      "text-editor",
      "email-client",
      "csv-reader",
    ],
    nodes: [
      {
        id: "ent-onb-1",
        type: "agentNode",
        position: { x: 80, y: 160 },
        data: {
          type: "agent",
          templateId: "web-researcher",
          name: "Customer Intel Agent",
          role: "Customer Research Analyst",
          description:
            "Researches the new customer's industry, company size, tech stack, and key stakeholders to build a customer profile.",
          icon: "Search",
          color: "#0984e3",
          tools: ["web-search", "url-reader"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Build a comprehensive customer profile that enables hyper-personalized onboarding",
            backstory:
              "Customer success strategist who has onboarded 200+ enterprise accounts",
            tone: "analytical",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-onb-2",
        type: "taskNode",
        position: { x: 460, y: 80 },
        data: {
          type: "task",
          templateId: "research-report",
          name: "Customer Profile Report",
          description: "Structured profile with industry context, pain points, and success metrics.",
          icon: "FileSearch",
          color: "#d4a84b",
          expectedInput: "Customer name, domain, and contract details",
          expectedOutput:
            "Structured JSON profile: industry, company size, tech stack, key stakeholders, likely pain points, success metrics, competitor products they may have used",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "json",
            detailedInstructions:
              "Research the company website, LinkedIn, press releases. Identify: 1) Industry vertical, 2) Employee count, 3) Tech stack signals, 4) Recent news, 5) Likely use cases for our product, 6) Key success metrics for their role.",
          },
          status: "pending",
        } as TaskNodeData,
      },
      {
        id: "ent-onb-3",
        type: "agentNode",
        position: { x: 800, y: 160 },
        data: {
          type: "agent",
          templateId: "content-writer",
          name: "Onboarding Architect",
          role: "Customer Success Strategist",
          description:
            "Designs a personalized 14-day onboarding plan with milestones, training modules, and success checkpoints.",
          icon: "Wand2",
          color: "#b8694a",
          tools: ["text-editor"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Create an onboarding plan so good the customer achieves their first value milestone in 5 days",
            backstory:
              "Built the onboarding framework that increased activation rates by 340% at a $2B SaaS company",
            tone: "friendly",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-onb-4",
        type: "taskNode",
        position: { x: 1140, y: 80 },
        data: {
          type: "task",
          templateId: "blog-post",
          name: "14-Day Onboarding Plan",
          description:
            "Personalized day-by-day plan with training modules, success checkpoints, and escalation triggers.",
          icon: "ListChecks",
          color: "#d4a84b",
          expectedInput: "Customer profile with industry, pain points, and success metrics",
          expectedOutput:
            "Day-by-day plan (14 days) with: daily objectives, training resources, hands-on exercises, checkpoint criteria, CSM touchpoint schedule",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "markdown",
            detailedInstructions:
              "Week 1: Foundation (account setup, core features, first integration). Week 2: Expansion (advanced features, team rollout, first ROI measurement). Include specific milestones and 'at-risk' triggers for each day.",
          },
          status: "pending",
        } as TaskNodeData,
      },
      {
        id: "ent-onb-5",
        type: "agentNode",
        position: { x: 1480, y: 160 },
        data: {
          type: "agent",
          templateId: "email-assistant",
          name: "Welcome Sequence Writer",
          role: "Email Marketing Specialist",
          description:
            "Crafts a 5-email welcome sequence personalized to the customer's industry and use case.",
          icon: "Mail",
          color: "#e84393",
          tools: ["text-editor", "grammar-checker", "email-client"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Write emails so personalized the customer feels like they have a dedicated success partner",
            tone: "friendly",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-onb-6",
        type: "taskNode",
        position: { x: 1820, y: 80 },
        data: {
          type: "task",
          templateId: "email-draft",
          name: "Welcome Email Sequence",
          description: "5-email drip sequence: Welcome, Quick Win, Deep Dive, Team Invite, ROI Check-in.",
          icon: "Send",
          color: "#e84393",
          expectedInput: "Customer profile and onboarding plan",
          expectedOutput:
            "5 complete emails with subject lines, body copy, and CTA buttons — personalized to customer's industry and goals",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "markdown",
            detailedInstructions:
              "Email 1 (Day 0): Welcome + quick setup guide. Email 2 (Day 2): First quick win tutorial. Email 3 (Day 5): Deep dive into their top use case. Email 4 (Day 8): Invite team members. Email 5 (Day 14): ROI check-in + expansion opportunities.",
          },
          status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "ent-onb-e1", source: "ent-onb-1", target: "ent-onb-2", type: "vyneEdge", animated: true },
      { id: "ent-onb-e2", source: "ent-onb-2", target: "ent-onb-3", type: "vyneEdge", animated: true },
      { id: "ent-onb-e3", source: "ent-onb-3", target: "ent-onb-4", type: "vyneEdge", animated: true },
      { id: "ent-onb-e4", source: "ent-onb-4", target: "ent-onb-5", type: "vyneEdge", animated: true },
      { id: "ent-onb-e5", source: "ent-onb-5", target: "ent-onb-6", type: "vyneEdge", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 3. COMPETITIVE INTELLIGENCE RADAR
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "enterprise-competitive-intel",
    name: "Competitive Intelligence Radar",
    description:
      "Monitors competitor activity, analyzes product launches and pricing changes, and generates actionable battle cards for your sales team.",
    icon: "Activity",
    color: "#e84393",
    complexity: "intermediate",
    timeSaved: "~8 hours/week",
    category: "enterprise",
    tags: ["enterprise", "competitive-intel", "sales-enablement", "research"],
    tools: ["web-search", "url-reader", "text-editor", "chart-generator"],
    nodes: [
      {
        id: "ent-ci-1",
        type: "agentNode",
        position: { x: 80, y: 140 },
        data: {
          type: "agent",
          templateId: "web-researcher",
          name: "Market Scanner",
          role: "Competitive Intelligence Analyst",
          description:
            "Scans the web for competitor news, product updates, pricing changes, and executive movements.",
          icon: "Globe",
          color: "#4a7c59",
          tools: ["web-search", "url-reader"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Find every significant competitor move in the last 30 days — pricing changes, product launches, funding rounds, key hires, partnerships",
            backstory:
              "Former strategy consultant at McKinsey who ran competitive intelligence for Fortune 100 clients",
            tone: "analytical",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-ci-2",
        type: "taskNode",
        position: { x: 460, y: 60 },
        data: {
          type: "task",
          templateId: "research-report",
          name: "Competitive Signals Report",
          description: "Structured analysis of all competitor activities detected.",
          icon: "FileSearch",
          color: "#d4a84b",
          expectedInput: "List of competitors to monitor",
          expectedOutput:
            "Structured report: competitor name, signal type (product/pricing/hiring/funding), summary, impact assessment (low/medium/high), recommended response",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "markdown",
            detailedInstructions:
              "For each competitor: 1) Latest product updates, 2) Pricing/packaging changes, 3) Funding or M&A, 4) Key hires, 5) Marketing campaigns. Rate each signal's threat level.",
          },
          status: "pending",
        } as TaskNodeData,
      },
      {
        id: "ent-ci-3",
        type: "agentNode",
        position: { x: 800, y: 140 },
        data: {
          type: "agent",
          templateId: "data-analyst",
          name: "Strategy Analyst",
          role: "Strategic Positioning Expert",
          description:
            "Synthesizes competitive signals into strategic recommendations and battle card content.",
          icon: "BarChart3",
          color: "#0984e3",
          tools: ["text-editor", "chart-generator"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Turn raw competitive intelligence into actionable sales weapons — battle cards, objection handlers, and win/loss insights",
            backstory:
              "Product marketing leader who increased win rates against top competitors by 23%",
            tone: "concise",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-ci-4",
        type: "taskNode",
        position: { x: 1140, y: 60 },
        data: {
          type: "task",
          templateId: "blog-post",
          name: "Sales Battle Cards",
          description:
            "Generate one-page battle cards for each competitor with positioning, objection handling, and win themes.",
          icon: "FileText",
          color: "#b8694a",
          expectedInput: "Competitive signals report with threat assessments",
          expectedOutput:
            "Per-competitor battle cards: Positioning statement, 3 key differentiators, Top 5 objection responses, Recommended trap questions, Win/loss themes",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "markdown",
            detailedInstructions:
              "For each competitor create a battle card: 1) Their pitch vs ours, 2) Where we win (with proof points), 3) Where they win (with mitigation), 4) Killer questions to ask prospects, 5) Common objections with responses.",
          },
          status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "ent-ci-e1", source: "ent-ci-1", target: "ent-ci-2", type: "vyneEdge", animated: true },
      { id: "ent-ci-e2", source: "ent-ci-2", target: "ent-ci-3", type: "vyneEdge", animated: true },
      { id: "ent-ci-e3", source: "ent-ci-3", target: "ent-ci-4", type: "vyneEdge", animated: true },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════
  // 4. INCIDENT RESPONSE AUTOPILOT
  // ═══════════════════════════════════════════════════════════════════
  {
    id: "enterprise-incident-response",
    name: "Incident Response Autopilot",
    description:
      "When an incident fires, this workflow triages severity, investigates root cause, drafts a status page update, and creates a post-mortem — all in under 2 minutes.",
    icon: "ShieldCheck",
    color: "#e74c3c",
    complexity: "advanced",
    timeSaved: "~4 hours per incident",
    category: "enterprise",
    tags: ["enterprise", "devops", "incident-response", "sre", "cybersecurity"],
    tools: ["web-search", "code-executor", "text-editor", "email-client"],
    nodes: [
      {
        id: "ent-ir-1",
        type: "agentNode",
        position: { x: 80, y: 180 },
        data: {
          type: "agent",
          templateId: "data-analyst",
          name: "Triage Agent",
          role: "Incident Triage Specialist",
          description:
            "Analyzes incoming alert data, classifies severity (P1-P4), identifies affected services, and determines blast radius.",
          icon: "Activity",
          color: "#e74c3c",
          tools: ["code-executor"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Accurately classify incident severity and blast radius within 30 seconds",
            backstory:
              "Staff SRE who has triaged 2,000+ production incidents at a hyperscaler",
            tone: "concise",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-ir-2",
        type: "taskNode",
        position: { x: 460, y: 100 },
        data: {
          type: "task",
          templateId: "data-analysis",
          name: "Severity Classification",
          description: "Classify severity, identify affected services, estimate user impact.",
          icon: "ListChecks",
          color: "#e74c3c",
          expectedInput: "Alert payload with error messages, metrics, and timestamps",
          expectedOutput:
            "JSON: severity (P1-P4), affected services, estimated user impact %, blast radius, recommended response team",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "json",
            detailedInstructions:
              "P1: Revenue-impacting, >50% users affected. P2: Major degradation, 10-50% users. P3: Minor issue, <10% users. P4: Cosmetic/non-urgent. Include: services affected, error rate, latency impact.",
          },
          status: "pending",
        } as TaskNodeData,
      },
      {
        id: "ent-ir-3",
        type: "agentNode",
        position: { x: 800, y: 180 },
        data: {
          type: "agent",
          templateId: "code-developer",
          name: "Root Cause Investigator",
          role: "Senior SRE / Debugging Specialist",
          description:
            "Analyzes error patterns, recent deployments, and infrastructure changes to identify probable root cause.",
          icon: "Code2",
          color: "#5a9e6f",
          tools: ["code-executor", "web-search"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Identify the most likely root cause and provide a concrete remediation path",
            backstory:
              "Debugging expert who can read stack traces like poetry and has seen every failure mode",
            tone: "analytical",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-ir-4",
        type: "taskNode",
        position: { x: 1140, y: 100 },
        data: {
          type: "task",
          templateId: "research-report",
          name: "Root Cause Analysis",
          description: "Investigate and document the probable root cause with evidence.",
          icon: "FileSearch",
          color: "#d4a84b",
          expectedInput: "Severity classification and alert details",
          expectedOutput:
            "Root cause analysis: probable cause, evidence, contributing factors, immediate fix, long-term remediation",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "markdown",
            detailedInstructions:
              "Analyze: 1) Error patterns, 2) Recent deployment changes, 3) Infrastructure anomalies, 4) Dependency failures. Provide: hypothesis, evidence, confidence level, and step-by-step remediation.",
          },
          status: "pending",
        } as TaskNodeData,
      },
      {
        id: "ent-ir-5",
        type: "agentNode",
        position: { x: 1480, y: 180 },
        data: {
          type: "agent",
          templateId: "content-writer",
          name: "Comms Drafter",
          role: "Incident Communications Lead",
          description:
            "Drafts customer-facing status page updates and internal post-mortem documents.",
          icon: "PenTool",
          color: "#b8694a",
          tools: ["text-editor", "email-client"],
          persona: {
            ...DEFAULT_AGENT_PERSONA,
            goal: "Write clear, empathetic status updates that maintain customer trust during incidents",
            backstory:
              "Communications lead who managed public comms for 50+ P1 incidents at a public company",
            tone: "professional",
          },
          status: "idle",
        } as AgentNodeData,
      },
      {
        id: "ent-ir-6",
        type: "taskNode",
        position: { x: 1820, y: 100 },
        data: {
          type: "task",
          templateId: "blog-post",
          name: "Status Update + Post-Mortem Draft",
          description:
            "Customer-facing status update and internal post-mortem template.",
          icon: "FileEdit",
          color: "#b8694a",
          expectedInput: "Root cause analysis and severity classification",
          expectedOutput:
            "Two documents: 1) Status page update (customer-facing, 3 paragraphs), 2) Post-mortem draft (timeline, root cause, impact, action items)",
          config: {
            ...DEFAULT_TASK_CONFIG,
            outputFormat: "markdown",
            detailedInstructions:
              "Status Update: Acknowledge → Explain → Resolve timeline. No blame, no jargon. Post-Mortem: Timeline of events, root cause, impact metrics, 5 Whys analysis, action items with owners and deadlines.",
          },
          status: "pending",
        } as TaskNodeData,
      },
    ],
    edges: [
      { id: "ent-ir-e1", source: "ent-ir-1", target: "ent-ir-2", type: "vyneEdge", animated: true },
      { id: "ent-ir-e2", source: "ent-ir-2", target: "ent-ir-3", type: "vyneEdge", animated: true },
      { id: "ent-ir-e3", source: "ent-ir-3", target: "ent-ir-4", type: "vyneEdge", animated: true },
      { id: "ent-ir-e4", source: "ent-ir-4", target: "ent-ir-5", type: "vyneEdge", animated: true },
      { id: "ent-ir-e5", source: "ent-ir-5", target: "ent-ir-6", type: "vyneEdge", animated: true },
    ],
  },
];

/**
 * Get all enterprise templates merged with standard templates.
 */
export function getAllTemplates(
  standardTemplates: WorkflowTemplate[]
): WorkflowTemplate[] {
  return [...enterpriseTemplates, ...standardTemplates];
}
