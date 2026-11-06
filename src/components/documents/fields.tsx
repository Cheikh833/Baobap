import type { Document, KnowledgeArticle } from "@prisma/client";
import { FileText, FileSpreadsheet, FileImage, File as FileIcon, Presentation } from "lucide-react";
import { SelectField, TextAreaField, TextField } from "@/components/forms/action-form";
import type { Messages } from "@/i18n/messages/fr";

type Opt = readonly (readonly [string, string])[];

export function DocFields({ d, projects, m, withFile, projectId }: { d?: Document; projects: Opt; m: Messages; withFile?: boolean; projectId?: string }) {
  const F = m.docs.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      {withFile && <TextField name="file" label={F.file} type="file" required className="sm:col-span-4" accept=".pdf,.docx,.xlsx,.pptx,.odt,.ods,.doc,.xls,.ppt,.csv,.txt,.md,.png,.jpg,.jpeg,.webp" />}
      <TextField name="title" label={F.title} defaultValue={d?.title} required className="sm:col-span-2" />
      <SelectField name="category" label={F.category} options={Object.entries(m.docs.categories)} defaultValue={d?.category ?? "OTHER"} />
      {projectId ? <input type="hidden" name="projectId" value={projectId} /> : <SelectField name="projectId" label={F.project} options={projects} placeholder={m.docs.noProject} defaultValue={d?.projectId ?? ""} />}
      <TextField name="tags" label={F.tags} hint={F.tagsHint} defaultValue={d?.tags.join(", ")} className="sm:col-span-2" />
      <TextAreaField name="description" label={F.description} rows={2} defaultValue={d?.description ?? ""} className="sm:col-span-2" />
    </div>
  );
}

export function ArticleFields({ a, projects, m }: { a?: KnowledgeArticle; projects: Opt; m: Messages }) {
  const F = m.docs.fields;
  return (
    <div className="grid gap-3 sm:grid-cols-4">
      <TextField name="title" label={F.title} defaultValue={a?.title} required className="sm:col-span-2" />
      <SelectField name="category" label={F.category} options={Object.entries(m.docs.kcategories)} defaultValue={a?.category ?? "LESSON"} />
      <SelectField name="projectId" label={F.project} options={projects} placeholder={m.docs.noProject} defaultValue={a?.projectId ?? ""} />
      <TextAreaField name="body" label={F.body} rows={10} defaultValue={a?.body} required className="sm:col-span-4" />
      <TextField name="tags" label={F.tags} hint={F.tagsHint} defaultValue={a?.tags.join(", ")} className="sm:col-span-4" />
    </div>
  );
}

export function FileKindIcon({ mime, className = "h-5 w-5" }: { mime?: string | null; className?: string }) {
  const I = !mime ? FileIcon : mime.startsWith("image/") ? FileImage : /sheet|excel|csv/.test(mime) ? FileSpreadsheet : /presentation|powerpoint/.test(mime) ? Presentation : FileText;
  return <I className={className} aria-hidden />;
}

export const fmtSize = (n: number, locale: string) => {
  const f = new Intl.NumberFormat(locale === "en" ? "en-GB" : "fr-FR", { maximumFractionDigits: 1 });
  return n < 1024 ? `${n} o` : n < 1024 ** 2 ? `${f.format(n / 1024)} Ko` : n < 1024 ** 3 ? `${f.format(n / 1024 ** 2)} Mo` : `${f.format(n / 1024 ** 3)} Go`;
};
