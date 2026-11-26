import { ApiError } from "../middlewares/api-error.js";
import { setCartItem, listCart, checkout, listOrders, getOrder, listSales, listAdminSales, changeOrderStatus, changeWorkshopOrderStatus } from "../services/retail.service.js";
import { listPage } from "../routes/schemas.js";

export async function adminOrderList(req, res) {
    const query = req.validatedQuery;
    res.json(await listPage(query, options => listAdminSales({ ...options, status: query.status })));
}

export async function artisanSales(req, res) {
    const query = req.validatedQuery;
    res.json(await listPage(query, options => listSales(req.user.id, { ...options, status: query.status })));
}

export async function setOrderStatus(req, res) {
    res.json({ data: await changeOrderStatus(req.user, req.validatedParams.id, req.validatedBody.status, req.validatedBody.paymentCollected) });
}

export async function setWorkshopOrderStatus(req, res) {
    const { id, artisanId } = req.validatedParams;
    const { status, paymentCollected } = req.validatedBody;
    res.json({ data: await changeWorkshopOrderStatus(req.user, id, artisanId, status, paymentCollected) });
}

export async function cart(req, res) {
    res.json({ data: await listCart(req.user.id) });
}

export async function putCartItem(req, res) {
    res.json({ data: await setCartItem({ userId: req.user.id, productId: req.validatedParams.id, quantity: req.validatedBody.quantity }) });
}

export async function placeOrder(req, res) {
    res.status(201).json({ data: await checkout({ ...req.validatedBody, userId: req.user.id, requireConfirmation: true }) });
}

export async function orders(req, res) {
    res.json(await listPage(req.validatedQuery, options => listOrders(req.user.id, options)));
}

export async function order(req, res) {
    const order = await getOrder(req.user.id, req.validatedParams.id);
    if (!order) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng.");
    res.json({ data: order });
}
