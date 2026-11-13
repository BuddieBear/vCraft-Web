import { app } from "./app.js";
import { prisma } from "./database/prisma.js";

const port = Number(process.env.PORT ?? 5000);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const host = process.env.HOST ?? "127.0.0.1";
const server = app.listen(port, host, () => {
  console.log(`vCraft API listening on http://${host}:${port}`);
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
