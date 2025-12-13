import { Router } from "express";
import { generateLabelsController , getAvailableLabelSizes} from "../../controller/admin/genrateLabel";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const router = Router();

router.get(
  "/sizes",
  authorizePermissions("product","View"), 
  catchAsync(getAvailableLabelSizes)
);

router.post(
  "/generate",
  authorizePermissions("product","Add"),
  catchAsync(generateLabelsController)
);

export default router;