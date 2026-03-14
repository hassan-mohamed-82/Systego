import { Request, Response } from 'express';
import { CustomerModel, CustomerGroupModel } from '../../models/schema/admin/POS/customer';
import { BadRequest } from '../../Errors/BadRequest';
import { NotFound } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { CountryModel } from '../../models/schema/admin/Country';
import mongoose from 'mongoose';
import { SaleModel } from '../../models/schema/admin/POS/Sale';
import { PaymentModel } from '../../models/schema/admin/POS/payment';
import { ReturnModel } from '../../models/schema/admin/POS/ReturnSale';

// Create Customer
export const createCustomer = async (req: Request, res: Response) => {
    const {
        name,
        email,
        phone_number,
        address,
        country,
        city,
        customer_group_id,
        is_Due,
        amount_Due,
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
        customer_group_id,
        is_Due,
        amount_Due,
    });

    const savedCustomer = await newCustomer.save();

    // Populate references for response
    await savedCustomer.populate([
        { path: 'country', select: 'name code' },
        { path: 'city', select: 'name' },
        { path: 'customer_group_id', select: 'name status' }
    ]);

    SuccessResponse(res, {
        message: "Customer created successfully",
        customer: savedCustomer
    });


};


export const getCustomers = async (req: Request, res: Response) => {
    const customers = await CustomerModel.find().populate('country', 'name').populate('city', 'name').populate('customer_group_id', 'name status');
    SuccessResponse(res, {
        message: "Customers fetched successfully",
        customers
    });
}
export const getCustomerById = async (req: Request, res: Response) => {
    const customer = await CustomerModel.findById(req.params.id).populate('country', 'name').populate('city', 'name').populate('customer_group_id', 'name status');
    if (!customer) {
        throw new NotFound("Customer not found");
    }
    SuccessResponse(res, {
        message: "Customer fetched successfully",
        customer
    });
}

export const getDueCustomers = async (req: Request, res: Response) => {
    const customers = await CustomerModel.find({ is_Due: true });
    SuccessResponse(res, {
        message: "Due customers fetched successfully",
        customers
    });
}

export const updateCustomer = async (req: Request, res: Response) => {
    const customer = await CustomerModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!customer) {
        throw new NotFound("Customer not found");
    }
    SuccessResponse(res, {
        message: "Customer updated successfully",
        customer
    });
}

export const deleteCustomer = async (req: Request, res: Response) => {
    const customer = await CustomerModel.findByIdAndDelete(req.params.id);
    if (!customer) {
        throw new NotFound("Customer not found");
    }
    SuccessResponse(res, {
        message: "Customer deleted successfully",
        customer
    });
}

export const customerandDuecustomers = async (req: Request, res: Response) => {
    const customers = await CustomerModel.find();
    const dueCustomers = await CustomerModel.find({ is_Due: true });
    SuccessResponse(res, {
        message: "Customers fetched successfully",
        customers,
        dueCustomers
    });
}

export const getallgroups = async (req: Request, res: Response) => {
    // Get all customer groups
    const customerGroups = await CustomerGroupModel.find();

    // For each group, find all customers that belong to it
    const groupsWithCustomers = await Promise.all(
        customerGroups.map(async (group) => {
            const customers = await CustomerModel.find({ customer_group_id: group._id })
                .populate([
                    { path: 'country', select: 'name code' },
                    { path: 'city', select: 'name' }
                ]);

            return {
                _id: group._id,
                name: group.name,
                status: group.status,
                createdAt: group.createdAt,
                updatedAt: group.updatedAt,
                customers: customers
            };
        })
    );

    SuccessResponse(res, {
        message: "Customer groups fetched successfully",
        groups: groupsWithCustomers
    });
}

export const getgroupbyid = async (req: Request, res: Response) => {
    const group = await CustomerGroupModel.findById(req.params.id);
    if (!group) {
        throw new NotFound("Customer group not found");
    }
    SuccessResponse(res, {
        message: "Customer group fetched successfully",
        group
    });
}

export const updategroup = async (req: Request, res: Response) => {
    const group = await CustomerGroupModel.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!group) {
        throw new NotFound("Customer group not found");
    }
    SuccessResponse(res, {
        message: "Customer group updated successfully",
        group
    });
}

export const deletegroup = async (req: Request, res: Response) => {
    const group = await CustomerGroupModel.findByIdAndDelete(req.params.id);
    if (!group) {
        throw new NotFound("Customer group not found");
    }
    SuccessResponse(res, {
        message: "Customer group deleted successfully",
        group
    });
}

export const creategroup = async (req: Request, res: Response) => {
    const { name, status } = req.body;

    if (!name || !status) {
        throw new BadRequest("Name and status are required");
    }

    // Validate if there's existing group
    const existingGroup = await CustomerGroupModel.findOne({ name });
    if (existingGroup) {
        throw new BadRequest("Customer group with this name already exists");
    }


    const group = new CustomerGroupModel({ name, status });
    await group.save();

    SuccessResponse(res, {
        message: "Customer group created successfully",
        group
    });
}

export const getCountriesWithCities = async (req: Request, res: Response) => {
    const countries = await CountryModel.find().populate("cities");

    SuccessResponse(res, {
        message: "Countries with cities fetched successfully",
        countries,
    });
};

export const getCustomerSinglePageData = async (req: Request, res: Response) => {
    const { id } = req.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        throw new BadRequest("Valid customer id is required");
    }

    const customer = await CustomerModel.findById(id)
        .populate('country', 'name')
        .populate('city', 'name');

    if (!customer) {
        throw new NotFound("Customer not found");
    }

    const customerObjectId = new mongoose.Types.ObjectId(id);

    const sales = await SaleModel.find({
        $or: [
            { customer_id: customerObjectId },
            { Due_customer_id: customerObjectId },
        ],
    })
        .select('reference grand_total paid_amount remaining_amount date createdAt')
        .sort({ createdAt: -1 });

    const saleIds = sales.map((sale) => sale._id);

    const totalOrders = sales.length;
    const totalRevenue = sales.reduce((sum, sale) => sum + Number(sale.grand_total || 0), 0);
    const totalPaid = sales.reduce((sum, sale) => sum + Number(sale.paid_amount || 0), 0);
    const outstandingBalance = sales.reduce((sum, sale) => sum + Number(sale.remaining_amount || 0), 0);
    const lastOrderDate = sales.length > 0 ? sales[0].date || sales[0].createdAt : null;

    const paymentDocs = saleIds.length
        ? await PaymentModel.find({ sale_id: { $in: saleIds } })
            .populate('sale_id', 'reference')
            .populate('financials.account_id', 'name')
            .sort({ createdAt: -1 })
        : [];

    const paymentHistory = paymentDocs.flatMap((payment: any) => {
        const lines = Array.isArray(payment.financials) ? payment.financials : [];

        return lines.map((line: any, index: number) => {
            const accountName = line?.account_id?.name || 'Unknown';

            return {
                payment_id: payment._id,
                date: payment.createdAt,
                amount: Number(line?.amount || 0),
                payment_method: accountName,
                reference_number: payment?.sale_id?.reference || null,
                notes: payment.payment_proof || '',
                line_no: index + 1,
            };
        });
    });

    const returnDocs = await ReturnModel.find({ customer_id: customerObjectId })
        .select('reference sale_reference date items total_amount createdAt')
        .sort({ createdAt: -1 });

    const returns = returnDocs.map((ret: any) => ({
        return_number: ret.reference,
        order_number: ret.sale_reference,
        date: ret.date || ret.createdAt,
        items_returned: Array.isArray(ret.items)
            ? ret.items.reduce((sum: number, item: any) => sum + Number(item.returned_quantity || 0), 0)
            : 0,
        refund_amount: Number(ret.total_amount || 0),
        status: 'completed',
    }));

    return SuccessResponse(res, {
        message: "Customer single page data fetched successfully",
        customer: {
            customer_name: customer.name,
            phone_number: customer.phone_number,
            email: customer.email || null,
            address: customer.address || null,
            city: (customer.city as any)?.name || null,
            country: (customer.country as any)?.name || null,
            cards: {
                total_orders: totalOrders,
            },
            financial_summary: {
                total_revenue: totalRevenue,
                total_paid: totalPaid,
                outstanding_balance: outstandingBalance,
                last_order_date: lastOrderDate,
            },
            payment_history: paymentHistory,
            returns,
        },
    });
};

