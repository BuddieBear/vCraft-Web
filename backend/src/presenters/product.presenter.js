function toProductSummary(product) {
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    price: product.price?.toString() ?? null,
    pricingMode: product.pricingMode,
    saleUnit: product.saleUnit,
    mediaUrls: product.mediaUrls,
    category: product.category,
    artisan: product.artisan,
  };
}

export function toCatalogJson({ products, pagination }) {
  return { data: products.map(toProductSummary), pagination };
}

export function toProductDetailJson(product) {
  return {
    data: {
      ...toProductSummary(product),
      description: product.description,
      culturalStory: product.culturalStory,
      weaveType: product.weaveType,
      rawMaterial: product.rawMaterial,
      createdAt: product.createdAt.toISOString(),
      updatedAt: product.updatedAt.toISOString(),
    },
  };
}
