// Build de production : vérifie les réglages, met à jour la base (migrations), puis construit l'application.
import { spawnSync } from "node:child_process";
import { DB_URL_CANDIDATES, resolveDatabaseUrl } from "./db-url.mjs";

const box = (lines) => console.error(["", "╔" + "═".repeat(70) + "╗", ...lines.map((l) => "  " + l), "╚" + "═".repeat(70) + "╝", ""].join("\n"));

const db = resolveDatabaseUrl();
if (!db) {
  // Aide au diagnostic : noms (jamais les valeurs) des variables qui ressemblent à une base de données.
  const similar = Object.keys(process.env).filter((k) => /database|postgres|neon|^pg|_db$|^db_/i.test(k)).sort();
  box([
    "BAOBAB — adresse de la base de données introuvable.",
    "",
    "Vercel → Settings → Environment Variables :",
    " 1. Name  : DATABASE_URL   (exactement ainsi, en anglais, majuscules)",
    "    Value : l'adresse Neon postgresql://…?sslmode=require (connexion directe)",
    " 2. Cocher Production, Preview et Development, puis Save.",
    " 3. Deployments → « ⋯ » → Redeploy.",
    "",
    "Astuce : désactivez la traduction automatique du navigateur sur Vercel,",
    "elle peut modifier les noms de variables.",
    "",
    `Noms acceptés : ${DB_URL_CANDIDATES.join(", ")}`,
    `Variables trouvées qui y ressemblent : ${similar.length ? similar.join(", ") : "aucune"}`,
  ]);
  process.exit(1);
}
if (!/^postgres(ql)?:\/\//.test(db.value)) {
  box([`BAOBAB — la variable ${db.name} ne contient pas une adresse PostgreSQL.`, "Elle doit commencer par postgresql:// (copiez-la depuis Neon → Connect)."]);
  process.exit(1);
}
console.log(`BAOBAB — base de données : variable ${db.name} utilisée.`);
if (!process.env.APP_URL) console.warn("BAOBAB — recommandé : ajouter APP_URL (adresse publique du site).");

const env = { ...process.env, DATABASE_URL: db.value };
const run = (cmd, args) => {
  const r = spawnSync(cmd, args, { stdio: "inherit", env, shell: process.platform === "win32" });
  if (r.status !== 0) process.exit(r.status ?? 1);
};
run("npx", ["prisma", "migrate", "deploy"]);
run("npx", ["next", "build"]);
