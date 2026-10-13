import { Router } from "express";
import {
  getAllProducts,
  getProductById,
  getBestSellingProducts,
  getProductsByCategory,
} from "../../controller/users/products";
import { optionalAuthenticated } from "../../middlewares/optionalAuthenticated";

const productRoute = Router();

productRoute.use(optionalAuthenticated);

productRoute.get("/best-sellers", getBestSellingProducts);
productRoute.get("/", getAllProducts);
productRoute.get("/category/:id", getProductsByCategory);
productRoute.get("/:id", getProductById);

export default productRoute;
