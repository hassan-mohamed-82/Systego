import { Router } from "express";
import { getPublicProducts } from "../controller/public/products";

const publicRouter = Router();

publicRouter.get("/products", getPublicProducts);

export default publicRouter;
