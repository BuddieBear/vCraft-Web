import { toCatalogJson, toProductDetailJson } from "../presenters/product.presenter.js";
import { getCatalogProduct, listCatalogProducts } from "../services/products.service.js";

function parsePositiveInteger(value, fallback, maximum) {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;

    const number = Number(value);
    return number <= maximum ? number : null;
}

export async function listProducts(request, response) {
    const { category, artisanId, q, sort, storefront } = request.query;
    const page = parsePositiveInteger(request.query.page, 1, 10_000);
    const limit = parsePositiveInteger(request.query.limit, 24, 100);
    const validCategory = category === undefined
        || (typeof category === "string" && category.trim().length > 0 && category.length <= 120);
    const validArtisan = artisanId === undefined || (typeof artisanId === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(artisanId));

    const validSearch = q === undefined || (typeof q === "string" && q.trim().length > 0 && q.length <= 100);
    if (!page || !limit || !validCategory || !validArtisan || !validSearch || (storefront !== undefined && storefront !== "true") || (sort !== undefined && !["asc", "desc"].includes(sort))) {
        return response.status(400).json({
            error: { code: "INVALID_QUERY", message: "Tham số danh mục không hợp lệ." },
        });
    }

    const catalog = await listCatalogProducts({ page, limit, category: category?.trim(), artisanId, q: q?.trim(), sort, storefront: storefront === "true" });
    return response.json(toCatalogJson(catalog));
}

export async function getProduct(request, response) {
    const product = await getCatalogProduct(request.params.slug);
    if (!product) {
        return response.status(404).json({
            error: { code: "PRODUCT_NOT_FOUND", message: "Không tìm thấy sản phẩm." },
        });
    }

    return response.json(toProductDetailJson(product));
}
