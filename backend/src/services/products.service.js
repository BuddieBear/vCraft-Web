import {
    findPublicProductBySlug,
    hideProductWithAudit,
    listPublicProducts,
    createOwnedProduct,
    listOwnedProducts,
    replaceOwnedProduct,
    listCategories,
} from "../repositories/products.repository.js";
import { ApiError } from "../middlewares/api-error.js";

export async function listCatalogProducts({ page = 1, limit = 24, category, artisanId, q, sort, storefront } = {}) {
    const rows = await listPublicProducts({ skip: (page - 1) * limit, take: limit + 1, category, artisanId, q, sort, storefront });
    return {
        products: rows.slice(0, limit),
        pagination: { page, limit, hasNext: rows.length > limit },
    };
}

export function getCatalogProduct(slug, options) {
    return findPublicProductBySlug(slug, options);
}
export function getCategories() {
    return listCategories();
}
export function getMyProducts(userId, options) {
    return listOwnedProducts(userId, options);
}
export async function createProduct(userId, data) {
    const product = await createOwnedProduct(userId, data);
    if (!product) throw new ApiError(403, "FORBIDDEN", "Xưởng chưa được duyệt.");
    return product;
}
export async function replaceProduct(userId, id, data) {
    const product = await replaceOwnedProduct(userId, id, data);
    if (!product) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy sản phẩm.");
    return product;
}

export function hideCatalogProduct({ productId, userId }) {
    return hideProductWithAudit({ productId, userId });
}
