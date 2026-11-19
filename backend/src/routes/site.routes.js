import { Router } from "express";
import { fileURLToPath } from "node:url";
import { productPageRoots, productTraceSegment, signInPath, sitePaths } from "../../../frontend/src/site-paths.js";
import { getCatalogProduct } from "../services/products.service.js";
import { findReferenceProduct } from "../data/workshop-references.js";
import { batchPage, productionPage } from "../controllers/traceability.controller.js";
import { getPublicProductionProduct } from "../services/traceability.service.js";

export const frontendDirectory = fileURLToPath(new URL("../../../frontend/", import.meta.url));
const router = Router();
const sendIndex = (_request, response) => response.sendFile("index.html", { root: frontendDirectory });
const sendNotFound = response => response.status(404).sendFile("404.html", { root: frontendDirectory });

function productPage(findProduct, { demoRedirect = false } = {}) {
    return async (request, response) => {
        const { slug } = request.params;
        if (slug.length > 280 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return sendNotFound(response);
        if (await findProduct(slug)) return sendIndex(request, response);
        if (demoRedirect && await getPublicProductionProduct(slug, false)) {
            return response.redirect(302, "/trace/product/" + productTraceSegment(slug));
        }
        return sendNotFound(response);
    };
}

router.get(signInPath, (_request, response) => response.sendFile("login.html", { root: frontendDirectory }));
router.get("/login.html", (request, response) => {
    const query = new URL(request.originalUrl, "http://localhost").search;
    response.redirect(302, signInPath + query);
});
router.get(productPageRoots.retail + "/:slug", productPage(slug => getCatalogProduct(slug, { storefront: true }), { demoRedirect: true }));
router.get(productPageRoots.reference + "/:slug", productPage(findReferenceProduct));
router.get("/trace/product/reference/:slug", productionPage(true));
router.get("/trace/product/:slug", productionPage(false));
router.get("/trace/:code", batchPage);
router.get(Object.values(sitePaths), sendIndex);

export function siteNotFound(request, response) {
    if (request.method === "GET" && request.get("accept")?.includes("text/html") && request.accepts("html") && !request.path.includes(".")) {
        return sendNotFound(response);
    }
    return response.status(404).json({ error: { code: "NOT_FOUND", message: "Không tìm thấy đường dẫn." } });
}

export default router;
