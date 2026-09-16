import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** One Prisma client per server process (survives hot reload in dev). */
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const connectionString = process.env.DATABASE_URL!;
  // `prisma dev` (local Prisma Postgres) accepts a single connection at a time.
  const isLocalPrismaDev = /localhost:5121\d/.test(connectionString);
  const adapter = new PrismaPg({
    connectionString,
    max: isLocalPrismaDev ? 1 : 10,
    // Serverless functions should release idle connections quickly (use Neon's pooled URL in production).
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 15_000,
  });
  return new PrismaClient({ adapter });
}

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
