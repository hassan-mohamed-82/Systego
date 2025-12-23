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
import { authorizePermissions } from "../../middlewares/haspremission";

const router = express.Router();

router.post("/",authorizePermissions("Units","Add"),catchAsync(createUnit));
router.get("/",authorizePermissions("Units","View"),catchAsync(getUnits));
router.get("/active",authorizePermissions("Units","View"),catchAsync(getActiveUnits));
router.get("/base",authorizePermissions("Units","View"),catchAsync(getBaseUnits));
router.get("/:id",authorizePermissions("Units","View"),catchAsync(getUnitById));
router.put("/:id",authorizePermissions("Units","Edit"),catchAsync(updateUnit));
router.delete("/:id",authorizePermissions("Units","Delete"),catchAsync(deleteUnit));
router.post("/delete-many",authorizePermissions("Units","Delete"),catchAsync(deleteManyUnits));
router.post("/convert",authorizePermissions("Units","Edit"),catchAsync(convertUnit));

export default router;
