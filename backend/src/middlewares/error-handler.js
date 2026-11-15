import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "./api-error.js";
import multer from "multer";

const invalid = new Set(["Invalid identifier", "Invalid text", "Invalid quantity", "Invalid amount", "Invalid deadline", "Invalid attachments", "Invalid images", "Invalid note", "Invalid bids", "Invalid allocations", "Invalid transition", "Invalid userId", "Invalid cart item", "Invalid review target", "Provide one order", "Invalid review", "Invalid media", "Invalid recipientName", "Invalid recipientPhone", "Invalid shippingAddress", "Invalid shippingNote", "Invalid paymentMethod"]);
const conflict = new Set(["Quote not found or invalid state", "Quote deadline passed", "No eligible artisan", "Artisan cannot bid on quote", "Invalid or unavailable bids", "Too many bids for the requested quantity", "Allocations must cover accepted bids and requested quantity", "Assignment not found", "Assignment not found or invalid state", "Product is unavailable or has insufficient stock", "Product is unavailable, changed price, or has insufficient stock", "Cart is empty", "Cart changed during checkout", "Artisan is unavailable", "Review target is not in a delivered order", "Invalid production step", "Incomplete production timeline", "Invalid order transition", "Batch exceeds allocated quantity"]);

export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);

  if (error instanceof URIError && error.status === 400) {
    return response.status(400).json({
      error: { code: "INVALID_PATH", message: "Đường dẫn không hợp lệ." },
    });
  }

  if (error instanceof ApiError) return response.status(error.status).json({ error: { code: error.code, message: error.message } });
  if (error.message === "Quote buyer is unavailable") return response.status(409).json({ error: { code: "BUYER_UNAVAILABLE", message: "Tài khoản người mua không còn hoạt động." } });
  if (error.message === "Assignment has unfinished batches") return response.status(409).json({ error: { code: "BATCHES_INCOMPLETE", message: "Còn lô sản xuất chưa hoàn thành." } });
  if (error.message === "Stale product stock") return response.status(409).json({ error: { code: "STALE_STOCK", message: "Tồn kho đã thay đổi. Hãy tải lại sản phẩm trước khi lưu." } });
  if (error.message === "Invalid payment confirmation") return response.status(409).json({ error: { code: "PAYMENT_CONFIRMATION_REQUIRED", message: "Kiểm tra và xác nhận đã thu tiền trước khi hoàn tất giao hàng COD." } });
  if (error instanceof multer.MulterError) return response.status(error.code === "LIMIT_FILE_SIZE" ? 413 : 400).json({ error: { code: "INVALID_UPLOAD", message: "Tệp tải lên vượt giới hạn hoặc không hợp lệ." } });
  if (error instanceof ZodError || error.type === "entity.parse.failed" || invalid.has(error.message)) return response.status(400).json({ error: { code: "INVALID_REQUEST", message: "Dữ liệu gửi lên không hợp lệ." } });
  if (error.type === "entity.too.large") return response.status(413).json({ error: { code: "BODY_TOO_LARGE", message: "Dữ liệu gửi lên quá lớn." } });
  if (["charset.unsupported", "encoding.unsupported"].includes(error.type)) return response.status(415).json({ error: { code: "UNSUPPORTED_ENCODING", message: "Định dạng mã hóa không được hỗ trợ." } });
  if (conflict.has(error.message)) return response.status(409).json({ error: { code: "CONFLICT", message: "Thao tác không phù hợp với trạng thái hiện tại." } });
  if (["Buyer is not active", "Admin is not active", "Artisan is not active"].includes(error.message)) return response.status(403).json({ error: { code: "FORBIDDEN", message: "Không có quyền thực hiện thao tác." } });
  if (error instanceof Prisma.PrismaClientKnownRequestError && ["P2002", "P2003", "P2025", "P2034"].includes(error.code)) return response.status(409).json({ error: { code: "CONFLICT", message: "Dữ liệu đã thay đổi hoặc bị trùng; vui lòng kiểm tra lại." } });

  console.error("Request failed.", { name: error.name, code: error.code, route: _request.route?.path, method: _request.method });
  return response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu." },
  });
}
