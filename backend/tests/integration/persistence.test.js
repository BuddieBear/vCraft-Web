import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import test from "node:test";
import { env } from "../../src/config/env.js";
import { prisma } from "../../src/database/prisma.js";
import { toProductDetailJson } from "../../src/presenters/product.presenter.js";
import { recordProductHidden } from "../../src/repositories/audit-log.repository.js";
import { hideProductOwnedByUser } from "../../src/repositories/products.repository.js";
import { findPublicTimelineByBatchCode } from "../../src/repositories/traceability.repository.js";
import { findActiveCredentialsByEmail, findActiveUserProfile } from "../../src/repositories/users.repository.js";
import { getCatalogProduct, hideCatalogProduct } from "../../src/services/products.service.js";

test("repositories, public DTO and product audit transaction", async () => {
  assert.equal(env.nodeEnv, "test", "Run on a seeded test or local development database.");

  const id = randomUUID();
  const slug = `persistence-test-${id}`;
  const auditFilter = { targetTable: "products", targetRecordId: id, action: "PRODUCT_HIDDEN" };
  let created = false;

  try {
    const credentials = await findActiveCredentialsByEmail("buyer@nhaxa.example");
    assert.equal(credentials.role, "BUYER");
    assert.ok(credentials.passwordHash);
    const profile = await findActiveUserProfile(credentials.id);
    assert.equal(profile.id, credentials.id);
    assert.ok(!Object.hasOwn(profile, "passwordHash"));

    const timeline = await findPublicTimelineByBatchCode("NX-004");
    assert.equal(timeline.product.slug, "hong-dat");
    assert.deepEqual(timeline.logs.map(({ stepOrder }) => stepOrder), [1, 2, 3, 4, 5]);
    assert.ok(!Object.hasOwn(timeline, "orderAssignmentId"));
    assert.equal(await findPublicTimelineByBatchCode(slug), null);
    assert.equal(toProductDetailJson(await getCatalogProduct("hong-dat")).data.price, "690000");
    assert.equal(toProductDetailJson(await getCatalogProduct("hop-nang")).data.price, null);

    const reference = await prisma.product.findUniqueOrThrow({
      where: { slug: "hong-dat" },
      select: { artisanId: true, artisan: { select: { userId: true } } },
    });
    const owner = { productId: id, userId: reference.artisan.userId };
    try {
      await prisma.user.update({ where: { id: owner.userId }, data: { isActive: false } });
      assert.equal(await getCatalogProduct("hong-dat"), null);
      assert.equal(await findPublicTimelineByBatchCode("NX-004"), null);
    } finally {
      await prisma.user.update({ where: { id: owner.userId }, data: { isActive: true } });
    }
    await prisma.product.create({
      data: { id, slug, name: "Persistence test", artisanId: reference.artisanId, price: 1 },
    });
    created = true;

    assert.equal(await hideCatalogProduct({ productId: id, userId: credentials.id }), false);
    assert.equal(await prisma.auditLog.count({ where: auditFilter }), 0);

    const rollback = new Error("Abort fixture transaction");
    await assert.rejects(prisma.$transaction(async (transaction) => {
      assert.equal((await hideProductOwnedByUser(transaction, owner)).count, 1);
      await recordProductHidden(transaction, owner);
      throw rollback;
    }), (error) => error === rollback);
    assert.ok(await getCatalogProduct(slug));
    assert.equal(await prisma.auditLog.count({ where: auditFilter }), 0);

    const results = await Promise.all([hideCatalogProduct(owner), hideCatalogProduct(owner)]);
    assert.deepEqual(results.sort(), [false, true]);
    assert.equal(await getCatalogProduct(slug), null);
    const audit = await prisma.auditLog.findMany({ where: auditFilter });
    assert.equal(audit.length, 1);
    assert.equal(audit[0].userId, owner.userId);
    assert.deepEqual(audit[0].metadata, { isPublished: false });
  } finally {
    try {
      if (created) {
        await prisma.$transaction([
          prisma.auditLog.deleteMany({ where: auditFilter }),
          prisma.product.deleteMany({ where: { id, slug } }),
        ]);
      }
    } finally {
      await prisma.$disconnect();
    }
  }
});
