import express from "express";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import routes from "./routes/index.js";
import { uploadDirectory } from "./services/media.service.js";
import { getPublicTimeline } from "./services/traceability.service.js";
import { renderTraceabilityPage } from "./presenters/traceability.presenter.js";
import { sitePaths } from "../../frontend/src/site-paths.js";

export const app = express();
const frontendDirectory = fileURLToPath(new URL("../../frontend/", import.meta.url));

app.disable("x-powered-by");
const origins = process.env.CORS_ALLOWED_ORIGINS === undefined
    ? (env.nodeEnv === "production" ? [] : ["http://127.0.0.1:5189", "http://localhost:5189"])
    : process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: (origin, done) => done(null, Boolean(origin && origins.includes(origin))), methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use("/api/news", express.json({ limit: "256kb" }));
app.use(express.json({ limit: "64kb" }));
app.use("/uploads", (request, response, next) => {
    if (!/^\/[a-f0-9-]+\.webp$/.test(request.path)) return response.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy ảnh." } });
    next();
}, express.static(uploadDirectory, { dotfiles: "deny", index: false, maxAge: "1d", setHeaders: (response) => response.setHeader("X-Content-Type-Options", "nosniff") }));
app.use("/api", routes);
app.use("/api", (_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy đường dẫn." } });
});
app.get("/trace/:code", async (request, response) => {
    const { code } = request.params;
    const batch = code.length <= 50 ? await getPublicTimeline(code, { includeCover: true }) : null;
    if (!batch) return response.status(404).type("text").send("Không tìm thấy lô sản phẩm.");
    return response.set({
        "Content-Security-Policy": "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' https: http:; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
    }).type("html").send(renderTraceabilityPage(batch));
});
app.get(Object.values(sitePaths).filter(path => path !== "/"), (_request, response) => {
    response.sendFile("index.html", { root: frontendDirectory });
});
app.use("/vendor/leaflet", express.static(fileURLToPath(new URL("../../node_modules/leaflet/dist/", import.meta.url)), { dotfiles: "deny", index: false, maxAge: "1d" }));
app.use(express.static(frontendDirectory, { dotfiles: "deny" }));
app.use((_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy đường dẫn." } });
});
app.use(errorHandler);
