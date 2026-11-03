// Parcours navigateur de bout en bout (Playwright). Usage : BASE_URL=http://localhost:3000 node tests/e2e/journey.mjs [dossier-captures]
import { createRequire } from "node:module";
// Playwright est résolu via require (installation globale ou devDependency).
const { chromium } = createRequire(import.meta.url)("playwright");
import fs from "node:fs";

const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const SHOTS = process.argv[2];
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const stamp = Date.now().toString(36).toUpperCase();
const results = [];
const check = (name, ok, detail = "") => { results.push({ name, ok, detail }); console.log(`${ok ? "✔" : "✘"} ${name}${detail ? " — " + detail : ""}`); };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(e.message));
// Attend qu'un élément soit visible (renvoie false au lieu de lever une erreur).
const vis = (loc, timeout = 8000) => loc.first().waitFor({ state: "visible", timeout }).then(() => true, () => false);
const hidden = (loc) => loc.first().isVisible().then((v) => !v);
// Navigation + attente de l'hydratation React.
const waitUrl = async (u) => { await page.waitForURL(u); await page.waitForLoadState("networkidle"); };
const waitStep = async (n) => { await page.getByRole("heading", { name: new RegExp(`^Étape ${n} —`) }).waitFor(); await page.waitForLoadState("networkidle"); };
const warnings = [];
// Clic sur un lien + attente de l'URL ; une seule nouvelle tentative, signalée en avertissement.
const clickNav = async (selector, url) => {
  await page.click(selector);
  try { await page.waitForURL(url, { timeout: 8000 }); }
  catch { warnings.push(`navigation relancée : ${selector}`); await page.click(selector); await page.waitForURL(url); }
  await page.waitForLoadState("networkidle");
};
const go = async (path) => { const r = await page.goto(path.startsWith("http") ? path : BASE + path); await page.waitForLoadState("networkidle"); return r; };
const shot = async (n) => SHOTS && page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });

try {
  await go(BASE + "/");
  check("Landing page", await vis(page.getByRole("heading", { name: /Gérez vos projets/ })));
  await shot("01-landing");

  // Validation côté serveur : erreurs affichées
  await go(BASE + "/signup");
  await page.fill("[name=name]", "Testeur E2E");
  await page.fill("[name=email]", `e2e-${stamp}@test.sn`);
  await page.fill("[name=password]", "court");
  await page.click("button[type=submit]");
  check("Erreur de validation affichée", await vis(page.getByText(/au moins 10 caractères/)));
  await page.fill("[name=password]", "motdepasse123");
  await page.click("button[type=submit]");
  await waitUrl("**/onboarding");
  check("Inscription → onboarding", true);

  await page.fill("[name=name]", `Organisation E2E ${stamp}`);
  await page.fill("[name=code]", `E2E${stamp}`);
  await page.click("button[type=submit]");
  await waitUrl("**/dashboard**");
  check("Création organisation → tableau de bord", await vis(page.getByText("Premiers pas")));
  await shot("02-dashboard-vide");

  // Portefeuille
  await go(BASE + "/portfolios/new");
  await page.fill("[name=name]", "Portefeuille E2E");
  await page.fill("[name=code]", "pf-e2e");
  await page.fill("[name=startDate]", "2026-01-01");
  await page.fill("[name=endDate]", "2025-01-01");
  await page.click("button[type=submit]");
  check("Contrôle des dates (fin < début)", await vis(page.getByText(/date de fin doit être postérieure/)));
  await page.fill("[name=endDate]", "2028-12-31");
  await page.click("button[type=submit]");
  await waitUrl(/\/portfolios\/c/);
  check("Portefeuille créé (code normalisé)", await vis(page.getByText("PF-E2E").first()));

  // Programme rattaché
  await go(BASE + "/programs/new");
  await page.fill("[name=name]", "Programme E2E");
  await page.fill("[name=code]", "PG-E2E");
  await page.selectOption("[name=portfolioId]", { label: "PF-E2E · Portefeuille E2E" });
  await page.click("button[type=submit]");
  await waitUrl(/\/programs\/c/);
  check("Programme créé et rattaché", await vis(page.getByRole("link", { name: "Portefeuille E2E" })));

  // Assistant projet
  await clickNav("text=+ Ajouter un projet", /\/projects\/new\?programId=/);
  await page.fill("[name=name]", "Projet E2E");
  await page.fill("[name=code]", "PRJ-E2E");
  await page.click("button[type=submit]");
  await waitStep(2);
  check("Brouillon créé à l'étape 1", true);
  await page.check("input[name=sdgs][value='3']");
  await page.click("button[type=submit]:has-text('Enregistrer et continuer')");
  await waitStep(3);
  await page.fill("[name=context]", "Contexte de test");
  await page.click("button[type=submit]:has-text('Enregistrer et continuer')");
  await waitStep(4);
  await page.click("button[name=intent][value=back]");
  await waitStep(3);
  check("Retour à l'étape précédente conserve les données", (await page.inputValue("[name=context]")) === "Contexte de test");
  const wizardBase = page.url().replace(/\/\d$/, "");
  await go(wizardBase + "/6");
  // Reprise : l'étape 4 a été enregistrée avant le retour, l'étape la plus avancée atteignable est donc la 5.
  check("Pas de saut d'étape non atteinte", /\/5$/.test(page.url()), page.url());
  await waitStep(5);
  await page.click("button[type=submit]:has-text('Enregistrer et continuer')");
  await waitStep(6);
  await page.fill("[name=startDate]", "2026-01-01");
  await page.fill("[name=endDate]", "2027-12-31");
  await page.click("button[type=submit]:has-text('Enregistrer et continuer')");
  await waitStep(7);
  await page.fill("[name=plannedBudget]", "25 000 000");
  await page.click("button[type=submit]:has-text('Enregistrer et continuer')");
  await waitStep(8);
  check("Vérification : synthèse affichée", await vis(page.getByText("Étape 8 — Vérification")));
  await shot("03-verification");
  await clickNav("text=Terminer (rester en brouillon)", /\/projects\/c[^/]+$/);
  check("Fiche projet : santé calculée", await vis(page.getByText("Santé du projet")));
  await shot("04-fiche-projet");

  // Activation (propriétaire)
  await go(page.url() + "?tab=settings");
  await page.click("button:has-text('→ Actif')");
  check("Activation du projet", await vis(page.getByRole("button", { name: "→ Suspendu" })));
  await go(page.url().replace("settings", "history"));
  check("Historique du projet", await vis(page.getByText(/ACTIVE/).first()));

  // Tableau de bord alimenté
  await go(BASE + "/dashboard");
  const dashText = await page.textContent("main");
  check("Tableau de bord : budget consolidé réel", /25\s000\s000/.test(dashText.replace(/ | /g, " ")));
  await shot("05-dashboard");

  // Organisation
  await go(BASE + "/organization/units");
  await page.fill("[name=name]", "Direction E2E");
  await page.click("button:has-text('Créer')");
  await page.waitForSelector("text=Structure créée.");
  check("Structure créée", await vis(page.getByText("Direction E2E").first()));
  await go(BASE + "/organization/members");
  await page.fill("[name=email]", `invite-${stamp}@test.sn`);
  await page.click("button:has-text(\"Créer l'invitation\")");
  const link = await page.locator("input[aria-label=\"Lien d'invitation\"]").inputValue();
  check("Invitation : lien généré", link.includes("/invitation/"));
  await go(BASE + "/organization/audit");
  check("Journal d'audit", await vis(page.getByText(/Invitation de invite-/)));
  await go(BASE + "/organization/roles");
  check("Rôles & permissions", await vis(page.getByText("Chef de projet").first()));

  // Déconnexion → invité accepte
  await go(BASE + "/dashboard");
  await page.click("text=Se déconnecter");
  await waitUrl("**/login");
  await go(link);
  await clickNav("text=Créer mon compte", /\/signup/);
  await page.fill("[name=name]", "Invité E2E");
  await page.fill("[name=email]", `invite-${stamp}@test.sn`);
  await page.fill("[name=password]", "motdepasse123");
  await page.click("button[type=submit]");
  await waitUrl(/\/invitation\//);
  await page.click("button:has-text(\"Accepter l'invitation\")");
  await waitUrl("**/dashboard");
  check("Invité : rejoint l'organisation", await vis(page.getByText(`Organisation E2E ${stamp}`).first()));
  await go(BASE + "/organization/members");
  check("Membre d'équipe : pas d'accès à la gestion des membres", await vis(page.getByText("Accès non autorisé")) || await hidden(page.getByText("Inviter un membre")));
  await go(BASE + "/projects/new");
  check("Membre d'équipe : création de projet refusée", await vis(page.getByText("Accès non autorisé")));
  await page.click("text=Se déconnecter");

  // Compte démo bailleur : isolation
  await go(BASE + "/login");
  await page.fill("[name=email]", "demo.bailleur@example.org");
  await page.fill("[name=password]", "demo-baobab-2026");
  await page.click("button[type=submit]");
  await waitUrl("**/dashboard");
  check("Démo bailleur : connexion", await vis(page.getByText("[DÉMO] ONG Fictive Sahel Avenir").first()));
  await go(BASE + "/organization/audit");
  check("Bailleur : journal d'audit interdit", await vis(page.getByText("Accès non autorisé")));
  await go(BASE + "/projects");
  check("Bailleur : ne voit pas les projets d'une autre organisation", await hidden(page.getByText("Projet E2E")));
  const pr = await go(BASE + "/projects/cdoesnotexist000000000000");
  check("Projet inexistant → 404", pr.status() === 404);

  // Responsive
  for (const [w, h] of [[320, 568], [375, 812], [390, 844], [430, 932], [768, 1024], [1024, 768], [1280, 800], [1440, 900]]) {
    await page.setViewportSize({ width: w, height: h });
    for (const path of ["/dashboard", "/projects"]) {
      await go(BASE + path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      check(`Responsive ${w}×${h} ${path} sans défilement horizontal`, overflow <= 0, overflow > 0 ? `+${overflow}px` : "");
    }
    if (w === 375 && SHOTS) await page.screenshot({ path: `${SHOTS}/06-mobile-dashboard.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 375, height: 812 });
  await go(BASE + "/dashboard");
  await page.click("button[aria-label='Ouvrir le menu']");
  check("Mobile : menu latéral", await vis(page.getByRole("dialog")));
  await page.setViewportSize({ width: 375, height: 812 });
  await go(BASE + "/");
  const lo = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  check("Responsive landing 375px", lo <= 0, lo > 0 ? `+${lo}px` : "");
} catch (e) {
  check("Exception pendant le parcours", false, e.message.split("\n")[0]);
  await shot("zz-erreur");
} finally {
  check("Aucune erreur console", consoleErrors.length === 0, consoleErrors.slice(0, 3).join(" | "));
  await browser.close();
  const failed = results.filter((r) => !r.ok);
  if (warnings.length) console.log("Avertissements :", warnings.join(" ; "));
  console.log(`\n${results.length - failed.length}/${results.length} vérifications réussies`);
  process.exit(failed.length ? 1 : 0);
}
