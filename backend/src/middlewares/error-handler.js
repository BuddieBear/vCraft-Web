export function errorHandler(error, _request, response, next) {
  if (response.headersSent) return next(error);

  if (error instanceof URIError && error.status === 400) {
    return response.status(400).json({
      error: { code: "INVALID_PATH", message: "Đường dẫn không hợp lệ." },
    });
  }

  console.error("Request failed.", error);
  return response.status(500).json({
    error: { code: "INTERNAL_ERROR", message: "Không thể xử lý yêu cầu." },
  });
}
