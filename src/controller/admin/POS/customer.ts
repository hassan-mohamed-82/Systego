import { Request, Response } from 'express';
import { CustomerModel, CustomerGroupModel } from '../../../models/schema/admin/POS/customer';
import { BadRequest } from '../../../Errors/BadRequest';
import { NotFound } from '../../../Errors';
import { SuccessResponse } from '../../../utils/response';

// Create Customer
export const createCustomer = async (req: Request, res: Response): Promise<void> => {
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
           throw new BadRequest("Name and phone number are required");
        }

        // Check if phone number already exists
        const existingCustomer = await CustomerModel.findOne({ phone_number });
        if (existingCustomer) {
            throw new BadRequest("Customer with this phone number already exists");
        }

        // Check if email already exists (if provided)
        if (email) {
            const existingEmail = await CustomerModel.findOne({ email });
            if (existingEmail) {
                throw new BadRequest("Customer with this email already exists");
            }
        }

        // Validate customer group if provided
        if (customer_group_id) {
            const customerGroup = await CustomerGroupModel.findById(customer_group_id);
            if (!customerGroup) {
                throw new NotFound("Customer group not found");
            }
            if (!customerGroup.status) {
                throw new BadRequest("Customer group is inactive");
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

        SuccessResponse(res,{
            message: "Customer created successfully",
            customer: savedCustomer
        });

    
};

