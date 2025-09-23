import { Router } from "express";
import {createProduct,getProductById,getProducts,updateProduct,deleteProduct,generateBarcodeImageController, generateProductCode
} from "../controller/products"
import {validate} from"../middlewares/validation";
import {createproductSchema,updateproductSchema} from "../validation/products"
import { catchAsync } from "../utils/catchAsync";
import { authenticated } from "../middlewares/authenticated";

const route = Router();

route.post("/" ,validate(createproductSchema), catchAsync(createProduct));
route.get("/",catchAsync(getProducts));
route.get("/:id" ,catchAsync(getProductById));
route.put("/:id" ,validate(updateproductSchema), catchAsync(updateProduct));
route.delete("/:id",catchAsync(deleteProduct));
route.get("/generate-barcode/:id", catchAsync(generateBarcodeImageController));
route.get("/products/generate-code", generateProductCode);



export default route;