// Robot d'audit : parcourt toutes les pages accessibles par les liens, pour un rôle donné, et signale
// erreurs HTTP, erreurs JavaScript, débordements (ordinateur et mobile 360 px), textes « undefined/NaN »,
// et textes français dans l'interface anglaise.
// Usage : BASE_URL=http://localhost:3000 node tests/e2e/audit.mjs <libellé> <email|-> <mot-de-passe|-> <rapport.json> [fr|en]
import { createRequire } from "node:module";
import fs from "node:fs";
const { chromium } = createRequire(import.meta.url)("playwright");
const B = process.env.BASE_URL ?? "http://localhost:3000";
const [, , label, email, password, outFile, locale = "fr"] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1360, height: 900 } });
if (locale === "en") await ctx.addCookies([{ name: "baobab_locale", value: "en", url: B }]);
const page = await ctx.newPage();
let errs = [];
page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 200)));
page.on("pageerror", (e) => errs.push("PAGEERROR " + String(e).slice(0, 200)));
const report = { label, locale, pages: [], issues: [] };
if (email !== "-") {
  await page.goto(B + "/login"); await page.fill("[name=email]", email); await page.fill("[name=password]", password);
  await page.click("button[type=submit]"); await page.waitForURL("**/dashboard", { timeout: 20000 });
}
const start = email === "-" ? ["/", "/pricing", "/login", "/signup?new=1", "/forgot-password", "/legal/terms", "/legal/privacy", "/legal/notice"] : ["/dashboard"];
const queue = [...start], seen = new Set(start);
const FR = /\b(Aucun|Aucune|Enregistrer|Supprimer|Modifier|Créer|Ajouter|Valider|Rejeter|Statut|Responsable|Début|Montant|Saisir|Annuler|Consulter|Nouveau|Nouvelle|Voir|Retour|Fermer|Indicateurs?|Données|Prochaine|Activités?|Tâches?|Jalons?|Échéance|Bientôt|Paramètres|Historique|Organisation|Stratégie|Portefeuilles?|Programmes?)\b/;
while (queue.length && report.pages.length < 450) {
  const url = queue.shift();
  errs = [];
  let status = 0;
  try {
    const r = await page.goto(B + url, { waitUntil: "networkidle", timeout: 30000 });
    status = r?.status() ?? 0;
  } catch (e) { report.issues.push({ url, kind: "timeout", detail: String(e).slice(0, 120) }); continue; }
  const info = await page.evaluate(() => {
    const main = document.querySelector("main") ?? document.body;
    const text = main.innerText.replace(/N\/A, NaN/g, ""); // la liste des valeurs manquantes cite « NaN » volontairement
    const links = [...document.querySelectorAll("a[href]")].filter((a) => a.origin === location.origin).map((a) => a.pathname + a.search);
    const ui = [...document.querySelectorAll("button, label, th, summary, nav a, h1, [role=tab]")].map((e) => e.innerText.trim()).filter(Boolean);
    const unnamed = [...document.querySelectorAll("button, a[href]")].filter((e) => !e.closest("details:not([open])") && e.offsetParent !== null && !e.innerText.trim() && !e.getAttribute("aria-label") && !e.getAttribute("title") && !e.querySelector("[aria-label],img[alt],svg[aria-label]")).length;
    return { title: document.title, text, links, ui, overflow: document.documentElement.scrollWidth > window.innerWidth + 1, unnamed, h1: document.querySelector("h1")?.innerText ?? "" };
  });
  report.pages.push({ url, status, title: info.title, h1: info.h1 });
  if (status >= 400) report.issues.push({ url, kind: "http", detail: status });
  if (errs.length) report.issues.push({ url, kind: "console", detail: [...new Set(errs)].slice(0, 3) });
  if (info.overflow) report.issues.push({ url, kind: "overflow-desktop" });
  if (info.unnamed) report.issues.push({ url, kind: "unnamed-controls", detail: info.unnamed });
  for (const bad of ["undefined", "NaN", "[object Object]", "Invalid Date"]) if (new RegExp(`(^|[^a-zA-Z])${bad.replace(/[[\]]/g, "\\$&")}([^a-zA-Z]|$)`).test(info.text)) report.issues.push({ url, kind: "bad-text", detail: bad });
  if (locale === "en") { const fr = info.ui.filter((t) => FR.test(t)); if (fr.length) report.issues.push({ url, kind: "fr-in-en", detail: [...new Set(fr)].slice(0, 8) }); }
  for (const h of info.links) {
    if (!h || !h.startsWith("/") || h.startsWith("/api/") || h.startsWith("//")) continue;
    let u = h.split("#")[0];
    if (u.startsWith("/?")) continue;
    // dédoublonnage : pour /meal/indicators/<id> et /analytics/<id>, on garde quelques exemples
    const key = u.replace(/c[a-z0-9]{24}/g, "ID");
    if (/\/(meal\/indicators|analytics)\/ID$/.test(key) && [...seen].filter((s) => s.replace(/c[a-z0-9]{24}/g, "ID") === key).length >= 2) continue;
    if (!seen.has(u)) { seen.add(u); queue.push(u); }
  }
}
// passage mobile : débordements horizontaux
const m = await ctx.newPage();
await m.setViewportSize({ width: 360, height: 760 });
for (const p of report.pages.filter((p) => p.status < 400)) {
  try { await m.goto(B + p.url, { waitUntil: "networkidle", timeout: 30000 }); } catch { continue; }
  if (await m.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)) report.issues.push({ url: p.url, kind: "overflow-mobile" });
}
fs.writeFileSync(outFile, JSON.stringify(report, null, 1));
console.log(label, locale, "pages:", report.pages.length, "issues:", report.issues.length);
await b.close();
