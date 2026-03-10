import { Router } from "express";
import { getAllProducts, getProductById } from "../controller/products";

const productRouter = Router();

productRouter.get("/", getAllProducts);
productRouter.get("/:id", getProductById);

export default productRouter;