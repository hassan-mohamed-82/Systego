"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createCustomerGroup = void 0;
const customer_1 = require("../../../models/schema/admin/POS/customer");
const BadRequest_1 = require("../../../Errors/BadRequest");
const response_1 = require("../../../utils/response");
// Create Customer Group
const createCustomerGroup = async (req, res) => {
    const { name, status = true } = req.body;
    // Validate required fields
    if (!name) {
        throw new BadRequest_1.BadRequest("Group name is required");
    }
    // Check if group name already exists
    const existingGroup = await customer_1.CustomerGroupModel.findOne({ name });
    if (existingGroup) {
        throw new BadRequest_1.BadRequest("Customer group with this name already exists");
    }
    // Create new customer group
    const newCustomerGroup = new customer_1.CustomerGroupModel({
        name,
        status
    });
    const savedGroup = await newCustomerGroup.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Customer group created successfully",
        customerGroup: savedGroup
    });
};
exports.createCustomerGroup = createCustomerGroup;
