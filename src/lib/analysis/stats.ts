// Statistiques déterministes (docs/product/business-rules.md, section « Analyse de données »).
// Aucune valeur n'est inventée : les valeurs manquantes sont exclues et toujours comptées.

export type ColType = "number" | "date" | "categorical" | "text" | "empty";
export const COL_TYPES: ColType[] = ["number", "date", "categorical", "text"];

const MISSING = new Set(["", "na", "n/a", "nan", "null", "none", "-", ".", "nr", "ns", "#n/a"]);
export const isMissing = (v: string | null | undefined) => v === null || v === undefined || MISSING.has(v.trim().toLowerCase());

export function parseNumber(v: string): number | null {
  const s = v.trim().replace(/[\s  ]/g, "");
  if (!/^[-+]?(\d+([.,]\d+)?|[.,]\d+)$/.test(s)) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export function parseDateValue(v: string): Date | null {
  const s = v.trim();
  let y: number, m: number, d: number;
  let g = s.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (g) [y, m, d] = [+g[1], +g[2], +g[3]];
  else if ((g = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) [d, m, y] = [+g[1], +g[2], +g[3]];
  else return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}

/** Type d'une colonne : ≥ 95 % des valeurs renseignées numériques → nombre ; idem dates ; ≤ 20 modalités (et répétitions) → catégoriel ; sinon texte. */
export function inferType(values: string[]): ColType {
  const ok = values.filter((v) => !isMissing(v));
  if (!ok.length) return "empty";
  if (ok.filter((v) => parseNumber(v) !== null).length / ok.length >= 0.95) return "number";
  if (ok.filter((v) => parseDateValue(v) !== null).length / ok.length >= 0.95) return "date";
  const distinct = new Set(ok.map((v) => v.trim())).size;
  if (distinct <= 20 && (distinct <= ok.length / 2 || ok.length < 10)) return "categorical";
  return "text";
}

export const column = (rows: string[][], i: number) => rows.map((r) => r[i] ?? "");

/** Quantile, méthode « type 7 » (R par défaut, Excel QUARTILE.INC). `sorted` doit être trié. */
export function quantile(sorted: number[], p: number) {
  if (!sorted.length) return null;
  const h = (sorted.length - 1) * p;
  const lo = Math.floor(h);
  return sorted[lo] + (h - lo) * ((sorted[Math.min(lo + 1, sorted.length - 1)] ?? sorted[lo]) - sorted[lo]);
}

export function describe(values: string[]) {
  const nums = values.map((v) => (isMissing(v) ? null : parseNumber(v)));
  const valid = nums.filter((n): n is number => n !== null);
  const missing = values.filter(isMissing).length;
  const invalid = values.length - missing - valid.length;
  const n = valid.length;
  if (!n) return { n, missing, invalid, mean: null, sd: null, min: null, q1: null, median: null, q3: null, max: null, sum: null, outliers: 0 };
  const sorted = [...valid].sort((a, b) => a - b);
  const sum = valid.reduce((s, x) => s + x, 0);
  const mean = sum / n;
  const sd = n > 1 ? Math.sqrt(valid.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : null;
  const q1 = quantile(sorted, 0.25)!, q3 = quantile(sorted, 0.75)!;
  const iqr = q3 - q1;
  const outliers = valid.filter((x) => x < q1 - 1.5 * iqr || x > q3 + 1.5 * iqr).length;
  return { n, missing, invalid, mean, sd, min: sorted[0], q1, median: quantile(sorted, 0.5), q3, max: sorted[n - 1], sum, outliers };
}

/** Histogramme à intervalles égaux (règle de Sturges, 5 à 15 classes). */
export function histogram(values: string[]) {
  const nums = values.map((v) => (isMissing(v) ? null : parseNumber(v))).filter((n): n is number => n !== null);
  if (!nums.length) return [];
  const min = Math.min(...nums), max = Math.max(...nums);
  if (min === max) return [{ from: min, to: max, count: nums.length }];
  const k = Math.max(5, Math.min(15, Math.ceil(Math.log2(nums.length) + 1)));
  const w = (max - min) / k;
  const bins = Array.from({ length: k }, (_, i) => ({ from: min + i * w, to: i === k - 1 ? max : min + (i + 1) * w, count: 0 }));
  for (const x of nums) bins[Math.min(k - 1, Math.floor((x - min) / w))].count++;
  return bins;
}

export function frequencies(values: string[]) {
  const counts = new Map<string, number>();
  let missing = 0;
  for (const v of values) {
    if (isMissing(v)) { missing++; continue; }
    const k = v.trim();
    counts.set(k, (counts.get(k) ?? 0) + 1);
  }
  const valid = values.length - missing;
  const rows = [...counts].map(([value, count]) => ({ value, count, pct: valid ? (count / valid) * 100 : 0 })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value));
  return { rows, valid, missing, total: values.length };
}

export function duplicateRows(rows: string[][]) {
  const seen = new Set<string>();
  let dup = 0;
  for (const r of rows) {
    const k = JSON.stringify(r.map((c) => c.trim()));
    if (seen.has(k)) dup++; else seen.add(k);
  }
  return dup;
}

/** Profil d'une colonne : type, valeurs manquantes, modalités, valeurs non conformes au type. */
export function profileColumn(values: string[], type: ColType) {
  const missing = values.filter(isMissing).length;
  const ok = values.filter((v) => !isMissing(v));
  const distinct = new Set(ok.map((v) => v.trim())).size;
  const invalid = type === "number" ? ok.filter((v) => parseNumber(v) === null).length : type === "date" ? ok.filter((v) => parseDateValue(v) === null).length : 0;
  return { missing, missingPct: values.length ? (missing / values.length) * 100 : 0, distinct, invalid, example: ok.slice(0, 3) };
}

// ───────────── Fonctions spéciales (lois du khi² et de Fisher) ─────────────

function lnGamma(x: number): number {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let ser = 1.000000000190015;
  for (const k of c) ser += k / ++y;
  return -tmp + Math.log((2.5066282746310005 * ser) / x);
}

/** Fonction gamma incomplète régularisée P(a, x). */
function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a, del = sum, ap = a;
    for (let n = 0; n < 500; n++) { ap++; del *= x / ap; sum += del; if (Math.abs(del) < Math.abs(sum) * 1e-14) break; }
    return sum * Math.exp(-x + a * Math.log(x) - lnGamma(a));
  }
  let b = x + 1 - a, c = 1 / 1e-300, d = 1 / b, h = d;
  for (let i = 1; i < 500; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - lnGamma(a)) * h;
}

export const chiSquarePValue = (chi2: number, df: number) => (df <= 0 ? 1 : Math.max(0, Math.min(1, 1 - gammaP(df / 2, chi2 / 2))));

function betacf(a: number, b: number, x: number) {
  const qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-300) d = 1e-300;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 500; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d; h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-300) d = 1e-300;
    c = 1 + aa / c; if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-14) break;
  }
  return h;
}

/** Bêta incomplète régularisée I_x(a, b). */
function betaI(a: number, b: number, x: number) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lnGamma(a + b) - lnGamma(a) - lnGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? (bt * betacf(a, b, x)) / a : 1 - (bt * betacf(b, a, 1 - x)) / b;
}

export const fPValue = (f: number, df1: number, df2: number) => (f <= 0 ? 1 : Math.max(0, Math.min(1, betaI(df2 / 2, df1 / 2, df2 / (df2 + df1 * f)))));

// ───────────── Tableau croisé et test d'indépendance du khi² ─────────────

export const MAX_CATEGORIES = 30;

export function crosstab(a: string[], b: string[]) {
  const pairs = a.map((x, i) => [x, b[i]] as const).filter(([x, y]) => !isMissing(x) && !isMissing(y)).map(([x, y]) => [x.trim(), y.trim()] as const);
  const rowsK = [...new Set(pairs.map((p) => p[0]))].sort((x, y) => x.localeCompare(y));
  const colsK = [...new Set(pairs.map((p) => p[1]))].sort((x, y) => x.localeCompare(y));
  const excluded = a.length - pairs.length;
  if (rowsK.length > MAX_CATEGORIES || colsK.length > MAX_CATEGORIES) return { tooMany: true as const, rows: rowsK.length, cols: colsK.length };
  const counts = rowsK.map((r) => colsK.map((c) => pairs.filter((p) => p[0] === r && p[1] === c).length));
  const rowTot = counts.map((r) => r.reduce((s, x) => s + x, 0));
  const colTot = colsK.map((_, j) => counts.reduce((s, r) => s + r[j], 0));
  const n = pairs.length;
  const expected = rowTot.map((rt) => colTot.map((ct) => (n ? (rt * ct) / n : 0)));
  let chi2 = 0;
  counts.forEach((r, i) => r.forEach((o, j) => { const e = expected[i][j]; if (e > 0) chi2 += (o - e) ** 2 / e; }));
  const df = (rowsK.length - 1) * (colsK.length - 1);
  const cells = expected.flat();
  const lowShare = cells.length ? cells.filter((e) => e < 5).length / cells.length : 0;
  const minExpected = cells.length ? Math.min(...cells) : 0;
  const k = Math.min(rowsK.length, colsK.length);
  return {
    tooMany: false as const, rowsK, colsK, counts, rowTot, colTot, n, excluded, expected,
    chi2, df, p: df > 0 ? chiSquarePValue(chi2, df) : null, cramerV: k > 1 && n ? Math.sqrt(chi2 / (n * (k - 1))) : null,
    // Conditions de Cochran : aucun effectif théorique < 1 et au plus 20 % < 5.
    conditionsMet: df > 0 && minExpected >= 1 && lowShare <= 0.2, lowShare: lowShare * 100, minExpected,
  };
}

// ───────────── Comparaison de moyennes entre groupes (ANOVA à un facteur) ─────────────

export function groupMeans(values: string[], groups: string[]) {
  const by = new Map<string, number[]>();
  let excluded = 0;
  values.forEach((v, i) => {
    const g = groups[i];
    const x = isMissing(v) ? null : parseNumber(v);
    if (x === null || isMissing(g)) { excluded++; return; }
    const k = g.trim();
    (by.get(k) ?? by.set(k, []).get(k)!).push(x);
  });
  if (by.size > MAX_CATEGORIES) return { tooMany: true as const, groups: by.size };
  const rows = [...by].map(([group, xs]) => {
    const n = xs.length, mean = xs.reduce((s, x) => s + x, 0) / n;
    const sd = n > 1 ? Math.sqrt(xs.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : null;
    const sorted = [...xs].sort((a, b) => a - b);
    return { group, n, mean, sd, median: quantile(sorted, 0.5)!, min: sorted[0], max: sorted[n - 1] };
  }).sort((a, b) => a.group.localeCompare(b.group));
  const N = rows.reduce((s, r) => s + r.n, 0);
  const k = rows.length;
  const grand = rows.reduce((s, r) => s + r.mean * r.n, 0) / (N || 1);
  const ssb = rows.reduce((s, r) => s + r.n * (r.mean - grand) ** 2, 0);
  const ssw = [...by.values()].reduce((s, xs) => { const m = xs.reduce((a, x) => a + x, 0) / xs.length; return s + xs.reduce((a, x) => a + (x - m) ** 2, 0); }, 0);
  const df1 = k - 1, df2 = N - k;
  const f = df1 > 0 && df2 > 0 && ssw > 0 ? ssb / df1 / (ssw / df2) : null;
  return {
    tooMany: false as const, rows, n: N, excluded, df1, df2, f, p: f === null ? null : fPValue(f, df1, df2),
    etaSquared: ssb + ssw > 0 ? ssb / (ssb + ssw) : null,
    // Conditions minimales : au moins 2 groupes, chacun avec au moins 2 observations.
    conditionsMet: k >= 2 && rows.every((r) => r.n >= 2),
  };
}
