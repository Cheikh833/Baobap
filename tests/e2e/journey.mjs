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
const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, locale: "fr-FR" });
const page = await ctx.newPage();
const consoleErrors = [];
page.on("console", (m) => m.type() === "error" && consoleErrors.push(m.text()));
page.on("pageerror", (e) => consoleErrors.push(`${e.message} @ ${page.url()}`));
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
// Changement de langue (formulaire natif → /api/locale → redirection) : attendre la fin réelle du rechargement.
const setLocale = async (code) => {
  await Promise.all([page.waitForResponse((r) => r.url().includes("/api/locale")), page.selectOption("#locale-select", code)]);
  await page.waitForLoadState("load");
  await page.waitForFunction((c) => document.documentElement.lang === c, code);
  await page.waitForLoadState("networkidle");
};
const go = async (path) => { const r = await page.goto(path.startsWith("http") ? path : BASE + path); await page.waitForLoadState("networkidle"); return r; };
const shot = async (n) => SHOTS && page.screenshot({ path: `${SHOTS}/${n}.png`, fullPage: true });

try {
  await go(BASE + "/");
  check("Landing page", await vis(page.getByRole("heading", { level: 1, name: /Planifier/ })));
  await shot("01-landing");

  // Pages légales, santé, mot de passe oublié
  await go("/legal/privacy");
  check("Page légale : confidentialité", await vis(page.getByRole("heading", { name: "Politique de confidentialité" })));
  const health = await page.request.get(BASE + "/api/health");
  check("Supervision : /api/health répond 200", health.status() === 200);
  await go("/forgot-password");
  await page.fill("[name=email]", "quelquun@test.sn");
  await page.click("button[type=submit]");
  check("Mot de passe oublié : message honnête sans SMTP", await vis(page.getByText(/pas encore configuré/)));

  // Tarifs
  await go("/pricing");
  check("Page Tarifs : 4 plans", (await page.locator("main article").count()) === 4);
  check("Tarifs : prix annuel affiché", await vis(page.getByText(/490\s000/)));
  await go("/pricing?cycle=monthly");
  check("Tarifs : prix mensuel affiché", await vis(page.getByText(/49\s000/)));
  await shot("01b-tarifs");

  // Changement de langue (formulaire natif)
  await setLocale("en");
  check("Langue : anglais", await vis(page.getByRole("heading", { name: /Pricing designed for impact/ })));
  await setLocale("wo");
  check("Langue : wolof (bêta, repli français)", await vis(page.getByRole("link", { name: "Njëg yi" })));
  await setLocale("fr");
  check("Langue : retour au français", await vis(page.getByRole("heading", { name: /Des tarifs pensés/ })));

  // Validation côté serveur : erreurs affichées
  await go(BASE + "/signup");
  await page.fill("[name=name]", "Testeur E2E");
  await page.fill("[name=email]", `e2e-${stamp}@test.sn`);
  await page.fill("[name=password]", "court");
  await page.click("button[type=submit]");
  check("Erreur de validation affichée", await vis(page.getByText(/au moins 10 caractères/)));
  check("Inscription : acceptation des conditions exigée", await vis(page.getByText(/accepter les conditions/).last()));
  await page.fill("[name=password]", "motdepasse123");
  await page.check("[name=terms]");
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
  const programUrl = page.url();

  // Stratégie : plan actif, axe, objectif
  await go("/strategy/new");
  await page.fill("[name=title]", "Plan stratégique E2E");
  await page.selectOption("[name=status]", "ACTIVE");
  await page.click("button[type=submit]");
  await waitUrl(/\/strategy\/c/);
  const planUrl = page.url();
  await page.fill("form:has(button:has-text('Créer')) [name=code]", "A1");
  await page.fill("form:has(button:has-text('Créer')) [name=title]", "Axe santé E2E");
  await page.click("button:has-text('Créer')");
  check("Stratégie : axe créé", await vis(page.getByText("Axe santé E2E")));
  await page.click("summary:has-text('Nouvel objectif')");
  const objForm = page.locator("details[open] form").first();
  await objForm.locator("[name=code]").fill("OS1");
  await objForm.locator("[name=title]").fill("Objectif E2E");
  await objForm.locator("button[type=submit]").click();
  check("Stratégie : objectif créé (non couvert)", await vis(page.getByText("Non couvert")));

  // Assistant projet
  await go(programUrl);
  await clickNav("text=+ Ajouter un projet", /\/projects\/new\?programId=/);
  await page.fill("[name=name]", "Projet E2E");
  await page.fill("[name=code]", "PRJ-E2E");
  await page.click("button[type=submit]");
  await waitStep(2);
  check("Brouillon créé à l'étape 1", true);
  await page.check("input[name=sdgs][value='3']");
  await page.locator("input[name^=obj_]").first().check();
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
  check("Fiche projet : contribution à l'objectif stratégique", await vis(page.getByText("Objectif E2E")));
  const projectUrl = page.url();
  await go(planUrl);
  check("Stratégie : couverture 100 % après alignement du projet", await vis(page.getByText("1 / 1 objectifs couverts par au moins un projet")));
  await go(projectUrl);
  await shot("04-fiche-projet");

  // Activation (propriétaire)
  await go(page.url() + "?tab=settings");
  await page.click("button:has-text('→ Actif')");
  check("Activation du projet", await vis(page.getByRole("button", { name: "→ Suspendu" })));
  await go(page.url().replace("settings", "history"));
  check("Historique du projet", await vis(page.getByText(/ACTIVE/).first()));

  // Planification : activité → Gantt ; tâche → Kanban
  await go(page.url().replace(/\?tab=.*$/, "") + "?tab=planning");
  const actForm = page.locator("details:has(summary:has-text('Nouvelle activité')) form");
  await actForm.locator("[name=code]").fill("A1");
  await actForm.locator("[name=title]").fill("Activité E2E");
  await actForm.locator("[name=startDate]").fill("2026-02-01");
  await actForm.locator("[name=endDate]").fill("2026-06-30");
  await actForm.locator("button[type=submit]").click();
  check("Planification : activité créée et visible dans le Gantt", await vis(page.getByText("Activité E2E")));
  await go(page.url().replace(/\?tab=.*$/, "") + "?tab=activities");
  const taskForm = page.locator("details:has(summary:has-text('Nouvelle tâche')) form");
  await taskForm.locator("[name=title]").fill("Tâche E2E");
  await taskForm.locator("button[type=submit]").click();
  const todoCol = page.locator("section[aria-label='À faire']");
  check("Kanban : tâche dans « À faire »", await vis(todoCol.getByText("Tâche E2E")));
  await page.click("button[aria-label='Avancer : Tâche E2E']");
  const inProgCol = page.locator("section[aria-label='En cours']");
  check("Kanban : tâche déplacée « En cours »", await vis(inProgCol.getByText("Tâche E2E")));
  await page.waitForLoadState("networkidle"); // laisse l'enregistrement du déplacement se terminer
  await go(page.url());
  check("Kanban : déplacement enregistré après rechargement", await vis(page.locator("section[aria-label='En cours']").getByText("Tâche E2E")));

  // Suivi-évaluation : cadre logique → indicateur → valeur ventilée → validation
  await go(page.url().replace(/\?tab=.*$/, "") + "?tab=results");
  const itemForm = page.locator("details:has(summary:has-text('Ajouter un élément')) form");
  await itemForm.locator("[name=level]").selectOption("IMPACT");
  await itemForm.locator("[name=code]").fill("IMP");
  await itemForm.locator("[name=title]").fill("Impact E2E");
  await itemForm.locator("button[type=submit]").click();
  check("MEAL : élément du cadre logique créé", await vis(page.getByText("Impact E2E")));
  check("MEAL : contrôle de cohérence signale l'absence d'indicateur", await vis(page.getByText("IMP n'a aucun indicateur")));
  await go(page.url().replace(/\?tab=.*$/, "") + "?tab=meal");
  const indForm = page.locator("details:has(summary:has-text('Nouvel indicateur')) form");
  await indForm.locator("[name=code]").fill("IND-E2E");
  await indForm.locator("[name=name]").fill("Personnes formées E2E");
  await indForm.locator("[name=definition]").fill("Nombre de personnes formées.");
  await indForm.locator("[name=unit]").fill("personnes");
  await indForm.locator("[name=logframeItemId]").selectOption({ label: "Impact · IMP — Impact E2E" });
  await indForm.locator("[name=baseline]").fill("0");
  await indForm.locator("[name=target]").fill("200");
  await indForm.locator("[name=source]").fill("Listes de présence");
  await indForm.locator("[name=disaggregations]").fill("Sexe : Femmes, Hommes");
  await indForm.locator("button[type=submit]").click();
  check("MEAL : indicateur créé", await vis(page.getByText("Personnes formées E2E")));
  await page.click("a:has-text('Personnes formées E2E')");
  await waitUrl("**/meal/indicators/**");
  const valForm = page.locator("form:has([name=periodStart])").first();
  await valForm.locator("[name=periodStart]").fill("2026-01-01");
  await valForm.locator("[name=periodEnd]").fill("2026-03-31");
  await valForm.locator("[name=value]").fill("50");
  await valForm.locator("[name=source]").fill("Listes T1");
  await valForm.locator("[name='dis__Sexe__Femmes']").fill("30");
  await valForm.locator("[name='dis__Sexe__Hommes']").fill("10");
  await valForm.locator("button[type=submit]").click();
  check("MEAL : ventilation incohérente refusée", await vis(page.getByText(/Ventilation incohérente/)));
  await valForm.locator("[name='dis__Sexe__Hommes']").fill("20");
  await valForm.locator("button[type=submit]").click();
  check("MEAL : valeur saisie en attente de validation", await vis(page.getByText("À valider").first()));
  await page.click("button:has-text('Valider')");
  check("MEAL : valeur validée, taux d'atteinte calculé (25 %)", await vis(page.getByText("25\u00A0%").first()));
  await shot("05b-indicateur");

  // Analyse de données : import CSV → dictionnaire & qualité → tableau croisé → ANOVA
  await go(BASE + "/analytics");
  check("Analyse : page vide explicite", await vis(page.getByText("Aucun jeu de données")));
  const lines = ["id;sexe;zone;score"];
  for (let i = 1; i <= 60; i++) lines.push(`${i};${i % 2 ? "F" : "H"};${i % 3 ? "Rurale" : "Urbaine"};${i % 2 ? 10 + (i % 7) : 14 + (i % 5)}`);
  lines.push("60;H;Urbaine;18");
  const impForm = page.locator("form:has([name=file])");
  await impForm.locator("[name=name]").fill("Enquête E2E");
  await impForm.locator("[name=file]").setInputFiles({ name: "enquete.csv", mimeType: "text/csv", buffer: Buffer.from(lines.join("\n")) });
  await impForm.locator("button[type=submit]").click();
  await waitUrl("**/analytics/c*");
  check("Analyse : import et dictionnaire des variables", await vis(page.getByRole("cell", { name: "score" })));
  check("Analyse : contrôle qualité (doublon détecté)", /Lignes en double/.test(await page.textContent("main")));
  await go(page.url().split("?")[0] + "?view=crosstab");
  check("Analyse : tableau croisé et test du khi²", await vis(page.getByText(/χ² = /)));
  await go(page.url().split("?")[0] + "?view=groups");
  check("Analyse : comparaison de moyennes (ANOVA)", await vis(page.getByText(/F = /)));
  await shot("05c-analyse");

  // Tableau de bord alimenté
  await go(BASE + "/dashboard");
  const dashText = await page.textContent("main");
  check("Tableau de bord : budget consolidé réel", /25\s000\s000/.test(dashText.replace(/ | /g, " ")));
  await shot("05-dashboard");

  // Espace de travail en anglais puis retour au français
  await setLocale("en");
  check("Espace de travail en anglais", await vis(page.getByRole("heading", { name: /^Hello,/ })));
  await setLocale("fr");
  check("Espace de travail : retour au français", await vis(page.getByRole("heading", { name: /^Bonjour,/ })));

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
  await go(BASE + "/organization/billing");
  check("Abonnement : essai gratuit affiché", await vis(page.getByText("Essai gratuit").first()));
  await page.fill("[name=contactPhone]", "+221 77 000 00 00");
  await page.click("button:has-text('Envoyer la demande')");
  check("Abonnement : demande enregistrée", await vis(page.getByText("En attente de traitement")));
  await shot("07-abonnement");

  // Espace de démonstration en un clic (données fictives), puis retour à l'organisation E2E
  await go("/onboarding");
  await page.click("button:has-text(\"Créer l'espace de démonstration\")");
  await waitUrl("**/dashboard");
  check("Démo : espace fictif créé et ouvert", await vis(page.locator("main").getByText("[DÉMO] ONG Sahel Avenir (fictif)").first()));
  check("Démo : plan stratégique pré-rempli", await vis(page.getByText(/Plan stratégique .* \(fictif\)/).first()));
  await Promise.all([
    page.waitForResponse((r) => r.url().includes("/api/organizations/switch")),
    page.selectOption("#organizationId", { label: `Organisation E2E ${stamp}` }),
  ]);
  await page.locator("main").getByText(`Organisation E2E ${stamp}`).first().waitFor();
  await page.waitForLoadState("networkidle");

  // Déconnexion → invité accepte
  await go(BASE + "/dashboard");
  await page.click("text=Se déconnecter");
  await waitUrl("**/login");
  await go(link);
  await clickNav("text=Créer mon compte", /\/signup/);
  await page.fill("[name=name]", "Invité E2E");
  await page.fill("[name=email]", `invite-${stamp}@test.sn`);
  await page.fill("[name=password]", "motdepasse123");
  await page.check("[name=terms]");
  await page.click("button[type=submit]");
  await waitUrl(/\/invitation\//);
  await page.click("button:has-text(\"Accepter l'invitation\")");
  await waitUrl("**/dashboard");
  check("Invité : rejoint l'organisation", await vis(page.locator("main").getByText(`Organisation E2E ${stamp}`)));
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
  check("Démo bailleur : connexion", await vis(page.locator("main").getByText("[DÉMO] ONG Fictive Sahel Avenir")));
  await go(BASE + "/organization/audit");
  check("Bailleur : journal d'audit interdit", await vis(page.getByText("Accès non autorisé")));
  await go(BASE + "/projects");
  check("Bailleur : ne voit pas les projets d'une autre organisation", await hidden(page.getByText("Projet E2E")));
  const before404 = consoleErrors.length;
  const pr = await go(BASE + "/projects/cdoesnotexist000000000000");
  consoleErrors.splice(before404); // le 404 attendu est journalisé par le navigateur
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
