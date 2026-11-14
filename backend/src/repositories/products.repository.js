import { prisma } from "../database/prisma.js";

const publicProducts = {
  isPublished: true,
  artisan: { verificationStatus: "APPROVED", user: { isActive: true } },
};

const summaryFields = {
  id: true,
  slug: true,
  name: true,
  price: true,
  pricingMode: true,
  saleUnit: true,
  mediaUrls: true,
  category: { select: { slug: true, name: true } },
  artisan: { select: { id: true, workshopName: true } },
};

export function listPublicProducts({ skip, take, category }) {
  const where = { ...publicProducts };
  if (category) where.category = { slug: category };

  return prisma.product.findMany({
    where,
    select: summaryFields,
    orderBy: { slug: "asc" },
    skip,
    take,
  });
}

export function findPublicProductBySlug(slug) {
  return prisma.product.findUnique({
    where: { slug, ...publicProducts },
    select: {
      ...summaryFields,
      description: true,
      culturalStory: true,
      weaveType: true,
      rawMaterial: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

export function hideProductOwnedByUser(transaction, { productId, userId }) {
  return transaction.product.updateMany({
    where: {
      id: productId,
      isPublished: true,
      artisan: { userId, user: { isActive: true } },
    },
    data: { isPublished: false },
  });
}
