import { Router } from "express";
import { getProduct, listProducts } from "../controllers/products.controller.js";
import { z } from "zod";
import Decimal from "decimal.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { validate } from "../middlewares/validate-request.js";
import { ApiError } from "../middlewares/api-error.js";
import { byId, uuid, urls, pageArgs, pageQuery, money } from "./schemas.js";
import { getMyProducts, createProduct, replaceProduct, hideCatalogProduct } from "../services/products.service.js";

const router = Router();
const stockQuantity = z.number().int().min(0).max(2147483647);
const productFields = z.object({ name: z.string().trim().min(1).max(255), slug: z.string().min(1).max(280).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).refine((v) => v !== "mine"), categoryId: uuid.nullable().optional(), weaveType: z.enum(["LUA_VAN", "LUA_GAM", "LUA_SATIN", "LUA_TWILL", "LUA_TO_TAM_THO", "PHU_KIEN_LUA"]).optional(), rawMaterial: z.string().min(1).max(150).optional(), description: z.string().max(20000).nullable().optional(), culturalStory: z.string().max(20000).nullable().optional(), pricingMode: z.enum(["FIXED", "CONTACT"]), price: money.nullable(), saleUnit: z.enum(["METER", "PIECE", "SET", "BOX"]), stockQuantity, mediaUrls: urls, isUniquePiece: z.boolean().optional(), isPublished: z.boolean().optional() }).strict();
function validatePricing(v, ctx) {
    if (v.pricingMode === "CONTACT" && v.price === null) return;
    try {
        const price = new Decimal(v.price);
        if (v.pricingMode === "FIXED" && price.isFinite() && price.gte(0) && price.lte("9999999999.99") && price.decimalPlaces() <= 2) return;
    } catch { /* The field error below also covers unparsable amounts. */ }
    ctx.addIssue({ code: "custom", path: ["price"], message: "Invalid pricing" });
}
const productBody = productFields.superRefine(validatePricing);
const replaceBody = productFields.extend({ expectedStockQuantity: stockQuantity }).superRefine(validatePricing);
const own = [authenticate, authorize("ARTISAN")];
router.get("/mine", ...own, validate({ query: pageQuery }), async (req, res) => res.json({ data: await getMyProducts(req.user.id, pageArgs(req.validatedQuery)) }));
router.post("/", ...own, validate({ body: productBody }), async (req, res) => res.status(201).json({ data: await createProduct(req.user.id, req.validatedBody) }));
router.put("/:id", ...own, validate({ params: byId, body: replaceBody }), async (req, res) => res.json({ data: await replaceProduct(req.user.id, req.validatedParams.id, req.validatedBody) }));
router.delete("/:id", ...own, validate({ params: byId }), async (req, res) => { if (!await hideCatalogProduct({ userId: req.user.id, productId: req.validatedParams.id })) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy sản phẩm đang công bố."); res.status(204).end(); });
router.get("/", listProducts);
router.get("/by-slug/:slug", getProduct);
router.get("/:slug", getProduct);

export default router;
