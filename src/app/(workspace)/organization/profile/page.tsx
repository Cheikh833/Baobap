import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getOrganization } from "@/server/services/organization";
import { Card } from "@/components/ui/display";
import { ActionForm, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { joinList } from "@/lib/dates";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { updateProfileAction } from "../actions";

export const metadata = { title: "Profil institutionnel" };

export default async function ProfilePage() {
  const ctx = await requireTenant();
  if (!can(ctx, "organization:view")) return <Forbidden />;
  const [o, { m }] = await Promise.all([getOrganization(ctx), getMessages()]);
  const F = m.org.fields;
  const editable = can(ctx, "organization:edit");
  const fields = (
    <fieldset disabled={!editable} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextField name="name" label={F.name} defaultValue={o.name} required />
        <TextField name="shortName" label={F.shortName} defaultValue={o.shortName ?? ""} />
        <SelectField name="type" label={F.type} options={Object.entries(m.orgTypes)} defaultValue={o.type} />
        <TextField name="foundedYear" label={F.foundedYear} type="number" defaultValue={o.foundedYear ?? ""} />
        <TextField name="country" label={F.country} defaultValue={o.country} required />
        <TextField name="region" label={F.region} defaultValue={o.region ?? ""} />
        <TextField name="city" label={F.city} defaultValue={o.city ?? ""} />
        <TextField name="address" label={F.address} defaultValue={o.address ?? ""} />
        <TextField name="phone" label={F.phone} defaultValue={o.phone ?? ""} />
        <TextField name="email" label={F.email} type="email" defaultValue={o.email ?? ""} />
        <TextField name="website" label={F.website} defaultValue={o.website ?? ""} placeholder="https://" />
        <TextField name="defaultCurrency" label={F.currency} defaultValue={o.defaultCurrency} maxLength={3} />
        <TextField name="size" label={F.size} defaultValue={o.size ?? ""} />
        <TextField name="sectors" label={F.sectors} hint={m.ui.listHint} defaultValue={joinList(o.sectors)} />
      </div>
      <TextAreaField name="description" label={F.description} defaultValue={o.description ?? ""} />
      <div className="grid gap-4 lg:grid-cols-3">
        <TextAreaField name="mission" label={F.mission} defaultValue={o.mission ?? ""} />
        <TextAreaField name="vision" label={F.vision} defaultValue={o.vision ?? ""} />
        <TextAreaField name="values" label={F.values} defaultValue={o.values ?? ""} />
      </div>
      <p className="text-xs text-slate-500">{fill(m.org.codeNote, { code: o.code })}</p>
    </fieldset>
  );
  return (
    <Card>
      {editable ? <ActionForm action={updateProfileAction}>{fields}</ActionForm> : <>{fields}<p className="mt-4 text-sm text-slate-500">{m.ui.readOnlyRole}</p></>}
    </Card>
  );
}
