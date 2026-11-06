import { ActionForm, SelectField, TextField } from "@/components/forms/action-form";
import type { Messages } from "@/i18n/messages/fr";
import { createReportAction } from "@/app/(workspace)/studio/actions";

export function CreateReportForm({ projects, m, projectId }: { projects: readonly (readonly [string, string])[]; m: Messages; projectId?: string }) {
  const S = m.studio;
  return (
    <ActionForm action={createReportAction} submitLabel={S.newReport}>
      <div className="grid gap-3 sm:grid-cols-4">
        <SelectField name="type" label={S.fields.type} options={Object.entries(S.types).filter(([k]) => !projectId || k !== "ORGANIZATION_SUMMARY")} required className="sm:col-span-2" />
        {projectId ? <input type="hidden" name="projectId" value={projectId} /> : <SelectField name="projectId" label={S.fields.project} options={projects} placeholder="—" className="sm:col-span-2" />}
        <TextField name="title" label={S.fields.title} required className="sm:col-span-2" />
        <TextField name="startDate" label={S.fields.start} type="date" />
        <TextField name="endDate" label={S.fields.end} type="date" />
      </div>
      <ul className="mt-1 space-y-0.5 text-xs text-slate-500">{Object.entries(S.typeHints).map(([k, h]) => <li key={k}><span className="font-semibold">{S.types[k as keyof typeof S.types]}</span> — {h}</li>)}</ul>
    </ActionForm>
  );
}
