import { PrismaClient } from "@prisma/client";

// Adresse de la base : DATABASE_URL, ou à défaut les noms créés par l'intégration Vercel ↔ Neon
// (même ordre que scripts/db-url.mjs).
if (!process.env.DATABASE_URL) {
  for (const name of ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]) {
    if (process.env[name]) { process.env.DATABASE_URL = process.env[name]; break; }
  }
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
