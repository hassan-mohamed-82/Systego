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
