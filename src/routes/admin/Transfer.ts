import { Router } from "express";
import { validate } from "../../middlewares/validation";
import { catchAsync } from "../../utils/catchAsync";
import {
    getTransferById,createTransfer,getTransfersForWarehouse,gettransferin,gettransferout,updateTransferStatus
    ,getalltransfers
} from "../../controller/admin/Transfer";
import {
    createTransferSchema,updateTransferStatusSchema
} from "../../validation/admin/Transfer"

import {authorizePermissions} from "../../middlewares/haspremission"

const route = Router();

route.post("/",authorizePermissions("transfer","Add") ,validate(createTransferSchema), catchAsync(createTransfer));
route.get("/get/:warehouseId",  authorizePermissions("transfer","View"), catchAsync(getTransfersForWarehouse));
route.get("/gettransferin/:warehouseId",authorizePermissions("transfer","View"), catchAsync(gettransferin));
route.get("/gettransferout/:warehouseId",authorizePermissions("transfer","View"), catchAsync(gettransferout));
route.put("/:id",authorizePermissions("transfer","Edit"), validate(updateTransferStatusSchema), catchAsync(updateTransferStatus));
route.get("/:id",authorizePermissions("transfer","View"), catchAsync(getTransferById));
route.get("/",authorizePermissions("transfer","View"), catchAsync(getalltransfers));

export default route;