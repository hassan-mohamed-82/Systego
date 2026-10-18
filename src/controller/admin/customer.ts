import { Request, Response } from 'express';
import { CustomerModel, CustomerGroupModel } from '../../models/schema/admin/POS/customer';
import { BadRequest } from '../../Errors/BadRequest';
import { NotFound } from '../../Errors';
import { SuccessResponse } from '../../utils/response';
import { CountryModel } from '../../models/schema/admin/Country';
import mongoose from 'mongoose';
import { SaleModel, ProductSalesModel } from '../../models/schema/admin/POS/Sale';
import { PaymentModel } from '../../models/schema/admin/POS/payment';
import { ReturnModel } from '../../models/schema/admin/POS/ReturnSale';
import { OrderModel } from '../../models/schema/users/Order';

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
    const validCustomerGroupId =
        customer_group_id && customer_group_id.toString().trim() !== ""
            ? customer_group_id
            : null;

    if (validCustomerGroupId) {
        const customerGroup = await CustomerGroupModel.findById(validCustomerGroupId);
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
        country: country || (req.body as any).countryId || null,
        city: city || (req.body as any).cityId || null,
        customer_group_id: validCustomerGroupId,
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
    const updateData: any = { ...req.body };

    if (updateData.customer_group_id === "" || updateData.customer_group_id === undefined) {
        updateData.customer_group_id = null;
    } else if (updateData.customer_group_id) {
        const customerGroup = await CustomerGroupModel.findById(updateData.customer_group_id);
        if (!customerGroup) {
            throw new NotFound("Customer group not found");
        }
        if (!customerGroup.status) {
            throw new BadRequest("Customer group is inactive");
        }
    }

    if (updateData.countryId && !updateData.country) {
        updateData.country = updateData.countryId;
    }
    if (updateData.cityId && !updateData.city) {
        updateData.city = updateData.cityId;
    }

    const customer = await CustomerModel.findByIdAndUpdate(req.params.id, updateData, { new: true })
        .populate('country', 'name')
        .populate('city', 'name')
        .populate('customer_group_id', 'name status');

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
    const { ar_name, name, status } = req.body;

    if (!ar_name || !name || !status) {
        throw new BadRequest("Arabic name, name, and status are required");
    }

    // Validate if there's existing group
    const existingGroup = await CustomerGroupModel.findOne({ name });
    if (existingGroup) {
        throw new BadRequest("Customer group with this name already exists");
    }

    const group = new CustomerGroupModel({ ar_name, name, status });
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

    const customer = await CustomerModel.findById(id)
        .populate('country', 'name')
        .populate('city', 'name')
        .populate('customer_group_id', 'name status');

    if (!customer) {
        throw new NotFound("Customer not found");
    }

    const sales = await SaleModel.find({
        $or: [
            { customer_id: id },
            { Due_customer_id: id },
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

    const returnDocs = await ReturnModel.find({ customer_id: id })
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
            customer_group_id: customer.customer_group_id || null,
            customer_group: (customer.customer_group_id as any)?.name || null,
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


export const getCustomerOrders = async (req: Request, res: Response) => {
    const { id } = req.params;

    const customer = await CustomerModel.findById(id);
    if (!customer) {
        throw new NotFound("Customer not found");
    }

    const sales = await SaleModel.find({
        $or: [{ customer_id: id }, { Due_customer_id: id }],
    })
        .select('reference grand_total paid_amount remaining_amount date createdAt order_pending return_status')
        .sort({ createdAt: -1 });

    const saleIds = sales.map((s: any) => s._id);
    const productSales = saleIds.length
        ? await ProductSalesModel.find({ sale_id: { $in: saleIds } })
            .populate('product_id', 'name image')
            .populate('bundle_id', 'name')
            .lean()
        : [];
    const itemsBySale: Record<string, any[]> = {};
    productSales.forEach((ps: any) => {
        const sid = String(ps.sale_id);
        if (!itemsBySale[sid]) itemsBySale[sid] = [];
        itemsBySale[sid].push({
            _id: ps._id,
            name: ps.product_id?.name || ps.bundle_id?.name || 'Item',
            image: ps.product_id?.image,
            quantity: ps.quantity,
            price: ps.price,
            subtotal: ps.subtotal,
        });
    });

    const posOrders = sales.map((sale: any) => {
        let status = 'completed';
        if (sale.order_pending === 1) status = 'pending';
        if (sale.return_status === 'full') status = 'returned';
        else if (sale.return_status === 'partial') status = 'partially_returned';
        return {
            _id: sale._id,
            source: 'pos',
            reference: sale.reference,
            total: sale.grand_total,
            paid: sale.paid_amount,
            remaining: sale.remaining_amount,
            date: sale.date || sale.createdAt,
            status,
            items: itemsBySale[String(sale._id)] || [],
        };
    });

    const onlineOrders = await OrderModel.find({ user: id })
        .populate('cartItems.product', 'name image')
        .select('reference totalOrderPrice totalPriceAfterDiscount status createdAt cartItems')
        .sort({ createdAt: -1 });

    const onlineMapped = onlineOrders.map((o: any) => {
        const total = Number(o.totalPriceAfterDiscount || o.totalOrderPrice || 0);
        return {
            _id: o._id,
            source: 'online',
            reference: o.reference,
            total,
            paid: null,
            remaining: null,
            date: o.createdAt,
            status: o.status || 'pending',
            items: (o.cartItems || []).map((ci: any) => ({
                _id: ci._id,
                name: ci.product?.name || 'Item',
                image: ci.product?.image,
                quantity: ci.quantity,
                price: ci.price,
                subtotal: (ci.price || 0) * (ci.quantity || 0),
            })),
        };
    });

    const orders = [...posOrders, ...onlineMapped].sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    const statusCounts: Record<string, number> = {};
    const statusTotals: Record<string, number> = {};
    let pendingTotal = 0;
    const pendingOrders: any[] = [];
    orders.forEach((o) => {
        statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
        statusTotals[o.status] = (statusTotals[o.status] || 0) + Number(o.total || 0);
        if (o.status === 'pending') {
            pendingTotal += Number(o.total || 0);
            pendingOrders.push({ _id: o._id, reference: o.reference, source: o.source, total: o.total, date: o.date, items: o.items });
        }
    });

    SuccessResponse(res, {
        message: 'Customer orders fetched successfully',
        customer: { _id: customer._id, name: customer.name },
        orders,
        statusCounts,
        statusTotals,
        pendingTotal,
        pendingOrders,
        total: orders.length,
    });
};

export const getCustomersWithOrders = async (req: Request, res: Response) => {
    const customers = await CustomerModel.find()
        .populate('country', 'name')
        .populate('city', 'name')
        .populate('customer_group_id', 'name status');

    const sales = await SaleModel.find().select('customer_id Due_customer_id reference grand_total paid_amount remaining_amount date createdAt order_pending return_status');
    const onlineOrders = await OrderModel.find().select('user reference totalOrderPrice totalPriceAfterDiscount status createdAt');

    const byCustomer: Record<string, any[]> = {};
    const push = (cid: string, order: any) => {
        if (!cid) return;
        if (!byCustomer[cid]) byCustomer[cid] = [];
        byCustomer[cid].push(order);
    };

    sales.forEach((sale: any) => {
        let status = 'completed';
        if (sale.order_pending === 1) status = 'pending';
        if (sale.return_status === 'full') status = 'returned';
        else if (sale.return_status === 'partial') status = 'partially_returned';
        const order = {
            _id: sale._id,
            source: 'pos',
            reference: sale.reference,
            total: sale.grand_total,
            paid: sale.paid_amount,
            remaining: sale.remaining_amount,
            date: sale.date || sale.createdAt,
            status,
        };
        if (sale.customer_id) push(String(sale.customer_id), order);
        if (sale.Due_customer_id && sale.Due_customer_id !== sale.customer_id) push(String(sale.Due_customer_id), order);
    });

    onlineOrders.forEach((o: any) => {
        if (!o.user) return;
        push(String(o.user), {
            _id: o._id,
            source: 'online',
            reference: o.reference,
            total: Number(o.totalPriceAfterDiscount || o.totalOrderPrice || 0),
            paid: null,
            remaining: null,
            date: o.createdAt,
            status: o.status || 'pending',
        });
    });

    const result = customers.map((c: any) => {
        const orders = (byCustomer[String(c._id)] || []).sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        );
        const statusCounts: Record<string, number> = {};
        const statusTotals: Record<string, number> = {};
        let pendingTotal = 0;
        const pendingOrders: any[] = [];
        orders.forEach((o) => {
            statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;
            statusTotals[o.status] = (statusTotals[o.status] || 0) + Number(o.total || 0);
            if (o.status === 'pending') {
                pendingTotal += Number(o.total || 0);
                pendingOrders.push({ _id: o._id, reference: o.reference, source: o.source, total: o.total, date: o.date });
            }
        });
        return {
            ...c.toObject(),
            orders,
            statusCounts,
            statusTotals,
            pendingTotal,
            pendingOrders,
            totalOrders: orders.length,
        };
    });

    SuccessResponse(res, {
        message: 'Customers with orders fetched successfully',
        customers: result,
    });
};
