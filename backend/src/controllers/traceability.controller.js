import { getProductBatches, getPublicProductionProduct, getPublicTimeline } from "../services/traceability.service.js";
import { renderProductProductionPage, renderTraceabilityPage } from "../presenters/traceability.presenter.js";
import { ApiError } from "../middlewares/api-error.js";
import { sendNotFound } from "../routes/site.routes.js";

function sendTracePage(response, html) {
    return response.set({
        "Content-Security-Policy": "default-src 'none'; style-src 'self'; font-src 'self'; img-src 'self' https: http:; base-uri 'none'; frame-ancestors 'none'",
        "X-Content-Type-Options": "nosniff",
    }).type("html").send(html);
}

export function productionPage(reference) {
    return async (request, response) => {
        const { slug } = request.params;
        const product = slug.length <= 280 ? await getPublicProductionProduct(slug, reference) : null;
        if (!product) return sendNotFound(response);
        const batches = reference ? [] : await getProductBatches(slug);
        return sendTracePage(response, renderProductProductionPage(product, reference, batches));
    };
}

export async function batchPage(request, response) {
    const { code } = request.params;
    const batch = code.length <= 50 ? await getPublicTimeline(code, { includeCover: true }) : null;
    if (!batch) return sendNotFound(response);
    return sendTracePage(response, renderTraceabilityPage(batch));
}

export async function timeline(request, response) {
    const batch = await getPublicTimeline(request.validatedParams.code);
    if (!batch) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô sản phẩm.");
    response.json({ data: batch });
}
