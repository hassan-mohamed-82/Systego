"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomerGroup = void 0;
const customer_1 = require("../../../models/schema/admin/POS/customer");
// Create Customer Group
const createCustomerGroup = async (req, res) => {
    try {
        const { name, status = true } = req.body;
        // Validate required fields
        if (!name) {
            res.status(400).json({
                success: false,
                message: "Group name is required"
            });
            return;
        }
        // Check if group name already exists
        const existingGroup = await customer_1.CustomerGroupModel.findOne({ name });
        if (existingGroup) {
            res.status(409).json({
                success: false,
                message: "Customer group with this name already exists"
            });
            return;
        }
        // Create new customer group
        const newCustomerGroup = new customer_1.CustomerGroupModel({
            name,
            status
        });
        const savedGroup = await newCustomerGroup.save();
        res.status(201).json({
            success: true,
            message: "Customer group created successfully",
            data: savedGroup
        });
    }
    catch (error) {
        console.error("Error creating customer group:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.createCustomerGroup = createCustomerGroup;
