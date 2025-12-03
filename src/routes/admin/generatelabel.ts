import { Router } from "express";
import { generateLabelsController , getAvailableLabelSizes} from "../../controller/admin/genrateLabel";
import { catchAsync } from "../../utils/catchAsync";
const router = Router();

router.get(
  "/sizes",
  catchAsync(getAvailableLabelSizes)
);

router.post(
  "/generate",
  catchAsync(generateLabelsController)
);

export default router;