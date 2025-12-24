import { Request,Response } from "express";
import { BookingModel } from "../../models/schema/admin/Booking";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { CustomerModel } from "../../models/schema/admin/POS/customer";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { ProductModel } from "../../models/schema/admin/products";
import { CategoryModel } from "../../models/schema/admin/category";
import { ProductPriceModel, ProductPriceOptionModel } from "../../models/schema/admin/product_price";
import { ProductSalesModel, SaleModel } from "../../models/schema/admin/POS/Sale";

export const getAllBookings = async(req:Request,res:Response)=>{
const pendingBookings = await BookingModel.find({status:"pending"})
const failerBookings = await BookingModel.find({status:"failer"})
const payBookings = await BookingModel.find({status:"pay"})
SuccessResponse(res,{message:"Bookings retrieved successfully",pendingBookings,failerBookings,payBookings})

}

export const getBookingById = async(req:Request,res:Response)=>{
const {id} = req.params
const booking = await BookingModel.findById(id)
if(!booking) throw new NotFound("Booking not found")
SuccessResponse(res,{message:"Booking retrieved successfully",booking})
}

export const createbooking=async(req:Request,res:Response)=>{
    const {number_of_days,deposit,CustmerId,WarehouseId,ProductId,CategoryId,option_id} = req.body
    if(!number_of_days || !deposit || !CustmerId || !WarehouseId || !ProductId || !CategoryId || !option_id) throw new BadRequest("All fields are required")
        const existcustmer = await CustomerModel.findById(CustmerId)
        if(!existcustmer) throw new BadRequest("Customer not found")
         const existwarehouse = await WarehouseModel.findById(WarehouseId)
        if(!existwarehouse) throw new BadRequest("Warehouse not found")
          const existproduct = await ProductModel.findById(ProductId)
        if(!existproduct) throw new BadRequest("Product not found")   
        const existQty = existproduct.quantity ?? 0;
        if (existQty < 1) throw new BadRequest("Product out of stock");
    const booking = await BookingModel.create({
      number_of_days,
      deposit,
      CustmerId,
      WarehouseId,
      ProductId,
      CategoryId,
      option_id,
      status: "pending"
    });
    existproduct.quantity = existQty - 1;
    await existproduct.save(); 
    const option = await ProductPriceOptionModel.findById(option_id)
    if(!option) throw new BadRequest("Option not found")
       const productprice = option.product_price_id
       if(!productprice) throw new BadRequest("Product price not found")
       const existproductprice = await ProductPriceModel.findById(productprice)
       if(!existproductprice) throw new BadRequest("Product price not found")
      existproductprice.quantity=existproductprice.quantity-1
       existproductprice.save()
     if(existproductprice.quantity<1) throw new BadRequest("Product price out of stock")
    SuccessResponse(res,{message:"Booking created successfully",booking})

}



export const updateBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    number_of_days,
    deposit,
    CustmerId,
    WarehouseId,
    ProductId,
    CategoryId,
    option_id,
    status,
  } = req.body;

  const booking = await BookingModel.findById(id);
  if (!booking) throw new NotFound("Booking not found");

  // ✅ Validate optional relations if provided
  if (CustmerId) {
    const existcustmer = await CustomerModel.findById(CustmerId);
    if (!existcustmer) throw new BadRequest("Customer not found");
  }

  if (WarehouseId) {
    const existwarehouse = await WarehouseModel.findById(WarehouseId);
    if (!existwarehouse) throw new BadRequest("Warehouse not found");
  }

  if (ProductId) {
    const existproduct = await ProductModel.findById(ProductId);
    if (!existproduct) throw new BadRequest("Product not found");
  }

  if (CategoryId) {
    const existcategory = await CategoryModel.findById(CategoryId);
    if (!existcategory) throw new BadRequest("Category not found");
  }

  // ✅ Validate option and price if provided
  if (option_id) {
    const option = await ProductPriceOptionModel.findById(option_id);
    if (!option) throw new BadRequest("Option not found");
    const productprice = option.product_price_id;
    const existproductprice = await ProductPriceModel.findById(productprice);
    if (!existproductprice) throw new BadRequest("Product price not found");
  }

  // ✅ Update allowed fields
  if (number_of_days !== undefined) booking.number_of_days = number_of_days;
  if (deposit !== undefined) booking.deposit = deposit;
  if (CustmerId !== undefined) booking.CustmerId = CustmerId;
  if (WarehouseId !== undefined) booking.WarehouseId = WarehouseId;
  if (ProductId !== undefined) booking.ProductId = ProductId;
  if (CategoryId !== undefined) booking.CategoryId = CategoryId;
  if (option_id !== undefined) (booking as any).option_id = option_id;
  if (status !== undefined) booking.status = status;

  await booking.save();

  SuccessResponse(res, {
    message: "Booking updated successfully",
    booking,
  });
};

export const deleteBooking = async (req: Request, res: Response) => {
  const { id } = req.params;

  // ✅ ابحث عن الحجز أولاً
  const booking = await BookingModel.findById(id);
  if (!booking) throw new NotFound("Booking not found");

  // ❌ لا يمكن حذف إلا الحجوزات التي حالتها pending
  if (booking.status !== "pending") {
    throw new BadRequest("Only pending bookings can be deleted");
  }

  // ✅ استرجاع كمية المنتج
  if (booking.ProductId) {
    const product = await ProductModel.findById(booking.ProductId);
    if (product) {
      product.quantity = (product.quantity ?? 0) + 1;
      await product.save();
    }
  }

  // ✅ استرجاع كمية الـ product_price (إن وجدت)
  if (booking.option_id) {
    const option = await ProductPriceOptionModel.findById(booking.option_id);
    if (option) {
      const price = await ProductPriceModel.findById(option.product_price_id);
      if (price) {
        price.quantity += 1;
        await price.save();
      }
    }
  }

  // ✅ حذف الحجز نفسه
  await booking.deleteOne();

  SuccessResponse(res, {
    message: "Booking deleted successfully and quantities restored",
  });
};


export const convertToSale = async (req: Request, res: Response) => {
    const { id } = req.params;
    
    const booking = await BookingModel.findById(id)
        .populate('CustmerId')
        .populate('WarehouseId')
        .populate('ProductId')
        .populate('option_id'); 
    
    if (!booking) throw new NotFound("Booking not found");
    
    if (booking.status === "pay") {
        throw new BadRequest("Booking is already converted to sale");
    }
    
      console.log("Booking WarehouseId:", booking.WarehouseId);
    console.log("Booking populated:", booking);

    const option = await ProductPriceOptionModel.findById((booking as any).option_id);
    if (!option) throw new BadRequest("Product option not found");
    console.log(option)

    const productPrice = await ProductPriceModel.findById(option.product_price_id);
    if (!productPrice) throw new BadRequest("Product price not found");

    const quantity = 1; 
    const price = productPrice.price;
    const subtotal = price * quantity;
    
    const saleReference = `SALE-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const saleData = {
        reference: saleReference,
        customer_id: booking.CustmerId, 
        warehouse_id: booking.WarehouseId, 
        grand_total: subtotal,
        sale_status: 'completed',
        currency_id: null, 
        order_tax: null,
        order_discount: null,
        coupon_id: null,
        gift_card_id: null,
    };

    const sale = await SaleModel.create(saleData);

    const productSaleData = {
        sale_id: sale._id,
        product_id: booking.ProductId, 
        options_id: (booking as any).option_id, 
        quantity: quantity,
        price: price,
        subtotal: subtotal
    };

    const productSale = await ProductSalesModel.create(productSaleData);

    booking.status = "pay";
    await booking.save();

    SuccessResponse(res, {
        message: "Booking successfully converted to sale"
    });
}

