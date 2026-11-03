import type { LucideIcon } from "lucide-react";
import {
  BarChart3, Bell, BookOpen, Briefcase, Building2, FileText, FolderKanban, LayoutDashboard, Layers, Settings, ShieldAlert, Sparkles, Target, Wallet,
} from "lucide-react";
import type { Permission } from "@/server/permissions/catalog";

// Navigation cible complète. Les modules non encore construits sont affichés comme « Bientôt »,
// non cliquables : aucune route morte, aucune fonctionnalité présentée comme opérationnelle à tort.
export type NavItem = { href: string; label: string; icon: LucideIcon; permission?: Permission; phase?: number };

export const NAV: { section: string; items: NavItem[] }[] = [
  { section: "Pilotage", items: [{ href: "/dashboard", label: "Tableau de bord", icon: LayoutDashboard }] },
  {
    section: "Organisation",
    items: [
      { href: "/organization", label: "Organisation", icon: Building2, permission: "organization:view" },
      { href: "/strategy", label: "Stratégie", icon: Target, phase: 2 },
    ],
  },
  {
    section: "Interventions",
    items: [
      { href: "/portfolios", label: "Portefeuilles", icon: Briefcase, permission: "portfolio:view" },
      { href: "/programs", label: "Programmes", icon: Layers, permission: "program:view" },
      { href: "/projects", label: "Projets", icon: FolderKanban, permission: "project:view" },
    ],
  },
  {
    section: "Modules à venir",
    items: [
      { href: "/meal", label: "Suivi-évaluation / MEAL", icon: Target, phase: 4 },
      { href: "/finance", label: "Finances", icon: Wallet, phase: 5 },
      { href: "/risks", label: "Risques & conformité", icon: ShieldAlert, phase: 5 },
      { href: "/knowledge", label: "Documents & connaissances", icon: BookOpen, phase: 6 },
      { href: "/analytics", label: "Analyse de données", icon: BarChart3, phase: 7 },
      { href: "/ai", label: "BAOBAB AI", icon: Sparkles, phase: 8 },
      { href: "/studio", label: "BAOBAB Studio", icon: FileText, phase: 9 },
      { href: "/notifications", label: "Notifications", icon: Bell, phase: 10 },
      { href: "/administration", label: "Administration", icon: Settings, phase: 11 },
    ],
  },
];
