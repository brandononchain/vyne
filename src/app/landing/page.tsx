"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";

// ── Character-by-character animation ─────────────────────────────────

function AnimatedHeading({ text, delay = 200 }: { text: string; delay?: number }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <span className="inline-block" aria-label={text}>
      {text.split("").map((char, i) => (
        <span
          key={i}
          className="inline-block transition-all duration-500 ease-out"
          style={{
            transform: visible ? "translateX(0)" : "translateX(-18px)",
            opacity: visible ? 1 : 0,
            transitionDelay: `${i * 30}ms`,
          }}
        >
          {char === " " ? "\u00A0" : char}
        </span>
      ))}
    </span>
  );
}

// ── Fade-in wrapper ──────────────────────────────────────────────────

function FadeIn({
  children,
  delay = 0,
  duration = 1000,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(12px)",
        transition: `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`,
      }}
    >
      {children}
    </div>
  );
}

// ── Main Landing Page ────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#0a1208]">
      {/* ── Video Background ── */}
      <div className="absolute inset-0 z-0">
        {/* Screenpal embed as background */}
        <iframe
          src="https://go.screenpal.com/player/cOf1n9nTmWa?ff=1&autoplay=1&controls=0"
          className="absolute inset-0 w-full h-full border-0 pointer-events-none scale-[1.8] origin-center"
          allow="autoplay"
          style={{ filter: "brightness(0.35) saturate(1.2)" }}
        />
        {/* Gradient overlay for depth */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1208]/60 via-transparent to-[#0a1208]/90" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a1208]/50 via-transparent to-transparent" />
        {/* Subtle grain texture */}
        <div
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* ── Navbar ── */}
      <FadeIn delay={100} duration={800}>
        <nav className="relative z-20 mx-auto max-w-[1200px] mt-4 px-4">
          <div className="liquid-glass rounded-2xl px-6 py-3 flex items-center justify-between">
            {/* Logo */}
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

            {/* Nav Links */}
            <div className="hidden md:flex items-center gap-8">
              {["Company", "Enterprise", "Agents", "Resources"].map((item) => (
                <a
                  key={item}
                  href="#"
                  className="text-[13px] font-medium text-white/60 hover:text-white transition-colors duration-200 tracking-tight"
                >
                  {item}
                </a>
              ))}
            </div>

            {/* CTA */}
            <Link
              href="/sign-up"
              className="px-5 py-2 rounded-xl bg-[#4a7c59] text-white text-[13px] font-semibold
                         hover:bg-[#5a9e6f] transition-all duration-200 tracking-tight"
            >
              Start Building
            </Link>
          </div>
        </nav>
      </FadeIn>

      {/* ── Hero Content ── */}
      <div className="relative z-10 mx-auto max-w-[1200px] px-6 pt-[18vh] pb-24 min-h-[calc(100vh-80px)]">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-12 items-end h-full">
          {/* Left column */}
          <div className="flex flex-col justify-end">
            {/* Main Heading */}
            <h1 className="text-4xl sm:text-5xl md:text-6xl xl:text-7xl font-semibold text-white leading-[1.05] tracking-[-0.04em] mb-6">
              <AnimatedHeading text="AI Agents" delay={200} />
              <br />
              <AnimatedHeading text="that grow." delay={500} />
            </h1>

            {/* Subheading */}
            <FadeIn delay={800} duration={1000}>
              <p className="text-base sm:text-lg text-white/50 max-w-[480px] leading-relaxed mb-8 tracking-tight font-light">
                Seed agentic workflows to scale your business. Design, connect, and deploy multi-agent teams on a visual canvas — no code required.
              </p>
            </FadeIn>

            {/* Action Buttons */}
            <FadeIn delay={1200} duration={1000} className="flex items-center gap-3">
              <Link
                href="/sign-up"
                className="px-7 py-3.5 rounded-xl bg-[#4a7c59] text-white text-[14px] font-semibold
                           hover:bg-[#5a9e6f] transition-all duration-200 tracking-tight
                           shadow-[0_0_30px_rgba(74,124,89,0.3)]"
              >
                Start Building
              </Link>
              <a
                href="#"
                className="liquid-glass px-7 py-3.5 rounded-xl text-white/80 text-[14px] font-medium hover:text-white transition-all duration-200 tracking-tight border border-white/[0.08]"
              >
                Explore Workflows
              </a>
            </FadeIn>
          </div>

          {/* Right column — Tag */}
          <div className="hidden lg:flex flex-col items-end justify-end pb-2">
            <FadeIn delay={1400} duration={1000}>
              <div className="liquid-glass rounded-2xl px-8 py-5 border border-white/[0.08]">
                <p className="text-lg xl:text-2xl text-white/70 font-light tracking-tight italic">
                  Seed. Sprout. Grow.
                </p>
              </div>
            </FadeIn>
          </div>
        </div>
      </div>

      {/* ── Bottom fade ── */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a1208] to-transparent z-10" />
    </div>
  );
}
