import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getOrganization } from "@/server/services/organization";
import { Card } from "@/components/ui/display";
import { ActionForm, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { ORGANIZATION_TYPES } from "@/lib/validation/schemas";
import { joinList } from "@/lib/dates";
import { Forbidden } from "../../forbidden";
import { updateProfileAction } from "../actions";

export const metadata = { title: "Profil institutionnel" };

export default async function ProfilePage() {
  const ctx = await requireTenant();
  if (!can(ctx, "organization:view")) return <Forbidden />;
  const o = await getOrganization(ctx);
  const editable = can(ctx, "organization:edit");
  const fields = (
    <fieldset disabled={!editable} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label="Nom officiel" defaultValue={o.name} required />
        <TextField name="shortName" label="Sigle" defaultValue={o.shortName ?? ""} />
        <SelectField name="type" label="Type" options={ORGANIZATION_TYPES} defaultValue={o.type} />
        <TextField name="foundedYear" label="Année de création" type="number" defaultValue={o.foundedYear ?? ""} />
        <TextField name="country" label="Pays" defaultValue={o.country} required />
        <TextField name="region" label="Région" defaultValue={o.region ?? ""} />
        <TextField name="city" label="Ville" defaultValue={o.city ?? ""} />
        <TextField name="address" label="Adresse" defaultValue={o.address ?? ""} />
        <TextField name="phone" label="Téléphone" defaultValue={o.phone ?? ""} />
        <TextField name="email" label="Email" type="email" defaultValue={o.email ?? ""} />
        <TextField name="website" label="Site web" defaultValue={o.website ?? ""} placeholder="https://" />
        <TextField name="defaultCurrency" label="Devise par défaut" defaultValue={o.defaultCurrency} maxLength={3} />
        <TextField name="size" label="Taille" defaultValue={o.size ?? ""} />
        <TextField name="sectors" label="Domaines d'intervention" hint="Séparés par des virgules" defaultValue={joinList(o.sectors)} />
      </div>
      <TextAreaField name="description" label="Description" defaultValue={o.description ?? ""} />
      <div className="grid gap-4 lg:grid-cols-3">
        <TextAreaField name="mission" label="Mission" defaultValue={o.mission ?? ""} />
        <TextAreaField name="vision" label="Vision" defaultValue={o.vision ?? ""} />
        <TextAreaField name="values" label="Valeurs" defaultValue={o.values ?? ""} />
      </div>
      <p className="text-xs text-slate-500">Code organisation : <strong>{o.code}</strong> (non modifiable). Logo et documents institutionnels : disponibles avec le module Documents (phase 6).</p>
    </fieldset>
  );
  return (
    <Card>
      {editable ? <ActionForm action={updateProfileAction}>{fields}</ActionForm> : <>{fields}<p className="mt-4 text-sm text-slate-500">Lecture seule : votre rôle ne permet pas de modifier le profil.</p></>}
    </Card>
  );
}
