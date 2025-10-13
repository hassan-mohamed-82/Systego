import { Request, Response } from "express";
import { StockModel } from "../../models/schema/admin/Stock";
import { BrandModel } from "../../models/schema/admin/brand";
import { CategoryModel } from "../../models/schema/admin/category";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { ProductModel } from "../../models/schema/admin/products";
import { Product_WarehouseModel } from "../../models/schema/admin/Product_Warehouse";
import { uploadFile } from "../../utils/uploadFile";
import { createObjectCsvWriter } from "csv-writer";
import path from "path";
import fs from "fs"; 

export const getStock = async (req: Request, res: Response) => {
const baseUrl = req.protocol + "://" + req.get("host") + "/";

const stocks = await StockModel.find()
  .populate({ path: "category_id", select: "name" })
  .populate("brand_id", "name")
  .populate("warehouseId", "name")
  .lean(); 

  const updatedStocks = stocks.map((item) => ({
    ...item,
    initial_file: item.initial_file ? baseUrl + item.initial_file : null,
    final_file: item.final_file ? baseUrl + item.final_file : null,
  }));

  SuccessResponse(res, { message: "Get stocks successfully", stocks: updatedStocks });

};

export const getStockById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Adjustment ID is required");

  const stock = await StockModel.findById(id)
    .populate({ path: "category_id", select: "_id name" })
    .populate("brand_id", "_id name")
    .populate("warehouseId", "_id name");

  if (!stock) throw new NotFound("Stock not found");

  SuccessResponse(res, { message: "Get Stock successfully", stock });
};

export const createStock = async (req: Request, res: Response) => {
  const { warehouseId, type, category_id, brand_id, final_file } = req.body;

  const warehouse = await WarehouseModel.findById(warehouseId);
  if (!warehouse) throw new BadRequest("Invalid warehouse ID");

  const categoriesCount = await CategoryModel.countDocuments({
    _id: { $in: category_id },
  });
  if (categoriesCount !== category_id.length) {
    throw new BadRequest("Invalid category ID");
  }

  const brandCount = await BrandModel.countDocuments({
    _id: { $in: brand_id },
  });
  if (brandCount !== brand_id.length) {
    throw new BadRequest("Invalid Brand ID");
  }

  const stock = await StockModel.create({
    warehouseId,
    type,
    category_id,
    brand_id,
  });

  let stock_data = await StockModel.findById(stock._id)
    .populate({
      path: "category_id",
      select: "name products",
      populate: { path: "products", select: "name quantity" },
    })
    .populate({
      path: "brand_id",
      select: "name products",
      populate: { path: "products", select: "name quantity" },
    })
    .populate({ path: "warehouseId", select: "name" });

  if (!stock_data) {
    throw new BadRequest("Invalid stock ID");
  }

  let products: Record<string, { name: string; expected: number }> = {};

  const categories = stock_data.category_id as any[];
  const brands = stock_data.brand_id as any[];

  if (stock_data) {
    for (const cat of categories) {
      if (Array.isArray(cat.products)) {
        for (const product of cat.products as any[]) {
          products[(product as any)._id] = {
            name: (product as any).name,
            expected: (product as any).quantity,
          };
        }
      }
    }

    for (const brand of brands) {
      if (Array.isArray(brand.products)) {
        for (const product of brand.products as any[]) {
          products[(product as any)._id] = {
            name: (product as any).name,
            expected: (product as any).quantity,
          };
        }
      }
    }
  }

  const product_arr = Object.values(products);

  const dirPath = path.join("uploads", "stocks");

  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  const filePath = path.join("uploads/stocks", `stocks_${Date.now()}.csv`);

  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "name", title: "Product Name" },
      { id: "expected", title: "Expected" },
      { id: "counted", title: "Counted" },
    ],
  });

  const records = product_arr.map((item: any) => ({
    name: item?.name || "",
    expected: item?.expected?.toString() || "",
    counted: "0",
  }));

  await csvWriter.writeRecords(records);

  stock_data.initial_file = filePath;
  await stock_data?.save();
  const baseUrl = req.protocol + "://" + req.get("host") + "/";

  SuccessResponse(res, { filePath : baseUrl + filePath});
};

export const uploadFinalFile = async (req: Request, res: Response) => {

  const stock_id = req.params.id;

  // تحقق من وجود الستوك
  const stock_data = await StockModel.findById(stock_id);
  if (!stock_data) throw new NotFound("Stock not found");

  // تحقق من وجود الملف المرفوع
  if (!req.file) throw new BadRequest("final_file is required");

  // خزن المسار
  const baseUrl = req.protocol + "://" + req.get("host") + "/";
  const filePath = req.file.path.replace(/\\/g, "/"); // لو ويندوز
  stock_data.final_file = filePath;
  await stock_data.save();

  SuccessResponse(res, {
    message: "Final file uploaded successfully",
    filePath: baseUrl + filePath,
  });
};