/**
 * db/index.ts — Drizzle ORM connection singleton
 *
 * Usa postgres (node-postgres driver) com connection pooling.
 * Em dev: uma conexão por hot reload cycle.
 * Em prod: pool de até 10 conexões.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL não definida");
}

// Em dev, Next.js hot reload cria múltiplos clients — reutilize via globalThis
const globalForDb = globalThis as unknown as {
  _pgClient: ReturnType<typeof postgres> | undefined;
};

const client =
  globalForDb._pgClient ??
  postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 3,
    idle_timeout: 20,
    connect_timeout: 10,
  });

if (process.env.NODE_ENV !== "production") {
  globalForDb._pgClient = client;
}

export const db = drizzle(client, { schema });
export type DB = typeof db;
