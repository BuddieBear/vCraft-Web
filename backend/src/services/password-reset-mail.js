import { ApiError } from "../middlewares/api-error.js";
import { signInPath } from "../../../frontend/src/site-paths.js";

export function passwordResetDelivery() {
    const { RESEND_API_KEY: key, PASSWORD_RESET_FROM: from, PUBLIC_APP_URL: appUrl, NODE_ENV: environment } = process.env;
    if (!key && !from && !appUrl && (environment === "test" || environment === "development")) return null;
    let origin;
    try {
        origin = new URL(appUrl);
        if (origin.protocol !== "https:" && !((environment === "test" || environment === "development") && origin.protocol === "http:")) throw new Error();
        if (origin.username || origin.password || origin.pathname !== "/" || origin.search || origin.hash || !key || !from) throw new Error();
    } catch {
        throw new ApiError(503, "RESET_MAIL_UNAVAILABLE", "Dịch vụ gửi email khôi phục đang tạm thời không khả dụng.");
    }
    return async (email, token) => {
        const link = new URL(signInPath, origin);
        link.hash = new URLSearchParams({ reset: token }).toString();
        try {
            const response = await fetch("https://api.resend.com/emails", {
                method: "POST",
                headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
                body: JSON.stringify({
                    from, to: [email], subject: "Đặt lại mật khẩu vCraft",
                    text: `Mở liên kết sau để đặt lại mật khẩu vCraft trong vòng 15 phút:\n${link.href}\n\nBạn có thể bỏ qua email nếu không yêu cầu đặt lại mật khẩu.`,
                }),
                signal: AbortSignal.timeout(8000),
            });
            if (!response.ok) throw new Error();
        } catch {
            throw new ApiError(503, "RESET_MAIL_UNAVAILABLE", "Dịch vụ gửi email khôi phục đang tạm thời không khả dụng.");
        }
    };
}
