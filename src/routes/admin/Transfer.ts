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

const route = Router();

route.post("/", validate(createTransferSchema), catchAsync(createTransfer));
route.get("/get/:warehouseId", catchAsync(getTransfersForWarehouse));
route.get("/gettransferin/:warehouseId", catchAsync(gettransferin));
route.get("/gettransferout/:warehouseId", catchAsync(gettransferout));
route.put("/:id", validate(updateTransferStatusSchema), catchAsync(updateTransferStatus));
route.get("/:id", catchAsync(getTransferById));
route.get("/", catchAsync(getalltransfers));

export default route;