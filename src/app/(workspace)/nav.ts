import type { LucideIcon } from "lucide-react";
import {
  BarChart3, Bell, Gauge, BookOpen, Briefcase, Building2, FileText, FolderKanban, LayoutDashboard, Layers, Settings, ShieldAlert, Sparkles, Target, Wallet,
} from "lucide-react";
import type { Permission } from "@/server/permissions/catalog";
import type { Messages } from "@/i18n/messages/fr";

type NavKey = keyof Messages["nav"];

// Navigation cible complète. Les modules non encore construits sont affichés comme « Bientôt »,
// non cliquables : aucune route morte, aucune fonctionnalité présentée comme opérationnelle à tort.
export type NavItem = { href: string; label: NavKey; icon: LucideIcon; permission?: Permission; phase?: number };

export const NAV: { section: NavKey; items: NavItem[] }[] = [
  { section: "pilotage", items: [{ href: "/dashboard", label: "dashboard", icon: LayoutDashboard }] },
  {
    section: "organizationSection",
    items: [
      { href: "/organization", label: "organization", icon: Building2, permission: "organization:view" },
      { href: "/strategy", label: "strategy", icon: Target, permission: "strategy:view" },
    ],
  },
  {
    section: "interventions",
    items: [
      { href: "/portfolios", label: "portfolios", icon: Briefcase, permission: "portfolio:view" },
      { href: "/programs", label: "programs", icon: Layers, permission: "program:view" },
      { href: "/projects", label: "projects", icon: FolderKanban, permission: "project:view" },
      { href: "/meal", label: "meal", icon: Gauge, permission: "meal:view" },
      { href: "/finance", label: "finance", icon: Wallet, permission: "finance:view" },
      { href: "/risks", label: "risks", icon: ShieldAlert, permission: "risk:view" },
      { href: "/analytics", label: "analytics", icon: BarChart3, permission: "analytics:view" },
    ],
  },
  {
    section: "upcoming",
    items: [
      { href: "/knowledge", label: "knowledge", icon: BookOpen, phase: 6 },
      { href: "/ai", label: "ai", icon: Sparkles, phase: 8 },
      { href: "/studio", label: "studio", icon: FileText, phase: 9 },
      { href: "/notifications", label: "notifications", icon: Bell, phase: 10 },
      { href: "/administration", label: "administration", icon: Settings, phase: 11 },
    ],
  },
];
