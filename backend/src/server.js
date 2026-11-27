import { app } from "./app.js";
import { prisma } from "./database/prisma.js";
import { jwtSecret } from "./config/security.js";
import { parseHost, parsePort } from "./config/network.js";

jwtSecret();

const port = parsePort();
const host = parseHost();
const displayHost = host.includes(":") ? `[${host}]` : host;
const server = app.listen(port, host, () => {
    console.log(`vCraft API listening on http://${displayHost}:${port}`);
});

server.once("close", () => {
    prisma.$disconnect().catch((error) => {
        console.error("Could not disconnect Prisma.", error);
        process.exitCode = 1;
    });
});

for (const signal of ["SIGINT", "SIGTERM"]) {
    process.once(signal, () => server.close());
}
