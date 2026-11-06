import { createZip } from "./zip";

// Génération de fichiers Office ouverts (OOXML) sans dépendance : Excel (.xlsx) et Word (.docx).

export type Cell = string | number | null;
export type Sheet = { name: string; rows: Cell[][] };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "");
const col = (i: number) => { let s = ""; for (i++; i > 0; i = Math.floor((i - 1) / 26)) s = String.fromCharCode(65 + ((i - 1) % 26)) + s; return s; };
const sheetName = (n: string, i: number) => (n.replace(/[\\/?*[\]:]/g, " ").slice(0, 31).trim() || `Feuille${i + 1}`);

/** Classeur Excel : une feuille par tableau ; la première ligne de chaque feuille est mise en gras. */
export function buildXlsx(sheets: Sheet[]) {
  const names = sheets.map((s, i) => sheetName(s.name, i)).map((n, i, all) => (all.indexOf(n) !== i ? `${n.slice(0, 28)} ${i + 1}` : n));
  const files = [
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>` },
    { name: "xl/workbook.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${names.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>` },
    { name: "xl/_rels/workbook.xml.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` },
    { name: "xl/styles.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE6F4F0"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="2"><xf/><xf fontId="1" fillId="2" applyFont="1" applyFill="1"/></cellXfs></styleSheet>` },
    ...sheets.map((s, i) => ({
      name: `xl/worksheets/sheet${i + 1}.xml`,
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${s.rows.map((r, ri) => `<row r="${ri + 1}">${r.map((c, ci) => {
        const ref = `${col(ci)}${ri + 1}`, st = ri === 0 ? ' s="1"' : "";
        if (c === null || c === "") return `<c r="${ref}"${st}/>`;
        return typeof c === "number" && Number.isFinite(c) ? `<c r="${ref}"${st}><v>${c}</v></c>` : `<c r="${ref}" t="inlineStr"${st}><is><t xml:space="preserve">${esc(String(c))}</t></is></c>`;
      }).join("")}</row>`).join("")}</sheetData></worksheet>`,
    })),
  ];
  return createZip(files);
}

export type DocBlock =
  | { kind: "title"; text: string }
  | { kind: "heading"; text: string }
  | { kind: "paragraph"; text: string; muted?: boolean }
  | { kind: "table"; head: string[]; rows: Cell[][] };

const run = (t: string, opts: { b?: boolean; size?: number; color?: string } = {}) =>
  `<w:r><w:rPr>${opts.b ? "<w:b/>" : ""}${opts.color ? `<w:color w:val="${opts.color}"/>` : ""}${opts.size ? `<w:sz w:val="${opts.size}"/>` : ""}</w:rPr><w:t xml:space="preserve">${esc(t)}</w:t></w:r>`;
const para = (t: string, opts: Parameters<typeof run>[1] & { after?: number } = {}) =>
  `<w:p><w:pPr><w:spacing w:after="${opts.after ?? 120}"/></w:pPr>${t.split("\n").map((l, i) => (i ? "<w:r><w:br/></w:r>" : "") + run(l, opts)).join("")}</w:p>`;
const cell = (t: string, head: boolean) =>
  `<w:tc><w:tcPr>${head ? '<w:shd w:val="clear" w:color="auto" w:fill="E6F4F0"/>' : ""}</w:tcPr>${para(t, { b: head, size: 18, after: 0 })}</w:tc>`;

/** Document Word : titres, paragraphes et tableaux. */
export function buildDocx(blocks: DocBlock[]) {
  const body = blocks.map((b) => {
    if (b.kind === "title") return para(b.text, { b: true, size: 40, color: "073B3A", after: 240 });
    if (b.kind === "heading") return para(b.text, { b: true, size: 28, color: "087F68", after: 120 });
    if (b.kind === "paragraph") return para(b.text, { color: b.muted ? "64748B" : undefined, size: b.muted ? 18 : 22 });
    const border = '<w:tblBorders><w:top w:val="single" w:sz="4" w:color="D5DED9"/><w:left w:val="single" w:sz="4" w:color="D5DED9"/><w:bottom w:val="single" w:sz="4" w:color="D5DED9"/><w:right w:val="single" w:sz="4" w:color="D5DED9"/><w:insideH w:val="single" w:sz="4" w:color="D5DED9"/><w:insideV w:val="single" w:sz="4" w:color="D5DED9"/></w:tblBorders>';
    return `<w:tbl><w:tblPr><w:tblW w:w="5000" w:type="pct"/>${border}</w:tblPr>${[b.head, ...b.rows].map((r, i) => `<w:tr>${r.map((c) => cell(c === null ? "" : String(c), i === 0)).join("")}</w:tr>`).join("")}</w:tbl>${para("", { after: 120 })}`;
  }).join("");
  return createZip([
    { name: "[Content_Types].xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>` },
    { name: "_rels/.rels", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>` },
    { name: "word/document.xml", data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134" w:header="708" w:footer="708" w:gutter="0"/></w:sectPr></w:body></w:document>` },
  ]);
}
