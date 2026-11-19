import { Prisma, PrismaClient } from "@prisma/client";
import { env } from "../config/env.js";

export const prisma = new PrismaClient({ datasourceUrl: env.databaseUrl });

export function isPersistenceConflict(error) {
    return error instanceof Prisma.PrismaClientKnownRequestError
        && ["P2002", "P2003", "P2025", "P2034"].includes(error.code);
}
