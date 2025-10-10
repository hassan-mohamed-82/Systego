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
import{saveBase64Image} from "../../utils/handleImages"
import { createObjectCsvWriter } from "csv-writer";
import path from "path";

export const getStock = async (req: Request, res: Response) => {
  const stocks = await StockModel.find().populate({path : "category_id",
    select: "name"}).populate("brand_id", "name").populate("warehouseId", "name");
  SuccessResponse(res, { message: "Get stocks successfully", stocks });
};


export const getStockById = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Adjustment ID is required");

  const stock = await StockModel.findById(id).populate({path : "category_id",
    select: "_id name"}).populate("brand_id", "_id name")
    .populate("warehouseId", "_id name");

  if (!stock) throw new NotFound("Stock not found");

  SuccessResponse(res, { message: "Get Stock successfully", stock });
};

export const createStock = async (req: Request, res: Response) => {
const { warehouseId, type, category_id, brand_id, final_file } = req.body;

// ✅ تأكد إن المخزن موجود
const warehouse = await WarehouseModel.findById(warehouseId);
if (!warehouse) throw new BadRequest("Invalid warehouse ID");

// ✅ تأكد من الكاتيجوريز
const categoriesCount = await CategoryModel.countDocuments({ _id: { $in: category_id } });
if (categoriesCount !== category_id.length) {
  throw new BadRequest("Invalid category ID");
}

// ✅ تأكد من البراندز
const brandCount = await BrandModel.countDocuments({ _id: { $in: brand_id } });
if (brandCount !== brand_id.length) {
  throw new BadRequest("Invalid Brand ID");
} 
// ✅ إنشاء المخزون
const stock = await StockModel.create({
  warehouseId,
  type,
  category_id,
  brand_id, 
});

// ✅ اجلب الداتا كاملة مع populate متعدد المستويات
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

  if(!stock_data){
    throw new BadRequest("Invalid stock ID");
  }
// ✅ تجميع المنتجات بدون تكرار
let products = {};

if (stock_data) {
  // 🟢 loop على الكاتيجوري
  for (const cat of stock_data.category_id || []) {
    if (Array.isArray(cat.products)) {
      for (const product of cat.products) {
        products[product._id] = {
          name: product.name,
          expected: product.quantity,
        };
      }
    }
  }

  // 🟢 loop على البراند
  for (const brand of stock_data.brand_id || []) {
    if (Array.isArray(brand.products)) {
      for (const product of brand.products) {
        products[product._id] = {
          name: product.name,
          expected: product.quantity,
        };
      }
    }
  }
}

// ✅ حول الـ object إلى array
const product_arr = Object.values(products);

// لو عايز تعرض الناتج
  const filePath = path.join("uploads", `stocks_${Date.now()}.csv`);
  
  const csvWriter = createObjectCsvWriter({
    path: filePath,
    header: [
      { id: "product", title: "Product Name" },
      { id: "expected", title: "Expected" },
      { id: "counted", title: "Counted" },
    ],
  });
      const records = product_arr.map((item) => (
      return {
        name: item?.name || "",
        expected: item?.expected?.toString() || "",
        counted: "0",
      }
    ));

    await csvWriter.writeRecords(records); 
    stock_data.initial_file = filePath;
    await stock_data?.save();
  SuccessResponse(res, { filePath });
};