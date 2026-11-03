import { Network } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { listUnits } from "@/server/services/units";
import { Badge, Card, EmptyState } from "@/components/ui/display";
import { ActionForm, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import { Forbidden } from "../../forbidden";
import { createUnitAction, deleteUnitAction, updateUnitAction } from "../actions";

export const metadata = { title: "Structures internes" };

export default async function UnitsPage() {
  const ctx = await requireTenant();
  if (!can(ctx, "units:view")) return <Forbidden />;
  const [units, { m }] = await Promise.all([listUnits(ctx), getMessages()]);
  const U = m.units;
  const typeOptions = Object.entries(m.unitTypes);
  const byParent = new Map<string | null, typeof units>();
  for (const u of units) byParent.set(u.parentId, [...(byParent.get(u.parentId) ?? []), u]);
  const parentOptions = units.map((u) => [u.id, u.name] as const);

  const renderTree = (parentId: string | null, depth: number): React.ReactNode =>
    (byParent.get(parentId) ?? []).map((u) => (
      <li key={u.id} style={{ marginLeft: depth * 20 }} className="rounded-lg border border-line bg-white p-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{u.name}</span>
          {u.code && <span className="text-xs text-slate-500">{u.code}</span>}
          <Badge tone="brand">{m.unitTypes[u.type]}</Badge>
          <span className="text-xs text-slate-500">{fill(U.membersCount, { n: u._count.members })}</span>
        </div>
        {u.description && <p className="mt-1 text-sm text-slate-600">{u.description}</p>}
        {(can(ctx, "units:edit") || can(ctx, "units:delete")) && (
          <details className="mt-2">
            <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
            <div className="mt-3 space-y-3">
              {can(ctx, "units:edit") && (
                <ActionForm action={updateUnitAction.bind(null, u.id)}>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <TextField name="name" label={U.name} defaultValue={u.name} required />
                    <TextField name="code" label={U.code} defaultValue={u.code ?? ""} />
                    <SelectField name="type" label={U.type} options={typeOptions} defaultValue={u.type} />
                    <SelectField name="parentId" label={U.parent} options={parentOptions.filter(([id]) => id !== u.id)} placeholder={U.root} defaultValue={u.parentId ?? ""} />
                  </div>
                  <TextAreaField name="description" label={U.description} rows={2} defaultValue={u.description ?? ""} />
                </ActionForm>
              )}
              {can(ctx, "units:delete") && (
                <ActionForm action={deleteUnitAction.bind(null, u.id)} submitLabel={U.deleteBtn} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: u.name })} />
              )}
            </div>
          </details>
        )}
        {byParent.has(u.id) && <ul className="mt-2 space-y-2">{renderTree(u.id, 1)}</ul>}
      </li>
    ));

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2">
        {units.length === 0 ? <EmptyState icon={Network} title={U.emptyTitle} description={U.emptyText} /> : <ul className="space-y-2">{renderTree(null, 0)}</ul>}
      </div>
      {can(ctx, "units:create") && (
        <Card>
          <h2 className="mb-4 font-semibold">{U.new}</h2>
          <ActionForm action={createUnitAction} submitLabel={m.ui.create} resetOnSuccess>
            <TextField name="name" label={U.name} required />
            <TextField name="code" label={U.code} />
            <SelectField name="type" label={U.type} options={typeOptions} defaultValue="DEPARTMENT" />
            <SelectField name="parentId" label={U.parent} options={parentOptions} placeholder={U.root} />
            <TextAreaField name="description" label={U.description} rows={2} />
          </ActionForm>
        </Card>
      )}
    </div>
  );
}
