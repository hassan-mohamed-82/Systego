import { Request, Response } from 'express';
import { CustomerModel, CustomerGroupModel } from '../../../models/schema/admin/POS/customer';

// Create Customer
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
    try {
        const {
            name,
            email,
            phone_number,
            address,
            country,
            city,
            customer_group_id
        } = req.body;

        // Validate required fields
        if (!name || !phone_number) {
            res.status(400).json({
                success: false,
                message: "Name and phone number are required fields"
            });
            return;
        }

        // Check if phone number already exists
        const existingCustomer = await CustomerModel.findOne({ phone_number });
        if (existingCustomer) {
            res.status(409).json({
                success: false,
                message: "Customer with this phone number already exists"
            });
            return;
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await CustomerModel.findOne({ email });
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
            const customerGroup = await CustomerGroupModel.findById(customer_group_id);
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
        const newCustomer = new CustomerModel({
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

    } catch (error: any) {
        console.error("Error creating customer:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error",
            error: error.message
        });
    }
};

