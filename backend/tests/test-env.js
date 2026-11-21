import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { fileURLToPath } from "node:url";

const envPath = fileURLToPath(new URL("../../.env", import.meta.url));
if (existsSync(envPath)) loadEnvFile(envPath);

function databaseConnection(key) {
    const url = process.env[key]?.trim();
    try {
        const connection = new URL(url);
        const name = decodeURIComponent(connection.pathname.slice(1));
        if (["postgres:", "postgresql:"].includes(connection.protocol) && connection.hostname && name) {
            return { url, name, schema: connection.searchParams.get("schema") ?? "public" };
        }
    } catch {
        // Report the variable name without exposing its credentials.
    }
    throw new Error(`Set ${key} to a valid PostgreSQL connection URL with a database name.`);
}

export function testDatabase() {
    const config = databaseConnection("ORM_TEST_DATABASE_URL");
    if (!/^vcraft_orm_test_[a-z0-9_]+$/.test(config.name) || config.schema !== "public") {
        throw new Error("ORM_TEST_DATABASE_URL must use a vcraft_orm_test_* database and the public schema.");
    }
    return config;
}

export function assertIsolatedTestDatabase() {
    const { url } = testDatabase();
    if (process.env.NODE_ENV !== "test" || process.env.DATABASE_URL?.trim() !== url || process.env.MIGRATION_DATABASE_URL?.trim() !== url) {
        throw new Error("Run npm test to prepare and select the isolated PostgreSQL test database.");
    }
}

export function assertSeparateTestDatabase(name) {
    for (const key of ["DATABASE_URL", "MIGRATION_DATABASE_URL"]) {
        if (process.env[key] && databaseConnection(key).name === name) {
            throw new Error(`Use a test database separate from ${key}.`);
        }
    }
}
