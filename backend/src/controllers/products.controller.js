import { toCatalogJson, toProductDetailJson } from "../presenters/product.presenter.js";
import { getCatalogProduct, listCatalogProducts } from "../services/products.service.js";

function parsePositiveInteger(value, fallback, maximum) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d*$/.test(value)) return null;

  const number = Number(value);
  return number <= maximum ? number : null;
}

export async function listProducts(request, response) {
  const { category } = request.query;
  const page = parsePositiveInteger(request.query.page, 1, 10_000);
  const limit = parsePositiveInteger(request.query.limit, 24, 100);
  const validCategory = category === undefined
    || (typeof category === "string" && category.trim().length > 0 && category.length <= 120);

  if (!page || !limit || !validCategory) {
    return response.status(400).json({
      error: { code: "INVALID_QUERY", message: "Tham số page, limit hoặc category không hợp lệ." },
    });
  }

  const catalog = await listCatalogProducts({ page, limit, category });
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
