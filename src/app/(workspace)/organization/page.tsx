import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { db } from "@/server/db";
import { getOrganization } from "@/server/services/organization";
import { Card, DefinitionList, Stat } from "@/components/ui/display";
import { getMessages } from "@/i18n/server";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Organisation" };

export default async function OrganizationOverview() {
  const ctx = await requireTenant();
  if (!can(ctx, "organization:view")) return <Forbidden />;
  const [org, { m }] = await Promise.all([getOrganization(ctx), getMessages()]);
  const w = { organizationId: ctx.organizationId, deletedAt: null };
  const [units, members, portfolios, programs, projects] = await Promise.all([
    db.organizationalUnit.count({ where: w }),
    db.membership.count({ where: { organizationId: ctx.organizationId, status: "ACTIVE" } }),
    db.portfolio.count({ where: w }),
    db.program.count({ where: w }),
    db.project.count({ where: w }),
  ]);
  const S = m.org.stats;
  const F = m.org.fields;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat tone="navy" label={S.units} value={units} />
        <Stat tone="teal" label={S.members} value={members} />
        <Stat tone="brand" label={S.portfolios} value={portfolios} />
        <Stat tone="ochre" label={S.programs} value={programs} />
        <Stat tone="navy" label={S.projects} value={projects} />
      </div>
      <Card>
        <h2 className="mb-4 font-semibold">{m.org.identity}</h2>
        <DefinitionList items={[
          [F.name, org.name], [F.shortName, org.shortName], [F.code, org.code], [F.type, m.orgTypes[org.type]],
          [F.country, org.country], [F.city, org.city], [F.sectors, org.sectors.join(", ")], [F.currency, org.defaultCurrency],
          [F.mission, org.mission], [F.vision, org.vision],
        ]} />
      </Card>
    </div>
  );
}
