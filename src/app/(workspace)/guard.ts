import { notFound } from "next/navigation";
import { AppError } from "@/server/errors";

/** Convertit une erreur NOT_FOUND métier en page 404 (aucune fuite d'existence entre organisations). */
export async function orNotFound<T>(p: Promise<T>): Promise<T> {
  try {
    return await p;
  } catch (e) {
    if (e instanceof AppError && e.code === "NOT_FOUND") notFound();
    throw e;
  }
}
