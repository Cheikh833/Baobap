import Link from "next/link";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { requireTenant } from "@/server/context";
import { can } from "@/server/permissions/check";
import { getDataset } from "@/server/services/analytics";
import { column, crosstab, describe, frequencies, groupMeans, histogram, parseDateValue, isMissing, COL_TYPES } from "@/lib/analysis/stats";
import { Badge, Card, PageHeader, Table, Td } from "@/components/ui/display";
import { ActionForm, SelectField } from "@/components/forms/action-form";
import { Bars } from "@/components/charts/charts";
import { Histogram } from "@/components/analysis/histogram";
import { cn } from "@/components/ui/cn";
import { formatDate, intlLocale } from "@/lib/metrics";
import { getMessages } from "@/i18n/server";
import { fill } from "@/i18n/translate";
import type { Messages } from "@/i18n/messages/fr";
import { Forbidden } from "../../forbidden";
import { orNotFound } from "../../guard";
import { columnTypeAction, deleteDatasetAction } from "../actions";

const VIEWS = ["overview", "describe", "crosstab", "groups", "data"] as const;
type View = (typeof VIEWS)[number];
type DS = Awaited<ReturnType<typeof getDataset>>;

const fmtFactory = (locale: string) => {
  const f2 = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 2 });
  const f3 = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 3, minimumFractionDigits: 3 });
  const clean = (s: string) => s.replace(/ /g, " ");
  return {
    n: (x: number | null | undefined) => (x === null || x === undefined ? "—" : clean(f2.format(x))),
    p: (x: number | null) => (x === null ? "= —" : x < 0.001 ? (locale === "en" ? "< 0.001" : "< 0,001") : `= ${clean(f3.format(x))}`),
    d3: (x: number | null) => (x === null ? "—" : clean(f3.format(x))),
  };
};

export default async function DatasetPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | undefined>> }) {
  const ctx = await requireTenant();
  if (!can(ctx, "analytics:view")) return <Forbidden />;
  const { id } = await params;
  const sp = await searchParams;
  const [ds, { m, locale }] = await Promise.all([orNotFound(getDataset(ctx, id)), getMessages()]);
  const A = m.analytics;
  const view: View = (VIEWS as readonly string[]).includes(sp.view ?? "") ? (sp.view as View) : "overview";

  return (
    <>
      <PageHeader
        title={ds.name}
        description={<>{ds.description && <span className="block">{ds.description}</span>}<span className="text-xs">{fill(A.importedBy, { file: ds.fileName, date: formatDate(ds.createdAt, locale) })}{ds.project && <> · <Link href={`/projects/${ds.project.id}`} className="hover:underline">{ds.project.code}</Link></>}</span></>}
        breadcrumb={<Link href="/analytics" className="hover:underline">{A.title}</Link>}
      />
      <nav className="-mx-4 mb-6 overflow-x-auto border-b border-line px-4 sm:mx-0 sm:px-0" aria-label="views">
        <ul className="flex gap-1">
          {VIEWS.map((v) => (
            <li key={v}><Link href={`?view=${v}`} aria-current={view === v ? "page" : undefined} className={cn("block whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium", view === v ? "border-brand text-brand-deep" : "border-transparent text-slate-600 hover:text-navy")}>{A.views[v]}</Link></li>
          ))}
        </ul>
      </nav>
      {view === "overview" && <Overview ds={ds} m={m} locale={locale} canEdit={can(ctx, "analytics:create")} canDelete={can(ctx, "analytics:delete")} />}
      {view === "describe" && <Describe ds={ds} m={m} locale={locale} col={sp.col} />}
      {view === "crosstab" && <Crosstab ds={ds} m={m} locale={locale} a={sp.a} b={sp.b} />}
      {view === "groups" && <Groups ds={ds} m={m} locale={locale} num={sp.num} grp={sp.grp} />}
      {view === "data" && <DataPreview ds={ds} m={m} />}
      <p className="mt-6 text-xs text-slate-500">{A.method}</p>
    </>
  );
}

function Overview({ ds, m, locale, canEdit, canDelete }: { ds: DS; m: Messages; locale: string; canEdit: boolean; canDelete: boolean }) {
  const A = m.analytics;
  const f = fmtFactory(locale);
  const q = ds.quality;
  const cards: [string, string, boolean][] = [
    [A.quality.rows, f.n(ds.rowCount), false], [A.quality.columns, f.n(ds.columnCount), false],
    [A.quality.missing, `${f.n(q.missingCells)} (${f.n(Math.round(q.missingPct * 10) / 10)} %)`, q.missingPct > 5],
    [A.quality.duplicates, f.n(q.duplicates), q.duplicates > 0], [A.quality.invalid, f.n(q.invalidCells), q.invalidCells > 0],
  ];
  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {cards.map(([l, v, warn], i) => (
          <Card key={l} className="animate-fade-up" ><div style={{ animationDelay: `${i * 60}ms` }}><p className={cn("font-display text-2xl font-bold tabular", warn ? "text-amber-700" : "text-navy")}>{v}</p><p className="flex items-center gap-1 text-xs text-slate-500">{warn ? <AlertTriangle className="h-3 w-3 text-amber-600" /> : <CheckCircle2 className="h-3 w-3 text-green-600" />}{l}</p></div></Card>
        ))}
      </div>
      <p className="text-xs text-slate-500">{A.qualityHint}</p>
      <Card className="p-0">
        <Table head={A.dictHead}>
          {ds.columns.map((c) => (
            <tr key={c.name} className="hover:bg-canvas">
              <Td><Link href={`?view=describe&col=${c.index}`} className="font-medium hover:underline">{c.name}</Link></Td>
              <Td>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={c.type === "number" ? "brand" : c.type === "categorical" ? "info" : c.type === "date" ? "warning" : "neutral"}>{A.types[c.type]}</Badge>
                  {c.overridden && <span className="text-[11px] text-slate-500">({fill(A.typeAuto, { type: A.types[c.inferred] })})</span>}
                </div>
                {canEdit && (
                  <details className="mt-1">
                    <summary className="cursor-pointer text-[11px] font-medium text-brand">{A.changeType}</summary>
                    <ActionForm action={columnTypeAction.bind(null, ds.id, c.name)} className="mt-1 flex items-end gap-2 space-y-0">
                      <SelectField name="type" label={A.variable} options={[["auto", fill(A.typeAuto, { type: A.types[c.inferred] })], ...COL_TYPES.map((t) => [t, A.types[t]] as const)]} defaultValue={c.overridden ? c.type : "auto"} />
                    </ActionForm>
                  </details>
                )}
              </Td>
              <Td className={cn("tabular", c.missingPct > 20 && "font-semibold text-amber-700")}>{f.n(c.missing)} <span className="text-xs text-slate-500">({f.n(Math.round(c.missingPct * 10) / 10)} %)</span></Td>
              <Td className="tabular">{f.n(c.distinct)}</Td>
              <Td className={cn("tabular", c.invalid > 0 && "font-semibold text-danger")}>{c.type === "number" || c.type === "date" ? f.n(c.invalid) : "—"}</Td>
              <Td className="max-w-[16rem] truncate text-xs text-slate-500">{c.example.join(" · ")}</Td>
            </tr>
          ))}
        </Table>
      </Card>
      <p className="text-xs text-slate-500">{A.inferredHint}</p>
      {canDelete && (
        <Card className="border-danger/30">
          <h2 className="mb-3 font-semibold text-danger">{A.deleteTitle}</h2>
          <ActionForm action={deleteDatasetAction.bind(null, ds.id)} submitLabel={A.deleteBtn} submitVariant="danger" confirm={fill(m.ui.confirmDelete, { name: ds.name })} />
        </Card>
      )}
    </div>
  );
}

/** Sélecteur(s) de variables (formulaire GET : fonctionne sans JavaScript). */
function Picker({ view, fields, m }: { view: View; fields: { name: string; label: string; options: { value: string; label: string }[]; value?: string }[]; m: Messages }) {
  return (
    <form method="get" className="flex flex-wrap items-end gap-3">
      <input type="hidden" name="view" value={view} />
      {fields.map((f) => (
        <label key={f.name} className="text-sm font-medium text-navy">
          {f.label}
          <select name={f.name} defaultValue={f.value} className="mt-1 block w-60 max-w-full rounded-lg border border-line bg-white px-3 py-2 text-sm focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20">
            {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      ))}
      <button type="submit" className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-deep">{m.analytics.analyze}</button>
    </form>
  );
}

function Describe({ ds, m, locale, col }: { ds: DS; m: Messages; locale: string; col?: string }) {
  const A = m.analytics;
  const f = fmtFactory(locale);
  const c = ds.columns[Number(col)] ?? ds.columns.find((x) => x.type === "number") ?? ds.columns[0];
  const values = column(ds.rows, c.index);
  const opts = ds.columns.map((x) => ({ value: String(x.index), label: `${x.name} (${A.types[x.type]})` }));
  let body;
  if (c.type === "number") {
    const d = describe(values);
    const S = A.stats;
    const items: [string, string][] = [[S.n, f.n(d.n)], [S.missing, f.n(d.missing)], [S.invalid, f.n(d.invalid)], [S.mean, f.n(d.mean)], [S.sd, f.n(d.sd)], [S.min, f.n(d.min)], [S.q1, f.n(d.q1)], [S.median, f.n(d.median)], [S.q3, f.n(d.q3)], [S.max, f.n(d.max)], [S.sum, f.n(d.sum)], [S.outliers, f.n(d.outliers)]];
    body = (
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
            {items.map(([k, v]) => <div key={k}><dt className="text-xs text-slate-500">{k}</dt><dd className="font-display text-lg font-bold tabular">{v}</dd></div>)}
          </dl>
        </Card>
        <Card className="lg:col-span-3"><h2 className="mb-3 font-display font-semibold">{A.histogram}</h2><Histogram bins={histogram(values)} label={`${A.histogram} — ${c.name}`} fmt={f.n} /></Card>
      </div>
    );
  } else if (c.type === "date") {
    const dates = values.filter((v) => !isMissing(v)).map(parseDateValue).filter((x): x is Date => !!x).sort((a, b) => a.getTime() - b.getTime());
    body = <Card><p className="text-sm">{dates.length ? fill(A.dateRange, { min: formatDate(dates[0], locale), max: formatDate(dates.at(-1), locale), n: dates.length }) : "—"}</p></Card>;
  } else {
    const fr = frequencies(values);
    const shown = fr.rows.slice(0, 30);
    body = (
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-0">
          <Table head={A.freqHead}>
            {shown.map((r) => <tr key={r.value}><Td>{r.value}</Td><Td className="tabular">{f.n(r.count)}</Td><Td className="tabular">{f.n(Math.round(r.pct * 10) / 10)} %</Td></tr>)}
          </Table>
          <p className="px-4 py-3 text-xs text-slate-500">{fill(A.freqTotal, { valid: fr.valid, missing: fr.missing })}{fr.rows.length > 30 && <> · {fill(A.moreCategories, { n: fr.rows.length - 30 })}</>}</p>
        </Card>
        <Card><h2 className="mb-3 font-display font-semibold">{A.frequencies}</h2><Bars label={c.name} data={shown.slice(0, 12).map((r) => ({ label: r.value, value: r.pct }))} format={(v) => `${f.n(Math.round(v * 10) / 10)} %`} /></Card>
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <Card><Picker view="describe" m={m} fields={[{ name: "col", label: A.variable, options: opts, value: String(c.index) }]} /></Card>
      {body}
    </div>
  );
}

const strengthOf = (v: number | null) => (v === null ? "negligible" : v < 0.1 ? "negligible" : v < 0.3 ? "weak" : v < 0.5 ? "moderate" : "strong");

function Crosstab({ ds, m, locale, a, b }: { ds: DS; m: Messages; locale: string; a?: string; b?: string }) {
  const A = m.analytics;
  const f = fmtFactory(locale);
  const cats = ds.columns.filter((c) => c.type === "categorical");
  if (cats.length < 2) return <Card><p className="text-sm text-slate-600">{A.chooseCategorical}</p></Card>;
  const ca = ds.columns[Number(a)] ?? cats[0];
  const cb = ds.columns[Number(b)] ?? cats.find((c) => c.index !== ca.index)!;
  const opts = ds.columns.filter((c) => c.type !== "number" || c.distinct <= 30).map((x) => ({ value: String(x.index), label: x.name }));
  const t = crosstab(column(ds.rows, ca.index), column(ds.rows, cb.index));
  return (
    <div className="space-y-6">
      <Card><Picker view="crosstab" m={m} fields={[{ name: "a", label: A.rowVar, options: opts, value: String(ca.index) }, { name: "b", label: A.colVar, options: opts, value: String(cb.index) }]} /></Card>
      {t.tooMany ? <Card><p className="text-sm text-amber-800">{fill(A.tooMany, { n: Math.max(t.rows, t.cols) })}</p></Card> : (
        <>
          <Card className="p-0">
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-canvas text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr><th className="px-4 py-3">{ca.name} \ {cb.name}</th>{t.colsK.map((c) => <th key={c} className="px-4 py-3 text-right">{c}</th>)}<th className="px-4 py-3 text-right">{A.total}</th></tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {t.rowsK.map((r, i) => (
                    <tr key={r}>
                      <td className="px-4 py-2 font-medium">{r}</td>
                      {t.counts[i].map((n, j) => {
                        const pct = t.rowTot[i] ? (n / t.rowTot[i]) * 100 : 0;
                        return (
                          <td key={j} className="px-4 py-2 text-right tabular" style={{ background: `rgba(8,127,104,${(pct / 100) * 0.35})` }}>
                            <span className="font-semibold">{f.n(n)}</span> <span className="text-xs text-slate-600">{f.n(Math.round(pct * 10) / 10)} %</span>
                          </td>
                        );
                      })}
                      <td className="px-4 py-2 text-right font-semibold tabular">{f.n(t.rowTot[i])}</td>
                    </tr>
                  ))}
                  <tr className="bg-canvas font-semibold"><td className="px-4 py-2">{A.total}</td>{t.colTot.map((n, j) => <td key={j} className="px-4 py-2 text-right tabular">{f.n(n)}</td>)}<td className="px-4 py-2 text-right tabular">{f.n(t.n)}</td></tr>
                </tbody>
              </table>
            </div>
            <p className="px-4 py-3 text-xs text-slate-500">{A.rowPct}{t.excluded > 0 && <> · {fill(A.excluded, { n: t.excluded })}</>}</p>
          </Card>
          <Card>
            <h2 className="mb-2 font-display font-semibold">{A.chiTitle}</h2>
            <p className="text-sm tabular">{fill(A.chiResult, { chi2: f.d3(t.chi2), df: t.df, p: f.p(t.p), v: f.d3(t.cramerV), strength: A.strength[strengthOf(t.cramerV)] })}</p>
            {!t.conditionsMet ? (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{fill(A.conditionsKo, { low: f.n(Math.round(t.lowShare)), min: f.n(Math.round(t.minExpected * 100) / 100) })}</p>
            ) : (
              <p className={cn("mt-2 rounded-lg p-3 text-sm", t.p !== null && t.p < 0.05 ? "bg-brand-50 text-brand-deep" : "bg-slate-50 text-slate-700")}>{t.p !== null && t.p < 0.05 ? A.significant : A.notSignificant}</p>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function Groups({ ds, m, locale, num, grp }: { ds: DS; m: Messages; locale: string; num?: string; grp?: string }) {
  const A = m.analytics;
  const f = fmtFactory(locale);
  const nums = ds.columns.filter((c) => c.type === "number");
  const cats = ds.columns.filter((c) => c.type === "categorical");
  if (!nums.length) return <Card><p className="text-sm text-slate-600">{A.chooseNumeric}</p></Card>;
  if (!cats.length) return <Card><p className="text-sm text-slate-600">{A.chooseCategorical}</p></Card>;
  const cn_ = ds.columns[Number(num)]?.type === "number" ? ds.columns[Number(num)] : nums[0];
  const cg = ds.columns[Number(grp)] ?? cats[0];
  const g = groupMeans(column(ds.rows, cn_.index), column(ds.rows, cg.index));
  return (
    <div className="space-y-6">
      <Card><Picker view="groups" m={m} fields={[{ name: "num", label: A.numVar, options: nums.map((x) => ({ value: String(x.index), label: x.name })), value: String(cn_.index) }, { name: "grp", label: A.groupVar, options: ds.columns.filter((c) => c.type !== "number" && c.type !== "text").map((x) => ({ value: String(x.index), label: x.name })), value: String(cg.index) }]} /></Card>
      {g.tooMany ? <Card><p className="text-sm text-amber-800">{fill(A.tooMany, { n: g.groups })}</p></Card> : (
        <>
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="p-0">
              <Table head={A.groupsHead}>
                {g.rows.map((r) => <tr key={r.group}><Td className="font-medium">{r.group}</Td><Td className="tabular">{r.n}</Td><Td className="tabular font-semibold">{f.n(r.mean)}</Td><Td className="tabular">{f.n(r.sd)}</Td><Td className="tabular">{f.n(r.median)}</Td><Td className="tabular">{f.n(r.min)}</Td><Td className="tabular">{f.n(r.max)}</Td></tr>)}
              </Table>
              {g.excluded > 0 && <p className="px-4 py-3 text-xs text-slate-500">{fill(A.excluded, { n: g.excluded })}</p>}
            </Card>
            <Card><h2 className="mb-3 font-display font-semibold">{cn_.name} — {cg.name}</h2><Bars label={cn_.name} data={g.rows.map((r) => ({ label: r.group, value: r.mean }))} format={(v) => f.n(v)} /></Card>
          </div>
          <Card>
            <h2 className="mb-2 font-display font-semibold">{A.anovaTitle}</h2>
            {g.f !== null && <p className="text-sm tabular">{fill(A.anovaResult, { f: f.d3(g.f), df1: g.df1, df2: g.df2, p: f.p(g.p), eta: f.d3(g.etaSquared) })}</p>}
            {!g.conditionsMet || g.p === null ? (
              <p className="mt-2 flex items-start gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-900"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{A.anovaConditions}</p>
            ) : (
              <>
                <p className={cn("mt-2 rounded-lg p-3 text-sm", g.p < 0.05 ? "bg-brand-50 text-brand-deep" : "bg-slate-50 text-slate-700")}>{g.p < 0.05 ? A.anovaSignificant : A.anovaNot}</p>
                <p className="mt-2 text-xs text-slate-500">{A.anovaConditions}</p>
              </>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function DataPreview({ ds, m }: { ds: DS; m: Messages }) {
  const n = Math.min(100, ds.rows.length);
  return (
    <Card className="p-0">
      <p className="px-4 py-3 text-xs text-slate-500">{fill(m.analytics.dataPreview, { n })}</p>
      <div className="max-h-[70vh] overflow-auto">
        <table className="min-w-full text-xs">
          <thead className="sticky top-0 bg-canvas text-left text-slate-500"><tr><th className="px-3 py-2">#</th>{ds.headers.map((h) => <th key={h} className="whitespace-nowrap px-3 py-2">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">
            {ds.rows.slice(0, n).map((r, i) => <tr key={i}><td className="px-3 py-1.5 text-slate-400">{i + 1}</td>{r.map((c, j) => <td key={j} className={cn("whitespace-nowrap px-3 py-1.5", isMissing(c) && "bg-amber-50 text-amber-700")}>{c || "∅"}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
