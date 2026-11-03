// Erreurs métier typées : traduites en messages compréhensibles dans l'interface.
export class AppError extends Error {
  constructor(
    public code: "UNAUTHENTICATED" | "FORBIDDEN" | "NOT_FOUND" | "VALIDATION" | "CONFLICT" | "RATE_LIMITED",
    message: string,
  ) {
    super(message);
  }
}

export const forbidden = (msg = "Vous n'avez pas les droits nécessaires pour cette action.") => new AppError("FORBIDDEN", msg);
export const notFound = (msg = "Élément introuvable.") => new AppError("NOT_FOUND", msg);
