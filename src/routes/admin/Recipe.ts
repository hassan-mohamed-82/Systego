import { Router } from "express";
import { createRecipe, getRecipesByProductId,selecttion, 
    deleteRecipe, updateRecipe,getAllRecipes ,produceProductFromRecipe,
    checkProductRecipe,getAllProductions } from "../../controller/admin/Recipe";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const router = Router();

router.post("/",authorizePermissions("recipe","Add"), catchAsync(createRecipe));
router.get("/:productId",authorizePermissions("recipe","View"), catchAsync(getRecipesByProductId));
router.get("/productions",authorizePermissions("recipe","View"), catchAsync(getAllProductions));
router.get("/",authorizePermissions("recipe","View"), catchAsync(getAllRecipes));
router.delete("/:id",authorizePermissions("recipe","Delete"), catchAsync(deleteRecipe));
router.put("/:id",authorizePermissions("recipe","Edit"), catchAsync(updateRecipe));
router.get("/check/:productId",authorizePermissions("recipe","View"), catchAsync(checkProductRecipe));
router.post("/produce",authorizePermissions("recipe","Add"), catchAsync(produceProductFromRecipe));
router.get("/selection",authorizePermissions("recipe","View"), catchAsync(selecttion));
export default router;
