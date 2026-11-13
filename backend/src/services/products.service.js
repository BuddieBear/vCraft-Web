import { prisma } from "../database/prisma.js";
import { recordProductHidden } from "../repositories/audit-log.repository.js";
import {
  findPublicProductBySlug,
  hideProductOwnedByUser,
  listPublicProducts,
} from "../repositories/products.repository.js";

export async function listCatalogProducts({ page = 1, limit = 24, category } = {}) {
  const rows = await listPublicProducts({ skip: (page - 1) * limit, take: limit + 1, category });
  return {
    products: rows.slice(0, limit),
    pagination: { page, limit, hasNext: rows.length > limit },
  };
}

export function getCatalogProduct(slug) {
  return findPublicProductBySlug(slug);
}

export function hideCatalogProduct({ productId, userId }) {
  return prisma.$transaction(async (transaction) => {
    const { count } = await hideProductOwnedByUser(transaction, { productId, userId });
    if (count === 0) return false;

    await recordProductHidden(transaction, { productId, userId });
    return true;
  });
}
