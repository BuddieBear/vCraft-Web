import express from "express";
import compression from "compression";
import cors from "cors";
import { fileURLToPath } from "node:url";
import { env } from "./config/env.js";
import { errorHandler } from "./middlewares/error-handler.js";
import routes from "./routes/index.js";
import { uploadDirectory } from "./services/media.service.js";
import { isLegacyPrivateImage } from "./repositories/traceability.repository.js";
import { imageFilename } from "../../frontend/src/data/batch-media.js";
import siteRoutes, { frontendDirectory, siteNotFound } from "./routes/site.routes.js";
import { browserDocumentPolicy } from "./config/browser-policy.js";

export const app = express();

app.disable("x-powered-by");
app.use(compression({
    filter(request, response) {
        const cacheControl = response.getHeader("Cache-Control") || "";
        if (/(?:^|,)\s*(?:private|no-store)\b/i.test(cacheControl)) return false;
        if (response.statusCode === 304) {
            // Express removes Content-Type from 304 responses before compression checks it.
            response.vary("Accept-Encoding");
            return false;
        }
        if (request.get("Range")) return false;
        return compression.filter(request, response);
    },
}));
app.use((_request, response, next) => {
    response.set({
        "X-Content-Type-Options": "nosniff",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=(self)",
    });
    next();
});
const origins = process.env.CORS_ALLOWED_ORIGINS === undefined
    ? (env.nodeEnv === "production" ? [] : ["http://127.0.0.1:5189", "http://localhost:5189"])
    : process.env.CORS_ALLOWED_ORIGINS.split(",").map((origin) => origin.trim()).filter(Boolean);
app.use(cors({ origin: (origin, done) => done(null, Boolean(origin && origins.includes(origin))), methods: ["GET", "POST", "PUT", "PATCH", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use("/api/news", express.json({ limit: "256kb" }));
app.use(express.json({ limit: "64kb" }));
app.use("/uploads", async (request, response, next) => {
    const filename = request.path.slice(1);
    if (!imageFilename.test(filename) || await isLegacyPrivateImage(filename)) return response.set("Cache-Control", "no-store").status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy ảnh." } });
    next();
}, express.static(uploadDirectory, { dotfiles: "deny", index: false, maxAge: "1d", setHeaders: (response) => response.setHeader("X-Content-Type-Options", "nosniff") }));
app.use("/api", routes);
app.use("/api", (_request, response) => {
    response.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy đường dẫn." } });
});
app.use(browserDocumentPolicy);
app.use(siteRoutes);
app.use("/vendor/leaflet", express.static(fileURLToPath(new URL("../../node_modules/leaflet/dist/", import.meta.url)), { dotfiles: "deny", index: false, maxAge: "1d" }));
app.use("/vendor/maplibre", express.static(fileURLToPath(new URL("../../node_modules/maplibre-gl/dist/", import.meta.url)), { dotfiles: "deny", index: false, maxAge: "1d" }));
app.get("/vendor/maplibre-leaflet.js", (_request, response) => {
    response.sendFile(fileURLToPath(new URL("../../node_modules/@maplibre/maplibre-gl-leaflet/leaflet-maplibre-gl.js", import.meta.url)), { maxAge: "1d" });
});
app.use(express.static(frontendDirectory, { dotfiles: "deny" }));
app.use(siteNotFound);
app.use(errorHandler);
