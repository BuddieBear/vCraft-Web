import { request } from "./http.js";

export async function getCatalogProduct(slug, reference, signal) {
  const param = encodeURIComponent(slug);
  const path = reference ? "/artisans/reference/products/" + param : "/products/by-slug/" + param + "?storefront=true";
  return (await request(path, { signal })).data;
}
