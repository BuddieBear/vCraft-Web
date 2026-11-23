import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate-request.js";
import { uuid, pageQuery, byId } from "./schemas.js";
import * as actions from "../controllers/retail.controller.js";

const router = Router();
const fulfillmentStatus = z.enum(["CONFIRMED", "SHIPPING", "DELIVERED"]);
const salesQuery = pageQuery.extend({ status: z.enum(["PENDING", "CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"]).optional() });
router.use(authenticate);
router.get("/admin/orders", authorize("ADMIN"), validate({ query: salesQuery }), actions.adminOrderList);
router.get("/sales", authorize("ARTISAN"), validate({ query: salesQuery }), actions.artisanSales);
router.patch("/orders/:id/workshops/:artisanId/status", authorize("ARTISAN", "ADMIN"), validate({
    params: byId.extend({ artisanId: uuid }),
    body: z.object({ status: fulfillmentStatus, paymentCollected: z.boolean().optional() }).strict(),
}), actions.setWorkshopOrderStatus);
router.patch("/orders/:id/status", authorize("BUYER", "ARTISAN", "ADMIN"), validate({ params: byId, body: z.object({ status: z.enum(["CONFIRMED", "SHIPPING", "DELIVERED", "CANCELLED"]), paymentCollected: z.boolean().optional() }).strict() }), actions.setOrderStatus);
router.use(authorize("BUYER"));
router.get("/cart", actions.cart);
router.put("/cart/:id", validate({ params: z.object({ id: uuid }), body: z.object({ quantity: z.number().int().min(0).max(2147483647) }).strict() }), actions.putCartItem);
router.post("/checkout", validate({ body: z.object({ recipientName: z.string().trim().min(1).max(120), recipientPhone: z.string().trim().min(1).max(20), shippingAddress: z.string().trim().min(1).max(2000), shippingNote: z.string().max(2000).nullable().optional(), paymentMethod: z.enum(["COD", "BANK_TRANSFER", "VNPAY", "MOMO"]).optional() }).strict() }), actions.placeOrder);
router.get("/orders", validate({ query: pageQuery }), actions.orders);
router.get("/orders/:id", validate({ params: byId }), actions.order);
export default router;
