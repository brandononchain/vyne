"use client";

import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LogOut,
  Settings,
  CreditCard,
  ChevronDown,
  User,
  ExternalLink,
} from "lucide-react";
import { useAuthStore } from "@/store/auth-store";
import { useBillingStore, PLANS } from "@/store/billing-store";

function UserAvatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      className="rounded-full bg-[var(--vyne-accent)] text-white flex items-center justify-center font-bold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {initials}
    </div>
  );
}

export function UserDropdown() {
  const { user, userMenuOpen, toggleUserMenu, closeUserMenu, logout } = useAuthStore();
  const { creditsUsed, creditsTotal, currentPlan, openPricing } = useBillingStore();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const remaining = creditsTotal - creditsUsed;
  const plan = PLANS.find((p) => p.tier === currentPlan);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        closeUserMenu();
      }
    };
    if (userMenuOpen) {
      document.addEventListener("mousedown", handler);
      return () => document.removeEventListener("mousedown", handler);
    }
  }, [userMenuOpen, closeUserMenu]);

  if (!user) return null;

  return (
    <div ref={dropdownRef} className="relative">
      {/* Trigger */}
      <button
        onClick={toggleUserMenu}
        className="flex items-center gap-2 pl-1.5 pr-2 py-1 rounded-lg
                   hover:bg-[var(--vyne-bg-warm)] transition-colors"
      >
        <UserAvatar name={user.name} size={26} />
        <ChevronDown
          size={12}
          className={`text-[var(--vyne-text-tertiary)] transition-transform duration-200 ${
            userMenuOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* Dropdown */}
      <AnimatePresence>
        {userMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            className="absolute right-0 top-[calc(100%+6px)] w-[260px] bg-white rounded-xl
                       border border-[var(--vyne-border)] shadow-[var(--shadow-lg)] overflow-hidden z-50"
          >
            {/* User info */}
            <div className="px-4 py-3.5 border-b border-[var(--vyne-border)]">
              <div className="flex items-center gap-2.5">
                <UserAvatar name={user.name} size={32} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate">
                    {user.name}
                  </p>
                  <p className="text-[10px] text-[var(--vyne-text-tertiary)] truncate">
                    {user.email}
                  </p>
                </div>
              </div>
            </div>

            {/* Credits section */}
            <div className="px-4 py-3 border-b border-[var(--vyne-border)]">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-[var(--vyne-text-tertiary)] font-semibold uppercase tracking-wider">
                  Credits
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--vyne-accent-bg)] text-[var(--vyne-accent)]">
                  {plan?.name}
                </span>
              </div>
              <div className="flex items-baseline gap-1 mb-1.5">
                <span className="text-[16px] font-bold text-[var(--vyne-text-primary)]">
                  {remaining.toLocaleString()}
                </span>
                <span className="text-[10px] text-[var(--vyne-text-tertiary)]">
                  / {creditsTotal.toLocaleString()} remaining
                </span>
              </div>
              {/* Mini progress bar */}
              <div className="h-1.5 rounded-full bg-[var(--vyne-bg)] overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(2, (remaining / creditsTotal) * 100)}%`,
                    backgroundColor:
                      remaining / creditsTotal > 0.4
                        ? "var(--vyne-success)"
                        : remaining / creditsTotal > 0.15
                        ? "var(--vyne-warning)"
                        : "var(--vyne-error)",
                  }}
                />
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <button
                onClick={() => {
                  closeUserMenu();
                  openPricing();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-text-secondary)]
                           hover:bg-[var(--vyne-bg-warm)] hover:text-[var(--vyne-text-primary)] transition-colors"
              >
                <CreditCard size={14} />
                Manage Plan
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-text-secondary)]
                           hover:bg-[var(--vyne-bg-warm)] hover:text-[var(--vyne-text-primary)] transition-colors"
              >
                <Settings size={14} />
                Account Settings
              </button>
              <button
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-text-secondary)]
                           hover:bg-[var(--vyne-bg-warm)] hover:text-[var(--vyne-text-primary)] transition-colors"
              >
                <ExternalLink size={14} />
                API Documentation
              </button>
            </div>

            {/* Logout */}
            <div className="border-t border-[var(--vyne-border)] py-1.5">
              <button
                onClick={() => {
                  closeUserMenu();
                  logout();
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-[12px] text-[var(--vyne-error)]
                           hover:bg-red-50 transition-colors"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
