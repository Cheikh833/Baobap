import { describe, expect, it } from "vitest";
import { deflateSync } from "node:zlib";
import { createZip, crc32, readZip } from "@/lib/zip";
import { detectType, extractText, snippet } from "@/lib/documents";

describe("ZIP", () => {
  it("aller-retour et CRC32 de référence", () => {
    expect(crc32(Buffer.from("123456789"))).toBe(0xcbf43926);
    const z = createZip([{ name: "a.txt", data: "Bonjour Thiès" }, { name: "dossier/b.csv", data: Buffer.from("x;y\n1;2") }]);
    const r = readZip(z);
    expect(r.get("a.txt")!.toString()).toBe("Bonjour Thiès");
    expect(r.get("dossier/b.csv")!.toString()).toBe("x;y\n1;2");
  });
});

describe("types de fichiers", () => {
  it("vérifie la signature réelle, pas seulement l'extension", () => {
    expect(detectType("rapport.pdf", Buffer.from("%PDF-1.7 ..."))).toBe("application/pdf");
    expect(detectType("rapport.pdf", Buffer.from("MZ\x90\x00 executable"))).toBeNull();
    expect(detectType("virus.exe", Buffer.from("MZ"))).toBeNull();
    expect(detectType("page.html", Buffer.from("<script>"))).toBeNull();
    expect(detectType("image.svg", Buffer.from("<svg onload=alert(1)>"))).toBeNull();
    expect(detectType("photo.png", Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))).toBe("image/png");
    expect(detectType("note.txt", Buffer.from([0x41, 0x00, 0x42]))).toBeNull();
  });
});

describe("extraction de texte", () => {
  it("Word (.docx)", () => {
    const docx = createZip([{ name: "word/document.xml", data: '<w:document><w:body><w:p><w:r><w:t>Rapport annuel &amp; leçons apprises</w:t></w:r></w:p><w:p><w:r><w:t>Région de Kaffrine</w:t></w:r></w:p></w:body></w:document>' }]);
    expect(extractText("r.docx", docx)).toBe("Rapport annuel & leçons apprises\nRégion de Kaffrine");
  });
  it("PDF : flux compressé et non compressé", () => {
    const stream = (content: string, compress: boolean) => { const b = compress ? deflateSync(Buffer.from(content, "latin1")) : Buffer.from(content, "latin1"); return Buffer.concat([Buffer.from("stream\n"), b, Buffer.from("\nendstream\n")]); };
    const pdf = Buffer.concat([Buffer.from("%PDF-1.4\n"), stream("BT (Taux de couverture vaccinale) Tj ET", true), stream("BT [(Distr) -20 (ict de Mbour)] TJ ET", false), Buffer.from("%%EOF")]);
    const t = extractText("r.pdf", pdf)!;
    expect(t).toContain("Taux de couverture vaccinale");
    expect(t).toContain("District de Mbour");
    expect(snippet("Le taux de couverture progresse dans la région.", ["couverture"])).toContain("couverture");
  });
});
