import { UnauthorizedError } from "../Errors/";
import { SuccessResponse } from "../utils/response";
import { Request, Response } from "express";
import { ProductsModel } from "../models/schema/products";
import { saveBase64Image } from "../utils/handleImages";
import { BadRequest } from "../Errors/BadRequest";
import { NotFound } from "../Errors/";
import mongoose from "mongoose";
import { BrandModel } from "../models/schema/brand";
import { CategoryModel } from "../models/schema/category";
import {generateEAN13Barcode} from "../utils/barcode"
import crypto from "crypto";



// ✅ باقي CRUD زي ما هي
export const getProducts = async (req: Request, res: Response) => {
  const products = await ProductsModel.find({})
    .populate("brand_id", "name")
    .populate("category_id", "name");
  if (!products || products.length === 0) throw new NotFound("No products found");
  SuccessResponse(res, { message: "get products successfully", products });
};

export const getProductById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Product id is required");
  const product = await ProductsModel.findById(id)
    .populate("brand_id", "name")
    .populate("category_id", "name");
  if (!product) throw new NotFound("Product not found");
  SuccessResponse(res, { message: "get product successfully", product });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Product id is required");
  const product = await ProductsModel.findByIdAndDelete(id);
  if (!product) throw new NotFound("Product not found");
  SuccessResponse(res, { message: "delete product successfully" });
};


export const createproduct = async (req: Request, res: Response) => {
  const {
    name,
    code,
    icon,
    quantity,
    brand_id,
    category_id,
    unit,
    price,
    cost,
    stock_worth,
    exp_date,
    notify_near_expiry,
    barcode_number,
  } = req.body;

  // ✅ تحقق من الحقول الأساسية (من غير الباركود دلوقتي)
  if (
    !name ||
    !code ||
    !quantity ||
    !brand_id ||
    !category_id ||
    !unit ||
    !price ||
    !stock_worth ||
    !exp_date ||
    notify_near_expiry === undefined
  ) {
    throw new BadRequest("All fields are required except barcode_number (auto-generated if missing)");
  }

  // ✅ تحقق من brand_id و category_id
  if (!mongoose.Types.ObjectId.isValid(brand_id)) {
    throw new BadRequest("Invalid brand_id format");
  }
  const brand = await BrandModel.findById(brand_id);
  if (!brand) throw new NotFound("Brand not found");

  if (!mongoose.Types.ObjectId.isValid(category_id)) {
    throw new BadRequest("Invalid category_id format");
  }
  const category = await CategoryModel.findById(category_id);
  if (!category) throw new NotFound("Category not found");

  // ✅ الباركود: استخدم اللي جاي أو ولّد واحد جديد
  let finalBarcode = barcode_number || generateEAN13Barcode();

  // تأكد إنه مش مكرر
  const existingBarcode = await ProductsModel.findOne({ barcode_number: finalBarcode });
  if (existingBarcode) {
    throw new BadRequest("Barcode number already exists");
  }

  // ✅ حفظ صورة الايقونة لو موجودة
  let imageUrl = "";
  if (icon) {
    imageUrl = await saveBase64Image(icon, Date.now().toString(), req, "product");
  }

  const product = await ProductsModel.create({
    name,
    code,
    icon: imageUrl,
    quantity,
    brand_id,
    category_id,
    unit,
    price,
    cost,
    stock_worth,
    exp_date,
    notify_near_expiry,
    barcode_number: finalBarcode,
  });

  SuccessResponse(res, {
    message: "create product successfully",
    product,
  });
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Product id is required");

  let updateData = { ...req.body };

  // ✅ لو فيه باركود جديد، اتأكد إنه مش مكرر
  if (updateData.barcode_number) {
    const exists = await ProductsModel.findOne({
      barcode_number: updateData.barcode_number,
      _id: { $ne: id }
    });
    if (exists) {
      throw new BadRequest("Barcode number already exists");
    }
  } else {
    // لو مش موجود في التحديث، ممكن نولّد واحد جديد
    updateData.barcode_number = generateEAN13Barcode();
  }

  const product = await ProductsModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!product) throw new NotFound("Product not found");

  SuccessResponse(res, { message: "update product successfully", product });
};