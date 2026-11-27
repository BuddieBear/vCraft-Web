import { Router } from "express";
import { prisma } from "../database/prisma.js";

async function defaultDatabaseCheck() {
    await prisma.$queryRaw`SELECT 1`;
}

export function createHealthRouter(checkDatabase = defaultDatabaseCheck) {
    const router = Router();
    let inFlightCheck = null;

    function runCheck() {
        if (!inFlightCheck) {
            inFlightCheck = Promise.resolve()
                .then(() => checkDatabase())
                .finally(() => {
                    inFlightCheck = null;
                });
        }
        return inFlightCheck;
    }

    router.get("/", async (_req, res) => {
        res.set("Cache-Control", "no-store");
        try {
            await runCheck();
            return res.status(200).json({ data: { status: "ok", database: "ok" } });
        } catch (error) {
            console.error("Health check failed.", { name: error?.name, code: error?.code });
            return res.status(503).json({
                error: {
                    code: "SERVICE_UNAVAILABLE",
                    message: "Cơ sở dữ liệu hiện không sẵn sàng.",
                },
            });
        }
    });
    return router;
}

export default createHealthRouter();
