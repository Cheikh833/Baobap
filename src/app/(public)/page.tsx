import Link from "next/link";
import { BarChart3, FileText, FolderTree, Layers, LineChart, ShieldCheck, Sparkles, Target, Wallet } from "lucide-react";
import { Logo } from "@/components/logo";
import { ButtonLink } from "@/components/ui/button";
import { getSessionUser } from "@/server/auth/session";

// Landing page publique. Aucun client, témoignage, chiffre ou logo partenaire n'est inventé.
const problems = [
  "Données dispersées dans de multiples fichiers",
  "Projets gérés indépendamment les uns des autres",
  "Difficulté à relier activités, résultats et objectifs stratégiques",
  "Rapports produits manuellement pour chaque bailleur",
  "Indicateurs difficiles à actualiser et à consolider",
  "Décisions prises sans vue consolidée",
];

const modules = [
  { icon: Target, title: "Pilotage stratégique", text: "Plans, axes et objectifs stratégiques reliés aux interventions.", ready: false },
  { icon: FolderTree, title: "Portefeuilles, programmes, projets", text: "Une hiérarchie cohérente de l'organisation jusqu'au livrable.", ready: true },
  { icon: Layers, title: "Suivi-évaluation / MEAL", text: "Cadre logique, théorie du changement, indicateurs et apprentissage.", ready: false },
  { icon: Wallet, title: "Finances", text: "Budgets, financements, dépenses, engagements et variances.", ready: false },
  { icon: ShieldCheck, title: "Risques & conformité", text: "Registre, matrice probabilité × impact, plans de mitigation.", ready: false },
  { icon: BarChart3, title: "Analyse de données", text: "Import, qualité, statistiques calculées par un moteur déterministe.", ready: false },
  { icon: Sparkles, title: "BAOBAB AI", text: "Assistant contextualisé, sourcé, respectant vos permissions.", ready: false },
  { icon: FileText, title: "BAOBAB Studio", text: "One Source → Many Stories : dashboards, rapports, présentations.", ready: false },
];

const steps = ["Stratégie", "Portefeuille", "Programme", "Projet", "Exécution", "Indicateurs", "Analyse", "Décision", "Impact"];

const faq = [
  ["À qui s'adresse BAOBAB ?", "Aux ONG, associations, fondations, institutions publiques, agences de développement, bailleurs, cabinets de conseil et à toute organisation qui pilote des projets et programmes à impact."],
  ["Mes données sont-elles isolées des autres organisations ?", "Oui. Chaque requête est contrôlée côté serveur : un membre n'accède qu'aux données des organisations auxquelles il appartient, selon les permissions de son rôle."],
  ["Quels modules sont disponibles aujourd'hui ?", "La fondation organisationnelle (organisation, structures, membres, rôles et permissions, journal d'audit) ainsi que la gestion des portefeuilles, programmes et projets. Les autres modules sont en cours de construction et signalés comme tels."],
  ["L'IA invente-t-elle des chiffres ?", "Non. Les calculs sont réalisés par des moteurs déterministes ; l'IA (à venir) interprétera uniquement des résultats calculés et sourcés."],
];

export default async function LandingPage() {
  const user = await getSessionUser();
  return (
    <div className="bg-white">
      <header className="sticky top-0 z-20 border-b border-line/70 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Link href="/" aria-label="BAOBAB, accueil"><Logo /></Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <ButtonLink href="/dashboard">Ouvrir mon espace</ButtonLink>
            ) : (
              <>
                <ButtonLink href="/login" variant="ghost">Connexion</ButtonLink>
                <ButtonLink href="/signup">Démarrer</ButtonLink>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden bg-gradient-to-br from-brand-deep via-[#0B5B55] to-navy text-white">
          <div className="absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#fff_1px,transparent_1px),linear-gradient(90deg,#fff_1px,transparent_1px)] [background-size:40px_40px]" aria-hidden />
          <div className="relative mx-auto grid max-w-6xl gap-10 px-4 py-20 lg:grid-cols-2 lg:items-center lg:py-28">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.2em] text-emerald-200">Planifier. Exécuter. Impacter.</p>
              <h1 className="mt-4 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">Gérez vos projets.<br />Maximisez votre impact.</h1>
              <p className="mt-6 max-w-xl text-lg text-emerald-50/90">
                BAOBAB est la plateforme intelligente conçue pour les ONG et institutions. Suivi-évaluation, analyse de données assistée par IA et gestion de portefeuille dans un même environnement.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <ButtonLink href="/signup" size="lg" className="bg-white !text-brand-deep hover:bg-emerald-50">Démarrer gratuitement</ButtonLink>
                <ButtonLink href="#plateforme" size="lg" variant="ghost" className="!text-white ring-1 ring-white/40 hover:bg-white/10">Découvrir la plateforme</ButtonLink>
              </div>
            </div>
            {/* Représentation schématique du produit (sans données chiffrées inventées) */}
            <div className="rounded-2xl border border-white/15 bg-white/5 p-4 shadow-2xl backdrop-blur" aria-hidden>
              <div className="rounded-xl bg-white p-4 text-navy">
                <div className="mb-3 flex items-center gap-2 text-xs text-slate-500"><span className="h-2 w-2 rounded-full bg-brand" />Organisation › Portefeuille › Programme › Projet</div>
                <div className="space-y-2">
                  {["Portefeuille", "Programme", "Projet", "Activités"].map((l, i) => (
                    <div key={l} className="flex items-center gap-3 rounded-lg border border-line p-2.5" style={{ marginLeft: i * 16 }}>
                      <span className="h-6 w-6 rounded-md bg-brand-50" />
                      <span className="text-sm font-medium">{l}</span>
                      <span className="ml-auto h-1.5 w-20 rounded-full bg-slate-100"><span className="block h-full rounded-full bg-brand" style={{ width: `${70 - i * 12}%` }} /></span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-slate-400">Illustration de l&apos;interface</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">Les difficultés que BAOBAB résout</h2>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {problems.map((p) => <li key={p} className="rounded-xl border border-line bg-canvas p-5 text-sm">{p}</li>)}
          </ul>
        </section>

        <section className="bg-canvas py-20">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl font-semibold tracking-tight">Un système intégré, pas une collection d&apos;outils</h2>
            <p className="mt-3 max-w-2xl text-slate-600">Toutes les informations sont reliées dans un modèle de données commun, accessibles selon les permissions et exploitables pour la décision.</p>
            <ol className="mt-8 flex flex-wrap items-center gap-2 text-sm">
              {steps.map((s, i) => (
                <li key={s} className="flex items-center gap-2">
                  <span className="rounded-full border border-brand/30 bg-white px-3 py-1 font-medium text-brand-deep">{s}</span>
                  {i < steps.length - 1 && <span className="text-slate-400" aria-hidden>→</span>}
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="plateforme" className="mx-auto max-w-6xl scroll-mt-20 px-4 py-20">
          <h2 className="text-3xl font-semibold tracking-tight">La plateforme</h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {modules.map(({ icon: Icon, title, text, ready }) => (
              <article key={title} className="rounded-xl border border-line p-5">
                <Icon className="h-6 w-6 text-brand" aria-hidden />
                <h3 className="mt-3 font-semibold">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{text}</p>
                <p className={`mt-3 text-xs font-medium ${ready ? "text-success" : "text-slate-400"}`}>{ready ? "Disponible" : "En construction"}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="bg-canvas py-20">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 lg:grid-cols-2">
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Conçu pour la confiance</h2>
              <ul className="mt-6 space-y-3 text-sm text-slate-700">
                <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-brand" aria-hidden />Isolation stricte des organisations, contrôlée côté serveur.</li>
                <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-brand" aria-hidden />Rôles et permissions configurables par organisation.</li>
                <li className="flex gap-3"><ShieldCheck className="h-5 w-5 shrink-0 text-brand" aria-hidden />Journal d&apos;audit de toutes les modifications importantes.</li>
                <li className="flex gap-3"><LineChart className="h-5 w-5 shrink-0 text-brand" aria-hidden />Formules de calcul documentées, sans double comptage ni conversion implicite de devises.</li>
              </ul>
            </div>
            <div>
              <h2 className="text-3xl font-semibold tracking-tight">Questions fréquentes</h2>
              <div className="mt-6 space-y-3">
                {faq.map(([q, a]) => (
                  <details key={q} className="rounded-xl border border-line bg-white p-4">
                    <summary className="cursor-pointer font-medium">{q}</summary>
                    <p className="mt-2 text-sm text-slate-600">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-20 text-center">
          <h2 className="text-3xl font-semibold tracking-tight">Prêt à structurer votre pilotage ?</h2>
          <div className="mt-6"><ButtonLink href="/signup" size="lg">Créer mon organisation</ButtonLink></div>
        </section>
      </main>

      <footer className="bg-navy py-10 text-sm text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 sm:flex-row sm:items-center sm:justify-between">
          <Logo light />
          <p>© {new Date().getFullYear()} BAOBAB — Planifier. Exécuter. Impacter.</p>
        </div>
      </footer>
    </div>
  );
}
