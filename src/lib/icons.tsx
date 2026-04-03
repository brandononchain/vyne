"use client";

import {
  Globe,
  BarChart3,
  PenTool,
  Code2,
  Users,
  Mail,
  Wrench,
  Zap,
  Search,
  FileText,
  type LucideProps,
} from "lucide-react";
import type { FC } from "react";

const iconMap: Record<string, FC<LucideProps>> = {
  Globe,
  BarChart3,
  PenTool,
  Code2,
  Users,
  Mail,
  Wrench,
  Zap,
  Search,
  FileText,
};

export function DynamicIcon({
  name,
  ...props
}: { name: string } & LucideProps) {
  const Icon = iconMap[name] || Zap;
  return <Icon {...props} />;
}
