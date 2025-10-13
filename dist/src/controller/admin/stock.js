"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadFinalFile = exports.createStock = exports.getStockById = exports.getStock = void 0;
const Stock_1 = require("../../models/schema/admin/Stock");
const brand_1 = require("../../models/schema/admin/brand");
const category_1 = require("../../models/schema/admin/category");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const csv_writer_1 = require("csv-writer");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const getStock = async (req, res) => {
    const baseUrl = req.protocol + "://" + req.get("host") + "/";
    const stocks = await Stock_1.StockModel.find()
        .populate({ path: "category_id", select: "name" })
        .populate("brand_id", "name")
        .populate("warehouseId", "name")
        .lean();
    const updatedStocks = stocks.map((item) => ({
        ...item,
        initial_file: item.initial_file ? baseUrl + item.initial_file : null,
        final_file: item.final_file ? baseUrl + item.final_file : null,
    }));
    (0, response_1.SuccessResponse)(res, { message: "Get stocks successfully", stocks: updatedStocks });
};
exports.getStock = getStock;
const getStockById = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Adjustment ID is required");
    const stock = await Stock_1.StockModel.findById(id)
        .populate({ path: "category_id", select: "_id name" })
        .populate("brand_id", "_id name")
        .populate("warehouseId", "_id name");
    if (!stock)
        throw new Errors_1.NotFound("Stock not found");
    (0, response_1.SuccessResponse)(res, { message: "Get Stock successfully", stock });
};
exports.getStockById = getStockById;
const createStock = async (req, res) => {
    const { warehouseId, type, category_id, brand_id, final_file } = req.body;
    const warehouse = await Warehouse_1.WarehouseModel.findById(warehouseId);
    if (!warehouse)
        throw new BadRequest_1.BadRequest("Invalid warehouse ID");
    const categoriesCount = await category_1.CategoryModel.countDocuments({
        _id: { $in: category_id },
    });
    if (categoriesCount !== category_id.length) {
        throw new BadRequest_1.BadRequest("Invalid category ID");
    }
    const brandCount = await brand_1.BrandModel.countDocuments({
        _id: { $in: brand_id },
    });
    if (brandCount !== brand_id.length) {
        throw new BadRequest_1.BadRequest("Invalid Brand ID");
    }
    const stock = await Stock_1.StockModel.create({
        warehouseId,
        type,
        category_id,
        brand_id,
    });
    let stock_data = await Stock_1.StockModel.findById(stock._id)
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
        throw new BadRequest_1.BadRequest("Invalid stock ID");
    }
    let products = {};
    const categories = stock_data.category_id;
    const brands = stock_data.brand_id;
    if (stock_data) {
        for (const cat of categories) {
            if (Array.isArray(cat.products)) {
                for (const product of cat.products) {
                    products[product._id] = {
                        name: product.name,
                        expected: product.quantity,
                    };
                }
            }
        }
        for (const brand of brands) {
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
    const product_arr = Object.values(products);
    const dirPath = path_1.default.join("uploads", "stocks");
    if (!fs_1.default.existsSync(dirPath)) {
        fs_1.default.mkdirSync(dirPath, { recursive: true });
    }
    const filePath = path_1.default.join("uploads/stocks", `stocks_${Date.now()}.csv`);
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: filePath,
        header: [
            { id: "name", title: "Product Name" },
            { id: "expected", title: "Expected" },
            { id: "counted", title: "Counted" },
        ],
    });
    const records = product_arr.map((item) => ({
        name: item?.name || "",
        expected: item?.expected?.toString() || "",
        counted: "0",
    }));
    await csvWriter.writeRecords(records);
    stock_data.initial_file = filePath;
    await stock_data?.save();
    const baseUrl = req.protocol + "://" + req.get("host") + "/";
    (0, response_1.SuccessResponse)(res, { filePath: baseUrl + filePath });
};
exports.createStock = createStock;
const uploadFinalFile = async (req, res) => {
    const stock_id = req.params.id;
    // تحقق من وجود الستوك
    const stock_data = await Stock_1.StockModel.findById(stock_id);
    if (!stock_data)
        throw new Errors_1.NotFound("Stock not found");
    // تحقق من وجود الملف المرفوع
    if (!req.file)
        throw new BadRequest_1.BadRequest("final_file is required");
    // خزن المسار
    const baseUrl = req.protocol + "://" + req.get("host") + "/";
    const filePath = req.file.path.replace(/\\/g, "/"); // لو ويندوز
    stock_data.final_file = filePath;
    await stock_data.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Final file uploaded successfully",
        filePath: baseUrl + filePath,
    });
};
exports.uploadFinalFile = uploadFinalFile;
