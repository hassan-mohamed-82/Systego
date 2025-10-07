import { Router } from "express";
import { validate } from "../../middlewares/validation";
import { catchAsync } from "../../utils/catchAsync";
import {
    getTransferById,createTransfer,getTransfersForWarehouse,gettransferin,gettransferout,markTransferAsReceived
} from "../../controller/admin/Transfer";
import {
    createTransferSchema,markTransferAsReceivedSchema
} from "../../validation/admin/Transfer"

const route = Router();

route.post("/", validate(createTransferSchema), catchAsync(createTransfer));
route.get("/get/:warehouseId", catchAsync(getTransfersForWarehouse));
route.get("/gettransferin/:warehouseId", catchAsync(gettransferin));
route.get("/gettransferout/:warehouseId", catchAsync(gettransferout));
route.put("/markTransferAsReceived", validate(markTransferAsReceivedSchema), catchAsync(markTransferAsReceived));
route.get("/:id", catchAsync(getTransferById));
export default route;