import { Router } from "express";
import {
    createDiscount,
    getAllDiscounts,
    updateDiscount,
    deleteDiscount,
    getDiscountById
} from "../../controller/admin/discount";
import { catchAsync } from "../../utils/catchAsync";

const router = Router();

router.post("/", catchAsync(createDiscount));
router.get("/", catchAsync(getAllDiscounts));
router.get("/:id", catchAsync(getDiscountById));
router.put("/:id", catchAsync(updateDiscount));
router.delete("/:id", catchAsync(deleteDiscount));

export default router;