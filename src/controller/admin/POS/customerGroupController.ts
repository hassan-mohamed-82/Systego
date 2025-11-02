import { Request, Response } from 'express';
import { CustomerGroupModel } from '../../../models/schema/admin/POS/customer';
import { BadRequest } from '../../../Errors/BadRequest';
import { SuccessResponse } from '../../../utils/response';
import { NotFound } from '../../../Errors';
// Create Customer Group
export const createCustomerGroup = async (req: Request, res: Response) => {
        const { name, status = true } = req.body;

        // Validate required fields
        if (!name) {
            throw new BadRequest("Group name is required");
        }

        // Check if group name already exists
        const existingGroup = await CustomerGroupModel.findOne({ name });
        if (existingGroup) {
            throw new BadRequest("Customer group with this name already exists");
        }

        // Create new customer group
        const newCustomerGroup = new CustomerGroupModel({
            name,
            status
        });

        const savedGroup = await newCustomerGroup.save();

        SuccessResponse(res, {
            message: "Customer group created successfully",
            customerGroup: savedGroup
        });

    
};




