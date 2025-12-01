import { Router } from "express";
import { createRecipe, getRecipesByProductId,selecttion, 
    deleteRecipe, updateRecipe,getAllRecipes ,produceProductFromRecipe,
    checkProductRecipe,getAllProductions } from "../../controller/admin/Recipe";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post("/", catchAsync(createRecipe));
router.get("/:productId", catchAsync(getRecipesByProductId));
router.get("/productions", catchAsync(getAllProductions));
router.get("/", catchAsync(getAllRecipes));
router.delete("/:id", catchAsync(deleteRecipe));
router.put("/:id", catchAsync(updateRecipe));
router.get("/check/:productId", catchAsync(checkProductRecipe));
router.post("/produce", catchAsync(produceProductFromRecipe));
router.get("/selection", catchAsync(selecttion));
export default router;
