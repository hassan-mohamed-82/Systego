import express from "express";
import { catchAsync } from "../../utils/catchAsync";
import { 
  createUnit, 
  getUnits, 
  getActiveUnits,
  getBaseUnits,
  getUnitById, 
  updateUnit, 
  deleteUnit,
  deleteManyUnits,
  convertUnit
} from "../../controller/admin/units";

const router = express.Router();

router.post("/", catchAsync(createUnit));
router.get("/", catchAsync(getUnits));
router.get("/active", catchAsync(getActiveUnits));
router.get("/base", catchAsync(getBaseUnits));
router.get("/:id", catchAsync(getUnitById));
router.put("/:id", catchAsync(updateUnit));
router.delete("/:id", catchAsync(deleteUnit));
router.post("/delete-many", catchAsync(deleteManyUnits));
router.post("/convert", catchAsync(convertUnit));

export default router;
