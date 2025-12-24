import { Router } from "express";
import {
    createRevenue,
    updateRevenue,
    getRevenues,
    getRevenueById,
    selectionRevenue,
} from "../../controller/admin/RevenueController";
import { catchAsync } from "../../utils/catchAsync";
import {authorizePermissions} from "../../middlewares/haspremission"

const Route = Router();


// Create a new revenue
Route.post("/", authorizePermissions("Revenue","Add"), catchAsync(createRevenue));

// Get selection data (categories and accounts)
Route.get("/selection", authorizePermissions("Revenue","View"), catchAsync(selectionRevenue));

// Get all revenues for the authenticated admin
Route.get("/", authorizePermissions("Revenue","View"), catchAsync(getRevenues));

// Get a specific revenue by ID
Route.get("/:id", authorizePermissions("Revenue","View"), catchAsync(getRevenueById));

// Update a revenue
Route.put("/:id", authorizePermissions("Revenue","Edit"), catchAsync(updateRevenue));

export default Route;
