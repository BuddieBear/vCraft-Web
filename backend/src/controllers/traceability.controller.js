import { getProductBatches, getPublicProductionProduct, getPublicTimeline } from "../services/traceability.service.js";
import { renderProductProductionPage, renderTraceabilityPage } from "../presenters/traceability.presenter.js";
import { ApiError } from "../middlewares/api-error.js";
import { sendNotFound, traceSecurityHeaders } from "../config/site-pages.js";

function sendTracePage(response, html) {
    return response.set(traceSecurityHeaders).type("html").send(html);
}

const traceNotFound = response => sendNotFound(response, traceSecurityHeaders);

export function productionPage(reference) {
    return async (request, response) => {
        const { slug } = request.params;
        const product = slug.length <= 280 ? await getPublicProductionProduct(slug, reference) : null;
        if (!product) return traceNotFound(response);
        const batches = reference ? [] : await getProductBatches(slug);
        return sendTracePage(response, renderProductProductionPage(product, reference, batches));
    };
}

export async function batchPage(request, response) {
    const { code } = request.params;
    const batch = code.length <= 50 ? await getPublicTimeline(code, { includeCover: true }) : null;
    if (!batch) return traceNotFound(response);
    return sendTracePage(response, renderTraceabilityPage(batch));
}

export async function timeline(request, response) {
    const batch = await getPublicTimeline(request.validatedParams.code);
    if (!batch) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy lô sản phẩm.");
    response.json({ data: batch });
}
