import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";
import { env, readDatabaseUrl } from "../backend/src/config/env.js";
import { artisans, batches, products, productionStages } from "../frontend/src/data/demo-data.js";

const prisma = new PrismaClient({ datasourceUrl: readDatabaseUrl("MIGRATION_DATABASE_URL") });
const categorySlugs = {
  "Khăn lụa": "khan-lua",
  "Vải tơ tằm": "vai-to-tam",
  "Phụ kiện": "phu-kien",
  "Quà tặng": "qua-tang",
};
const stageCodes = ["UOM_TO", "MAC_CUI", "DET_LUA", "NHUOM_MAU", "CAN_LANG"];
const pricingMigration = "20261108000200_product_pricing_and_sale_units";
const saleUnits = { "mét": "METER", "chiếc": "PIECE", "bộ": "SET", "hộp": "BOX" };
const workshopEmail = (id) => `${id}@nhaxa.example`;
const imagePath = (file) => `/public/images/${file}`;

// Reference point for the village. All workshops and their pins are illustrative.
const village = {
  address: "Làng Nha Xá, phường Duy Tân, tỉnh Ninh Bình",
  latitude: "20.6608333",
  longitude: "106.0197222",
};

function weaveType(product) {
  if (product.category !== "Vải tơ tằm") return "PHU_KIEN_LUA";
  if (product.material.startsWith("Satin")) return "LUA_SATIN";
  if (product.material.startsWith("Gấm")) return "LUA_GAM";
  if (product.material.startsWith("Lụa vân")) return "LUA_VAN";
  return "LUA_TO_TAM_THO";
}

function traceUrl(code) {
  const url = new URL(process.env.QR_BASE_URL || "http://localhost:5189/trace");
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("QR_BASE_URL must use HTTP or HTTPS.");
  }
  url.pathname = `${url.pathname.replace(/\/+$/, "")}/${code}`;
  return url.href;
}

async function seed() {
  if (env.nodeEnv === "production") {
    throw new Error("Run the Nha Xá demo seed in a development database.");
  }
  const password = process.env.SEED_DEMO_PASSWORD ?? "";
  const length = Buffer.byteLength(password, "utf8");
  if (length < 12 || length > 72) {
    throw new Error("SEED_DEMO_PASSWORD must be between 12 and 72 UTF-8 bytes.");
  }
  const [{ hasHistory }] = await prisma.$queryRaw`
    SELECT to_regclass('_prisma_migrations') IS NOT NULL AS "hasHistory"
  `;
  const [pricing] = hasHistory ? await prisma.$queryRaw`
    SELECT 1 FROM "_prisma_migrations"
    WHERE migration_name = ${pricingMigration}
      AND finished_at IS NOT NULL AND rolled_back_at IS NULL
  ` : [];
  if (!pricing) throw new Error("Run npm run db:migrate before seeding.");

  const users = [
    { email: "admin@nhaxa.example", fullName: "Quản trị Nha Xá (demo)", role: "ADMIN" },
    { email: "buyer@nhaxa.example", fullName: "Khách hàng Nha Xá (demo)", role: "BUYER" },
    ...artisans.map(({ id, artisan }) => ({ email: workshopEmail(id), fullName: artisan, role: "ARTISAN" })),
  ];
  const accounts = await Promise.all(users.map(async (user) => ({
    ...user,
    passwordHash: await hash(password, 12),
  })));

  await prisma.$transaction(async (tx) => {
    // Serialize demo seed writers so concurrent upserts cannot race.
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext('vcraft:nha-xa:seed'))::text`;
    const [{ batchDate }] = await tx.$queryRaw`SELECT CURRENT_DATE AS "batchDate"`;
    const userIds = new Map();
    const workshopIds = new Map();
    const categoryIds = new Map();
    const productIds = new Map();

    for (const account of accounts) {
      const user = await tx.user.upsert({
        where: { email: account.email }, create: account, update: {},
        select: { id: true, role: true },
      });
      if (user.role !== account.role) throw new Error(`Conflicting demo account role: ${account.email}`);
      userIds.set(account.email, user.id);
    }
    for (const workshop of artisans) {
      const userId = userIds.get(workshopEmail(workshop.id));
      const profile = await tx.artisanProfile.upsert({
        where: { userId },
        create: {
          userId,
          ...village,
          workshopName: workshop.name,
          artisanTitle: workshop.specialty,
          familyHistory: workshop.story,
          coverImageUrl: imagePath(workshop.image),
          verificationStatus: "APPROVED",
          verifiedAt: new Date(),
          isOpenForVisitors: false,
        },
        update: {},
      });
      workshopIds.set(workshop.id, profile.id);
    }
    for (const [name, slug] of Object.entries(categorySlugs)) {
      const category = await tx.category.upsert({ where: { slug }, create: { name, slug }, update: {} });
      categoryIds.set(name, category.id);
    }
    for (const product of products) {
      const artisanId = workshopIds.get(product.artisanId);
      const saleUnit = saleUnits[product.unit];
      if (!saleUnit) throw new Error(`Unknown demo sale unit: ${product.unit}`);
      const record = await tx.product.upsert({
        where: { slug: product.id },
        create: {
          slug: product.id,
          name: product.name,
          artisanId,
          categoryId: categoryIds.get(product.category),
          weaveType: weaveType(product),
          rawMaterial: product.material,
          description: product.description,
          price: product.price,
          pricingMode: product.price === null ? "CONTACT" : "FIXED",
          saleUnit,
          stockQuantity: product.price === null ? 0 : 12,
          mediaUrls: [imagePath(product.image)],
        },
        update: {},
        select: { id: true, artisanId: true },
      });
      if (record.artisanId !== artisanId) {
        throw new Error(`Conflicting demo product owner: ${product.id}`);
      }
      productIds.set(product.id, record.id);
    }
    for (const batch of batches) {
      const product = products.find(({ batch: code }) => code === batch.code);
      if (!product || batch.notes.length !== stageCodes.length) {
        throw new Error(`Invalid demo batch fixture: ${batch.code}`);
      }
      const productId = productIds.get(product.id);
      const record = await tx.productBatch.upsert({
        where: { batchCode: batch.code },
        create: {
          batchCode: batch.code,
          productId,
          qrCodeUrl: traceUrl(batch.code),
          totalQuantity: 12,
          status: "COMPLETED",
          startedAt: batchDate,
          completedAt: batchDate,
          logs: {
            create: batch.notes.map((description, index) => ({
              stage: stageCodes[index],
              stageTitle: productionStages[index],
              description,
              stepOrder: index + 1,
            })),
          },
        },
        update: {},
        select: { productId: true },
      });
      if (record.productId !== productId) {
        throw new Error(`Conflicting demo batch product: ${batch.code}`);
      }
    }
  }, { timeout: 30_000 });

  console.log(`Nha Xá seed ready: ${accounts.length} accounts, ${artisans.length} workshops, ${products.length} products, ${batches.length} batches.`);
}

try {
  await seed();
} finally {
  await prisma.$disconnect();
}
