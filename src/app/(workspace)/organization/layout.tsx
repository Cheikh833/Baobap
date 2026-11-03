import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { PageHeader } from "@/components/ui/display";
import { TabNav } from "@/components/tabs";
import { getMessages } from "@/i18n/server";

export default async function OrganizationLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireTenant();
  const { m } = await getMessages();
  const t = m.org.tabs;
  const tabs = [
    { href: "/organization", label: t.overview, exact: true, ok: can(ctx, "organization:view") },
    { href: "/organization/profile", label: t.profile, ok: can(ctx, "organization:view") },
    { href: "/organization/units", label: t.units, ok: can(ctx, "units:view") },
    { href: "/organization/members", label: t.members, ok: can(ctx, "members:view") },
    { href: "/organization/roles", label: t.roles, ok: can(ctx, "roles:view") },
    { href: "/organization/audit", label: t.audit, ok: can(ctx, "audit:view") },
    { href: "/organization/billing", label: m.billing.tab, ok: can({ ...ctx, readOnly: false }, "billing:view") },
  ].filter((x) => x.ok);
  return (
    <>
      <PageHeader title={ctx.organizationName} description={m.org.description} />
      <TabNav tabs={tabs} />
      {children}
    </>
  );
}
