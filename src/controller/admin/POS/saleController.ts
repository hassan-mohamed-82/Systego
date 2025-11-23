import { SaleModel, ProductSalesModel } from '../../../models/schema/admin/POS/Sale';
import { Request, Response } from 'express';
import { WarehouseModel } from "../../../models/schema/admin/Warehouse";
import { NotFound } from '../../../Errors';
import { ProductModel } from "../../../models/schema/admin/products";
import { CategoryModel } from "../../../models/schema/admin/category";
import { BrandModel } from "../../../models/schema/admin/brand";
import { VariationModel, OptionModel } from "../../../models/schema/admin/Variation";
import { CustomerModel } from '../../../models/schema/admin/POS/customer';
import { SuccessResponse } from '../../../utils/response';
import { CouponModel } from '../../../models/schema/admin/coupons';
import { TaxesModel } from '../../../models/schema/admin/Taxes';
import { DiscountModel } from '../../../models/schema/admin/Discount';
import { ProductPriceModel, ProductPriceOptionModel } from '../../../models/schema/admin/product_price';
import { PaymentModel } from '../../../models/schema/admin/POS/payment';
import { PaymentMethodModel } from '../../../models/schema/admin/payment_methods';
import { BadRequest } from '../../../Errors/BadRequest';
import { GiftCardModel } from '../../../models/schema/admin/POS/giftCard';
import { PointModel } from '../../../models/schema/admin/points';
import { BankAccountModel } from '../../../models/schema/admin/Financial_Account';



export const createSale = async (req: Request, res: Response)=> {
    const {
        customer_id,
        warehouse_id,
        currency_id,
        account_id,
        sale_status = 'pending',
        order_tax,
        order_discount,
        shipping_cost = 0,
        grand_total,
        coupon_id,
        products,
        payment_method,
        gift_card_id
    } = req.body;

    // Helper function to find product price safely
    const findProductPrice = async (item: any) => {
        const query = item.product_id
            ? { productId: item.product_id }
            : { code: item.product_code };
        const productPrice = await ProductPriceModel.findOne(query);
        if (!productPrice) {
            throw new NotFound(`Product not found for ID: ${item.product_id} or code: ${item.product_code}`);
        }
        return productPrice;
    };

    // Validate required entities
    const warehouse = await WarehouseModel.findById(warehouse_id);
    if (!warehouse) throw new NotFound("Warehouse not found");

    const customer = await CustomerModel.findById(customer_id);
    if (!customer) throw new NotFound("Customer not found");

    const paymentMethod = await PaymentMethodModel.findById(payment_method);
    if (!paymentMethod) throw new NotFound("Payment method not found");
    if (!paymentMethod.isActive) throw new BadRequest("Payment method is not active");

    if (account_id) {
        const bankAccount = await BankAccountModel.findById(account_id);
        if (!bankAccount) throw new NotFound("Bank Account not found");
        if (!bankAccount.is_default) throw new BadRequest("Bank Account is not default");
    }

    // Check if points payment
    const isPointsPayment = paymentMethod.name?.toLowerCase() === 'points' ||
                            paymentMethod.type?.toLowerCase() === 'points';

    // Handle points payment
    if (isPointsPayment) {
        const pointsConfig = await PointModel.findOne().sort({ createdAt: -1 });

        if (!pointsConfig) {
            throw new BadRequest("Points system is not configured");
        }

        const pointsRequired = Math.ceil(grand_total / pointsConfig.amount) * pointsConfig.points;

        if (!customer.total_points_earned || customer.total_points_earned < pointsRequired) {
            throw new BadRequest('Points Not enough');
        }

        await CustomerModel.findByIdAndUpdate(
            customer_id,
            {
                $inc: {
                    total_points_earned: -pointsRequired
                }
            }
        );
    }

    // Validate coupon
    if (coupon_id) {
        const coupon = await CouponModel.findById(coupon_id);
        if (!coupon) throw new NotFound("Coupon not found");
        if (coupon.available <= 0) throw new NotFound("Coupon is no longer available");
        if (new Date() > coupon.expired_date) throw new NotFound("Coupon has expired");
    }

    // Validate tax
    if (order_tax) {
        const tax = await TaxesModel.findById(order_tax);
        if (!tax) throw new NotFound("Tax not found");
        if (!tax.status) throw new BadRequest("Tax is inactive");
    }

    // Validate discount
    if (order_discount) {
        const discount = await DiscountModel.findById(order_discount);
        if (!discount) throw new NotFound("Discount not found");
        if (!discount.status) throw new BadRequest("Discount is inactive");
    }

    // Validate gift card
    if (gift_card_id) {
        const giftCard = await GiftCardModel.findById(gift_card_id);
        if (!giftCard) throw new NotFound("Gift card not found");
        if (!giftCard.isActive) throw new BadRequest("Gift card is inactive");
        if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
            throw new BadRequest("Gift card has expired");
        }
        if (giftCard.amount < grand_total) {
            throw new BadRequest("Gift card balance is insufficient for this sale");
        }
    }

    // Validate products and inventory
    for (const item of products) {
        const productPrice = await findProductPrice(item);

        if (productPrice.quantity < item.quantity) {
            throw new NotFound(`Insufficient stock for product. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
        }

        if (item.quantity <= 0) throw new BadRequest(`Invalid quantity for product`);
        if (item.price < 0) throw new BadRequest(`Invalid price for product`);
    }

    // Create sale
    const newSale = new SaleModel({
        customer_id,
        warehouse_id,
        currency_id,
        account_id,
        sale_status,
        order_tax,
        order_discount,
        shipping_cost,
        grand_total,
        coupon_id,
        gift_card_id,
        payment_method
    });

    const savedSale = await newSale.save();
    const saleId = savedSale._id;

    // Create payment record if not points payment
    if (payment_method && !isPointsPayment) {
        await PaymentModel.create([{
            sale_id: saleId,
            amount: grand_total,
            payment_method: payment_method,
            status: 'completed',
            payment_proof: null
        }]);
    }

    // Process products
    for (const item of products) {
        const productPrice = await findProductPrice(item);

        const productSale = new ProductSalesModel({
            sale_id: saleId,
            product_id: productPrice.productId,
            quantity: item.quantity,
            price: item.price,
            subtotal: item.subtotal,
            options_id: item.options_id || [],
            isGift: item.isGift || false
        });

        await productSale.save();

        // Update inventory
        await ProductPriceModel.findOneAndUpdate(
            { productId: productPrice.productId },
            { $inc: { quantity: -item.quantity } }
        );
    }

    // Update coupon availability
    if (coupon_id) {
        await CouponModel.findByIdAndUpdate(
            coupon_id,
            { $inc: { available: -1 } }
        );
    }

    // Update gift card balance
    if (gift_card_id) {
        await GiftCardModel.findByIdAndUpdate(
            gift_card_id,
            { $inc: { amount: -grand_total } }
        );
    }

    // Add points earned if not using points payment
    let pointsEarned = 0;
    if (!isPointsPayment) {
        const pointsConfig = await PointModel.findOne().sort({ createdAt: -1 });

        if (pointsConfig && pointsConfig.amount > 0 && pointsConfig.points > 0) {
            pointsEarned = Math.floor(grand_total / pointsConfig.amount) * pointsConfig.points;

            if (pointsEarned > 0) {
                await CustomerModel.findByIdAndUpdate(
                    customer_id,
                    {
                        $inc: {
                            total_points_earned: pointsEarned
                        }
                    }
                );
            }
        }
    }

    SuccessResponse(res, {
        message: "Sale created successfully",
        sale: savedSale,
        pointsEarned
    });
};


export const getSales = async (req: Request, res: Response)=> {
    const sales = await SaleModel.find()
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .populate('gift_card_id', 'code amount')
        //.populate('payment_method', 'name')
        .lean();
    SuccessResponse(res, { sales });
}

// update status sale
export const updateSaleStatus = async (req: Request, res: Response) => {
    const { saleId } = req.params;
    const { sale_status } = req.body;
    const sale = await SaleModel.findById(saleId);
    if (!sale) throw new NotFound("Sale not found");
    sale.sale_status = sale_status || sale.sale_status;
    await sale.save();
    SuccessResponse(res, { message: "Sale status updated successfully"});
}

export const getSaleById = async (req: Request, res: Response)=> {
    const { saleId } = req.params;
    const sale = await SaleModel.findById(saleId)
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .populate('gift_card_id', 'code amount')
        .lean();

    if (!sale) throw new NotFound("Sale not found");
    
    const products = await ProductSalesModel.find({ sale_id: saleId })
        .select('product_id quantity price subtotal')
        .populate('product_id', 'name')
        .lean();
    SuccessResponse(res, {sale, products });
}

export const getAllSales = async (req: Request, res: Response) => {
    const sales = await SaleModel.find()
    .select('grand_total')
    .populate('customer_id', 'name')
    SuccessResponse(res, { sales });
}

// get sales by status 
export const getSalesByStatus = async (req: Request, res: Response) => {
    const { status } = req.params;
    const sales = await SaleModel.find({ sale_status: status })
    .select('grand_total')
    .populate('customer_id', 'name')
    SuccessResponse(res, { sales });
}



