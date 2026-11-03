import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { db } from "@/server/db";
import { getOrganization } from "@/server/services/organization";
import { Card, DefinitionList, Stat } from "@/components/ui/display";
import { ORGANIZATION_TYPES } from "@/lib/validation/schemas";
import { Forbidden } from "../forbidden";

export const metadata = { title: "Organisation" };

export default async function OrganizationOverview() {
  const ctx = await requireTenant();
  if (!can(ctx, "organization:view")) return <Forbidden />;
  const org = await getOrganization(ctx);
  const w = { organizationId: ctx.organizationId, deletedAt: null };
  const [units, members, portfolios, programs, projects] = await Promise.all([
    db.organizationalUnit.count({ where: w }),
    db.membership.count({ where: { organizationId: ctx.organizationId, status: "ACTIVE" } }),
    db.portfolio.count({ where: w }),
    db.program.count({ where: w }),
    db.project.count({ where: w }),
  ]);
  const type = ORGANIZATION_TYPES.find(([k]) => k === org.type)?.[1];
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="Structures" value={units} />
        <Stat label="Membres actifs" value={members} />
        <Stat label="Portefeuilles" value={portfolios} />
        <Stat label="Programmes" value={programs} />
        <Stat label="Projets" value={projects} />
      </div>
      <Card>
        <h2 className="mb-4 font-semibold">Identité</h2>
        <DefinitionList items={[
          ["Nom officiel", org.name], ["Sigle", org.shortName], ["Code", org.code], ["Type", type],
          ["Pays", org.country], ["Ville", org.city], ["Secteurs", org.sectors.join(", ")], ["Devise par défaut", org.defaultCurrency],
          ["Mission", org.mission], ["Vision", org.vision],
        ]} />
      </Card>
    </div>
  );
}
