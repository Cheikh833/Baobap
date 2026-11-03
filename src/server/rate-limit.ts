// Limiteur en mémoire (fenêtre glissante). Suffisant pour une instance unique ;
// à remplacer par un stockage partagé (Redis/Postgres) en déploiement multi-instances.
const hits = new Map<string, number[]>();

const recent = (key: string, windowMs: number) => (hits.get(key) ?? []).filter((t) => Date.now() - t < windowMs);

/** Vrai si la clé a atteint la limite sur la fenêtre (n'enregistre rien). */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const r = recent(key, windowMs);
  hits.set(key, r);
  return r.length >= limit;
}

/** Enregistre un événement (ex. échec de connexion). */
export function recordHit(key: string): void {
  hits.set(key, [...(hits.get(key) ?? []), Date.now()]);
}

export function resetHits(key: string): void {
  hits.delete(key);
}
