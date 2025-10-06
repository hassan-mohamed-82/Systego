import { Request, Response } from "express";
import { TransferModel } from "../../models/schema/admin/Transfer.js";
import { WarehouseModel } from "../../models/schema/admin/Warehouse.js";
import { BadRequest } from "../../Errors/BadRequest.js";
import { NotFound } from "../../Errors/index.js";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse.js";
import { SuccessResponse } from "../../utils/response.js";

