import { Router } from "express";
import {createproduct,getProductById,getProducts,updateProduct,deleteProduct
} from "../controller/products"
import {validate} from"../middlewares/validation";
import {createproductSchema,updateproductSchema} from "../validation/products"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createproductSchema), catchAsync(createproduct));
route.get("/",catchAsync(getProducts));
route.get("/:id" ,catchAsync(getProductById));
route.put("/:id" ,validate(updateproductSchema), catchAsync(updateProduct));
route.delete("/:id",catchAsync(deleteProduct));

export default route;