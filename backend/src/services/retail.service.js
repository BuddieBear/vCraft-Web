import { checkoutOrder, findBuyerOrder, listArtisanOrders, listAdminOrders, transitionOrder, transitionWorkshopOrder, listBuyerCart, listBuyerOrders, setCartItem as setCartItemRecord } from "../repositories/retail.repository.js";
import { ApiError } from "../middlewares/api-error.js";
import { validRecipientPhone } from "../../../frontend/src/data/input-values.js";

export function listSales(userId, options) { return listArtisanOrders(userId, options); }
export function listAdminSales(options) { return listAdminOrders(options); }
export async function changeOrderStatus(actor, id, status, paymentCollected = false) {
    const result = await transitionOrder(actor, id, status, paymentCollected);
    if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy đơn hàng.");
    return result;
}
export async function changeWorkshopOrderStatus(actor, id, artisanId, status, paymentCollected = false) {
    const result = await transitionWorkshopOrder(actor, id, artisanId, status, paymentCollected);
    if (!result) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy phần đơn của xưởng.");
    return result;
}

export function getOrder(userId, id) {
    if (typeof userId !== "string" || !userId || typeof id !== "string" || !id) throw new Error("Invalid identifier");
    return findBuyerOrder(userId, id);
}

export async function setCartItem({ userId, productId, quantity }) {
    if (typeof userId !== "string" || !userId || typeof productId !== "string" || !productId || !Number.isInteger(quantity) || quantity < 0 || quantity > 2147483647) throw new Error("Invalid cart item");
    return setCartItemRecord(userId, productId, quantity);
}

export async function listCart(userId) {
    if (typeof userId !== "string" || !userId) throw new Error("Invalid userId");
    return listBuyerCart(userId);
}

export async function listOrders(userId, { skip = 0, take = 24 } = {}) {
    if (typeof userId !== "string" || !userId) throw new Error("Invalid userId");
    return listBuyerOrders(userId, { skip, take });
}

// The caller authenticates the user; this service verifies ownership and current data again.
export async function checkout({ userId, recipientName, recipientPhone, shippingAddress, shippingNote, paymentMethod = "COD", confirmedItems, requireConfirmation = false }) {
    if (typeof userId !== "string" || !userId.trim()) throw new Error("Invalid userId");
    for (const [name, value, max] of [["recipientName", recipientName, 120], ["recipientPhone", recipientPhone, 20], ["shippingAddress", shippingAddress, 2000]]) {
        if (typeof value !== "string" || !value.trim() || value.length > max) throw new Error(`Invalid ${name}`);
    }
    if (!validRecipientPhone(recipientPhone)) throw new Error("Invalid recipientPhone");
    if (shippingNote != null && (typeof shippingNote !== "string" || shippingNote.length > 2000)) throw new Error("Invalid shippingNote");
    if (!["COD", "BANK_TRANSFER", "VNPAY", "MOMO"].includes(paymentMethod)) throw new Error("Invalid paymentMethod");
    if (paymentMethod !== "COD") throw new ApiError(422, "PAYMENT_METHOD_UNAVAILABLE", "Hiện chỉ hỗ trợ thanh toán khi nhận hàng (COD).");
    if (requireConfirmation && !confirmedItems) throw new ApiError(409, "CART_CHANGED", "Hãy tải giỏ và xác nhận giá trước khi đặt hàng.");

    try {
        return await checkoutOrder(userId, { recipientName: recipientName.trim(), recipientPhone: recipientPhone.trim(), shippingAddress: shippingAddress.trim(), shippingNote, paymentMethod }, confirmedItems);
    } catch (error) {
        if (error.message === "ORDER_TOTAL_TOO_LARGE") throw new ApiError(422, "ORDER_TOTAL_TOO_LARGE", "Tổng đơn hàng vượt giới hạn. Hãy giảm số lượng trong giỏ.");
        if (error.code === "P2034" || error.message.startsWith("Product is unavailable,")) throw new ApiError(409, "CART_CHANGED", "Giỏ hàng, giá hoặc tồn kho đã đổi. Hãy kiểm tra lại trước khi đặt hàng.");
        throw error;
    }
}
