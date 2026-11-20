import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.warn("WARNING: DATABASE_URL is not set. Database-dependent features will fail.");
}

export const pool = new Pool(process.env.DATABASE_URL ? { connectionString: process.env.DATABASE_URL } : { connectionString: "postgres://localhost/dummy" });
export const db = drizzle(pool, { schema });

export * from "./schema";
