import { UnauthorizedError } from "../../Errors/";
import { SuccessResponse } from "../../utils/response";
import { Request, Response } from "express";
import { ProductsModel } from "../../models/schema/admin/products";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/";
import mongoose from "mongoose";
import { BrandModel } from "../../models/schema/admin/brand";
import { CategoryModel } from "../../models/schema/admin/category";
import {generateEAN13Barcode, generateBarcodeImage} from "../../utils/barcode"
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



export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    code,      // لازم المستخدم يدخل الكود أو يضغط زرار generate
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
  } = req.body;

  if (!name || !code || !quantity || !brand_id || !category_id || !unit || !price || !stock_worth || !exp_date || notify_near_expiry === undefined) {
    throw new BadRequest("All fields are required and code cannot be empty. Use generate button if needed.");
  }

  if (!mongoose.Types.ObjectId.isValid(brand_id)) throw new BadRequest("Invalid brand_id format");
  const brand = await BrandModel.findById(brand_id);
  if (!brand) throw new NotFound("Brand not found");

  if (!mongoose.Types.ObjectId.isValid(category_id)) throw new BadRequest("Invalid category_id format");
  const category = await CategoryModel.findById(category_id);
  if (!category) throw new NotFound("Category not found");

  // التأكد من أن الكود فريد
  const exists = await ProductsModel.findOne({ code });
  if (exists) throw new BadRequest("Product code already exists");

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
  });

  SuccessResponse(res, { message: "Create product successfully", product });
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Product id is required");

  const updateData = { ...req.body };

  if (updateData.code) {
    const exists = await ProductsModel.findOne({
      code: updateData.code,
      _id: { $ne: id }
    });
    if (exists) throw new BadRequest("Product code already exists");
  }

  const product = await ProductsModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!product) throw new NotFound("Product not found");

  SuccessResponse(res, { message: "Update product successfully", product });
};

export const generateBarcodeImageController = async (req: Request, res: Response) => {
  try {
    const { product_id } = req.params;
    if (!product_id) throw new BadRequest("Product ID is required");

    const product = await ProductsModel.findById(product_id);
    if (!product) throw new NotFound("Product not found");


const productCode = product.code;
const imageLink = await generateBarcodeImage(productCode, productCode);

    const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;

    res.status(200).json({ success: true, barcode: fullImageUrl });
  } catch (error: any) {
    res.status(error.status || 500).json({ success: false, message: error.message });
  }
};


export const generateProductCode = async (req: Request, res: Response) => {
  let newCode = generateEAN13Barcode();

  // التأكد من عدم التكرار
  while (await ProductsModel.findOne({ code: newCode })) {
    newCode = generateEAN13Barcode();
  }

  SuccessResponse(res, { code: newCode });
};