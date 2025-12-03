import { Router } from "express";
import { generateLabelsController } from "../../controller/admin/genrateLabel";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.post(
  "/generate",
  catchAsync(generateLabelsController)
);

export default router;