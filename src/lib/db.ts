import { PrismaClient } from "@prisma/client";

// Évite de recréer une nouvelle instance de PrismaClient à chaque hot-reload
// en développement (source classique d'épuisement des connexions Postgres).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
