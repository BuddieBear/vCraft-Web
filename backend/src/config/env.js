import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../../.env", import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);

export function readDatabaseUrl(name) {
  const value = process.env[name]?.trim();
  let connection;
  try {
    connection = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid PostgreSQL connection URL.`);
  }
  if (connection.protocol !== "postgresql:" && connection.protocol !== "postgres:") {
    throw new Error(`${name} must be a PostgreSQL connection URL.`);
  }
  if (!connection.hostname || connection.pathname.length <= 1) {
    throw new Error(`${name} must specify a PostgreSQL host and database name.`);
  }
  return value;
}

export const env = Object.freeze({
  databaseUrl: readDatabaseUrl("DATABASE_URL"),
  nodeEnv: process.env.NODE_ENV ?? "development",
});
