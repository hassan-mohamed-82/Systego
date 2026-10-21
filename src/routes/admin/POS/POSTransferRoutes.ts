import { Router } from "express";
import { catchAsync } from "../../../utils/catchAsync";
import { authorizePermissions } from "../../../middlewares/haspremission";
import { validate } from "../../../middlewares/validation";
import {
  createPOSTransfer,
  getPOSTransferById,
  listPOSTransfers,
  updatePOSTransferStatus,
} from "../../../controller/admin/POS/POSTransferController";
import {
  createPOSTransferSchema,
  updatePOSTransferStatusSchema,
} from "../../../validation/admin/Transfer";

const router = Router();

// GET /api/admin/pos/transfer
router.get(
  "/",
  authorizePermissions("transfer", "View"),
  catchAsync(listPOSTransfers),
);

// POST /api/admin/pos/transfer
router.post(
  "/",
  authorizePermissions("transfer", "Add"),
  validate(createPOSTransferSchema),
  catchAsync(createPOSTransfer),
);

// GET /api/admin/pos/transfer/:id
router.get(
  "/:id",
  authorizePermissions("transfer", "View"),
  catchAsync(getPOSTransferById),
);

// PUT /api/admin/pos/transfer/:id
router.put(
  "/:id",
  authorizePermissions("transfer", "Edit"),
  validate(updatePOSTransferStatusSchema),
  catchAsync(updatePOSTransferStatus),
);

export default router;
