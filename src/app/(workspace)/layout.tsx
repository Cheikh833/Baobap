import { requireTenant, requireUser } from "@/server/context";
import { listUserOrganizations } from "@/server/services/organization";
import { ALL_PERMISSIONS } from "@/server/permissions/catalog";
import { can } from "@/server/permissions/check";
import { Shell } from "./shell";

export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const ctx = await requireTenant();
  const memberships = await listUserOrganizations(user.id);
  return (
    <Shell
      user={{ name: user.name, email: user.email }}
      org={{ id: ctx.organizationId, name: ctx.organizationName, roleName: ctx.roleName }}
      orgs={memberships.map((m) => ({ id: m.organization.id, name: m.organization.name }))}
      allowed={ALL_PERMISSIONS.filter((p) => can(ctx, p))}
    >
      {children}
    </Shell>
  );
}
