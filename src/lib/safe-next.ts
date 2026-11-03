/** N'accepte qu'un chemin relatif interne (évite les redirections ouvertes). */
export function safeNext(v: unknown): string | null {
  if (typeof v !== "string") return null;
  return /^\/(?![/\\])[\w\-/?=&.%]*$/.test(v) ? v : null;
}
