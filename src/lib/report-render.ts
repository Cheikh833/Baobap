import type { DocBlock, Sheet } from "./office";
import { formatDate, formatMoney, intlLocale } from "./metrics";
import type { Messages } from "@/i18n/messages/fr";
import { fill } from "@/i18n/translate";

// Mise en forme d'un rapport du Studio : une seule source (blocs) pour l'aperçu, l'impression, Word et Excel.
// Les données sont celles du rapport (instantané figé s'il est validé) : aucun calcul nouveau ici.

/* eslint-disable @typescript-eslint/no-explicit-any */
type Data = any;
type Narrative = { summary?: string; highlights?: string; challenges?: string; nextSteps?: string };
type R = { title: string; type: string; status: string; approvedAt?: Date | null; periodStart?: Date | null; periodEnd?: Date | null };

export function reportBlocks(r: R, data: Data, narrative: Narrative, m: Messages, locale: string): DocBlock[] {
  const S = m.studio, L = S.labels, C = S.cols;
  const nf = new Intl.NumberFormat(intlLocale(locale), { maximumFractionDigits: 1 });
  const num = (x: number | null | undefined) => (x === null || x === undefined ? "—" : nf.format(x).replace(/ /g, " "));
  const pct = (x: number | null | undefined) => (x === null || x === undefined ? "—" : `${num(x)} %`);
  const d = (x: string | null | undefined) => (x ? formatDate(new Date(x), locale) : "—");
  const out: DocBlock[] = [{ kind: "title", text: r.title }];
  out.push({ kind: "paragraph", muted: true, text: `${S.types[r.type as keyof typeof S.types]} · ${data.orgName}\n${r.periodStart || r.periodEnd ? fill(S.period, { start: d(r.periodStart?.toISOString()), end: d(r.periodEnd?.toISOString()) }) : S.noPeriod}` });
  const text = (heading: string, body?: string) => { if (body?.trim()) out.push({ kind: "heading", text: heading }, { kind: "paragraph", text: body.trim() }); };
  text(S.fields.summary, narrative.summary);

  if (data.project) {
    const p = data.project, cur = p.currency, money = (x: number | null | undefined) => (x === null || x === undefined ? "—" : formatMoney(x, cur, locale));
    out.push({ kind: "heading", text: S.sections.identity }, { kind: "table", head: ["", ""], rows: [
      [L.project, `${p.code} — ${p.name}`], [L.program, p.program ?? "—"], [L.manager, p.manager ?? "—"], [L.zone, [p.country, p.region].filter(Boolean).join(" · ") || "—"],
      [L.period, `${d(p.start)} → ${d(p.end)}`], [L.objective, p.objective ?? "—"],
    ] });
    out.push({ kind: "heading", text: S.sections.progress }, { kind: "table", head: ["", ""], rows: [
      [L.elapsed, pct(p.elapsed)], [L.actual, pct(p.actual)],
      ...(data.activities ? [[S.sections.activities, fill(L.activitiesDone, { done: data.activities.done, total: data.activities.total })]] : []),
    ] });
    text(S.fields.highlights, narrative.highlights);
    if (data.activities?.late?.length) out.push({ kind: "heading", text: S.sections.lateActivities }, { kind: "table", head: [C.code, C.name, C.due], rows: data.activities.late.map((a: Data) => [a.code, a.title, d(a.end)]) });
    if (data.milestones?.length && r.type === "PROJECT_PROGRESS") out.push({ kind: "heading", text: S.sections.milestones }, { kind: "table", head: [C.name, C.due, C.achieved], rows: data.milestones.map((x: Data) => [x.title, d(x.due), x.achieved ? d(x.achieved) : "—"]) });
    if (data.indicators?.length && r.type === "PROJECT_PROGRESS") out.push({ kind: "heading", text: S.sections.indicators }, { kind: "table", head: [C.code, C.name, C.baseline, C.current, C.target, C.rate, C.status], rows: data.indicators.map((i: Data) => [i.code, `${i.name} (${i.unit})`, num(i.baseline), num(i.current), num(i.target), pct(i.rate), m.meal.track[i.status as keyof typeof m.meal.track]]) });
    if (data.finance) {
      const f = data.finance;
      out.push({ kind: "heading", text: S.sections.finance }, { kind: "table", head: ["", ""], rows: [
        [L.planned, money(f.planned)], [L.spent, money(f.spent)], [L.execution, pct(f.execution)], [L.pending, money(f.pending)], [L.funded, money(f.funded)], [L.gap, money(f.fundingGap)],
        ...(f.periodSpent !== undefined && f.periodSpent !== null ? [[L.periodSpent, money(f.periodSpent)]] : []),
      ] });
      if (f.fundings?.length && r.type === "PROJECT_FINANCIAL") out.push({ kind: "heading", text: S.sections.fundings }, { kind: "table", head: [C.donor, C.reference, C.amount], rows: f.fundings.map((x: Data) => [x.donor, x.reference ?? "—", money(x.amount)]) });
      if (f.lines?.length) out.push({ kind: "heading", text: S.sections.lines }, { kind: "table", head: [C.code, C.name, L.planned, L.spent, L.remaining, L.execution], rows: f.lines.map((l: Data) => [l.code, l.label, money(l.planned), money(l.spent), money(l.remaining), pct(l.rate)]) });
      if (f.expenses?.length) out.push({ kind: "heading", text: S.sections.expenses }, { kind: "table", head: [C.date, C.line, C.description, C.supplier, C.reference, C.amount], rows: f.expenses.map((e: Data) => [d(e.date), e.line, e.description, e.supplier ?? "—", e.reference ?? "—", money(e.amount)]) });
    }
    if (data.risks?.length && r.type === "PROJECT_PROGRESS") out.push({ kind: "heading", text: S.sections.risks }, { kind: "table", head: [C.code, C.name, C.score, C.status, C.mitigation], rows: data.risks.map((x: Data) => [x.code, x.title, `${x.score} (${m.risks.levels[x.level as keyof typeof m.risks.levels]})`, m.risks.status[x.status as keyof typeof m.risks.status], x.mitigation ?? "—"]) });
    if (data.team?.length && r.type === "PROJECT_PROGRESS") out.push({ kind: "heading", text: S.sections.team }, { kind: "table", head: [C.name, C.role], rows: data.team.map((t: Data) => [t.name, t.role]) });
  }

  if (data.org) {
    const o = data.org;
    const lines: string[] = [];
    if (o.indicators) lines.push(fill(L.indicators, o.indicators));
    if (o.risks) lines.push(fill(L.risks, o.risks));
    if (o.strategy) lines.push(fill(L.coverage, o.strategy));
    if (lines.length) out.push({ kind: "heading", text: S.sections.progress }, { kind: "paragraph", text: lines.join("\n") });
    text(S.fields.highlights, narrative.highlights);
    if (o.byCurrency?.length) out.push({ kind: "heading", text: S.sections.byCurrency }, { kind: "table", head: [C.currency, L.planned, L.spent, L.execution, L.funded], rows: o.byCurrency.map((c: Data) => [c.currency, formatMoney(c.planned, c.currency, locale), formatMoney(c.spent, c.currency, locale), pct(c.planned ? Math.round((c.spent / c.planned) * 1000) / 10 : null), formatMoney(c.funded, c.currency, locale)]) });
    out.push({ kind: "heading", text: S.sections.projects }, { kind: "table", head: [C.code, C.name, C.status, L.planned, L.execution, C.indicatorsAvg, C.criticalRisks], rows: o.projects.map((p: Data) => [p.code, p.name, m.status[p.status as keyof typeof m.status], p.planned === null ? "—" : formatMoney(p.planned, p.currency, locale), pct(p.execution), pct(p.indicatorsAvg), p.criticalRisks ?? "—"]) });
  }

  text(S.fields.challenges, narrative.challenges);
  text(S.fields.nextSteps, narrative.nextSteps);
  out.push({ kind: "paragraph", muted: true, text: fill(S.generated, { date: formatDate(new Date(data.generatedAt), locale), org: data.orgName }) + (r.status === "FINAL" ? ` · ${S.status.FINAL}` : ` · ${S.status.DRAFT}`) });
  return out;
}

/** Classeur Excel : une feuille de synthèse (titres et paragraphes) + une feuille par tableau. */
export function reportSheets(blocks: DocBlock[], summaryName: string): Sheet[] {
  const summary: Sheet = { name: summaryName, rows: [] };
  const sheets: Sheet[] = [];
  let heading = summaryName;
  for (const b of blocks) {
    if (b.kind === "title" || b.kind === "heading") { heading = b.text; summary.rows.push([b.text]); }
    else if (b.kind === "paragraph") b.text.split("\n").forEach((l) => summary.rows.push([l]));
    else if (b.head.every((h) => h === "")) b.rows.forEach((r) => summary.rows.push(r));
    else sheets.push({ name: heading, rows: [b.head, ...b.rows] });
  }
  return [summary, ...sheets];
}
