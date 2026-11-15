import assert from "node:assert/strict";
import test from "node:test";
import { app } from "../../src/app.js";
import { prisma } from "../../src/database/prisma.js";
import jwt from "jsonwebtoken";

test("HTTP authentication, access control, validation and commerce", async () => {
  assert.equal(process.env.NODE_ENV, "test");
  const server = app.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${server.address().port}/api`;
  async function request(path, { method = "GET", body, token, raw } = {}) {
    const headers = {};
    if (body !== undefined || raw !== undefined) headers["Content-Type"] = "application/json";
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetch(base + path, { method, headers, body: raw ?? (body === undefined ? undefined : JSON.stringify(body)) });
    return { status: response.status, json: await response.json() };
  }
  try {
    const preflight = await fetch(base + "/retail/cart", { method: "OPTIONS", headers: { Origin: "http://127.0.0.1:5189", "Access-Control-Request-Method": "GET", "Access-Control-Request-Headers": "authorization" } });
    assert.equal(preflight.headers.get("access-control-allow-origin"), "http://127.0.0.1:5189");
    const denied = await fetch(base + "/products", { headers: { Origin: "https://untrusted.example" } });
    assert.equal(denied.headers.get("access-control-allow-origin"), null);
    assert.equal((await request("/products")).status, 200);
    assert.equal((await request("/artisans?visitorsOnly=bad")).status, 400);
    assert.equal((await request("/retail/cart")).status, 401);
    assert.equal((await request("/auth/login", { method: "POST", raw: "{" })).status, 400);
    const credentials = { email: "api-test@example.test", password: "Secure-test-password-123", fullName: "API buyer" };
    assert.equal((await request("/auth/register", { method: "POST", body: { ...credentials, role: "ADMIN" } })).status, 400);
    assert.equal((await request("/auth/register", { method: "POST", body: credentials })).status, 201);
    assert.equal((await request("/auth/register", { method: "POST", body: credentials })).status, 409);
    assert.equal((await request("/auth/login", { method: "POST", body: { email: credentials.email, password: "wrong" } })).status, 401);
    const login = await request("/auth/login", { method: "POST", body: { email: credentials.email, password: credentials.password } });
    assert.equal(login.status, 200);
    const token = login.json.data.accessToken;
    const expired = jwt.sign({}, process.env.JWT_SECRET, { algorithm: "HS256", subject: "00000000-0000-4000-8000-000000000000", issuer: "vcraft", audience: "vcraft-api", expiresIn: -1 });
    assert.equal((await request("/auth/me", { token: expired })).status, 401);
    const me = await request("/auth/me", { token });
    assert.equal(me.json.data.role, "BUYER");
    assert.equal(Object.hasOwn(me.json.data, "passwordHash"), false);
    const second = { ...credentials, email: "api-test-other@example.test" };
    assert.equal((await request("/auth/register", { method: "POST", body: second })).status, 201);
    const otherLogin = await request("/auth/login", { method: "POST", body: { email: second.email, password: second.password } });
    const otherToken = otherLogin.json.data.accessToken;
    assert.equal((await request("/wholesale/assignments", { token })).status, 403);
    assert.equal((await request("/wholesale/quotes", { method: "POST", token, body: { title: "Order", specifications: "Silk", targetQuantity: 5, deadline: "2099-01-01", userId: "00000000-0000-0000-0000-000000000000" } })).status, 400);
    const quote = await request("/wholesale/quotes", { method: "POST", token, body: { title: "Order", specifications: "Silk", targetQuantity: 5, deadline: "2099-01-01" } });
    assert.equal(quote.status, 201);
    assert.equal(quote.json.data.buyerId, me.json.data.id);
    assert.equal((await request(`/wholesale/quotes/${quote.json.data.id}`, { token: otherToken })).status, 404);
    assert.equal((await request(`/wholesale/quotes/${quote.json.data.id}/send`, { method: "POST", token: otherToken })).status, 409);
    assert.equal((await request(`/wholesale/quotes/${quote.json.data.id}/send`, { method: "POST", token })).status, 200);
    const product = await prisma.product.findUniqueOrThrow({ where: { slug: "hong-dat" } });
    assert.equal((await request(`/products?artisanId=${product.artisanId}`)).json.data.every((p) => p.artisan.id === product.artisanId), true);
    const artisanProfile = await prisma.artisanProfile.findUniqueOrThrow({ where: { id: product.artisanId }, include: { user: true } });
    const artisanLogin = await request("/auth/login", { method: "POST", body: { email: artisanProfile.user.email, password: process.env.SEED_DEMO_PASSWORD } });
    assert.equal(artisanLogin.status, 200);
    const artisanToken = artisanLogin.json.data.accessToken;
    const bid = await request(`/wholesale/quotes/${quote.json.data.id}/bids`, { method: "POST", token: artisanToken, body: { proposedPrice: "1000", proposedCompletionDays: 5 } });
    assert.equal(bid.status, 201);
    const openQuotes = await request("/wholesale/open-quotes", { token: artisanToken });
    assert.equal(openQuotes.json.data.find((item) => item.id === quote.json.data.id).bids[0].id, bid.json.data.id);
    assert.equal((await request(`/wholesale/quotes/${quote.json.data.id}/accept`, { method: "POST", token, body: { bidIds: [bid.json.data.id] } })).status, 200);
    const adminLogin = await request("/auth/login", { method: "POST", body: { email: "admin@nhaxa.example", password: process.env.SEED_DEMO_PASSWORD } });
    assert.equal(adminLogin.status, 200);
    const pendingAllocations = await request("/wholesale/admin/quotes", { token: adminLogin.json.data.accessToken });
    assert.ok(pendingAllocations.json.data.some((item) => item.id === quote.json.data.id));
    assert.equal((await request("/wholesale/admin/quotes", { token })).status, 403);
    const allocation = await request(`/wholesale/quotes/${quote.json.data.id}/assignments`, { method: "POST", token: adminLogin.json.data.accessToken, body: { allocations: [{ bidId: bid.json.data.id, quantity: 5 }] } });
    assert.equal(allocation.status, 201);
    const assignedBatch = { productId: product.id, orderAssignmentId: allocation.json.data[0].id, batchCode: "API-ALLOC-001", totalQuantity: 6 };
    assert.equal((await request("/traceability/batches", { method: "POST", token: artisanToken, body: assignedBatch })).status, 409);
    assignedBatch.totalQuantity = 5;
    const batch = await request("/traceability/batches", { method: "POST", token: artisanToken, body: assignedBatch });
    assert.equal(batch.status, 201);
    const advance = (status) => request(`/wholesale/assignments/${allocation.json.data[0].id}`, { method: "PATCH", token: artisanToken, body: { status } });
    assert.equal((await advance("IN_PRODUCTION")).status, 200);
    assert.equal((await advance("READY_FOR_DELIVERY")).json.error.code, "BATCHES_INCOMPLETE");
    for (const stage of ["UOM_TO", "MAC_CUI", "DET_LUA", "NHUOM_MAU", "CAN_LANG"]) {
      assert.equal((await request(`/traceability/batches/${batch.json.data.id}/logs`, { method: "POST", token: artisanToken, body: { stage, stageTitle: stage, description: "Completed stage" } })).status, 201);
    }
    assert.equal((await request(`/traceability/batches/${batch.json.data.id}/complete`, { method: "POST", token: artisanToken })).status, 200);
    assert.equal((await advance("READY_FOR_DELIVERY")).status, 200);
    assert.equal((await advance("COMPLETED")).status, 200);
    assert.equal((await request(`/wholesale/quotes/${quote.json.data.id}`, { token })).json.data.status, "DELIVERED");
    assert.equal((await request(`/retail/cart/${product.id}`, { method: "PUT", token, body: { quantity: 1 } })).status, 200);
    const order = await request("/retail/checkout", { method: "POST", token, body: { recipientName: "Buyer", recipientPhone: "123", shippingAddress: "Address" } });
    assert.equal(order.status, 201);
    assert.equal(order.json.data.buyerId, me.json.data.id);
    assert.equal((await request(`/retail/orders/${order.json.data.id}`, { token: artisanToken })).status, 403);
    assert.equal((await request(`/retail/orders/${order.json.data.id}`, { token: otherToken })).status, 404);
    assert.equal((await request("/reviews", { method: "POST", token, body: { targetType: "PRODUCT", productId: product.id, artisanId: product.artisanId, retailOrderId: order.json.data.id, rating: 5, comment: "Good" } })).status, 409);
    for (const status of ["CONFIRMED", "SHIPPING", "DELIVERED"]) {
      assert.equal((await request(`/retail/orders/${order.json.data.id}/status`, { method: "PATCH", token: artisanToken, body: { status, ...(status === "DELIVERED" ? { paymentCollected: true } : {}) } })).status, 200);
    }
    const reviewBody = { targetType: "PRODUCT", productId: product.id, artisanId: product.artisanId, retailOrderId: order.json.data.id, rating: 5, comment: "Good" };
    assert.equal((await request("/reviews", { method: "POST", token, body: reviewBody })).status, 201);
    assert.equal((await request("/reviews", { method: "POST", token, body: reviewBody })).status, 409);
    await prisma.user.update({ where: { id: me.json.data.id }, data: { isActive: false } });
    assert.equal((await request("/auth/me", { token })).status, 401);
  } finally {
    await new Promise((resolve, reject) => server.close((err) => err ? reject(err) : resolve()));
    await prisma.$disconnect();
  }
});
