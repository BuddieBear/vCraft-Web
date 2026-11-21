import { ApiError } from "../middlewares/api-error.js";
import { setCartItem, listCart, checkout, listOrders, getOrder, listSales, listAdminSales, changeOrderStatus } from "../services/retail.service.js";
import { pageArgs } from "../routes/schemas.js";

export async function adminOrderList(req, res) {
    res.json({ data: await listAdminSales({ ...pageArgs(req.validatedQuery), status: req.validatedQuery.status }) });
}

export async function artisanSales(req, res) {
    res.json({ data: await listSales(req.user.id, pageArgs(req.validatedQuery)) });
}

export async function setOrderStatus(req, res) {
    res.json({ data: await changeOrderStatus(req.user, req.validatedParams.id, req.validatedBody.status, req.validatedBody.paymentCollected) });
}

export async function cart(req, res) {
    res.json({ data: await listCart(req.user.id) });
}

export async function putCartItem(req, res) {
    res.json({ data: await setCartItem({ userId: req.user.id, productId: req.validatedParams.id, quantity: req.validatedBody.quantity }) });
}

export async function placeOrder(req, res) {
    res.status(201).json({ data: await checkout({ ...req.validatedBody, userId: req.user.id }) });
}

export async function orders(req, res) {
    res.json({ data: await listOrders(req.user.id, pageArgs(req.validatedQuery)) });
}

export async function order(req, res) {
    const order = await getOrder(req.user.id, req.validatedParams.id);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng.");
    res.json({ data: order });
}
