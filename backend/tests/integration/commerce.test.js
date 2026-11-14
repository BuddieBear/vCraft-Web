import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "../../src/database/prisma.js";
import { checkout } from "../../src/services/retail.service.js";
import { createQuote, sendQuote, submitBid, acceptBids, assignBids, advanceAssignment } from "../../src/services/wholesale.service.js";
import { createReview } from "../../src/services/reviews.service.js";

test("checkout, multi-artisan quote and verified review transactions", async () => {
  assert.equal(process.env.NODE_ENV, "test");
  const user = (email, role) => prisma.user.create({ data: { email, role, passwordHash: "test", fullName: email } });
  try {
    const buyer = await user("commerce-buyer@example.test", "BUYER");
    const buyer2 = await user("commerce-buyer2@example.test", "BUYER");
    const buyer3 = await user("commerce-buyer3@example.test", "BUYER");
    const admin = await user("commerce-admin@example.test", "ADMIN");
    const a1 = await user("commerce-a1@example.test", "ARTISAN");
    const a2 = await user("commerce-a2@example.test", "ARTISAN");
    const workshop = (owner) => prisma.artisanProfile.create({ data: { userId: owner.id, workshopName: owner.email, address: "test", latitude: 0, longitude: 0, verificationStatus: "APPROVED" } });
    const w1 = await workshop(a1); const w2 = await workshop(a2);
    const product = await prisma.product.create({ data: { artisanId: w1.id, name: "test", slug: "commerce-test", price: 20, stockQuantity: 1 } });
    await assert.rejects(prisma.$executeRaw`UPDATE products SET price = 'NaN'::numeric WHERE id = ${product.id}::uuid`);
    for (const u of [buyer, buyer2]) await prisma.cartItem.create({ data: { userId: u.id, productId: product.id, quantity: 1 } });
    const details = { recipientName: "Test", recipientPhone: "123", shippingAddress: "Test" };
    const results = await Promise.allSettled([checkout({ userId: buyer.id, ...details }), checkout({ userId: buyer2.id, ...details })]);
    assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
    const order = results.find((r) => r.status === "fulfilled").value;
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: product.id } })).stockQuantity, 0);
    assert.equal(await prisma.retailOrder.count({ where: { id: order.id } }), 1);
    const loser = order.buyerId === buyer.id ? buyer2 : buyer;
    assert.equal(await prisma.cartItem.count({ where: { userId: loser.id, productId: product.id } }), 1);
    const available = await prisma.product.create({ data: { artisanId: w1.id, name: "available", slug: "commerce-available", price: 10, stockQuantity: 3 } });
    const unavailable = await prisma.product.create({ data: { artisanId: w1.id, name: "empty", slug: "commerce-empty", price: 10, stockQuantity: 0 } });
    await prisma.cartItem.createMany({ data: [available, unavailable].map((p) => ({ userId: buyer3.id, productId: p.id, quantity: 1 })) });
    await assert.rejects(checkout({ userId: buyer3.id, ...details }));
    assert.equal((await prisma.product.findUniqueOrThrow({ where: { id: available.id } })).stockQuantity, 3);
    assert.equal(await prisma.cartItem.count({ where: { userId: buyer3.id } }), 2);
    assert.equal(await prisma.retailOrder.count({ where: { buyerId: buyer3.id } }), 0);
    await assert.rejects(createReview({ userId: order.buyerId, targetType: "PRODUCT", productId: product.id, artisanId: w1.id, retailOrderId: order.id, rating: 5, comment: "Good" }));
    await prisma.retailOrder.update({ where: { id: order.id }, data: { status: "DELIVERED" } });
    const review = { userId: order.buyerId, targetType: "PRODUCT", productId: product.id, artisanId: w1.id, retailOrderId: order.id, rating: 5, comment: "Good" };
    const reviews = await Promise.allSettled([createReview(review), createReview(review)]);
    assert.equal(reviews.filter((r) => r.status === "fulfilled").length, 1);
    await assert.rejects(createReview({ ...review, artisanId: w2.id }));
    await assert.rejects(prisma.retailOrder.delete({ where: { id: order.id } }));
    assert.ok(await prisma.retailOrder.findUnique({ where: { id: order.id } }));

    await Promise.all([buyer, buyer2].map((author, index) => prisma.review.create({ data: { buyerId: author.id, productId: available.id, artisanId: w1.id, rating: index ? 5 : 1, comment: "Concurrent rollup" } })));
    const rated = await prisma.product.findUniqueOrThrow({ where: { id: available.id } });
    assert.equal(rated.totalReviews, 2);
    assert.equal(rated.averageRating.toString(), "3");

    await assert.rejects(createQuote({ userId: buyer.id, title: "Order", specifications: "Silk", targetQuantity: 10, deadline: "2099-02-30" }));
    await assert.rejects(createQuote({ userId: buyer.id, title: "Order", specifications: "Silk", targetQuantity: 10, deadline: "2099-01-01", maxBudget: "NaN" }));
    const smallQuote = await createQuote({ userId: buyer.id, title: "Single item", specifications: "Silk", targetQuantity: 1, deadline: "2099-01-01" });
    await sendQuote({ userId: buyer.id, quoteId: smallQuote.id });
    const small1 = await submitBid({ userId: a1.id, quoteId: smallQuote.id, proposedPrice: 20, proposedCompletionDays: 5 });
    const small2 = await submitBid({ userId: a2.id, quoteId: smallQuote.id, proposedPrice: 30, proposedCompletionDays: 7 });
    await assert.rejects(acceptBids({ userId: buyer.id, quoteId: smallQuote.id, bidIds: [small1.id, small2.id] }));
    assert.equal((await prisma.quotationRequest.findUniqueOrThrow({ where: { id: smallQuote.id } })).status, "ARTISANS_BIDDING");
    const quote = await createQuote({ userId: buyer.id, title: "Order", specifications: "Silk", targetQuantity: 10, deadline: "2099-01-01" });
    await sendQuote({ userId: buyer.id, quoteId: quote.id });
    await assert.rejects(submitBid({ userId: a1.id, quoteId: quote.id, proposedPrice: "NaN", proposedCompletionDays: 5 }));
    await assert.rejects(submitBid({ userId: a1.id, quoteId: quote.id, proposedPrice: "0.001", proposedCompletionDays: 5 }));
    const bid1 = await submitBid({ userId: a1.id, quoteId: quote.id, proposedPrice: 20, proposedCompletionDays: 5 });
    const bid2 = await submitBid({ userId: a2.id, quoteId: quote.id, proposedPrice: 30, proposedCompletionDays: 7 });
    const decisions = await Promise.allSettled([acceptBids({ userId: buyer.id, quoteId: quote.id, bidIds: [bid1.id, bid2.id] }), acceptBids({ userId: buyer.id, quoteId: quote.id, bidIds: [bid1.id, bid2.id] })]);
    assert.equal(decisions.filter((r) => r.status === "fulfilled").length, 1);
    const accepted = await prisma.bid.findMany({ where: { quotationRequestId: quote.id, status: "ACCEPTED" } });
    assert.equal(accepted.length, 2);
    const allocations = [{ bidId: bid1.id, quantity: 4 }, { bidId: bid2.id, quantity: 6 }];
    await assert.rejects(assignBids({ userId: buyer.id, quoteId: quote.id, allocations }));
    const assignments = await assignBids({ userId: admin.id, quoteId: quote.id, allocations });
    for (const assignment of assignments) {
      const actor = assignment.artisanId === w1.id ? a1 : a2;
      for (const status of ["IN_PRODUCTION", "READY_FOR_DELIVERY", "COMPLETED"]) await advanceAssignment({ userId: actor.id, assignmentId: assignment.id, status });
    }
    assert.equal((await prisma.quotationRequest.findUniqueOrThrow({ where: { id: quote.id } })).status, "DELIVERED");
    await createReview({ userId: buyer.id, targetType: "ARTISAN", artisanId: w1.id, quotationRequestId: quote.id, rating: 4, comment: "Good" });
    const assignment = assignments.find((item) => item.artisanId === w1.id);
    await prisma.productBatch.create({ data: { productId: product.id, orderAssignmentId: assignment.id, batchCode: "COMMERCE-TEST", qrCodeUrl: "https://example.test/qr", totalQuantity: 4, status: "COMPLETED" } });
    await createReview({ userId: buyer.id, targetType: "PRODUCT", productId: product.id, artisanId: w1.id, quotationRequestId: quote.id, rating: 5, comment: "Good" });
    await assert.rejects(createReview({ userId: buyer2.id, targetType: "ARTISAN", artisanId: w1.id, quotationRequestId: quote.id, rating: 5, comment: "Not mine" }));
  } finally { await prisma.$disconnect(); }
});
