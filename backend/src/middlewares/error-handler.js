import { isPersistenceConflict } from "../database/prisma.js";
import { ZodError } from "zod";
import { ApiError } from "./api-error.js";
import multer from "multer";
import { quoteBudgetError, recipientPhoneError, slugError } from "../../../frontend/src/data/input-values.js";

const invalid = new Set(["Invalid identifier", "Invalid text", "Invalid quantity", "Invalid amount", "Invalid deadline", "Invalid attachments", "Invalid images", "Invalid note", "Invalid bids", "Invalid allocations", "Invalid transition", "Invalid userId", "Invalid cart item", "Invalid review target", "Provide one order", "Invalid review", "Invalid media", "Invalid recipientName", "Invalid recipientPhone", "Invalid shippingAddress", "Invalid shippingNote", "Invalid paymentMethod"]);
const conflict = new Set(["Quote not found or invalid state", "Quote deadline passed", "No eligible artisan", "Artisan cannot bid on quote", "Invalid or unavailable bids", "Too many bids for the requested quantity", "Allocations must cover accepted bids and requested quantity", "Assignment not found", "Assignment not found or invalid state", "Product is unavailable or has insufficient stock", "Product is unavailable, changed price, or has insufficient stock", "Cart is empty", "Cart changed during checkout", "Artisan is unavailable", "Review target is not in a delivered order", "Invalid production step", "Incomplete production timeline", "Invalid order transition", "Batch exceeds allocated quantity"]);

function validationFields(issues) {
    const fields = new Map();
    for (const issue of issues) {
        const name = issue.path.map(String).join(".");
        if (!name || fields.has(name)) continue;
        let message = "Kiểm tra định dạng hoặc giá trị của mục này.";
        if (issue.format === "email") message = "Nhập địa chỉ email hợp lệ.";
        if (issue.code === "too_small" && issue.origin === "string") {
            message = issue.minimum === 1 ? "Vui lòng điền mục này." : `Nhập ít nhất ${issue.minimum} ký tự.`;
        }
        if (issue.code === "too_big" && issue.origin === "string") message = `Nhập tối đa ${issue.maximum} ký tự.`;
        if (name === "maxBudget") message = quoteBudgetError;
        if (name === "slug" && issue.code === "invalid_format") message = slugError;
        if (name === "phone" || name === "recipientPhone") message = recipientPhoneError;
        if ((name === "password" || name === "newPassword") && issue.code === "custom") message = "Mật khẩu phải từ 12 đến 72 byte UTF-8.";
        if (name === "username" && issue.code !== "too_small" && issue.code !== "too_big") message = "Tên đăng nhập gồm 3–32 ký tự không dấu (chữ, số, ., _, -), bắt đầu bằng chữ cái hoặc chữ số.";
        if (name === "identifier" && (issue.code === "too_small" || issue.code === "custom")) message = "Nhập email hoặc tên đăng nhập.";
        fields.set(name, { name, message });
    }
    return [...fields.values()];
}

function conflictTargetIncludes(error, field) {
    if (error.code !== "P2002") return false;
    const target = error.meta?.target;
    if (Array.isArray(target)) return target.some((item) => String(item).toLowerCase().includes(field));
    if (typeof target === "string") return target.toLowerCase().includes(field);
    return false;
}

export function errorHandler(error, _request, response, next) {
    if (response.headersSent) return next(error);

    if (error instanceof URIError && error.status === 400) {
        return response.status(400).json({
            error: { code: "INVALID_PATH", message: "Đường dẫn không hợp lệ." },
        });
    }

    if (error instanceof ApiError) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
    if (error.message === "Quote buyer is unavailable") return response.status(409).json({ error: { code: "BUYER_UNAVAILABLE", message: "Tài khoản người mua không còn hoạt động." } });
    if (error.message === "Artisan is unavailable") return response.status(409).json({ error: { code: "ARTISAN_UNAVAILABLE", message: "Xưởng hiện không đủ điều kiện tham gia giao dịch." } });
    if (error.message === "Assignment has unfinished batches") return response.status(409).json({ error: { code: "BATCHES_INCOMPLETE", message: "Còn lô sản xuất chưa hoàn thành." } });
    if (error.message === "Assignment batch quantity does not match allocation") return response.status(409).json({ error: { code: "BATCH_QUANTITY_MISMATCH", message: "Số lượng trong các lô hoàn thành chưa khớp với phân công." } });
    if (error.message === "Invalid recipientPhone") return response.status(400).json({ error: { code: "INVALID_PHONE", message: recipientPhoneError, fields: [{ name: "recipientPhone", message: recipientPhoneError }] } });
    if (error.message === "Invalid deadline") {
        const message = "Chọn ngày cần hàng hợp lệ, từ hôm nay trở đi.";
        return response.status(400).json({ error: { code: "INVALID_REQUEST", message, fields: [{ name: "deadline", message }] } });
    }
    if (error.message === "Stale product stock") return response.status(409).json({ error: { code: "STALE_STOCK", message: "Tồn kho đã thay đổi. Hãy tải lại sản phẩm trước khi lưu." } });
    if (error.message === "Stale product revision") return response.status(409).json({ error: { code: "STALE_PRODUCT", message: "Sản phẩm đã thay đổi. Hãy tải lại trước khi lưu." } });
    if (error.message === "Stock limit exceeded on cancellation") return response.status(409).json({ error: { code: "STOCK_LIMIT_EXCEEDED", message: "Hoàn tồn sẽ vượt giới hạn tồn kho. Hãy kiểm tra lại tồn kho trước khi hủy đơn." } });
    if (error.message === "Invalid payment confirmation") return response.status(409).json({ error: { code: "PAYMENT_CONFIRMATION_REQUIRED", message: "Kiểm tra và xác nhận đã thu tiền trước khi hoàn tất giao hàng COD." } });
    if (error instanceof multer.MulterError) return response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: { code: "INVALID_UPLOAD", message: "Tệp tải lên vượt giới hạn hoặc không hợp lệ." } });
    if (error instanceof ZodError || error.type === "entity.parse.failed" || invalid.has(error.message)) {
        const fields = error instanceof ZodError ? validationFields(error.issues) : [];
        return response.status(400).json({ error: { code: "INVALID_REQUEST", message: "Dữ liệu gửi lên không hợp lệ.", ...(fields.length && { fields }) } });
    }
    if (error.type === "entity.too.large") return response.status(413).json({ error: { code: "BODY_TOO_LARGE", message: "Dữ liệu gửi lên quá lớn." } });
    if (["charset.unsupported", "encoding.unsupported"].includes(error.type)) return response.status(415).json({ error: { code: "UNSUPPORTED_ENCODING", message: "Định dạng mã hóa không được hỗ trợ." } });
    if (conflict.has(error.message)) return response.status(409).json({ error: { code: "CONFLICT", message: "Thao tác không phù hợp với trạng thái hiện tại." } });
    if (["Buyer is not active", "Admin is not active", "Artisan is not active"].includes(error.message)) return response.status(403).json({ error: { code: "FORBIDDEN", message: "Không có quyền thực hiện thao tác." } });
    if (isPersistenceConflict(error)) {
        if (conflictTargetIncludes(error, "username")) {
            const message = "Tên đăng nhập này đã được sử dụng.";
            return response.status(409).json({ error: { code: "USERNAME_TAKEN", message, fields: [{ name: "username", message }] } });
        }
        if (error.meta?.modelName === "CommunityNews" && conflictTargetIncludes(error, "slug")) {
            const message = "Đường dẫn bài viết này đã được sử dụng.";
            return response.status(409).json({ error: { code: "CONFLICT", message, fields: [{ name: "slug", message }] } });
        }
        if (conflictTargetIncludes(error, "email")) {
            const message = "Email này đã được đăng ký.";
            return response.status(409).json({ error: { code: "CONFLICT", message, fields: [{ name: "email", message }] } });
        }
        return response.status(409).json({ error: { code: "CONFLICT", message: "Dữ liệu đã thay đổi hoặc bị trùng; vui lòng kiểm tra lại." } });
    }

    console.error("Request failed.", { name: error.name, code: error.code, route: _request.route?.path, method: _request.method });
    return response.status(500).json({
        error: { code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu." },
    });
}
