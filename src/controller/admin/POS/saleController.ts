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


export const createSale = async (req: Request, res: Response): Promise<void> => {
    const {
        customer_id,
        warehouse_id,
        currency_id,
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


    const warehouse = await WarehouseModel.findById(warehouse_id);
    if (!warehouse) throw new NotFound("Warehouse not found");

    const customer = await CustomerModel.findById(customer_id);
    if (!customer) throw new NotFound("Customer not found");
  
        const paymentMethod = await PaymentMethodModel.findById(payment_method);
        if (!paymentMethod) throw new NotFound("Payment method not found");
        if (!paymentMethod.isActive) throw new BadRequest("Payment method is not active");
    

    // Validate coupon if provided
    if (coupon_id) {
        const coupon = await CouponModel.findById(coupon_id);
        if (!coupon) {
            throw new NotFound("Coupon not found");
        }
        if (coupon.available <= 0) {
            throw new NotFound("Coupon is no longer available");
        }
        if (new Date() > coupon.expired_date) {
            throw new NotFound("Coupon has expired");
        }
    }

    // Validate tax if provided
    if (order_tax) {
        const tax = await TaxesModel.findById(order_tax);
        if (!tax) throw new NotFound("Tax not found");
        if (!tax.status) throw new BadRequest("Tax is inactive");
    }

    // Validate discount if provided
    if (order_discount) {
        const discount = await DiscountModel.findById(order_discount);
        if (!discount) throw new NotFound("Discount not found");
        if (!discount.status) throw new BadRequest("Discount is inactive");
    }


for (const item of products) {
    // const product = await ProductModel.findById(item.product_id);
    // if (!product) throw new NotFound(`Product with ID ${item.product_id} not found`);
    
    // Check if product has options (using ProductPrice)
    if (item.options_id) {
      const productProductPriceOption = await ProductPriceOptionModel.find({
        option_id: item.options_id
      })

      if (!productProductPriceOption) {
        throw new NotFound(`Product price option with ID ${item.options_id} not found for product ${item.product_id}`);
      }

        const productPrice = await ProductPriceModel.findOne({ 
            productId: item.product_id 
        });
        if (!productPrice) throw new NotFound(`Product price option with ID ${item.options_id} not found for product ${item.product_id}`);
        
        
        // Check if enough stock is available
        if (productPrice.quantity < item.quantity) {
            throw new NotFound(`Insufficient stock for product option ${item.options_id}. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
        }
    } else {
        // For products without options
        const productPrice = await ProductPriceModel.findOne({ 
            productId: item.product_id 
        });
        if (!productPrice) throw new NotFound(`Product price not found for product ID ${item.product_id}`);
        
        if (productPrice.quantity < item.quantity) {
            throw new NotFound(`Insufficient stock for product ID ${item.product_id}. Available: ${productPrice.quantity}, Requested: ${item.quantity}`);
        }
    }

    if (item.quantity <= 0) throw new NotFound(`Invalid quantity for product ID ${item.product_id}`);
    if (item.price < 0) throw new NotFound(`Invalid price for product ID ${item.product_id}`);
}
           
          if(gift_card_id) {
            const giftCard = await GiftCardModel.findById(gift_card_id);
            if (!giftCard) {
                throw new NotFound("Gift card not found");
            }
            if (!giftCard.isActive) {
                throw new BadRequest("Gift card is inactive");
            }

            if (giftCard.expiration_date && new Date() > giftCard.expiration_date) {
                throw new BadRequest("Gift card has expired");
            }
          if(giftCard.amount < grand_total) {
            throw new BadRequest("Gift card balance is insufficient for this sale");
          }
        }

        const newSale = new SaleModel({
            customer_id,
            warehouse_id,
            currency_id,
            sale_status,
            order_tax,
            order_discount,
            shipping_cost,
            grand_total,
            coupon_id,
            gift_card_id
        });

        const savedSale = await newSale.save();
        const saleId = savedSale._id;


        if (payment_method) {
            
            await PaymentModel.create([{
                sale_id: saleId,
                amount: grand_total,
                payment_method: payment_method,
                status: 'completed',
                payment_proof: null
            }]);
        }

        
        for (const item of products) {
            const productSale = new ProductSalesModel({
                sale_id: saleId,
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                subtotal: item.subtotal,
                options_id: item.options_id
            });

            await productSale.save();
            
          
            if (item.options_id) {
             
                await ProductPriceModel.findOneAndUpdate(
                    { 
                        productId: item.product_id,
                        _id: item.options_id 
                    },
                    { 
                        $inc: { quantity: -item.quantity } 
                    },
                );
            } else {
                // Update default product price
                await ProductPriceModel.findOneAndUpdate(
                    { productId: item.product_id },
                    { 
                        $inc: { quantity: -item.quantity } 
                    },
                );
            }
        }

        // Update coupon availability if used
        if (coupon_id) {
            await CouponModel.findByIdAndUpdate(
                coupon_id,
                { $inc: { available: -1 } }
            );
        }

        SuccessResponse(res, { message: "Sale created successfully", savedSale });

    }

export const getSales = async (req: Request, res: Response): Promise<void> => {
    const sales = await SaleModel.find()
        .populate('customer_id', 'name email phone_number')
        .populate('warehouse_id', 'name location')
        .populate('currency_id', 'code symbol')
        .populate('order_tax', 'name rate')
        .populate('order_discount', 'name rate')
        .populate('coupon_id', 'code discount_amount')
        .lean();
    SuccessResponse(res, { sales });
}


