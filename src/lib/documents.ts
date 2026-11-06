import { inflateSync } from "node:zlib";
import { readZip } from "./zip";

// Types de fichiers acceptés : vérifiés par l'extension ET la signature du contenu (pas seulement le nom).
export const MAX_FILE_BYTES = 4 * 1024 * 1024;

type Kind = { mime: string; magic?: (b: Buffer) => boolean };
const zip = (b: Buffer) => b.subarray(0, 4).equals(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
const ole = (b: Buffer) => b.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
const text = (b: Buffer) => !b.subarray(0, 4096).includes(0);
export const FILE_TYPES: Record<string, Kind> = {
  pdf: { mime: "application/pdf", magic: (b) => b.subarray(0, 5).toString() === "%PDF-" },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", magic: zip },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", magic: zip },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", magic: zip },
  odt: { mime: "application/vnd.oasis.opendocument.text", magic: zip },
  ods: { mime: "application/vnd.oasis.opendocument.spreadsheet", magic: zip },
  doc: { mime: "application/msword", magic: ole },
  xls: { mime: "application/vnd.ms-excel", magic: ole },
  ppt: { mime: "application/vnd.ms-powerpoint", magic: ole },
  csv: { mime: "text/csv", magic: text },
  txt: { mime: "text/plain", magic: text },
  md: { mime: "text/markdown", magic: text },
  png: { mime: "image/png", magic: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  jpg: { mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  jpeg: { mime: "image/jpeg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  webp: { mime: "image/webp", magic: (b) => b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP" },
};

export const extOf = (name: string) => name.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] ?? "";

/** Vérifie le type réel du fichier. Retourne le type MIME, ou null si refusé. */
export function detectType(name: string, data: Buffer): string | null {
  const k = FILE_TYPES[extOf(name)];
  if (!k || !data.length) return null;
  return !k.magic || k.magic(data) ? k.mime : null;
}

const stripXml = (x: string) => x.replace(/<\/(w:p|a:p|text:p|row)>/g, "\n").replace(/<[^>]+>/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");
const clean = (s: string) => s.replace(/[ \t ]+/g, " ").replace(/\s*\n\s*/g, "\n").trim().slice(0, 200_000);

/** Texte d'un PDF (meilleur effort : flux compressés, opérateurs Tj / TJ). Sert uniquement à la recherche. */
function pdfText(data: Buffer) {
  const s = data.toString("latin1");
  const parts: string[] = [];
  const re = /stream\r?\n/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(s)) && parts.join("").length < 200_000) {
    const start = m.index + m[0].length;
    const end = s.indexOf("endstream", start);
    if (end < 0) break;
    let content = s.slice(start, end);
    try { content = inflateSync(Buffer.from(content, "latin1"), { maxOutputLength: 5_000_000 }).toString("latin1"); } catch { /* flux non compressé */ }
    for (const t of content.matchAll(/\((?:\\.|[^\\)])*\)\s*Tj|\[(?:[^\]]*)\]\s*TJ/g)) {
      const strs = [...t[0].matchAll(/\(((?:\\.|[^\\)])*)\)/g)].map((x) => x[1].replace(/\\([nrt()\\])/g, (_, c) => ({ n: "\n", r: "", t: " ", "(": "(", ")": ")", "\\": "\\" })[c as "n"] ?? c));
      parts.push(strs.join(""));
    }
    parts.push("\n");
    re.lastIndex = end;
  }
  // ne garder que du texte lisible
  return parts.join(" ").replace(/[^\p{L}\p{N}\p{P}\p{Zs}\n€$%]/gu, " ");
}

/** Extrait le texte d'un fichier pour la recherche. Jamais bloquant : null si impossible. */
export function extractText(name: string, data: Buffer): string | null {
  try {
    const ext = extOf(name);
    if (["txt", "csv", "md"].includes(ext)) return clean(data.toString("utf8"));
    if (ext === "pdf") return clean(pdfText(data)) || null;
    if (["docx", "xlsx", "pptx", "odt", "ods"].includes(ext)) {
      const z = readZip(data);
      const parts: string[] = [];
      for (const [n, b] of z) {
        if (n === "word/document.xml" || n === "xl/sharedStrings.xml" || /^ppt\/slides\/slide\d+\.xml$/.test(n) || n === "content.xml") parts.push(stripXml(b.toString("utf8")));
      }
      return clean(parts.join("\n")) || null;
    }
  } catch { /* fichier illisible : pas de texte */ }
  return null;
}

/** Extrait autour de la première occurrence d'un terme (pour les résultats de recherche). */
export function snippet(text: string | null, terms: string[], width = 160) {
  if (!text) return null;
  const low = text.toLowerCase();
  const pos = Math.min(...terms.map((t) => low.indexOf(t.toLowerCase())).filter((i) => i >= 0));
  if (!Number.isFinite(pos)) return null;
  const start = Math.max(0, pos - width / 2);
  return (start > 0 ? "…" : "") + text.slice(start, start + width).replace(/\s+/g, " ").trim() + (start + width < text.length ? "…" : "");
}
