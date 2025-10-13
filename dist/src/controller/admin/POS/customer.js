"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomer = void 0;
const customer_1 = require("../../../models/schema/admin/POS/customer");
// Create Customer
const createCustomer = async (req, res) => {
    try {
        const { name, email, phone_number, address, country, city, customer_group_id } = req.body;
        // Validate required fields
        if (!name || !phone_number) {
            res.status(400).json({
                success: false,
                message: "Name and phone number are required fields"
            });
            return;
        }
        // Check if phone number already exists
        const existingCustomer = await customer_1.CustomerModel.findOne({ phone_number });
        if (existingCustomer) {
            res.status(409).json({
                success: false,
                message: "Customer with this phone number already exists"
            });
            return;
        }
        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await customer_1.CustomerModel.findOne({ email });
            if (existingEmail) {
                res.status(409).json({
                    success: false,
                    message: "Customer with this email already exists"
                });
                return;
            }
        }
        // Validate customer group if provided
        if (customer_group_id) {
            const customerGroup = await customer_1.CustomerGroupModel.findById(customer_group_id);
            if (!customerGroup) {
                res.status(404).json({
                    success: false,
                    message: "Customer group not found"
                });
                return;
            }
            if (!customerGroup.status) {
                res.status(400).json({
                    success: false,
                    message: "Customer group is inactive"
                });
                return;
            }
        }
        // Create new customer
        const newCustomer = new customer_1.CustomerModel({
            name,
            email,
            phone_number,
            address,
            country,
            city,
            customer_group_id
        });
        const savedCustomer = await newCustomer.save();
        // Populate references for response
        await savedCustomer.populate([
            { path: 'country', select: 'name code' },
            { path: 'city', select: 'name' },
            { path: 'customer_group_id', select: 'name status' }
        ]);
        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: savedCustomer
        });
    }
    catch (error) {
        console.error("Error creating customer:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};
exports.createCustomer = createCustomer;
