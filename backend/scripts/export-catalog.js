import { prisma } from "../src/database/prisma.js";
import { toCatalogJson, toProductDetailJson } from "../src/presenters/product.presenter.js";
import { getCatalogProduct, listCatalogProducts } from "../src/services/products.service.js";

async function readCatalogJson(args) {
  if (args.length > 1) {
    console.error("Cách dùng: npm run --silent db:json -- [slug]");
    return null;
  }
  if (args.length === 0) return toCatalogJson(await listCatalogProducts());

  const product = await getCatalogProduct(args[0]);
  if (!product) {
    console.error("Không tìm thấy sản phẩm trong danh mục công khai.");
    return null;
  }
  return toProductDetailJson(product);
}

try {
  const result = await readCatalogJson(process.argv.slice(2));
  if (result) console.log(JSON.stringify(result, null, 2));
  else process.exitCode = 1;
} catch {
  console.error("Không thể đọc dữ liệu danh mục.");
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
