import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { randomBytes } from "node:crypto";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { readDatabaseUrl } from "../../src/config/env.js";
import { artisans, batches, products } from "../../../frontend/src/data/demo-data.js";

const root = fileURLToPath(new URL("../../../", import.meta.url));
const require = createRequire(import.meta.url);
const prismaCli = resolve(dirname(require.resolve("prisma/package.json")), require("prisma/package.json").bin.prisma);
const seedFile = fileURLToPath(new URL("../../../prisma/seed.js", import.meta.url));
const persistenceTest = fileURLToPath(new URL("./persistence.test.js", import.meta.url));
const commerceTest = fileURLToPath(new URL("./commerce.test.js", import.meta.url));
const databaseName = (url) => decodeURIComponent(new URL(url).pathname.slice(1));

test("fresh ORM migration, idempotent seed, pricing and rating rollups", { timeout: 120_000 }, async () => {
  const url = readDatabaseUrl("ORM_TEST_DATABASE_URL");
  const name = databaseName(url);
  assert.match(name, /^vcraft_orm_test_[a-z0-9_]+$/);
  for (const key of ["DATABASE_URL", "MIGRATION_DATABASE_URL"]) {
    if (process.env[key]) assert.notEqual(name, databaseName(process.env[key]), `Use a separate database from ${key}.`);
  }
  assert.equal(new URL(url).searchParams.get("schema") ?? "public", "public");

  const prisma = new PrismaClient({ datasourceUrl: url });
  const env = {
    ...process.env,
    DATABASE_URL: url,
    MIGRATION_DATABASE_URL: url,
    NODE_ENV: "test",
    SEED_DEMO_PASSWORD: randomBytes(24).toString("base64url"),
  };
  const run = (...args) => execFileSync(process.execPath, args, {
    cwd: root,
    env,
    timeout: 60_000,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  const seed = () => run(seedFile);
  const productIds = () => prisma.product.findMany({ orderBy: { slug: "asc" }, select: { id: true, slug: true } });

  try {
    const [{ database, empty }] = await prisma.$queryRaw`
      SELECT current_database() AS database, NOT EXISTS (
        SELECT 1 FROM pg_class AS c JOIN pg_namespace AS n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
      ) AS empty
    `;
    assert.equal(database, name);
    assert.equal(empty, true, "Provide an empty ORM test database.");
    run(prismaCli, "migrate", "deploy");
    seed();
    const firstProducts = await productIds();
    const firstUsers = await prisma.user.findMany({ orderBy: { email: "asc" }, select: { id: true, passwordHash: true } });
    seed();
    assert.deepEqual(await productIds(), firstProducts);
    assert.deepEqual(await prisma.user.findMany({ orderBy: { email: "asc" }, select: { id: true, passwordHash: true } }), firstUsers);
    assert.equal(firstProducts.length, products.length);
    assert.equal(firstUsers.length, artisans.length + 2);
    assert.equal(await prisma.productBatch.count(), batches.length);
    assert.equal(await prisma.batchLog.count(), batches.length * 5);
    run("--test", persistenceTest);

    const fixed = await prisma.product.findUniqueOrThrow({ where: { slug: "hong-dat" } });
    const contact = await prisma.product.findUniqueOrThrow({ where: { slug: "hop-nang" } });
    assert.equal(fixed.pricingMode, "FIXED");
    assert.equal(fixed.saleUnit, "METER");
    assert.equal(fixed.price.toString(), "690000");
    assert.equal(contact.pricingMode, "CONTACT");
    assert.equal(contact.saleUnit, "BOX");
    assert.equal(contact.price, null);
    await assert.rejects(async () => {
      await prisma.product.update({ where: { id: fixed.id }, data: { price: null } });
    }, /chk_products_pricing_mode/);
    await assert.rejects(async () => {
      await prisma.product.update({ where: { id: contact.id }, data: { price: 1 } });
    }, /chk_products_pricing_mode/);

    const buyer = await prisma.user.findUniqueOrThrow({ where: { email: "buyer@nhaxa.example" } });
    const next = await prisma.product.findUniqueOrThrow({ where: { slug: "sen-hong" } });
    const otherArtisan = await prisma.artisanProfile.findFirstOrThrow({ where: { id: { not: fixed.artisanId } } });
    await assert.rejects(
      prisma.review.create({ data: { buyerId: buyer.id, productId: fixed.id, artisanId: otherArtisan.id, rating: 3, comment: "Invalid owner" } }),
      (error) => error.code === "P2003",
    );
    const review = await prisma.review.create({
      data: { buyerId: buyer.id, productId: fixed.id, artisanId: fixed.artisanId, rating: 3, comment: "ORM test" },
    });
    await prisma.review.update({ where: { id: review.id }, data: { productId: next.id, artisanId: next.artisanId } });
    for (const [target, count, rating] of [[fixed, 0, "5"], [next, 1, "3"]]) {
      const product = await prisma.product.findUniqueOrThrow({ where: { id: target.id } });
      const workshop = await prisma.artisanProfile.findUniqueOrThrow({ where: { id: target.artisanId } });
      for (const entity of [product, workshop]) {
        assert.equal(entity.totalReviews, count);
        assert.equal(entity.averageRating.toString(), rating);
      }
    }

    const collision = await prisma.product.findUniqueOrThrow({ where: { slug: "bo-cham-van" } });
    await prisma.product.delete({ where: { slug: "dao-phai" } });
    await prisma.product.update({ where: { id: collision.id }, data: { artisanId: fixed.artisanId } });
    assert.throws(seed, /Conflicting demo product owner: bo-cham-van/);
    assert.equal(await prisma.product.findUnique({ where: { slug: "dao-phai" } }), null, "Earlier seed writes must roll back.");
    await prisma.product.update({ where: { id: collision.id }, data: { artisanId: collision.artisanId } });
    seed();
    assert.equal(await prisma.product.count(), products.length);
    run("--test", commerceTest);
  } finally {
    await prisma.$disconnect();
  }
});
