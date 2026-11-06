// Écriture CSV (séparateur « ; », BOM UTF-8 pour Excel) avec protection contre l'injection de formules :
// une cellule qui commence par = + - @ (ou tabulation / retour chariot) est préfixée d'une apostrophe.
export function toCsv(head: string[], rows: unknown[][]) {
  const cell = (v: unknown) => {
    if (v === null || v === undefined) return "";
    let s = v instanceof Date ? v.toISOString() : typeof v === "object" ? JSON.stringify(v) : String(v);
    if (/^[=+\-@\t\r]/.test(s) && !(typeof v === "number")) s = "'" + s;
    return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return "﻿" + [head, ...rows].map((r) => r.map(cell).join(";")).join("\r\n") + "\r\n";
}
