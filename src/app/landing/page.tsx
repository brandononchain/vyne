"use client";

import React from "react";
import { motion, useInView } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Bot,
  Workflow,
  Zap,
  Shield,
  GitBranch,
  Play,
  Layers,
  Sparkles,
  MousePointerClick,
  Cable,
  Rocket,
  ChevronRight,
} from "lucide-react";

// ── Color palette matching workflow builder ────────────────────────────────
const COLORS = {
  bg: "#f8f9f4",
  bgWarm: "#f0f2ea",
  bgCard: "#ffffff",
  border: "#dde3d5",
  textPrimary: "#1a2316",
  textSecondary: "#4d5a45",
  textTertiary: "#8a9482",
  accentDark: "#4a7c59",
  accentLight: "#7fb685",
  accentBg: "#edf5ef",
  gold: "#d4a84b",
  goldBg: "#faf3e0",
  tool: "#7a9e7e",
  toolBg: "#eef4ef",
  success: "#5a9e6f",
  warning: "#d4a84b",
};

const ease = [0.22, 1, 0.36, 1] as const;

function SectionReveal({
  children,
  className = "",
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
}) {
  const ref = React.useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div
      ref={ref}
      className={className}
      initial={{ opacity: 0, y: 48 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.9, delay, ease }}
    >
      {children}
    </motion.div>
  );
}

// ── Grain texture (subtle on light background) ────────────────────────────
const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function Grain() {
  return (
    <div
      className="absolute inset-0 opacity-[0.015] mix-blend-overlay pointer-events-none z-[2]"
      style={{ backgroundImage: grainSvg }}
    />
  );
}

// ── Navbar ────────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50"
      initial={{ opacity: 0, y: -32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.1, ease }}
    >
      <div className="mx-auto max-w-[1200px] px-4 pt-4">
        <div
          className="rounded-2xl px-8 py-4 flex items-center justify-between
                     bg-white/50 backdrop-blur-xl border"
          style={{
            backgroundColor: `${COLORS.bg}80`,
            borderColor: COLORS.border,
          }}
        >
          <Link href="/" className="shrink-0 flex items-center gap-2.5">
            <Image
              src="/vyne-logo.svg"
              alt="Vyne"
              width={120}
              height={44}
              className="h-[36px] w-auto"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Pricing", "Docs"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-[13px] font-medium transition-colors duration-300 tracking-tight"
                style={{ color: COLORS.textSecondary }}
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden sm:inline-flex text-[13px] font-medium transition-colors duration-300 tracking-tight px-3 py-2"
              style={{ color: COLORS.textSecondary }}
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-5 py-2 rounded-xl text-[13px] font-semibold tracking-tight
                         text-white shadow-sm hover:shadow-md transition-shadow duration-300"
              style={{ backgroundColor: COLORS.accentDark }}
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Hero Section ──────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      className="relative min-h-screen flex items-center justify-center overflow-hidden pt-32"
      style={{ backgroundColor: COLORS.bg }}
    >
      {/* Subtle ambient glows */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 800,
            height: 800,
            top: "-20%",
            left: "-15%",
            background: `radial-gradient(circle, ${COLORS.accentDark}08 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full hidden lg:block"
          style={{
            width: 600,
            height: 600,
            bottom: "-10%",
            right: "-5%",
            background: `radial-gradient(circle, ${COLORS.gold}08 0%, transparent 70%)`,
          }}
          animate={{ scale: [1, 1.15, 1], rotate: [0, -3, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <Grain />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6 pb-24 text-center">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border mb-8"
          style={{
            backgroundColor: COLORS.accentBg,
            borderColor: COLORS.accentLight,
          }}
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
        >
          <Sparkles className="w-3.5 h-3.5" style={{ color: COLORS.accentDark }} />
          <span
            className="text-[12px] font-medium tracking-wide uppercase"
            style={{ color: COLORS.accentDark }}
          >
            Visual AI Orchestration
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          className="font-display text-[clamp(2.8rem,8vw,7.5rem)] leading-[0.9] tracking-[-0.035em] mb-6"
          style={{ color: COLORS.textPrimary }}
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease }}
        >
          Grow agentic
          <br />
          <span style={{ background: `linear-gradient(135deg, ${COLORS.accentDark}, ${COLORS.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            workflows
          </span>
          {" "}visually
        </motion.h1>

        {/* Sub copy */}
        <motion.p
          className="text-lg sm:text-xl max-w-[580px] mx-auto leading-relaxed mb-12 tracking-tight font-light"
          style={{ color: COLORS.textSecondary }}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
        >
          Drop agents, tasks, and tools onto a canvas. Connect them into
          intelligent pipelines. Deploy in one click — no code, no limits.
        </motion.p>

        {/* CTA row */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-20"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease }}
        >
          <Link
            href="/sign-up"
            className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl
                       text-white text-[15px] font-semibold tracking-tight shadow-lg
                       hover:shadow-xl transition-all duration-300"
            style={{ backgroundColor: COLORS.accentDark }}
          >
            Start Building — Free
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl text-[15px] font-medium tracking-tight
                       transition-all duration-300"
            style={{ color: COLORS.textSecondary }}
          >
            <Play className="w-4 h-4" />
            See How It Works
          </a>
        </motion.div>

        {/* Hero visual: Canvas mockup */}
        <motion.div
          className="relative mx-auto max-w-[900px]"
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 1.1, ease }}
        >
          {/* Glow behind the mockup */}
          <div
            className="absolute -inset-8 rounded-3xl opacity-40"
            style={{
              background: `radial-gradient(ellipse at 50% 50%, ${COLORS.accentDark}15 0%, transparent 70%)`,
            }}
          />

          {/* Mockup frame */}
          <div
            className="relative rounded-2xl border overflow-hidden shadow-lg"
            style={{
              backgroundColor: COLORS.bgCard,
              borderColor: COLORS.border,
            }}
          >
            {/* Title bar */}
            <div
              className="flex items-center gap-2 px-5 py-3 border-b"
              style={{
                borderColor: COLORS.border,
                backgroundColor: COLORS.bgWarm,
              }}
            >
              <div className="flex gap-1.5">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS.border }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS.border }}
                />
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: COLORS.border }}
                />
              </div>
              <span
                className="text-[11px] ml-3 tracking-tight"
                style={{ color: COLORS.textTertiary }}
              >
                my-workflow.vyne
              </span>
            </div>

            {/* Canvas area */}
            <div className="relative h-[320px] sm:h-[400px] p-6">
              {/* Dot grid */}
              <div
                className="absolute inset-0 opacity-30"
                style={{
                  backgroundImage: `radial-gradient(circle, ${COLORS.textTertiary}20 1px, transparent 1px)`,
                  backgroundSize: "24px 24px",
                }}
              />

              {/* Mock node: Agent */}
              <motion.div
                className="absolute top-8 left-8 sm:left-16 w-[200px] rounded-xl border p-4"
                style={{
                  backgroundColor: COLORS.accentBg,
                  borderColor: COLORS.accentDark,
                }}
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: COLORS.accentLight + "30" }}
                  >
                    <Bot className="w-3.5 h-3.5" style={{ color: COLORS.accentDark }} />
                  </div>
                  <span
                    className="text-sm font-medium tracking-tight"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Research Agent
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full animate-pulse"
                    style={{ backgroundColor: COLORS.accentLight }}
                  />
                  <span className="text-xs" style={{ color: COLORS.textTertiary }}>
                    Active
                  </span>
                </div>
              </motion.div>

              {/* Mock node: Task */}
              <motion.div
                className="absolute top-[120px] sm:top-[140px] left-[55%] sm:left-[45%] w-[180px] rounded-xl border p-4"
                style={{
                  backgroundColor: COLORS.goldBg,
                  borderColor: COLORS.gold,
                }}
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: COLORS.gold + "30" }}
                  >
                    <Layers className="w-3.5 h-3.5" style={{ color: COLORS.gold }} />
                  </div>
                  <span
                    className="text-sm font-medium tracking-tight"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Analyze Data
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: COLORS.gold }}
                  />
                  <span className="text-xs" style={{ color: COLORS.textTertiary }}>
                    Running
                  </span>
                </div>
              </motion.div>

              {/* Mock node: Tool */}
              <motion.div
                className="absolute bottom-8 left-[20%] sm:left-[25%] w-[170px] rounded-xl border p-4"
                style={{
                  backgroundColor: COLORS.toolBg,
                  borderColor: COLORS.tool,
                }}
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: COLORS.tool + "30" }}
                  >
                    <Zap className="w-3.5 h-3.5" style={{ color: COLORS.tool }} />
                  </div>
                  <span
                    className="text-sm font-medium tracking-tight"
                    style={{ color: COLORS.textPrimary }}
                  >
                    Web Search
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: COLORS.tool }}
                  />
                  <span className="text-xs" style={{ color: COLORS.textTertiary }}>
                    Ready
                  </span>
                </div>
              </motion.div>

              {/* Animated connection lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="mock-line" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor={COLORS.accentLight} stopOpacity="0.6" />
                    <stop offset="100%" stopColor={COLORS.gold} stopOpacity="0.3" />
                  </linearGradient>
                </defs>
                <motion.path
                  d="M 200 80 C 300 80, 350 180, 420 190"
                  stroke="url(#mock-line)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 1.5, ease: "easeOut" }}
                />
                <motion.path
                  d="M 380 230 C 340 280, 300 300, 260 310"
                  stroke="url(#mock-line)"
                  strokeWidth="1.5"
                  strokeDasharray="5 5"
                  fill="none"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 2, delay: 2, ease: "easeOut" }}
                />
              </svg>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Bottom gradient fade */}
      <div
        className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t z-[3]"
        style={{
          backgroundImage: `linear-gradient(to top, ${COLORS.bg}, transparent)`,
        }}
      />
    </section>
  );
}

// ── Logo strip ────────────────────────────────────────────────────────────

function LogoStrip() {
  const logos = ["Vercel", "Linear", "Notion", "Stripe", "Supabase"];
  return (
    <section
      className="relative py-16 border-t"
      style={{
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
      }}
    >
      <Grain />
      <SectionReveal className="text-center">
        <p
          className="text-[13px] font-medium tracking-widest uppercase mb-8"
          style={{ color: COLORS.textTertiary }}
        >
          Trusted by forward-thinking teams
        </p>
        <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap px-6">
          {logos.map((name) => (
            <span
              key={name}
              className="text-lg sm:text-xl font-semibold tracking-tight select-none"
              style={{ color: COLORS.textTertiary }}
            >
              {name}
            </span>
          ))}
        </div>
      </SectionReveal>
    </section>
  );
}

// ── Animated Feature Components ─────────────────────────────────────────

// Visual Canvas Builder - Animated canvas with dragging
function FeatureCanvasBuilder() {
  return (
    <div className="relative w-full h-64 rounded-xl border overflow-hidden"
      style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
      {/* Grid background */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: `linear-gradient(${COLORS.border}20 1px, transparent 1px), linear-gradient(90deg, ${COLORS.border}20 1px, transparent 1px)`,
          backgroundSize: "20px 20px",
        }}
      />
      {/* Animated nodes */}
      <motion.div
        className="absolute w-20 h-16 rounded-lg border flex items-center justify-center"
        style={{ backgroundColor: COLORS.accentBg, borderColor: COLORS.accentDark }}
        animate={{ x: [0, 30, 0], y: [0, -10, 0] }}
        transition={{ duration: 4, repeat: Infinity }}
      >
        <Bot size={24} style={{ color: COLORS.accentDark }} />
      </motion.div>
      <motion.div
        className="absolute w-20 h-16 rounded-lg border flex items-center justify-center"
        style={{ backgroundColor: COLORS.goldBg, borderColor: COLORS.gold, right: 40, top: 20 }}
        animate={{ x: [-30, 0, -30], y: [10, 0, 10] }}
        transition={{ duration: 5, repeat: Infinity, delay: 0.5 }}
      >
        <Layers size={24} style={{ color: COLORS.gold }} />
      </motion.div>
      {/* Animated connection */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <motion.line
          x1="80" y1="40" x2="160" y2="60"
          stroke={COLORS.accentLight}
          strokeWidth="2"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      </svg>
    </div>
  );
}

// Intelligent Agents - Animated agent cards
function FeatureIntelligentAgents() {
  return (
    <div className="relative w-full h-64 flex items-center justify-center gap-4 p-4">
      {["Claude", "GPT-4", "Llama"].map((model, i) => (
        <motion.div
          key={model}
          className="flex-1 rounded-lg border p-4 text-center"
          style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 3, repeat: Infinity, delay: i * 0.3 }}
        >
          <div
            className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center"
            style={{ backgroundColor: COLORS.accentBg }}
          >
            <Bot size={20} style={{ color: COLORS.accentDark }} />
          </div>
          <p className="text-sm font-semibold" style={{ color: COLORS.textPrimary }}>
            {model}
          </p>
          <p className="text-xs mt-1" style={{ color: COLORS.textTertiary }}>
            Powered
          </p>
        </motion.div>
      ))}
    </div>
  );
}

// Smart Connections - Animated data flow
function FeatureSmartConnections() {
  return (
    <div className="relative w-full h-64 rounded-xl border overflow-hidden"
      style={{ backgroundColor: COLORS.bgCard, borderColor: COLORS.border }}>
      <svg className="w-full h-full" preserveAspectRatio="xMidYMid slice">
        <defs>
          <linearGradient id="flow1" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={COLORS.gold} />
            <stop offset="100%" stopColor={COLORS.accentDark} />
          </linearGradient>
        </defs>
        {/* Multiple animated paths */}
        <motion.path
          d="M 50 50 Q 150 80 250 50"
          stroke="url(#flow1)"
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity }}
        />
        <motion.path
          d="M 50 150 Q 150 120 250 150"
          stroke={COLORS.accentLight}
          strokeWidth="3"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 3, repeat: Infinity, delay: 0.5 }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r="6"
          fill={COLORS.gold}
          animate={{ r: [6, 10, 6] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
        <motion.circle
          cx="250"
          cy="50"
          r="6"
          fill={COLORS.accentDark}
          animate={{ r: [6, 10, 6] }}
          transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
        />
      </svg>
    </div>
  );
}

// ── Enhanced Features Section ──────────────────────────────────────────────

const features = [
  {
    title: "Visual Canvas Builder",
    desc: "Drag agents, tasks, and tools onto an infinite canvas. Wire them together with intuitive connections.",
    component: FeatureCanvasBuilder,
    color: COLORS.accentDark,
    span: "col-span-1 sm:col-span-2 row-span-2",
  },
  {
    title: "Intelligent Agents",
    desc: "Pre-built agent archetypes powered by Claude, GPT, and open-source LLMs.",
    component: FeatureIntelligentAgents,
    color: COLORS.gold,
    span: "col-span-1 row-span-1",
  },
  {
    title: "Smart Connections",
    desc: "Type-safe data flows between nodes with automatic validation.",
    component: FeatureSmartConnections,
    color: COLORS.tool,
    span: "col-span-1 row-span-1",
  },
  {
    icon: Zap,
    title: "One-Click Deploy",
    desc: "Push workflows to production instantly with auto-scaling.",
    color: COLORS.accentLight,
    span: "col-span-1 row-span-1",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "SOC 2 compliant with role-based access and audit logs.",
    color: COLORS.accentDark,
    span: "col-span-1 row-span-1",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    desc: "Branch, diff, and merge agent configurations like code.",
    color: COLORS.gold,
    span: "col-span-1 sm:col-span-2 row-span-1",
  },
];

function FeaturesSection() {
  return (
    <section
      id="features"
      className="relative py-28 sm:py-36"
      style={{ backgroundColor: COLORS.bg }}
    >
      <Grain />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <SectionReveal className="text-center mb-16">
          <p
            className="text-[12px] font-semibold tracking-widest uppercase mb-4"
            style={{ color: COLORS.accentDark }}
          >
            Capabilities
          </p>
          <h2
            className="font-display text-4xl sm:text-5xl md:text-6xl tracking-[-0.03em] leading-[0.95] mb-5"
            style={{ color: COLORS.textPrimary }}
          >
            Everything you need to
            <br />
            <span style={{ background: `linear-gradient(135deg, ${COLORS.accentDark}, ${COLORS.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              orchestrate intelligence
            </span>
          </h2>
          <p
            className="text-lg max-w-[480px] mx-auto leading-relaxed tracking-tight"
            style={{ color: COLORS.textSecondary }}
          >
            A complete platform for building, testing, and deploying multi-agent systems.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            const Component = f.component;
            return (
              <SectionReveal key={f.title} delay={i * 0.08} className={f.span}>
                <div
                  className="group relative h-full rounded-2xl border p-7 hover:shadow-lg transition-all duration-500 cursor-pointer overflow-hidden"
                  style={{
                    backgroundColor: COLORS.bgCard,
                    borderColor: COLORS.border,
                  }}
                >
                  {/* Corner glow on hover */}
                  <div
                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                    style={{
                      background: `radial-gradient(circle, ${f.color}15 0%, transparent 70%)`,
                    }}
                  />

                  {Component ? (
                    <div className="mb-4 -mx-7 -mt-7 h-64 overflow-hidden rounded-t-xl">
                      <Component />
                    </div>
                  ) : Icon ? (
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center mb-5 border"
                      style={{
                        backgroundColor: `${f.color}12`,
                        borderColor: `${f.color}30`,
                      }}
                    >
                      <Icon className="w-5 h-5" style={{ color: f.color }} />
                    </div>
                  ) : null}

                  <h3
                    className="text-[17px] font-semibold tracking-tight mb-2"
                    style={{ color: COLORS.textPrimary }}
                  >
                    {f.title}
                  </h3>
                  <p
                    className="text-sm leading-relaxed tracking-tight"
                    style={{ color: COLORS.textSecondary }}
                  >
                    {f.desc}
                  </p>
                </div>
              </SectionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── How It Works ──────────────────────────────────────────────────────────

const steps = [
  {
    num: "01",
    title: "Design",
    desc: "Drag agents and tools onto the canvas. Configure each node's role and behavior.",
    icon: Workflow,
    color: COLORS.accentDark,
  },
  {
    num: "02",
    title: "Connect",
    desc: "Draw edges between nodes to define data flow with type-safe validation.",
    icon: Cable,
    color: COLORS.gold,
  },
  {
    num: "03",
    title: "Deploy",
    desc: "Hit deploy. Your workflow goes live with monitoring and auto-scaling.",
    icon: Rocket,
    color: COLORS.tool,
  },
];

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 sm:py-36 border-t"
      style={{
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
      }}
    >
      <Grain />

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-20"
        style={{
          background: `radial-gradient(ellipse, ${COLORS.accentDark}20 0%, transparent 70%)`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <SectionReveal className="text-center mb-20">
          <p
            className="text-[12px] font-semibold tracking-widest uppercase mb-4"
            style={{ color: COLORS.gold }}
          >
            Process
          </p>
          <h2
            className="font-display text-4xl sm:text-5xl md:text-6xl tracking-[-0.03em] leading-[0.95]"
            style={{ color: COLORS.textPrimary }}
          >
            Three steps to
            <br />
            <span style={{ background: `linear-gradient(135deg, ${COLORS.accentDark}, ${COLORS.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              production AI
            </span>
          </h2>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {steps.map((step, i) => {
            const Icon = step.icon;
            return (
              <SectionReveal key={step.num} delay={i * 0.15}>
                <div className="relative group">
                  {/* Step connector line (desktop) */}
                  {i < steps.length - 1 && (
                    <div
                      className="hidden md:block absolute top-12 -right-4 md:-right-5 w-8 md:w-10 h-px"
                      style={{
                        background: `linear-gradient(to right, ${COLORS.border}, transparent)`,
                      }}
                    />
                  )}

                  <div
                    className="flex flex-col items-start p-8 rounded-2xl border transition-all duration-500 hover:shadow-lg"
                    style={{
                      backgroundColor: COLORS.bgCard,
                      borderColor: COLORS.border,
                    }}
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center border"
                        style={{
                          backgroundColor: `${step.color}15`,
                          borderColor: `${step.color}30`,
                        }}
                      >
                        <Icon className="w-5 h-5" style={{ color: step.color }} />
                      </div>
                      <span
                        className="font-display text-5xl tracking-tight"
                        style={{ color: `${step.color}30` }}
                      >
                        {step.num}
                      </span>
                    </div>

                    <h3
                      className="text-xl font-semibold tracking-tight mb-3"
                      style={{ color: COLORS.textPrimary }}
                    >
                      {step.title}
                    </h3>
                    <p
                      className="text-sm leading-relaxed tracking-tight"
                      style={{ color: COLORS.textSecondary }}
                    >
                      {step.desc}
                    </p>
                  </div>
                </div>
              </SectionReveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ──────────────────────────────────────────────────────────

const testimonials = [
  {
    quote:
      "Vyne replaced three internal tools and our spaghetti of automations. AI pipeline from idea to production in an afternoon.",
    name: "Sarah Chen",
    role: "Head of AI, Meridian Labs",
  },
  {
    quote:
      "The visual canvas is addictive. You can literally see your agents thinking. Changed how our team reasons about AI.",
    name: "Marcus Rivera",
    role: "CTO, Dawnforge",
  },
  {
    quote:
      "We deployed 12 agent workflows in our first week. One-click deploy to production is genuinely magical.",
    name: "Anya Petrov",
    role: "Engineering Lead, Solaris AI",
  },
];

function TestimonialsSection() {
  return (
    <section
      className="relative py-28 sm:py-36 border-t"
      style={{
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
      }}
    >
      <Grain />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <SectionReveal className="text-center mb-16">
          <p
            className="text-[12px] font-semibold tracking-widest uppercase mb-4"
            style={{ color: COLORS.accentDark }}
          >
            Voices
          </p>
          <h2
            className="font-display text-4xl sm:text-5xl tracking-[-0.03em] leading-[0.95]"
            style={{ color: COLORS.textPrimary }}
          >
            Built for builders
          </h2>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <SectionReveal key={t.name} delay={i * 0.1}>
              <div
                className="flex flex-col justify-between h-full p-7 rounded-2xl border"
                style={{
                  backgroundColor: COLORS.bgCard,
                  borderColor: COLORS.border,
                }}
              >
                <p
                  className="font-display italic leading-relaxed mb-8 text-[17px]"
                  style={{ color: COLORS.textSecondary }}
                >
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p
                    className="text-sm font-semibold tracking-tight"
                    style={{ color: COLORS.textPrimary }}
                  >
                    {t.name}
                  </p>
                  <p className="text-xs tracking-tight mt-0.5" style={{ color: COLORS.textTertiary }}>
                    {t.role}
                  </p>
                </div>
              </div>
            </SectionReveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ─────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section
      className="relative py-32 sm:py-44"
      style={{ backgroundColor: COLORS.bg }}
    >
      <Grain />

      {/* Large ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px]"
        style={{
          background: `radial-gradient(ellipse, ${COLORS.accentDark}15 0%, transparent 60%)`,
        }}
      />

      <div className="relative z-10 mx-auto max-w-[700px] px-6 text-center">
        <SectionReveal>
          <h2
            className="font-display text-5xl sm:text-6xl md:text-7xl tracking-[-0.03em] leading-[0.9] mb-6"
            style={{ color: COLORS.textPrimary }}
          >
            Ready to grow
            <br />
            <span style={{ background: `linear-gradient(135deg, ${COLORS.accentDark}, ${COLORS.gold})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              something remarkable?
            </span>
          </h2>
          <p
            className="text-lg max-w-[440px] mx-auto leading-relaxed tracking-tight mb-10"
            style={{ color: COLORS.textSecondary }}
          >
            Join thousands of teams building the next generation of AI-powered workflows on Vyne.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center gap-2.5 px-10 py-5 rounded-2xl
                         text-white text-base font-semibold tracking-tight shadow-lg hover:shadow-xl transition-all"
              style={{ backgroundColor: COLORS.accentDark }}
            >
              Start Building — Free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/sign-in"
              className="text-[15px] font-medium tracking-tight px-4 py-2 transition-colors"
              style={{ color: COLORS.textSecondary }}
            >
              Sign In
            </Link>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────

function Footer() {
  const columns = [
    {
      title: "Product",
      links: ["Features", "Pricing", "Templates", "Changelog"],
    },
    { title: "Resources", links: ["Docs", "API Reference", "Blog", "Community"] },
    { title: "Company", links: ["About", "Careers", "Contact", "Legal"] },
  ];

  return (
    <footer
      className="relative border-t py-16"
      style={{
        backgroundColor: COLORS.bg,
        borderColor: COLORS.border,
      }}
    >
      <Grain />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/vyne-logo.svg"
              alt="Vyne"
              width={110}
              height={40}
              className="h-[30px] w-auto mb-4"
            />
            <p
              className="text-sm leading-relaxed tracking-tight max-w-[200px]"
              style={{ color: COLORS.textTertiary }}
            >
              Visual AI orchestration for modern teams.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p
                className="text-xs font-semibold tracking-widest uppercase mb-4"
                style={{ color: COLORS.textSecondary }}
              >
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-sm tracking-tight transition-colors duration-200"
                      style={{
                        color: COLORS.textTertiary,
                        textDecoration: "none",
                      }}
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div
          className="mt-14 pt-8 border-t flex flex-col sm:flex-row items-center justify-between gap-4"
          style={{ borderColor: COLORS.border }}
        >
          <p className="text-xs tracking-tight" style={{ color: COLORS.textTertiary }}>
            &copy; {new Date().getFullYear()} Vyne. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Twitter", "GitHub", "Discord"].map((s) => (
              <a
                key={s}
                href="#"
                className="text-xs tracking-tight transition-colors duration-200"
                style={{ color: COLORS.textTertiary }}
              >
                {s}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

// ── Main Landing Page ─────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div
      className="landing-page relative w-full text-white overflow-x-hidden"
      style={{ backgroundColor: COLORS.bg, color: COLORS.textPrimary }}
    >
      <Navbar />
      <HeroSection />
      <LogoStrip />
      <FeaturesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </div>
  );
}
