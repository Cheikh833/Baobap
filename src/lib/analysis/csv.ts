// Lecture CSV (RFC 4180) : guillemets, guillemets doublés, retours à la ligne dans les champs,
// séparateur détecté automatiquement (virgule, point-virgule, tabulation). Le fichier d'origine n'est jamais modifié :
// les cellules sont conservées telles quelles (texte), seules les interprétations se font au moment de l'analyse.

export const CSV_LIMITS = { bytes: 4 * 1024 * 1024, rows: 50_000, columns: 200 };

export class CsvError extends Error {}

export function detectDelimiter(text: string): string {
  const firstLine: string[] = [];
  let inQ = false;
  for (const ch of text) {
    if (ch === '"') inQ = !inQ;
    if (!inQ && (ch === "\n" || ch === "\r")) break;
    firstLine.push(ch);
  }
  const line = firstLine.join("");
  const counts = [",", ";", "\t"].map((d) => [d, line.split(d).length - 1] as const);
  const best = counts.reduce((a, b) => (b[1] > a[1] ? b : a));
  return best[1] > 0 ? best[0] : ",";
}

export function parseCsv(input: string, delimiter = detectDelimiter(input)): string[][] {
  const text = input.charCodeAt(0) === 0xfeff ? input.slice(1) : input;
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false;
      } else field += ch;
    } else if (ch === '"' && field === "") inQ = true;
    else if (ch === delimiter) { row.push(field); field = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); rows.push(row); row = []; field = "";
    } else field += ch;
  }
  if (inQ) throw new CsvError("Guillemet non fermé dans le fichier.");
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  // lignes entièrement vides ignorées
  return rows.filter((r) => r.some((c) => c.trim() !== ""));
}

/** Transforme un CSV en jeu de données : en-têtes uniques et lignes de longueur homogène. */
export function toDataset(text: string) {
  const delimiter = detectDelimiter(text);
  const all = parseCsv(text, delimiter);
  if (all.length < 2) throw new CsvError("Le fichier doit contenir une ligne d'en-têtes et au moins une ligne de données.");
  const raw = all[0].map((h) => h.trim());
  if (raw.length > CSV_LIMITS.columns) throw new CsvError(`Trop de colonnes (${raw.length}) : maximum ${CSV_LIMITS.columns}.`);
  if (all.length - 1 > CSV_LIMITS.rows) throw new CsvError(`Trop de lignes (${all.length - 1}) : maximum ${CSV_LIMITS.rows}.`);
  const seen = new Map<string, number>();
  const headers = raw.map((h, i) => {
    const base = h || `colonne_${i + 1}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);
    return n === 1 ? base : `${base}_${n}`;
  });
  let padded = 0;
  const rows = all.slice(1).map((r, i) => {
    if (r.length > headers.length) {
      // tolère des séparateurs finaux vides
      if (r.slice(headers.length).some((c) => c.trim() !== "")) throw new CsvError(`Ligne ${i + 2} : ${r.length} valeurs pour ${headers.length} colonnes. Vérifiez le séparateur et les guillemets.`);
      return r.slice(0, headers.length);
    }
    if (r.length < headers.length) { padded++; return [...r, ...Array(headers.length - r.length).fill("")]; }
    return r;
  });
  return { delimiter, headers, rows, padded };
}
