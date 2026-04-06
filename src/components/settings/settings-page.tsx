"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  User,
  Building2,
  Key,
  Bell,
  Shield,
  Camera,
  Copy,
  Check,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  ExternalLink,
  Leaf,
  Globe,
  Mail,
} from "lucide-react";
import { useUser } from "@clerk/nextjs";
import { useBillingStore, PLANS } from "@/store/billing-store";
import { useDeployStore } from "@/store/deploy-store";

// ── Types ────────────────────────────────────────────────────────────

type SettingsTab = "profile" | "organization" | "api-keys" | "notifications";

interface ApiKeyEntry {
  id: string;
  name: string;
  key: string;
  createdAt: string;
  lastUsed: string | null;
}

// ── Reusable form components ─────────────────────────────────────────

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div className="mb-1.5">
      <label className="text-[12px] font-semibold text-[var(--vyne-text-primary)]">{children}</label>
      {hint && <p className="text-[10px] text-[var(--vyne-text-tertiary)] mt-0.5">{hint}</p>}
    </div>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  disabled,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      disabled={disabled}
      className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
                 text-[13px] text-[var(--vyne-text-primary)] placeholder:text-[var(--vyne-text-tertiary)]
                 focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    />
  );
}

function SectionCard({ children, title, description }: { children: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[var(--vyne-border)] shadow-[var(--shadow-sm)]">
      <div className="px-6 py-4 border-b border-[var(--vyne-border)]">
        <h3 className="text-[14px] font-bold text-[var(--vyne-text-primary)]">{title}</h3>
        {description && <p className="text-[11px] text-[var(--vyne-text-tertiary)] mt-0.5">{description}</p>}
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  );
}

function SaveBar({ dirty, onSave, onDiscard }: { dirty: boolean; onSave: () => void; onDiscard: () => void }) {
  if (!dirty) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="sticky bottom-4 mx-auto w-fit flex items-center gap-3 px-5 py-2.5 rounded-2xl
                 bg-white border border-[var(--vyne-border)] shadow-[var(--shadow-lg)] z-20"
    >
      <span className="text-[12px] text-[var(--vyne-text-secondary)]">You have unsaved changes</span>
      <button onClick={onDiscard} className="px-3 py-1.5 rounded-xl text-[12px] font-medium text-[var(--vyne-text-tertiary)] hover:bg-[var(--vyne-bg-warm)] transition-colors">
        Discard
      </button>
      <button onClick={onSave} className="px-4 py-1.5 rounded-xl text-[12px] font-semibold bg-[var(--vyne-accent)] text-white hover:opacity-90 transition-opacity shadow-sm">
        Save Changes
      </button>
    </motion.div>
  );
}

// ── Copy button ──────────────────────────────────────────────────────

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
      className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-accent)] hover:bg-[var(--vyne-accent-bg)] transition-all"
    >
      {copied ? <Check size={13} className="text-[var(--vyne-success)]" /> : <Copy size={13} />}
    </button>
  );
}

// ── Profile Tab ──────────────────────────────────────────────────────

function ProfileTab() {
  const { user } = useUser();
  const userName = user?.fullName || user?.firstName || "User";
  const userEmail = user?.primaryEmailAddress?.emailAddress || "";
  const userAvatar = user?.imageUrl;
  const [name, setName] = useState(userName);
  const [email] = useState(userEmail);
  const [timezone, setTimezone] = useState("America/Chicago");
  const [dirty, setDirty] = useState(false);

  const initials = userName
    .split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="space-y-5">
      <SectionCard title="Profile Information" description="Your personal info visible to your team.">
        <div className="flex items-start gap-6 mb-6">
          {/* Avatar */}
          <div className="relative group">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="w-20 h-20 rounded-2xl object-cover" />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-[var(--vyne-accent)] text-white flex items-center justify-center text-[24px] font-bold">
                {initials}
              </div>
            )}
            <button className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Camera size={18} className="text-white" />
            </button>
          </div>
          <div className="flex-1 pt-1">
            <p className="text-[14px] font-semibold text-[var(--vyne-text-primary)]">{userName}</p>
            <p className="text-[12px] text-[var(--vyne-text-tertiary)] mb-2">{userEmail}</p>
            <div className="flex items-center gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[var(--vyne-accent-bg)] text-[10px] font-semibold text-[var(--vyne-accent)]">
                <Leaf size={9} /> {user?.externalAccounts?.[0]?.provider || "Email"}
              </span>
              <span className="text-[10px] text-[var(--vyne-text-tertiary)]">
                Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" }) : "Recently"}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Full Name</FieldLabel>
            <TextInput value={name} onChange={(v) => { setName(v); setDirty(true); }} placeholder="Your name" />
          </div>
          <div>
            <FieldLabel hint="Managed by your auth provider">Email Address</FieldLabel>
            <TextInput value={email} onChange={() => {}} disabled />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Preferences" description="Customize your Vyne experience.">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel>Timezone</FieldLabel>
            <select
              value={timezone}
              onChange={(e) => { setTimezone(e.target.value); setDirty(true); }}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
                         text-[13px] text-[var(--vyne-text-primary)]
                         focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                         transition-all appearance-none"
            >
              <option value="America/New_York">Eastern (ET)</option>
              <option value="America/Chicago">Central (CT)</option>
              <option value="America/Denver">Mountain (MT)</option>
              <option value="America/Los_Angeles">Pacific (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Berlin">Central Europe (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
            </select>
          </div>
          <div>
            <FieldLabel>Default Workflow View</FieldLabel>
            <select
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-[var(--vyne-border)]
                         text-[13px] text-[var(--vyne-text-primary)]
                         focus:outline-none focus:border-[var(--vyne-accent)] focus:ring-2 focus:ring-[var(--vyne-accent-glow)]
                         transition-all appearance-none"
              defaultValue="canvas"
            >
              <option value="canvas">Canvas (Builder)</option>
              <option value="dashboard">Dashboard</option>
              <option value="templates">Templates</option>
            </select>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Danger Zone" description="Irreversible actions for your account.">
        <div className="flex items-center justify-between p-4 rounded-xl border border-red-200 bg-red-50/50">
          <div>
            <p className="text-[13px] font-semibold text-[var(--vyne-text-primary)]">Delete Account</p>
            <p className="text-[11px] text-[var(--vyne-text-tertiary)]">Permanently remove your account and all data. This cannot be undone.</p>
          </div>
          <button className="px-4 py-2 rounded-xl text-[12px] font-semibold border border-red-300 text-[var(--vyne-error)] hover:bg-red-100 transition-colors">
            Delete Account
          </button>
        </div>
      </SectionCard>

      <SaveBar dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => { setName(userName || ""); setDirty(false); }} />
    </div>
  );
}

// ── Organization Tab ─────────────────────────────────────────────────

function OrganizationTab() {
  const { currentPlan } = useBillingStore();
  const plan = PLANS.find((p) => p.tier === currentPlan);
  const { openPricing } = useBillingStore();
  const [orgName, setOrgName] = useState("Vyne Workspace");
  const [dirty, setDirty] = useState(false);

  const members = [
    { name: "Alex Chen", email: "alex.chen@gmail.com", role: "Owner", status: "active" },
    { name: "Jordan Park", email: "jordan@company.com", role: "Admin", status: "active" },
    { name: "Sam Rivera", email: "sam.r@company.com", role: "Member", status: "active" },
    { name: "Taylor Kim", email: "taylor@company.com", role: "Member", status: "pending" },
  ];

  return (
    <div className="space-y-5">
      <SectionCard title="Organization Details" description="Manage your workspace identity.">
        <div className="flex items-start gap-6 mb-5">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--vyne-accent)] to-[var(--vyne-accent-light)] text-white flex items-center justify-center text-[20px] font-bold">
            VW
          </div>
          <div className="flex-1">
            <FieldLabel>Organization Name</FieldLabel>
            <TextInput value={orgName} onChange={(v) => { setOrgName(v); setDirty(true); }} placeholder="Your workspace name" />
          </div>
        </div>

        <div className="flex items-center gap-3 p-3.5 rounded-xl bg-[var(--vyne-bg)]">
          <div className="flex items-center gap-2 flex-1">
            <Globe size={14} className="text-[var(--vyne-text-tertiary)]" />
            <div>
              <p className="text-[11px] font-semibold text-[var(--vyne-text-primary)]">Workspace URL</p>
              <p className="text-[11px] text-[var(--vyne-text-tertiary)]">vyne.ai/w/vyne-workspace</p>
            </div>
          </div>
          <CopyBtn text="vyne.ai/w/vyne-workspace" />
        </div>
      </SectionCard>

      <SectionCard title="Plan & Billing" description="Your current subscription and usage.">
        <div className="flex items-center justify-between p-4 rounded-xl bg-[var(--vyne-accent-bg)]/40 border border-[var(--vyne-accent)]/10 mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--vyne-accent)] text-white flex items-center justify-center">
              <Leaf size={18} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-[var(--vyne-text-primary)]">{plan?.name} Plan</p>
              <p className="text-[11px] text-[var(--vyne-text-secondary)]">{plan?.monthlyCredits.toLocaleString()} credits/month &middot; ${plan?.price}/mo</p>
            </div>
          </div>
          <button onClick={openPricing} className="px-4 py-2 rounded-xl text-[12px] font-semibold bg-[var(--vyne-accent)] text-white hover:opacity-90 transition-opacity shadow-sm">
            Manage Plan
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-[var(--vyne-bg)] text-center">
            <p className="text-[18px] font-bold text-[var(--vyne-text-primary)]">3</p>
            <p className="text-[10px] text-[var(--vyne-text-tertiary)]">Live Workflows</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--vyne-bg)] text-center">
            <p className="text-[18px] font-bold text-[var(--vyne-text-primary)]">592</p>
            <p className="text-[10px] text-[var(--vyne-text-tertiary)]">Total Runs</p>
          </div>
          <div className="p-3 rounded-xl bg-[var(--vyne-bg)] text-center">
            <p className="text-[18px] font-bold text-[var(--vyne-success)]">98.4%</p>
            <p className="text-[10px] text-[var(--vyne-text-tertiary)]">Success Rate</p>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Team Members" description={`${members.length} members in your workspace.`}>
        <div className="space-y-1">
          {members.map((m) => (
            <div key={m.email} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--vyne-bg)] transition-colors">
              <div className="w-8 h-8 rounded-full bg-[var(--vyne-accent)] text-white flex items-center justify-center text-[11px] font-bold">
                {m.name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)] truncate">{m.name}</p>
                <p className="text-[10px] text-[var(--vyne-text-tertiary)] truncate">{m.email}</p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-lg ${
                m.role === "Owner" ? "bg-[var(--vyne-accent-bg)] text-[var(--vyne-accent)]"
                : m.role === "Admin" ? "bg-[var(--vyne-task-bg)] text-[var(--vyne-task)]"
                : "bg-[var(--vyne-bg)] text-[var(--vyne-text-tertiary)]"
              }`}>
                {m.role}
              </span>
              {m.status === "pending" && (
                <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-amber-50 text-amber-600">Pending</span>
              )}
            </div>
          ))}
        </div>

        <button className="mt-3 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-[var(--vyne-border)] text-[12px] font-medium text-[var(--vyne-text-tertiary)] hover:border-[var(--vyne-accent)] hover:text-[var(--vyne-accent)] hover:bg-[var(--vyne-accent-bg)]/30 transition-all">
          <Plus size={14} /> Invite Team Member
        </button>
      </SectionCard>

      <SaveBar dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => { setOrgName("Vyne Workspace"); setDirty(false); }} />
    </div>
  );
}

// ── API Keys Tab ─────────────────────────────────────────────────────

function ApiKeysTab() {
  const [showKey, setShowKey] = useState<string | null>(null);

  const keys: ApiKeyEntry[] = [
    { id: "k1", name: "Production API", key: "vyne_sk_prod_a8f3b2c1d4e5f6g7h8i9j0", createdAt: "2026-03-15", lastUsed: "2 hours ago" },
    { id: "k2", name: "Staging Environment", key: "vyne_sk_stg_x1y2z3w4v5u6t7s8r9q0", createdAt: "2026-03-28", lastUsed: "3 days ago" },
    { id: "k3", name: "CI/CD Pipeline", key: "vyne_sk_ci_m1n2o3p4q5r6s7t8u9v0", createdAt: "2026-04-01", lastUsed: null },
  ];

  return (
    <div className="space-y-5">
      <SectionCard title="API Keys" description="Manage your API keys for programmatic access to Vyne workflows.">
        <div className="space-y-2 mb-4">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center gap-3 p-3.5 rounded-xl border border-[var(--vyne-border)] bg-[var(--vyne-bg)]/50 hover:border-[var(--vyne-border-hover)] transition-colors">
              <Key size={14} className="text-[var(--vyne-accent)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)]">{k.name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <code className="text-[10px] text-[var(--vyne-text-tertiary)] font-mono">
                    {showKey === k.id ? k.key : `${k.key.slice(0, 12)}${"•".repeat(20)}`}
                  </code>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setShowKey(showKey === k.id ? null : k.id)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-text-secondary)] hover:bg-white transition-all"
                >
                  {showKey === k.id ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <CopyBtn text={k.key} />
                <button className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--vyne-text-tertiary)] hover:text-[var(--vyne-error)] hover:bg-red-50 transition-all">
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>

        <button className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[var(--vyne-accent)] text-white text-[12px] font-semibold hover:opacity-90 transition-opacity shadow-sm">
          <Plus size={14} /> Generate New API Key
        </button>
      </SectionCard>

      <SectionCard title="Webhook Endpoints" description="Receive real-time notifications when workflows complete.">
        <div className="p-4 rounded-xl bg-[var(--vyne-bg)] border border-dashed border-[var(--vyne-border)] text-center">
          <Globe size={20} className="text-[var(--vyne-text-tertiary)] mx-auto mb-2" />
          <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)] mb-1">No webhooks configured</p>
          <p className="text-[11px] text-[var(--vyne-text-tertiary)] mb-3 max-w-[280px] mx-auto">Add a webhook endpoint to receive POST requests when your workflows finish running.</p>
          <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white border border-[var(--vyne-border)] text-[12px] font-medium text-[var(--vyne-text-secondary)] hover:border-[var(--vyne-border-hover)] transition-colors">
            <Plus size={13} /> Add Endpoint
          </button>
        </div>
      </SectionCard>

      <div className="p-4 rounded-2xl bg-white border border-[var(--vyne-border)] flex items-center gap-3">
        <ExternalLink size={16} className="text-[var(--vyne-accent)] shrink-0" />
        <div className="flex-1">
          <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)]">API Documentation</p>
          <p className="text-[11px] text-[var(--vyne-text-tertiary)]">Explore the full Vyne REST API for workflows, agents, and executions.</p>
        </div>
        <button className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-[var(--vyne-accent)] hover:bg-[var(--vyne-accent-bg)] transition-colors">
          View Docs
        </button>
      </div>
    </div>
  );
}

// ── Notifications Tab ────────────────────────────────────────────────

function NotificationsTab() {
  const [emailNotifs, setEmailNotifs] = useState({ runs: true, failures: true, deploys: false, weekly: true, billing: true });
  const [dirty, setDirty] = useState(false);

  const toggle = (key: keyof typeof emailNotifs) => {
    setEmailNotifs((prev) => ({ ...prev, [key]: !prev[key] }));
    setDirty(true);
  };

  function Toggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
    return (
      <button
        onClick={onToggle}
        className={`w-10 h-[22px] rounded-full transition-colors duration-200 relative ${enabled ? "bg-[var(--vyne-accent)]" : "bg-[var(--vyne-border)]"}`}
      >
        <div className={`absolute top-[3px] w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 ${enabled ? "left-[22px]" : "left-[3px]"}`} />
      </button>
    );
  }

  const rows: { key: keyof typeof emailNotifs; icon: React.ReactNode; label: string; desc: string }[] = [
    { key: "runs", icon: <Leaf size={14} />, label: "Workflow Runs", desc: "Get notified when a live workflow completes or fails." },
    { key: "failures", icon: <Shield size={14} />, label: "Failure Alerts", desc: "Immediate notification when any workflow encounters an error." },
    { key: "deploys", icon: <Globe size={14} />, label: "Deployment Updates", desc: "Notifications when workflows are deployed or undeployed." },
    { key: "weekly", icon: <Mail size={14} />, label: "Weekly Summary", desc: "A digest of your workflow performance delivered every Monday." },
    { key: "billing", icon: <Key size={14} />, label: "Billing & Credits", desc: "Alerts when credits are running low or billing events occur." },
  ];

  return (
    <div className="space-y-5">
      <SectionCard title="Email Notifications" description="Choose what notifications you receive via email.">
        <div className="space-y-1">
          {rows.map((r) => (
            <div key={r.key} className="flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-[var(--vyne-bg)] transition-colors">
              <div className="w-8 h-8 rounded-xl bg-[var(--vyne-bg)] flex items-center justify-center text-[var(--vyne-text-tertiary)]">
                {r.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[12px] font-semibold text-[var(--vyne-text-primary)]">{r.label}</p>
                <p className="text-[10px] text-[var(--vyne-text-tertiary)]">{r.desc}</p>
              </div>
              <Toggle enabled={emailNotifs[r.key]} onToggle={() => toggle(r.key)} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SaveBar dirty={dirty} onSave={() => setDirty(false)} onDiscard={() => { setEmailNotifs({ runs: true, failures: true, deploys: false, weekly: true, billing: true }); setDirty(false); }} />
    </div>
  );
}

// ── Tab button ───────────────────────────────────────────────────────

function TabBtn({ active, icon, label, onClick }: { active: boolean; icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-[13px] font-medium transition-all text-left
        ${active
          ? "bg-white text-[var(--vyne-text-primary)] shadow-[var(--shadow-sm)] border border-[var(--vyne-border)] font-semibold"
          : "text-[var(--vyne-text-secondary)] hover:text-[var(--vyne-text-primary)] hover:bg-white/50"}`}
    >
      {icon}
      {label}
    </button>
  );
}

// ── Main Settings Page ───────────────────────────────────────────────

export function SettingsPage() {
  const { setCurrentView } = useDeployStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>("profile");

  const tabs: { id: SettingsTab; label: string; icon: React.ReactNode }[] = [
    { id: "profile", label: "Profile", icon: <User size={16} /> },
    { id: "organization", label: "Organization", icon: <Building2 size={16} /> },
    { id: "api-keys", label: "API Keys", icon: <Key size={16} /> },
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
  ];

  return (
    <div className="h-screen w-screen flex flex-col bg-[var(--vyne-bg)] overflow-hidden">
      {/* Header */}
      <header className="h-[var(--topbar-height)] bg-white border-b border-[var(--vyne-border)] flex items-center justify-between px-6 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setCurrentView("canvas")}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--vyne-text-secondary)] hover:text-[var(--vyne-text-primary)] hover:bg-[var(--vyne-bg-warm)] transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="w-px h-6 bg-[var(--vyne-border)]" />
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[var(--vyne-accent)] flex items-center justify-center">
              <span className="text-white text-[11px] font-black">V</span>
            </div>
            <div>
              <h1 className="text-[13px] font-bold text-[var(--vyne-text-primary)] leading-none">Vyne</h1>
              <p className="text-[10px] text-[var(--vyne-text-tertiary)]">Settings</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {/* Sidebar nav */}
        <aside className="w-[220px] shrink-0 border-r border-[var(--vyne-border)] bg-[var(--vyne-bg-warm)] p-4 flex flex-col gap-1">
          {tabs.map((tab) => (
            <TabBtn key={tab.id} active={activeTab === tab.id} icon={tab.icon} label={tab.label} onClick={() => setActiveTab(tab.id)} />
          ))}
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="max-w-[680px] mx-auto px-8 py-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
            >
              <h2 className="text-[20px] font-bold text-[var(--vyne-text-primary)] mb-1">
                {tabs.find((t) => t.id === activeTab)?.label}
              </h2>
              <p className="text-[12px] text-[var(--vyne-text-secondary)] mb-6">
                {activeTab === "profile" && "Manage your personal information and preferences."}
                {activeTab === "organization" && "Manage your workspace, team, and billing."}
                {activeTab === "api-keys" && "Create and manage API keys for programmatic access."}
                {activeTab === "notifications" && "Control how and when Vyne notifies you."}
              </p>

              {activeTab === "profile" && <ProfileTab />}
              {activeTab === "organization" && <OrganizationTab />}
              {activeTab === "api-keys" && <ApiKeysTab />}
              {activeTab === "notifications" && <NotificationsTab />}
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
