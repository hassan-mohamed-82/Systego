import { Router } from "express";
import {
    createRevenue,
    updateRevenue,
    getRevenues,
    getRevenueById,
    selectionRevenue,
} from "../../controller/admin/RevenueController";

const RevenueRouter = Router();

// Get selection data (categories and accounts)
RevenueRouter.get("/selection", selectionRevenue);

// Get all revenues for the authenticated admin
RevenueRouter.get("/", getRevenues);

// Get a specific revenue by ID
RevenueRouter.get("/:id", getRevenueById);

// Create a new revenue
RevenueRouter.post("/", createRevenue);

// Update a revenue
RevenueRouter.put("/:id", updateRevenue);

export default RevenueRouter;
