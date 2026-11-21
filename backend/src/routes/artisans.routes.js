import { Router } from "express";
import { z } from "zod";
import { validate } from "../middlewares/validate-request.js";
import { ApiError } from "../middlewares/api-error.js";
import { byId, listPage, pageQuery, urls, mediaUrl } from "./schemas.js";
import { getArtisan, listArtisans, getMyWorkshop, updateMyWorkshop, createCertificate, removeCertificate } from "../services/artisans.service.js";
import { authenticate } from "../middlewares/authenticate.js";
import { authorize } from "../middlewares/authorize.js";
import { findReferenceProduct, workshopReferences } from "../data/workshop-references.js";
const router = Router();
const own = [authenticate, authorize("ARTISAN")];
router.get("/reference", (_req, res) => res.json({
    data: workshopReferences.map(({ slug, name, description, location, products }) => ({ slug, name, description, location, productCount: products.length })),
}));
router.get("/reference/products", (_req, res) => res.json({
    data: workshopReferences.flatMap(({ name, products }) => products.map(product => ({ ...product, workshopName: name }))),
}));
router.get("/reference/products/:slug", (req, res) => {
    const product = findReferenceProduct(req.params.slug);
    if (!product) throw new ApiError(404, "PRODUCT_NOT_FOUND", "Không tìm thấy mẫu lụa.");
    res.json({ data: product });
});
router.get("/reference/:slug", (req, res) => {
    const workshop = workshopReferences.find(({ slug }) => slug === req.params.slug);
    if (!workshop) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy cơ sở dệt lụa.");
    res.json({ data: workshop });
});
router.get("/me", ...own, async (req, res) => res.json({ data: await getMyWorkshop(req.user.id) }));
router.patch("/me", ...own, validate({ body: z.object({ workshopName: z.string().trim().min(1).max(200).optional(), artisanTitle: z.string().max(150).nullable().optional(), familyHistory: z.string().max(20000).nullable().optional(), experienceYears: z.number().int().min(0).max(32767).nullable().optional(), address: z.string().trim().min(1).max(255).optional(), latitude: z.number().min(-90).max(90).optional(), longitude: z.number().min(-180).max(180).optional(), openingHours: z.string().max(100).optional(), isOpenForVisitors: z.boolean().optional(), coverImageUrl: mediaUrl.nullable().optional(), galleryImages: urls.optional() }).strict().refine((v) => Object.keys(v).length > 0) }), async (req, res) => res.json({ data: await updateMyWorkshop(req.user.id, req.validatedBody) }));
router.post("/me/certificates", ...own, validate({ body: z.object({ title: z.string().trim().min(1).max(200), issuingAuthority: z.string().trim().min(1).max(200), issuedYear: z.number().int().min(1800).max(new Date().getFullYear()), certificateImageUrl: mediaUrl }).strict() }), async (req, res) => res.status(201).json({ data: await createCertificate(req.user.id, req.validatedBody) }));
router.delete("/me/certificates/:id", ...own, validate({ params: byId }), async (req, res) => { await removeCertificate(req.user.id, req.validatedParams.id); res.status(204).end(); });
const storefront = z.literal("true").optional();
router.get("/", validate({ query: pageQuery.extend({ visitorsOnly: z.enum(["true", "false"]).default("false"), storefront }) }), async (req, res) => {
    const query = req.validatedQuery;
    res.json(await listPage(query, (options) => listArtisans({ ...options, visitorsOnly: query.visitorsOnly === "true", storefront: query.storefront === "true" })));
});
router.get("/:id", validate({ params: byId, query: z.object({ storefront }).strict() }), async (req, res) => { const artisan = await getArtisan(req.validatedParams.id, req.validatedQuery.storefront === "true"); if (!artisan) throw new ApiError(404, "NOT_FOUND", "Không tìm thấy xưởng."); res.json({ data: artisan }); });
export default router;
