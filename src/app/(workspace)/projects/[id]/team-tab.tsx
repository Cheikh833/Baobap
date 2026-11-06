import { Mail, Phone } from "lucide-react";
import type { Stakeholder } from "@prisma/client";
import { getProjectTeam } from "@/server/services/team";
import { Badge, Card } from "@/components/ui/display";
import { ActionForm, SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import { cn } from "@/components/ui/cn";
import { toDateInput } from "@/lib/dates";
import { formatDate } from "@/lib/metrics";
import { can, type TenantContext } from "@/server/permissions/check";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";
import { addMemberAction, createStakeholderAction, deleteStakeholderAction, removeMemberAction, updateMemberAction, updateStakeholderAction } from "../team-actions";

const Q_STYLE = { manage: "bg-red-50 border-red-200", satisfy: "bg-amber-50 border-amber-200", inform: "bg-blue-50 border-blue-200", monitor: "bg-slate-50 border-line" } as const;

function StakeholderFields({ s, m }: { s?: Stakeholder; m: Messages }) {
  const T = m.team;
  const lv = T.levels.map((l, i) => [String(i + 1), l] as const);
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="name" label={T.fields.name} defaultValue={s?.name} required className="sm:col-span-2" />
      <SelectField name="type" label={T.fields.type} options={Object.entries(T.types)} defaultValue={s?.type ?? "PARTNER"} />
      <TextField name="organization" label={T.fields.organization} defaultValue={s?.organization ?? ""} />
      <SelectField name="influence" label={T.fields.influence} options={lv} defaultValue={String(s?.influence ?? 2)} required />
      <SelectField name="interest" label={T.fields.interest} options={lv} defaultValue={String(s?.interest ?? 2)} required />
      <TextField name="contactName" label={T.fields.contactName} defaultValue={s?.contactName ?? ""} className="sm:col-span-2" />
      <TextField name="email" label={T.fields.email} type="email" defaultValue={s?.email ?? ""} className="sm:col-span-2" />
      <TextField name="phone" label={T.fields.phone} defaultValue={s?.phone ?? ""} className="sm:col-span-2" />
      <TextAreaField name="engagement" label={T.fields.engagement} rows={2} defaultValue={s?.engagement ?? ""} className="sm:col-span-4" />
    </div>
  );
}

export async function TeamTab({ ctx, projectId, members, m, locale }: { ctx: TenantContext; projectId: string; members: readonly (readonly [string, string])[]; m: Messages; locale: string }) {
  const { members: team, stakeholders, showContacts } = await getProjectTeam(ctx, projectId);
  const T = m.team;
  const edit = can(ctx, "project:edit");
  const free = members.filter(([id]) => !team.some((t) => t.userId === id));
  const quadrants = ["satisfy", "manage", "monitor", "inform"] as const; // disposition : influence en haut

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="mb-3 font-display font-semibold">{T.team}</h2>
        {team.length === 0 && <p className="text-sm text-slate-500">{T.noTeam}</p>}
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {team.map((t, i) => (
            <li key={t.id} className="animate-fade-up rounded-xl border border-line p-4" style={{ animationDelay: `${i * 50}ms` }}>
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-400 font-display text-sm font-bold text-white">{(t.user?.name ?? "?").split(/\s+/).map((x) => x[0]).slice(0, 2).join("").toUpperCase()}</span>
                <div className="min-w-0">
                  <p className="truncate font-semibold">{t.user?.name ?? "—"}</p>
                  <p className="truncate text-xs text-slate-500">{t.role}</p>
                </div>
                {t.allocation && <Badge tone="brand">{t.allocation} %</Badge>}
              </div>
              {(t.startDate || t.endDate) && <p className="mt-2 text-xs text-slate-500">{formatDate(t.startDate, locale)} → {formatDate(t.endDate, locale)}</p>}
              {edit && (
                <details className="mt-2">
                  <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
                  <div className="mt-2 space-y-2">
                    <ActionForm action={updateMemberAction.bind(null, t.id)}>
                      <TextField name="role" label={T.fields.role} defaultValue={t.role} required />
                      <div className="grid grid-cols-3 gap-2">
                        <TextField name="allocation" label={T.fields.allocation} type="number" min={1} max={100} defaultValue={t.allocation ?? ""} />
                        <TextField name="startDate" label={T.fields.start} type="date" defaultValue={toDateInput(t.startDate)} />
                        <TextField name="endDate" label={T.fields.end} type="date" defaultValue={toDateInput(t.endDate)} />
                      </div>
                    </ActionForm>
                    <ActionForm action={removeMemberAction.bind(null, t.id)} submitLabel={T.remove} submitVariant="secondary" confirm={fill(m.ui.confirmDelete, { name: t.user?.name ?? t.role })} />
                  </div>
                </details>
              )}
            </li>
          ))}
        </ul>
        {edit && free.length > 0 && (
          <details className="mt-4 rounded-xl border border-dashed border-brand/30 p-4" open={team.length === 0}>
            <summary className="cursor-pointer text-sm font-semibold text-brand">+ {T.addMember}</summary>
            <div className="mt-3">
              <ActionForm action={addMemberAction.bind(null, projectId)} submitLabel={T.addMember} resetOnSuccess>
                <div className="grid gap-3 sm:grid-cols-4">
                  <SelectField name="userId" label={T.fields.member} options={free} required className="sm:col-span-2" />
                  <TextField name="role" label={T.fields.role} required placeholder="Coordinatrice terrain" className="sm:col-span-2" />
                  <TextField name="allocation" label={T.fields.allocation} type="number" min={1} max={100} />
                  <TextField name="startDate" label={T.fields.start} type="date" />
                  <TextField name="endDate" label={T.fields.end} type="date" />
                </div>
              </ActionForm>
            </div>
          </details>
        )}
      </Card>

      <div className="grid gap-6 lg:grid-cols-5 lg:items-start">
        <Card className="lg:col-span-2">
          <h2 className="mb-3 font-display font-semibold">{T.grid}</h2>
          <div className="flex gap-2">
            <div className="flex w-5 items-center justify-center"><span className="-rotate-90 whitespace-nowrap text-[11px] font-semibold uppercase tracking-wide text-slate-500">{T.fields.influence} →</span></div>
            <div className="grid flex-1 grid-cols-2 gap-2">
              {quadrants.map((q) => {
                const list = stakeholders.filter((s) => s.quadrant === q);
                return (
                  <div key={q} className={cn("min-h-28 rounded-xl border p-3", Q_STYLE[q])} title={T.quadrantHints[q]}>
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-600">{T.quadrants[q]} <span className="font-normal">({list.length})</span></p>
                    <ul className="mt-1 space-y-0.5 text-xs">{list.map((s) => <li key={s.id} className="truncate">• {s.name}</li>)}</ul>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="mt-1 text-center text-[11px] font-semibold uppercase tracking-wide text-slate-500">{T.fields.interest} →</p>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="mb-3 font-display font-semibold">{T.stakeholders}</h2>
          {stakeholders.length === 0 && <p className="text-sm text-slate-500">{T.noStakeholders}</p>}
          <ul className="divide-y divide-line">
            {stakeholders.map((s) => (
              <li key={s.id} className="py-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{s.name}</span>
                  <Badge>{T.types[s.type]}</Badge>
                  <Badge tone={s.quadrant === "manage" ? "danger" : s.quadrant === "satisfy" ? "warning" : s.quadrant === "inform" ? "info" : "neutral"}>{T.quadrants[s.quadrant]}</Badge>
                  {s.organization && <span className="text-xs text-slate-500">{s.organization}</span>}
                </div>
                <p className="mt-1 text-xs text-slate-500">{T.fields.influence} {s.influence}/3 · {T.fields.interest} {s.interest}/3{s.contactName && <> · {s.contactName}</>}</p>
                {(s.email || s.phone) && (
                  <p className="mt-1 flex flex-wrap gap-3 text-xs">
                    {s.email && <a href={`mailto:${s.email}`} className="inline-flex items-center gap-1 text-brand hover:underline"><Mail className="h-3 w-3" />{s.email}</a>}
                    {s.phone && <a href={`tel:${s.phone.replace(/\s/g, "")}`} className="inline-flex items-center gap-1 text-brand hover:underline"><Phone className="h-3 w-3" />{s.phone}</a>}
                  </p>
                )}
                {s.engagement && <p className="mt-1 whitespace-pre-line text-sm text-slate-700">{s.engagement}</p>}
                {edit && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-brand">{m.ui.edit}</summary>
                    <div className="mt-3 space-y-3">
                      <ActionForm action={updateStakeholderAction.bind(null, s.id)}><StakeholderFields s={s as unknown as Stakeholder} m={m} /></ActionForm>
                      <ActionForm action={deleteStakeholderAction.bind(null, s.id)} submitLabel={T.deleteStakeholder} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: s.name })} />
                    </div>
                  </details>
                )}
              </li>
            ))}
          </ul>
          {!showContacts && stakeholders.length > 0 && <p className="mt-2 text-xs text-slate-500">{T.contactsHidden}</p>}
          {edit && (
            <details className="mt-4 rounded-xl border border-dashed border-brand/30 p-4" open={stakeholders.length === 0}>
              <summary className="cursor-pointer text-sm font-semibold text-brand">+ {T.newStakeholder}</summary>
              <div className="mt-3"><ActionForm action={createStakeholderAction.bind(null, projectId)} submitLabel={m.ui.create} resetOnSuccess><StakeholderFields m={m} /></ActionForm></div>
            </details>
          )}
        </Card>
      </div>
    </div>
  );
}
