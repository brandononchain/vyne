"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Settings,
  CreditCard,
  ChevronDown,
  ExternalLink,
} from "lucide-react";
import { useBillingStore, PLANS } from "@/store/billing-store";
import { useDeployStore } from "@/store/deploy-store";
import { useState } from "react";

export function UserDropdown() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const { creditsUsed, creditsTotal, currentPlan, openPricing } = useBillingStore();
  const { setCurrentView } = useDeployStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const remaining = creditsTotal - creditsUsed;
  const plan = PLANS.find((p) => p.tier === currentPlan);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [menuOpen]);

  if (!isLoaded || !user) return null;

  const name = user.fullName || user.firstName || "User";
  const email = user.primaryEmailAddress?.emailAddress || "";
  const initials = name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const avatarUrl = user.imageUrl;

  return (
    <div ref={dropdownRef} className="relative">
      <button
        onClick={() => setMenuOpen(!menuOpen)}
        className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg hover:bg-[var(--vyne-bg-warm)] transition-colors"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={name} className="w-[26px] h-[26px] rounded-full object-cover" />
        ) : (
          <div className="w-[26px] h-[26px] rounded-full bg-[var(--vyne-accent)] text-white flex items-center justify-center text-[10px] font-bold">
            {initials}
          </div>
        )}
        <ChevronDown
          size={12}
          className={`text-[var(--vyne-text-tertiary)] transition-transform duration-200 ${menuOpen ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+6px)] w-[260px] bg-white rounded-xl border border-[var(--vyne-border)] shadow-[var(--shadow-lg)] overflow-hidden z-50"
          >
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-[var(--vyne-border)]">
              <div className="flex items-center gap-2.5">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={name} className="w-8 h-8 rounded-full object-cover" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-[var(--vyne-accent)] text-white flex items-center justify-center text-[11px] font-bold">
                    {initials}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate">{name}</p>
                  <p className="text-[10px] text-[var(--vyne-text-tertiary)] truncate">{email}</p>
                </div>
              </div>
            </div>

            {/* Credits */}
            <div className="px-4 py-3 border-b border-[var(--vyne-border)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[var(--vyne-text-tertiary)] font-semibold uppercase tracking-wider">Credits</span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--vyne-accent-bg)] text-[var(--vyne-accent)]">
                  {plan?.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className="text-[16px] font-bold text-[var(--vyne-text-primary)]">{remaining.toLocaleString()}</span>
                <span className="text-[10px] text-[var(--vyne-text-tertiary)]">/ {creditsTotal.toLocaleString()} remaining</span>
              </div>
              <div className="h-1.5 rounded-full bg-[var(--vyne-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(2, (remaining / creditsTotal) * 100)}%`,
                    backgroundColor: remaining / creditsTotal > 0.4 ? "var(--vyne-success)" : remaining / creditsTotal > 0.15 ? "var(--vyne-warning)" : "var(--vyne-error)",
                  }}
                />
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <button
                onClick={() => { setMenuOpen(false); openPricing(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)] hover:text-[var(--vyne-text-primary)] transition-colors"
              >
                <CreditCard size={14} /> Manage Plan
              </button>
              <button
                onClick={() => { setMenuOpen(false); setCurrentView("settings"); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)] hover:text-[var(--vyne-text-primary)] transition-colors"
              >
                <Settings size={14} /> Account Settings
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-text-secondary)] hover:bg-[var(--vyne-bg-warm)] hover:text-[var(--vyne-text-primary)] transition-colors"
              >
                <ExternalLink size={14} /> API Documentation
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-[var(--vyne-border)] py-1.5">
              <button
                onClick={() => { setMenuOpen(false); signOut(); }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-error)] hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} /> Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
