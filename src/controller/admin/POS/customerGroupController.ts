import { Request, Response } from 'express';
import { CustomerGroupModel } from '../../../models/schema/admin/POS/customer';

// Create Customer Group
export const createCustomerGroup = async (req: Request, res: Response): Promise<void> => {
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
        const existingGroup = await CustomerGroupModel.findOne({ name });
        if (existingGroup) {
            res.status(409).json({
                success: false,
                message: "Customer group with this name already exists"
            });
            return;
        }

        // Create new customer group
        const newCustomerGroup = new CustomerGroupModel({
            name,
            status
        });

        const savedGroup = await newCustomerGroup.save();

        res.status(201).json({
            success: true,
            message: "Customer group created successfully",
            data: savedGroup
        });

    } catch (error: any) {
        console.error("Error creating customer group:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};




