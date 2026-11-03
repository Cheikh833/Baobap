import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { PageHeader } from "@/components/ui/display";
import { TabNav } from "@/components/tabs";

export default async function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  const tabs = [
    { href: "/organization", label: "Vue d'ensemble", exact: true, ok: can(ctx, "organization:view") },
    { href: "/organization/profile", label: "Profil institutionnel", ok: can(ctx, "organization:view") },
    { href: "/organization/units", label: "Structures", ok: can(ctx, "units:view") },
    { href: "/organization/members", label: "Membres", ok: can(ctx, "members:view") },
    { href: "/organization/roles", label: "Rôles & permissions", ok: can(ctx, "roles:view") },
    { href: "/organization/audit", label: "Journal d'audit", ok: can(ctx, "audit:view") },
  ].filter((t) => t.ok);
  return (
    <>
      <PageHeader title={ctx.organizationName} description="Espace institutionnel de l'organisation." />
      <TabNav tabs={tabs} />
      {children}
    </>
  );
}
