"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ChevronDown, Bot, ListChecks, Wrench } from "lucide-react";

// ── Easing & shared transition config ────────────────────────────────

const ease = [0.25, 0.46, 0.45, 0.94] as const;

// ── Aurora Background ────────────────────────────────────────────────

const blobs = [
  {
    color: "#4a7c59",
    size: 600,
    opacity: 0.35,
    style: { top: "-10%", left: "-5%" } as React.CSSProperties,
    animate: { x: [0, 120, 40, 0], y: [0, 80, -40, 0] },
    duration: 22,
  },
  {
    color: "#7fb685",
    size: 500,
    opacity: 0.25,
    style: { top: "20%", right: "-10%" } as React.CSSProperties,
    animate: { x: [0, -80, 30, 0], y: [0, 60, -20, 0] },
    duration: 26,
  },
  {
    color: "#d4a84b",
    size: 400,
    opacity: 0.15,
    style: { bottom: "0%", left: "30%" } as React.CSSProperties,
    animate: { x: [0, 60, -40, 0], y: [0, -50, 30, 0] },
    duration: 20,
  },
  {
    color: "#5a9e6f",
    size: 350,
    opacity: 0.2,
    style: { top: "5%", right: "25%" } as React.CSSProperties,
    animate: { x: [0, -50, 70, 0], y: [0, 40, -60, 0] },
    duration: 18,
  },
];

function AuroraBackground() {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden">
      <div className="absolute inset-0 bg-[#0a1208]" />

      {blobs.map((blob, i) => (
        <motion.div
          key={i}
          className={`absolute rounded-full ${i >= 3 ? "hidden sm:block" : ""}`}
          style={{
            width: blob.size,
            height: blob.size,
            background: blob.color,
            opacity: blob.opacity,
            filter: "blur(130px)",
            ...blob.style,
          }}
          animate={blob.animate}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}

      {/* Radial vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#0a1208_70%)]" />

      {/* Grain texture */}
      <div
        className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

// ── Navbar ────────────────────────────────────────────────────────────

function Navbar() {
  return (
    <motion.nav
      className="relative z-20 mx-auto max-w-[1200px] mt-4 px-4"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 0.1, ease }}
    >
      <div className="liquid-glass rounded-2xl px-8 py-4 flex items-center justify-between shadow-[0_1px_0_0_rgba(127,182,133,0.1)]">
        <Link href="/" className="shrink-0">
          <Image
            src="/vyne-logo.png"
            alt="Vyne"
            width={88}
            height={36}
            className="h-[28px] w-auto brightness-0 invert opacity-90"
            priority
          />
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {["Company", "Enterprise", "Agents", "Resources"].map((item) => (
            <a
              key={item}
              href="#"
              className="text-sm font-medium text-white/50 hover:text-white transition-colors duration-200 tracking-tight"
            >
              {item}
            </a>
          ))}
        </div>

        <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
          <Link
            href="/sign-up"
            className="px-5 py-2.5 rounded-xl bg-[#4a7c59] text-white text-sm font-semibold
                       hover:bg-[#5a9e6f] transition-colors duration-200 tracking-tight"
          >
            Start Building
          </Link>
        </motion.div>
      </div>
    </motion.nav>
  );
}

// ── Floating Nodes Visual ────────────────────────────────────────────

const nodes = [
  {
    label: "Research Agent",
    status: "Active",
    icon: Bot,
    color: "#4a7c59",
    bgColor: "rgba(74, 124, 89, 0.15)",
    position: { top: 20, left: 30 },
    delay: 1.2,
    floatDuration: 4.5,
  },
  {
    label: "Analyze Data",
    status: "Running",
    icon: ListChecks,
    color: "#d4a84b",
    bgColor: "rgba(212, 168, 75, 0.15)",
    position: { top: 140, left: 220 },
    delay: 1.5,
    floatDuration: 5,
  },
  {
    label: "Web Search",
    status: "Ready",
    icon: Wrench,
    color: "#7a9e7e",
    bgColor: "rgba(122, 158, 126, 0.15)",
    position: { top: 270, left: 80 },
    delay: 1.8,
    floatDuration: 4,
  },
];

const connections = [
  { x1: 130, y1: 65, x2: 250, y2: 175 },
  { x1: 270, y1: 210, x2: 170, y2: 305 },
];

function FloatingNodes() {
  return (
    <div className="hidden lg:block relative w-[440px] h-[380px]">
      {/* SVG connection lines */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        viewBox="0 0 440 380"
      >
        <defs>
          <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#4a7c59" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#7fb685" stopOpacity="0.5" />
          </linearGradient>
        </defs>
        {connections.map((conn, i) => (
          <motion.path
            key={i}
            d={`M ${conn.x1} ${conn.y1} C ${(conn.x1 + conn.x2) / 2} ${conn.y1}, ${(conn.x1 + conn.x2) / 2} ${conn.y2}, ${conn.x2} ${conn.y2}`}
            stroke="url(#lineGrad)"
            strokeWidth={1.5}
            strokeDasharray="6 6"
            fill="none"
            initial={{ pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.2, delay: 1.4 + i * 0.3, ease: "easeOut" }}
          />
        ))}

        {/* Glowing endpoints */}
        {connections.flatMap((conn, i) => [
          <motion.circle
            key={`s-${i}`}
            cx={conn.x1}
            cy={conn.y1}
            r={3}
            fill="#7fb685"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.4, 0.8] }}
            transition={{
              duration: 3,
              delay: 1.6 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ filter: "drop-shadow(0 0 6px #7fb685)" }}
          />,
          <motion.circle
            key={`e-${i}`}
            cx={conn.x2}
            cy={conn.y2}
            r={3}
            fill="#7fb685"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.8, 0.4, 0.8] }}
            transition={{
              duration: 3,
              delay: 1.8 + i * 0.3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            style={{ filter: "drop-shadow(0 0 6px #7fb685)" }}
          />,
        ])}
      </svg>

      {/* Node cards */}
      {nodes.map((node) => {
        const Icon = node.icon;
        return (
          <motion.div
            key={node.label}
            className="absolute liquid-glass rounded-2xl px-5 py-4 border border-white/[0.08] w-[190px]
                       hover:border-white/[0.15] transition-colors duration-300"
            style={{ top: node.position.top, left: node.position.left }}
            initial={{ opacity: 0, y: 30, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: node.delay, ease }}
          >
            {/* Continuous float */}
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: node.floatDuration,
                repeat: Infinity,
                ease: "easeInOut",
              }}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ backgroundColor: node.bgColor }}
                >
                  <Icon className="w-4 h-4" style={{ color: node.color }} />
                </div>
                <span className="text-white/80 text-sm font-medium tracking-tight">
                  {node.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: node.color }}
                />
                <span className="text-white/40 text-xs tracking-tight">
                  {node.status}
                </span>
              </div>
            </motion.div>
          </motion.div>
        );
      })}
    </div>
  );
}

// ── Social Proof Bar ─────────────────────────────────────────────────

const logoWidths = [56, 72, 48, 64, 52, 68];

function SocialProofBar() {
  return (
    <motion.div
      className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6 mt-12"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 1, delay: 2.2 }}
    >
      <span className="text-white/25 text-sm tracking-tight whitespace-nowrap">
        Trusted by 500+ teams
      </span>
      <div className="flex items-center gap-4">
        {logoWidths.map((w, i) => (
          <div
            key={i}
            className="h-5 rounded bg-white/[0.06]"
            style={{ width: w }}
          />
        ))}
      </div>
    </motion.div>
  );
}

// ── Scroll Indicator ─────────────────────────────────────────────────

function ScrollIndicator() {
  return (
    <motion.div
      className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.8, delay: 2.5 }}
    >
      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <ChevronDown className="w-5 h-5 text-white/20" />
      </motion.div>
    </motion.div>
  );
}

// ── Main Landing Page ────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1208]">
      <AuroraBackground />

      <Navbar />

      {/* Hero Content */}
      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-[14vh] sm:pt-[16vh] lg:pt-[18vh] pb-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left column — Text */}
          <div className="flex flex-col">
            {/* Heading */}
            <motion.h1
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-8xl
                         text-white leading-[0.95] tracking-[-0.03em] mb-6"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3, ease }}
            >
              AI Agents that
            </motion.h1>
            <motion.h1
              className="font-display text-5xl sm:text-6xl md:text-7xl lg:text-[5.5rem] xl:text-8xl
                         leading-[0.95] tracking-[-0.03em] mb-8"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.5, ease }}
            >
              <span
                className="bg-clip-text text-transparent"
                style={{
                  backgroundImage:
                    "linear-gradient(135deg, #7fb685 0%, #d4a84b 100%)",
                }}
              >
                grow your business.
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              className="text-lg sm:text-xl text-white/45 max-w-[520px] leading-relaxed mb-10 tracking-tight font-light"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.8, ease }}
            >
              Design, connect, and deploy multi-agent workflows on a visual
              canvas. No code required. Seed agentic teams that scale.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 1.0, ease }}
            >
              <motion.div
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.98 }}
              >
                <Link
                  href="/sign-up"
                  className="group inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl
                             bg-[#4a7c59] text-white text-[15px] font-semibold tracking-tight
                             hover:bg-[#5a9e6f] transition-all duration-200
                             shadow-[0_0_40px_rgba(74,124,89,0.3)]"
                >
                  Start Building
                  <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </motion.div>

              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <a
                  href="#"
                  className="inline-flex items-center justify-center liquid-glass px-8 py-4 rounded-xl
                             text-white/70 text-[15px] font-medium tracking-tight
                             border border-white/[0.08] hover:text-white hover:border-white/[0.15]
                             transition-all duration-200"
                >
                  Explore Workflows
                </a>
              </motion.div>
            </motion.div>

            {/* Social Proof */}
            <SocialProofBar />
          </div>

          {/* Right column — Floating Nodes Visual */}
          <div className="hidden lg:flex justify-center items-center">
            <FloatingNodes />
          </div>
        </div>
      </div>

      <ScrollIndicator />

      {/* Bottom fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a1208] to-transparent z-[5]" />
    </div>
  );
}
