// Vérifie les réglages indispensables avant le build de production (Vercel ou serveur).
// Sans DATABASE_URL, la base ne peut pas être mise à jour : on s'arrête avec un message clair.
const missing = [];
if (!process.env.DATABASE_URL) missing.push("DATABASE_URL");

if (missing.length) {
  console.error(`
╔══════════════════════════════════════════════════════════════════════╗
  BAOBAB — réglage manquant : ${missing.join(", ")}

  Vercel → votre projet → Settings → Environment Variables :
   1. Nom : DATABASE_URL
      Valeur : l'adresse de connexion Neon (postgresql://…?sslmode=require),
      de préférence la connexion DIRECTE (option « Connection pooling » désactivée).
   2. Cocher Production, Preview et Development, puis Save.
   3. Deployments → dernier déploiement → « ⋯ » → Redeploy.
╚══════════════════════════════════════════════════════════════════════╝
`);
  process.exit(1);
}

const warn = [];
if (!process.env.APP_URL) warn.push("APP_URL (adresse publique du site, ex. https://baobab-xxxx.vercel.app)");
if (process.env.VERCEL && process.env.COOKIE_SECURE !== "true") warn.push('COOKIE_SECURE="true"');
if (warn.length) console.warn(`BAOBAB — réglages recommandés manquants : ${warn.join(" ; ")}`);
console.log("BAOBAB — réglages indispensables présents.");
