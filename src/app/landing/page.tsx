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
} from "lucide-react";

// ── Shared config ────────────────────────────────────────────────────

const ease = [0.22, 1, 0.36, 1] as const;
const DARK = "#060b04";

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

// ── Grain texture (reused) ───────────────────────────────────────────

const grainSvg = `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`;

function Grain() {
  return (
    <div
      className="absolute inset-0 opacity-[0.035] mix-blend-overlay pointer-events-none z-[2]"
      style={{ backgroundImage: grainSvg }}
    />
  );
}

// ── Organic tendril SVG decoration ───────────────────────────────────

function TendrilDecoration({ className = "" }: { className?: string }) {
  return (
    <svg
      className={`absolute pointer-events-none ${className}`}
      width="600"
      height="800"
      viewBox="0 0 600 800"
      fill="none"
    >
      <motion.path
        d="M 300 0 C 320 200, 100 300, 280 500 S 500 600, 300 800"
        stroke="url(#tendril-grad)"
        strokeWidth="1"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.3 }}
        transition={{ duration: 3, delay: 0.5, ease: "easeOut" }}
      />
      <motion.path
        d="M 280 100 C 350 280, 150 350, 320 520 S 480 650, 260 780"
        stroke="url(#tendril-grad)"
        strokeWidth="0.5"
        fill="none"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.15 }}
        transition={{ duration: 3.5, delay: 1, ease: "easeOut" }}
      />
      <defs>
        <linearGradient id="tendril-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7fb685" stopOpacity="0" />
          <stop offset="30%" stopColor="#7fb685" stopOpacity="1" />
          <stop offset="70%" stopColor="#4a7c59" stopOpacity="1" />
          <stop offset="100%" stopColor="#4a7c59" stopOpacity="0" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────

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
                     bg-[#060b04]/70 backdrop-blur-xl border border-white/[0.06]
                     shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
        >
          <Link href="/" className="shrink-0 flex items-center gap-2.5">
            <Image
              src="/vyne-logo.png"
              alt="Vyne"
              width={88}
              height={36}
              className="h-[26px] w-auto brightness-0 invert opacity-80"
              priority
            />
          </Link>

          <div className="hidden md:flex items-center gap-8">
            {["Features", "How It Works", "Pricing", "Docs"].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-[13px] font-medium text-white/40 hover:text-white/80
                           transition-colors duration-300 tracking-tight"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/sign-in"
              className="hidden sm:inline-flex text-[13px] font-medium text-white/40
                         hover:text-white/80 transition-colors duration-300 tracking-tight px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="px-5 py-2 rounded-xl text-[13px] font-semibold tracking-tight
                         bg-gradient-to-b from-[#5a9e6f] to-[#3d6b49]
                         text-white shadow-[0_1px_12px_rgba(74,124,89,0.4),inset_0_1px_0_rgba(255,255,255,0.15)]
                         hover:shadow-[0_1px_20px_rgba(74,124,89,0.6),inset_0_1px_0_rgba(255,255,255,0.15)]
                         transition-shadow duration-300"
            >
              Get Started
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Deep ambient glows */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 900,
            height: 900,
            top: "-20%",
            left: "-15%",
            background:
              "radial-gradient(circle, rgba(74,124,89,0.2) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full"
          style={{
            width: 700,
            height: 700,
            bottom: "-10%",
            right: "-10%",
            background:
              "radial-gradient(circle, rgba(212,168,75,0.1) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.15, 1], rotate: [0, -3, 0] }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute rounded-full hidden lg:block"
          style={{
            width: 500,
            height: 500,
            top: "30%",
            right: "5%",
            background:
              "radial-gradient(circle, rgba(127,182,133,0.08) 0%, transparent 70%)",
          }}
          animate={{ scale: [1, 1.2, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      <TendrilDecoration className="right-0 top-0 opacity-40 hidden xl:block" />

      <Grain />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6 pt-32 pb-24 text-center">
        {/* Badge */}
        <motion.div
          className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                     border border-[#4a7c59]/30 bg-[#4a7c59]/10 mb-8"
          initial={{ opacity: 0, y: 20, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
        >
          <Sparkles className="w-3.5 h-3.5 text-[#7fb685]" />
          <span className="text-[12px] font-medium text-[#7fb685] tracking-wide uppercase">
            Visual AI Orchestration
          </span>
        </motion.div>

        {/* Main heading */}
        <motion.h1
          className="font-display text-[clamp(2.8rem,8vw,7.5rem)] leading-[0.9] tracking-[-0.035em] text-white mb-6"
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.3, ease }}
        >
          Grow agentic
          <br />
          <span className="landing-gradient-text">workflows</span>
          {" "}visually
        </motion.h1>

        {/* Sub copy */}
        <motion.p
          className="text-lg sm:text-xl text-white/35 max-w-[580px] mx-auto leading-relaxed mb-12
                     tracking-tight font-light"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6, ease }}
        >
          Drop agents, tasks, and tools onto a canvas. Connect them into
          intelligent pipelines. Deploy in one click — no code, no limits.
        </motion.p>

        {/* CTA row */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.9, ease }}
        >
          <Link
            href="/sign-up"
            className="group relative inline-flex items-center gap-2.5 px-8 py-4 rounded-2xl
                       text-white text-[15px] font-semibold tracking-tight
                       bg-gradient-to-b from-[#5a9e6f] to-[#3a6847]
                       shadow-[0_0_60px_rgba(74,124,89,0.35),0_4px_16px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
                       hover:shadow-[0_0_80px_rgba(74,124,89,0.5),0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
                       transition-all duration-300"
          >
            Start Building — Free
            <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl
                       text-white/50 text-[15px] font-medium tracking-tight
                       hover:text-white/80 transition-colors duration-300"
          >
            <Play className="w-4 h-4" />
            See How It Works
          </a>
        </motion.div>

        {/* Hero visual: Canvas mockup */}
        <motion.div
          className="relative mt-20 mx-auto max-w-[900px]"
          initial={{ opacity: 0, y: 80, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 1.2, delay: 1.1, ease }}
        >
          {/* Glow behind the mockup */}
          <div
            className="absolute -inset-8 rounded-3xl opacity-60"
            style={{
              background:
                "radial-gradient(ellipse at 50% 50%, rgba(74,124,89,0.15) 0%, transparent 70%)",
            }}
          />

          {/* Mockup frame */}
          <div
            className="relative rounded-2xl border border-white/[0.08] overflow-hidden
                        bg-[#0c1309]/80 backdrop-blur-sm
                        shadow-[0_24px_80px_-12px_rgba(0,0,0,0.6)]"
          >
            {/* Title bar */}
            <div className="flex items-center gap-2 px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
              <div className="flex gap-1.5">
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
                <div className="w-2.5 h-2.5 rounded-full bg-white/10" />
              </div>
              <span className="text-[11px] text-white/20 ml-3 tracking-tight">
                my-workflow.vyne
              </span>
            </div>

            {/* Canvas area */}
            <div className="relative h-[320px] sm:h-[400px] p-6">
              {/* Dot grid */}
              <div
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage:
                    "radial-gradient(circle, rgba(255,255,255,0.15) 1px, transparent 1px)",
                  backgroundSize: "24px 24px",
                }}
              />

              {/* Mock node: Agent */}
              <motion.div
                className="absolute top-8 left-8 sm:left-16 w-[200px] rounded-xl border border-[#4a7c59]/30 bg-[#4a7c59]/10 p-4"
                animate={{ y: [0, -6, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[#4a7c59]/20 flex items-center justify-center">
                    <Bot className="w-3.5 h-3.5 text-[#7fb685]" />
                  </div>
                  <span className="text-white/70 text-sm font-medium tracking-tight">
                    Research Agent
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7fb685] animate-pulse" />
                  <span className="text-white/30 text-xs">Active</span>
                </div>
              </motion.div>

              {/* Mock node: Task */}
              <motion.div
                className="absolute top-[120px] sm:top-[140px] left-[55%] sm:left-[45%] w-[180px] rounded-xl
                           border border-[#d4a84b]/30 bg-[#d4a84b]/10 p-4"
                animate={{ y: [0, -8, 0] }}
                transition={{
                  duration: 6,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 0.5,
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[#d4a84b]/20 flex items-center justify-center">
                    <Layers className="w-3.5 h-3.5 text-[#d4a84b]" />
                  </div>
                  <span className="text-white/70 text-sm font-medium tracking-tight">
                    Analyze Data
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#d4a84b]" />
                  <span className="text-white/30 text-xs">Running</span>
                </div>
              </motion.div>

              {/* Mock node: Tool */}
              <motion.div
                className="absolute bottom-8 left-[20%] sm:left-[25%] w-[170px] rounded-xl
                           border border-[#7a9e7e]/30 bg-[#7a9e7e]/10 p-4"
                animate={{ y: [0, -5, 0] }}
                transition={{
                  duration: 4.5,
                  repeat: Infinity,
                  ease: "easeInOut",
                  delay: 1,
                }}
              >
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-7 h-7 rounded-lg bg-[#7a9e7e]/20 flex items-center justify-center">
                    <Zap className="w-3.5 h-3.5 text-[#7a9e7e]" />
                  </div>
                  <span className="text-white/70 text-sm font-medium tracking-tight">
                    Web Search
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#7a9e7e]" />
                  <span className="text-white/30 text-xs">Ready</span>
                </div>
              </motion.div>

              {/* Animated connection lines */}
              <svg
                className="absolute inset-0 w-full h-full pointer-events-none"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="mock-line" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#7fb685" stopOpacity="0.6" />
                    <stop offset="100%" stopColor="#d4a84b" stopOpacity="0.3" />
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
      <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#060b04] to-transparent z-[3]" />
    </section>
  );
}

// ── Logo strip ───────────────────────────────────────────────────────

function LogoStrip() {
  const logos = ["Vercel", "Linear", "Notion", "Stripe", "Supabase"];
  return (
    <section className="relative py-16 border-t border-white/[0.04]">
      <Grain />
      <SectionReveal className="text-center">
        <p className="text-[13px] font-medium text-white/20 tracking-widest uppercase mb-8">
          Trusted by forward-thinking teams
        </p>
        <div className="flex items-center justify-center gap-10 sm:gap-16 flex-wrap px-6">
          {logos.map((name) => (
            <span
              key={name}
              className="text-white/[0.12] text-lg sm:text-xl font-semibold tracking-tight select-none"
            >
              {name}
            </span>
          ))}
        </div>
      </SectionReveal>
    </section>
  );
}

// ── Features bento grid ──────────────────────────────────────────────

const features = [
  {
    icon: MousePointerClick,
    title: "Visual Canvas Builder",
    desc: "Drag agents, tasks, and tools onto an infinite canvas. Wire them together with intuitive connections.",
    color: "#7fb685",
    span: "col-span-1 sm:col-span-2 row-span-1",
  },
  {
    icon: Bot,
    title: "Intelligent Agents",
    desc: "Pre-built agent archetypes powered by Claude, GPT, and open-source LLMs. Customize personality, tools, and memory.",
    color: "#4a7c59",
    span: "col-span-1 row-span-1",
  },
  {
    icon: Cable,
    title: "Smart Connections",
    desc: "Type-safe data flows between nodes. Vyne validates compatibility and suggests optimal routing.",
    color: "#d4a84b",
    span: "col-span-1 row-span-1",
  },
  {
    icon: Zap,
    title: "One-Click Deploy",
    desc: "Push workflows to production instantly. Auto-scaling infrastructure handles the rest.",
    color: "#7fb685",
    span: "col-span-1 row-span-1",
  },
  {
    icon: Shield,
    title: "Enterprise Security",
    desc: "SOC 2 compliant. Role-based access, audit logs, and data isolation built in.",
    color: "#4a7c59",
    span: "col-span-1 row-span-1",
  },
  {
    icon: GitBranch,
    title: "Version Control",
    desc: "Every workflow change is tracked. Branch, diff, and merge agent configurations like code.",
    color: "#d4a84b",
    span: "col-span-1 sm:col-span-2 row-span-1",
  },
];

function FeaturesSection() {
  return (
    <section id="features" className="relative py-28 sm:py-36">
      <Grain />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <SectionReveal className="text-center mb-16">
          <p className="text-[12px] font-semibold tracking-widest uppercase text-[#7fb685]/60 mb-4">
            Capabilities
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white tracking-[-0.03em] leading-[0.95] mb-5">
            Everything you need to
            <br />
            <span className="landing-gradient-text">orchestrate intelligence</span>
          </h2>
          <p className="text-white/30 text-lg max-w-[480px] mx-auto leading-relaxed tracking-tight">
            A complete platform for building, testing, and deploying
            multi-agent systems.
          </p>
        </SectionReveal>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <SectionReveal key={f.title} delay={i * 0.08} className={f.span}>
                <div
                  className="group relative h-full rounded-2xl border border-white/[0.06] p-7
                             bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.1]
                             transition-all duration-500 overflow-hidden"
                >
                  {/* Subtle corner glow on hover */}
                  <div
                    className="absolute -top-12 -right-12 w-32 h-32 rounded-full opacity-0 group-hover:opacity-100
                               transition-opacity duration-700"
                    style={{
                      background: `radial-gradient(circle, ${f.color}15 0%, transparent 70%)`,
                    }}
                  />
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-5
                               border border-white/[0.06]"
                    style={{ backgroundColor: `${f.color}12` }}
                  >
                    <Icon className="w-5 h-5" style={{ color: f.color }} />
                  </div>
                  <h3 className="text-white text-[17px] font-semibold tracking-tight mb-2">
                    {f.title}
                  </h3>
                  <p className="text-white/30 text-sm leading-relaxed tracking-tight">
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

// ── How It Works ─────────────────────────────────────────────────────

const steps = [
  {
    num: "01",
    title: "Design",
    desc: "Drag agents and tools onto the canvas. Configure each node's role, model, and behavior.",
    icon: Workflow,
    color: "#7fb685",
  },
  {
    num: "02",
    title: "Connect",
    desc: "Draw edges between nodes to define data flow. Vyne validates types and suggests optimal paths.",
    icon: Cable,
    color: "#d4a84b",
  },
  {
    num: "03",
    title: "Deploy",
    desc: "Hit deploy. Your workflow goes live on managed infrastructure with monitoring and auto-scaling.",
    icon: Rocket,
    color: "#4a7c59",
  },
];

function HowItWorksSection() {
  return (
    <section
      id="how-it-works"
      className="relative py-28 sm:py-36 border-t border-white/[0.04]"
    >
      <Grain />

      {/* Ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-30"
        style={{
          background:
            "radial-gradient(ellipse, rgba(74,124,89,0.12) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <SectionReveal className="text-center mb-20">
          <p className="text-[12px] font-semibold tracking-widest uppercase text-[#d4a84b]/60 mb-4">
            Process
          </p>
          <h2 className="font-display text-4xl sm:text-5xl md:text-6xl text-white tracking-[-0.03em] leading-[0.95]">
            Three steps to
            <br />
            <span className="landing-gradient-text">production AI</span>
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
                      className="hidden md:block absolute top-12 -right-4 md:-right-5 w-8 md:w-10 h-px
                                 bg-gradient-to-r from-white/10 to-transparent"
                    />
                  )}

                  <div
                    className="flex flex-col items-start p-8 rounded-2xl border border-white/[0.06]
                               bg-white/[0.015] hover:bg-white/[0.03] transition-all duration-500"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div
                        className="w-12 h-12 rounded-2xl flex items-center justify-center
                                   border border-white/[0.08]"
                        style={{ backgroundColor: `${step.color}12` }}
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

                    <h3 className="text-white text-xl font-semibold tracking-tight mb-3">
                      {step.title}
                    </h3>
                    <p className="text-white/30 text-sm leading-relaxed tracking-tight">
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

// ── Testimonials ─────────────────────────────────────────────────────

const testimonials = [
  {
    quote:
      "Vyne replaced three internal tools and a spaghetti of Zapier automations. Our AI pipeline went from idea to production in an afternoon.",
    name: "Sarah Chen",
    role: "Head of AI, Meridian Labs",
  },
  {
    quote:
      "The visual canvas is addictive. You can literally see your agents thinking. It changed how our entire team reasons about AI systems.",
    name: "Marcus Rivera",
    role: "CTO, Dawnforge",
  },
  {
    quote:
      "We deployed 12 agent workflows in our first week. The one-click deploy to production is genuinely magical.",
    name: "Anya Petrov",
    role: "Engineering Lead, Solaris AI",
  },
];

function TestimonialsSection() {
  return (
    <section className="relative py-28 sm:py-36 border-t border-white/[0.04]">
      <Grain />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <SectionReveal className="text-center mb-16">
          <p className="text-[12px] font-semibold tracking-widest uppercase text-[#7fb685]/60 mb-4">
            Voices
          </p>
          <h2 className="font-display text-4xl sm:text-5xl text-white tracking-[-0.03em] leading-[0.95]">
            Built for builders
          </h2>
        </SectionReveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <SectionReveal key={t.name} delay={i * 0.1}>
              <div
                className="flex flex-col justify-between h-full p-7 rounded-2xl
                           border border-white/[0.06] bg-white/[0.02]"
              >
                <p className="font-display text-white/60 text-[17px] italic leading-relaxed mb-8">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div>
                  <p className="text-white/80 text-sm font-semibold tracking-tight">
                    {t.name}
                  </p>
                  <p className="text-white/25 text-xs tracking-tight mt-0.5">
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

// ── Final CTA ────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section className="relative py-32 sm:py-44">
      <Grain />

      {/* Large ambient glow */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[1000px] h-[600px]"
        style={{
          background:
            "radial-gradient(ellipse, rgba(74,124,89,0.12) 0%, transparent 60%)",
        }}
      />

      <div className="relative z-10 mx-auto max-w-[700px] px-6 text-center">
        <SectionReveal>
          <h2 className="font-display text-5xl sm:text-6xl md:text-7xl text-white tracking-[-0.03em] leading-[0.9] mb-6">
            Ready to grow
            <br />
            <span className="landing-gradient-text">something remarkable?</span>
          </h2>
          <p className="text-white/30 text-lg max-w-[440px] mx-auto leading-relaxed tracking-tight mb-10">
            Join thousands of teams building the next generation of AI-powered
            workflows on Vyne.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/sign-up"
              className="group relative inline-flex items-center gap-2.5 px-10 py-5 rounded-2xl
                         text-white text-base font-semibold tracking-tight
                         bg-gradient-to-b from-[#5a9e6f] to-[#3a6847]
                         shadow-[0_0_80px_rgba(74,124,89,0.3),0_4px_20px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.15)]
                         hover:shadow-[0_0_120px_rgba(74,124,89,0.5),0_4px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.2)]
                         transition-all duration-300"
            >
              Start Building — Free
              <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1" />
            </Link>
            <Link
              href="/sign-in"
              className="text-white/40 text-[15px] font-medium tracking-tight
                         hover:text-white/70 transition-colors duration-300 px-4 py-2"
            >
              Sign In
            </Link>
          </div>
        </SectionReveal>
      </div>
    </section>
  );
}

// ── Footer ───────────────────────────────────────────────────────────

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
    <footer className="relative border-t border-white/[0.04] py-16">
      <Grain />
      <div className="relative z-10 mx-auto max-w-[1100px] px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Image
              src="/vyne-logo.png"
              alt="Vyne"
              width={80}
              height={32}
              className="h-[22px] w-auto brightness-0 invert opacity-60 mb-4"
            />
            <p className="text-white/20 text-sm leading-relaxed tracking-tight max-w-[200px]">
              Visual AI orchestration for modern teams.
            </p>
          </div>

          {columns.map((col) => (
            <div key={col.title}>
              <p className="text-white/40 text-xs font-semibold tracking-widest uppercase mb-4">
                {col.title}
              </p>
              <ul className="space-y-2.5">
                {col.links.map((link) => (
                  <li key={link}>
                    <a
                      href="#"
                      className="text-white/20 text-sm tracking-tight hover:text-white/50
                                 transition-colors duration-200"
                    >
                      {link}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-14 pt-8 border-t border-white/[0.04] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/15 text-xs tracking-tight">
            &copy; {new Date().getFullYear()} Vyne. All rights reserved.
          </p>
          <div className="flex gap-6">
            {["Twitter", "GitHub", "Discord"].map((s) => (
              <a
                key={s}
                href="#"
                className="text-white/15 text-xs tracking-tight hover:text-white/40 transition-colors duration-200"
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

// ── Main Landing Page ────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="landing-page relative w-full bg-[#060b04] text-white overflow-x-hidden">
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
