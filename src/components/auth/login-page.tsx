"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  Mail,
  Loader2,
  CheckCircle2,
  Sparkles,
  Zap,
  Users,
  Shield,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";

// ── GitHub icon (not in lucide) ──────────────────────────────────────
function GitHubIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

// ── Google icon ──────────────────────────────────────────────────────
function GoogleIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  );
}

// ── Vyne leaf/tendril logo mark (SVG) ─────────────────────────────────
function VyneLogo({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" className={className}>
      <path d="M20 38C20 38 20 28 20 22C20 16 16 12 12 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" fill="none" opacity="0.7" />
      <path d="M20 22C20 22 24 18 28 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5" />
      <path d="M8 4C8 4 2 12 6 20C10 28 20 22 20 22C20 22 12 22 8 16C4 10 8 4 8 4Z" fill="currentColor" opacity="0.9" />
      <path d="M28 10C28 10 34 14 32 20C30 26 22 24 22 24C22 24 28 22 30 18C32 14 28 10 28 10Z" fill="currentColor" opacity="0.6" />
      <circle cx="12" cy="7" r="2" fill="currentColor" opacity="0.4" />
    </svg>
  );
}

// ── Animated brand visual (left panel) ───────────────────────────────
function BrandVisual() {
  return (
    <div className="relative h-full bg-gradient-to-br from-[#3d6b4a] via-[#4a7c59] to-[#2d5a3a] overflow-hidden flex items-center justify-center">
      {/* Animated organic gradient orbs */}
      <div className="absolute inset-0">
        <motion.div
          className="absolute w-[500px] h-[500px] rounded-full bg-[#7fb685]/20 blur-[80px]"
          animate={{ x: [0, 60, -30, 0], y: [0, -40, 50, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "-10%", left: "-10%" }}
        />
        <motion.div
          className="absolute w-[400px] h-[400px] rounded-full bg-[#d4a84b]/12 blur-[60px]"
          animate={{ x: [0, -50, 30, 0], y: [0, 40, -30, 0] }}
          transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
          style={{ bottom: "-5%", right: "-5%" }}
        />
        <motion.div
          className="absolute w-[300px] h-[300px] rounded-full bg-[#8fbc8f]/15 blur-[50px]"
          animate={{ x: [0, 40, -20, 0], y: [0, -30, 40, 0] }}
          transition={{ duration: 11, repeat: Infinity, ease: "easeInOut" }}
          style={{ top: "40%", left: "30%" }}
        />
      </div>

      {/* Decorative vine tendrils */}
      <div className="absolute inset-0 opacity-[0.06]">
        <svg width="100%" height="100%" viewBox="0 0 400 600" preserveAspectRatio="none">
          <path d="M50,600 Q100,400 80,300 T120,100 T60,0" stroke="white" strokeWidth="1.5" fill="none" />
          <path d="M200,600 Q180,450 220,350 T180,150 T220,0" stroke="white" strokeWidth="1" fill="none" />
          <path d="M350,600 Q300,500 320,400 T280,200 T340,0" stroke="white" strokeWidth="1.5" fill="none" />
          <circle cx="80" cy="280" r="4" fill="white" opacity="0.5" />
          <circle cx="220" cy="330" r="3" fill="white" opacity="0.4" />
          <circle cx="320" cy="380" r="5" fill="white" opacity="0.3" />
        </svg>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center px-12 max-w-[420px]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="w-14 h-14 mx-auto mb-6 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/15">
            <VyneLogo size={30} className="text-white" />
          </div>

          <h1 className="text-[28px] font-bold text-white mb-3 leading-tight tracking-[-0.01em]">
            Grow AI Agent Teams<br />Visually
          </h1>
          <p className="text-[14px] text-white/65 leading-relaxed mb-8">
            Seed, connect, and cultivate multi-agent workflows — watch them grow from idea to deployment.
          </p>

          <div className="flex flex-col gap-3">
            {[
              { icon: <Users size={13} />, text: "2,400+ workflows cultivated" },
              { icon: <Zap size={13} />, text: "98.7% average success rate" },
              { icon: <Shield size={13} />, text: "SOC 2 compliant" },
            ].map((item) => (
              <div
                key={item.text}
                className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-white/8 backdrop-blur-sm border border-white/10"
              >
                <span className="text-white/50">{item.icon}</span>
                <span className="text-[12px] text-white/75 font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

// ── Magic Link sent state ────────────────────────────────────────────
function MagicLinkSent({ email, onConfirm, onBack }: { email: string; onConfirm: () => void; onBack: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center"
    >
      <div className="w-14 h-14 mx-auto mb-5 rounded-2xl bg-emerald-50 flex items-center justify-center">
        <CheckCircle2 size={24} className="text-[var(--vyne-success)]" />
      </div>
      <h3 className="text-[18px] font-bold text-[var(--vyne-text-primary)] mb-2">
        Check your inbox
      </h3>
      <p className="text-[13px] text-[var(--vyne-text-secondary)] mb-1">
        We sent a sign-in link to
      </p>
      <p className="text-[13px] font-semibold text-[var(--vyne-text-primary)] mb-6">
        {email}
      </p>

      <button
        onClick={onConfirm}
        className="w-full py-3 rounded-xl bg-[var(--vyne-accent)] text-white text-[13px] font-semibold
                   hover:opacity-90 transition-opacity shadow-sm mb-3"
      >
        I clicked the link (demo)
      </button>

      <button
        onClick={onBack}
        className="text-[12px] text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)] transition-colors"
      >
        Use a different method
      </button>
    </motion.div>
  );
}

// ── Main Login Page ──────────────────────────────────────────────────
export function LoginPage() {
  const {
    loginWithGoogle,
    loginWithGithub,
    sendMagicLink,
    confirmMagicLink,
    isLoading,
    authStep,
    setAuthStep,
  } = useAuthStore();

  const [email, setEmail] = useState("");
  const [magicLinkEmail, setMagicLinkEmail] = useState("");

  const handleMagicLink = async () => {
    if (!email.trim() || !email.includes("@")) return;
    setMagicLinkEmail(email);
    await sendMagicLink(email);
  };

  const handleConfirm = () => {
    confirmMagicLink();
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden">
      {/* Left — Brand visual */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="hidden lg:block w-[48%] shrink-0"
      >
        <BrandVisual />
      </motion.div>

      {/* Right — Auth form */}
      <motion.div
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="flex-1 flex items-center justify-center bg-white px-8"
      >
        <div className="w-full max-w-[380px]">
          <AnimatePresence mode="wait">
            {authStep === "magic-link-sent" ? (
              <MagicLinkSent
                key="magic-sent"
                email={magicLinkEmail}
                onConfirm={handleConfirm}
                onBack={() => setAuthStep("idle")}
              />
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* Header */}
                <div className="mb-8">
                  <div className="lg:hidden flex items-center gap-2 mb-6">
                    <div className="w-7 h-7 rounded-md bg-[var(--vyne-accent)] flex items-center justify-center">
                      <span className="text-white text-[12px] font-black">V</span>
                    </div>
                    <span className="text-[15px] font-bold text-[var(--vyne-text-primary)]">Vyne</span>
                  </div>
                  <h2 className="text-[22px] font-bold text-[var(--vyne-text-primary)] mb-1">
                    Welcome back
                  </h2>
                  <p className="text-[13px] text-[var(--vyne-text-secondary)]">
                    Sign in to continue building agent workflows
                  </p>
                </div>

                {/* SSO Buttons */}
                <div className="space-y-2.5 mb-5">
                  <button
                    onClick={loginWithGoogle}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                               bg-white border border-[var(--vyne-border)] text-[13px] font-semibold
                               text-[var(--vyne-text-primary)] hover:border-[var(--vyne-border-hover)]
                               hover:shadow-[var(--shadow-sm)] transition-all duration-150
                               disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isLoading && authStep === "loading" ? (
                      <Loader2 size={16} className="animate-spin text-[var(--vyne-text-tertiary)]" />
                    ) : (
                      <GoogleIcon size={18} />
                    )}
                    Continue with Google
                  </button>

                  <button
                    onClick={loginWithGithub}
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl
                               bg-[#1a1715] text-white text-[13px] font-semibold
                               hover:bg-[#2d2926] transition-colors duration-150
                               disabled:opacity-50 disabled:pointer-events-none"
                  >
                    {isLoading && authStep === "loading" ? (
                      <Loader2 size={16} className="animate-spin" />
                    ) : (
                      <GitHubIcon size={18} />
                    )}
                    Continue with GitHub
                  </button>
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 mb-5">
                  <div className="flex-1 h-px bg-[var(--vyne-border)]" />
                  <span className="text-[11px] text-[var(--vyne-text-tertiary)] font-medium uppercase tracking-wider">
                    or
                  </span>
                  <div className="flex-1 h-px bg-[var(--vyne-border)]" />
                </div>

                {/* Magic Link */}
                <div className="space-y-2.5 mb-6">
                  <div className="relative">
                    <Mail
                      size={15}
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--vyne-text-tertiary)]"
                    />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleMagicLink()}
                      placeholder="name@company.com"
                      disabled={isLoading}
                      className="w-full pl-10 pr-4 py-3 rounded-xl bg-[var(--vyne-bg)] border border-[var(--vyne-border)]
                                 text-[13px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                                 focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                                 focus:bg-white transition-all disabled:opacity-50"
                    />
                  </div>

                  <button
                    onClick={handleMagicLink}
                    disabled={isLoading || !email.trim() || !email.includes("@")}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl
                               bg-[var(--vyne-accent)] text-white text-[13px] font-semibold
                               hover:opacity-90 transition-all shadow-sm
                               disabled:opacity-40 disabled:pointer-events-none"
                  >
                    {authStep === "sending-magic-link" ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <Sparkles size={14} />
                    )}
                    Send Magic Link
                  </button>
                </div>

                {/* Footer */}
                <p className="text-[10px] text-[var(--vyne-text-tertiary)] text-center leading-relaxed">
                  By continuing, you agree to Vyne's Terms of Service and Privacy Policy.
                  No password needed — we'll send a secure sign-in link to your email.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
