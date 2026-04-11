"use client";

import {
  Globe, BarChart3, PenTool, Code2, Users, Mail, Wrench, Zap, Search,
  FileText, FileSearch, ListChecks, FileEdit, Repeat, ShieldCheck, Send,
  LinkIcon, Table, Terminal, Plug, Rocket, Activity,
  // Trigger
  Clock, Webhook, Rss, Play, Upload, CalendarClock,
  // Action
  MessageSquare, MessageCircle, Hash, Share2, Database, Braces,
  Filter, GitBranch, GitFork, Timer, GitMerge,
  // Output
  Eye, Download, ArrowUpRight, LayoutDashboard, Wand2,
  type LucideProps,
} from "lucide-react";
import type { FC } from "react";

const iconMap: Record<string, FC<LucideProps>> = {
  Globe, BarChart3, PenTool, Code2, Users, Mail, Wrench, Zap, Search,
  FileText, FileSearch, ListChecks, FileEdit, Repeat, ShieldCheck, Send,
  LinkIcon, Table, Terminal, Plug, Rocket, Activity,
  Clock, Webhook, Rss, Play, Upload, CalendarClock,
  MessageSquare, MessageCircle, Hash, Share2, Database, Braces,
  Filter, GitBranch, GitFork, Timer, GitMerge,
  Eye, Download, ArrowUpRight, LayoutDashboard, Wand2,
};

export function DynamicIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = iconMap[name] || Zap;
  return <Icon {...props} />;
}
