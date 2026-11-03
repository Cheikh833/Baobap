// Résolution de l'adresse PostgreSQL, partagée par le build et l'application.
// Accepte DATABASE_URL, et à défaut les noms créés par l'intégration Vercel ↔ Neon.
export const DB_URL_CANDIDATES = ["DATABASE_URL", "DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];

export function resolveDatabaseUrl(env = process.env) {
  for (const name of DB_URL_CANDIDATES) {
    const v = env[name]?.trim();
    if (v) return { name, value: v };
  }
  return null;
}
