import { Router } from "express";
import products from "./products.routes.js";

const router = Router();
router.use("/products", products);

export default router;
