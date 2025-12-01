"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.produceProductFromRecipe = exports.checkProductRecipe = exports.selecttion = exports.getAllRecipes = exports.updateRecipe = exports.deleteRecipe = exports.getRecipesByProductId = exports.createRecipe = void 0;
const Recipe_1 = require("../../models/schema/admin/Recipe");
const BadRequest_1 = require("../../Errors/BadRequest");
const Errors_1 = require("../../Errors");
const response_1 = require("../../utils/response");
const products_1 = require("../../models/schema/admin/products");
const Materials_1 = require("../../models/schema/admin/Materials");
const mongoose_1 = __importDefault(require("mongoose"));
const createRecipe = async (req, res) => {
    const { product_id, material_id, material_quantity, unit } = req.body;
    // ✅ تحقق من البيانات الأساسية
    if (!product_id || !material_id || !material_quantity || !unit) {
        throw new BadRequest_1.BadRequest("Please provide all required fields");
    }
    const product = await products_1.ProductModel.findById(product_id);
    if (!product)
        throw new BadRequest_1.BadRequest("Invalid product ID");
    const material = await Materials_1.MaterialModel.findById(material_id);
    if (!material)
        throw new BadRequest_1.BadRequest("Invalid material ID");
    const recipe = await Recipe_1.RecipeModel.create({ product_id, material_id, material_quantity, unit });
    return (0, response_1.SuccessResponse)(res, { message: "Recipe created successfully", recipe });
};
exports.createRecipe = createRecipe;
const getRecipesByProductId = async (req, res) => {
    const { productId } = req.params;
    if (!productId)
        throw new BadRequest_1.BadRequest("Product ID is required");
    if (!mongoose_1.default.Types.ObjectId.isValid(productId))
        throw new BadRequest_1.BadRequest("Invalid product ID");
    const recipes = await Recipe_1.RecipeModel.find({ product_id: productId })
        .populate("material_id", "name ar_name unit ");
    return (0, response_1.SuccessResponse)(res, { message: "Recipes fetched successfully", recipes });
};
exports.getRecipesByProductId = getRecipesByProductId;
const deleteRecipe = async (req, res) => {
    const { id } = req.params;
    if (!id)
        throw new BadRequest_1.BadRequest("Recipe ID is required");
    const recipe = await Recipe_1.RecipeModel.findByIdAndDelete(id);
    if (!recipe)
        throw new Errors_1.NotFound("Recipe not found");
    return (0, response_1.SuccessResponse)(res, { message: "Recipe deleted successfully" });
};
exports.deleteRecipe = deleteRecipe;
const updateRecipe = async (req, res) => {
    const { id } = req.params;
    const { product_id, material_id, material_quantity, unit } = req.body;
    if (!id)
        throw new BadRequest_1.BadRequest("Recipe ID is required");
    const updateData = {};
    if (product_id) {
        const product = await products_1.ProductModel.findById(product_id);
        if (!product)
            throw new BadRequest_1.BadRequest("Invalid product ID");
        updateData.product_id = product_id;
    }
    if (material_id) {
        const material = await Materials_1.MaterialModel.findById(material_id);
        if (!material)
            throw new BadRequest_1.BadRequest("Invalid material ID");
        updateData.material_id = material_id;
    }
    if (material_quantity)
        updateData.material_quantity = material_quantity;
    if (unit)
        updateData.unit = unit;
    const recipe = await Recipe_1.RecipeModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!recipe)
        throw new Errors_1.NotFound("Recipe not found");
    return (0, response_1.SuccessResponse)(res, { message: "Recipe updated successfully", recipe });
};
exports.updateRecipe = updateRecipe;
const getAllRecipes = async (req, res) => {
    const recipes = await Recipe_1.RecipeModel.find()
        .populate("product_id", "name ar_name")
        .populate("material_id", "name ar_name unit");
    return (0, response_1.SuccessResponse)(res, { message: "All recipes fetched successfully", recipes });
};
exports.getAllRecipes = getAllRecipes;
const selecttion = async (req, res) => {
    const products = await products_1.ProductModel.find({}, "name ar_name image");
    const materials = await Materials_1.MaterialModel.find({}, "name ar_name unit");
    return (0, response_1.SuccessResponse)(res, { message: "Selection data fetched successfully", products, materials });
};
exports.selecttion = selecttion;
const checkProductRecipe = async (req, res) => {
    const { product_id, productQuantity } = req.body;
    // ✅ validation
    if (!product_id)
        throw new BadRequest_1.BadRequest("product_id is required");
    if (!mongoose_1.default.Types.ObjectId.isValid(product_id)) {
        throw new BadRequest_1.BadRequest("Invalid product_id");
    }
    if (productQuantity === undefined || productQuantity === null) {
        throw new BadRequest_1.BadRequest("productQuantity is required");
    }
    const prodQty = Number(productQuantity);
    if (Number.isNaN(prodQty) || prodQty <= 0) {
        throw new BadRequest_1.BadRequest("productQuantity must be a positive number");
    }
    // ✅ تأكد إن المنتج موجود
    const product = await products_1.ProductModel.findById(product_id).select("name ar_name");
    if (!product)
        throw new Errors_1.NotFound("Product not found");
    // ✅ هات الريسبى بتاعة المنتج
    const recipes = await Recipe_1.RecipeModel.find({ product_id })
        .populate("material_id", "name ar_name unit quantity");
    // 👈 بافترض إن حقل الستوك في Material اسمه quantity
    if (!recipes.length) {
        return (0, response_1.SuccessResponse)(res, {
            message: "No recipe found for this product",
            is_available: false,
            product: {
                _id: product._id,
                name: product.name,
                ar_name: product.ar_name,
                requested_quantity: prodQty,
            },
            materials: [],
        });
    }
    const materials = recipes.map((recipe) => {
        const material = recipe.material_id;
        const required_quantity = recipe.material_quantity * prodQty; // 👈 الكمية المطلوبة من المتريال
        const available_quantity = material.quantity ?? 0; // 👈 الستوك الحالي
        const is_available = available_quantity >= required_quantity;
        const shortage = is_available ? 0 : required_quantity - available_quantity;
        return {
            material_id: material._id,
            name: material.name,
            ar_name: material.ar_name,
            unit: material.unit,
            per_unit_material_quantity: recipe.material_quantity, // كمية المتريال لو هتنتج 1 منتج
            required_quantity, // كمية المتريال المطلوبة للكمية اللي طلبتها
            available_quantity, // اللي موجود في الستوك
            is_available,
            shortage, // العجز لو في
        };
    });
    const is_all_available = materials.every((m) => m.is_available);
    return (0, response_1.SuccessResponse)(res, {
        message: "Recipe checked successfully",
        is_available: is_all_available, // المنتج كله ينفع يتعمل ولا لأ
        product: {
            _id: product._id,
            name: product.name,
            ar_name: product.ar_name,
            requested_quantity: prodQty,
        },
        materials,
    });
};
exports.checkProductRecipe = checkProductRecipe;
const produceProductFromRecipe = async (req, res) => {
    const { product_id, productQuantity, product_quantity } = req.body;
    const prodQtyRaw = productQuantity ?? product_quantity;
    if (!product_id)
        throw new BadRequest_1.BadRequest("product_id is required");
    if (!mongoose_1.default.Types.ObjectId.isValid(product_id)) {
        throw new BadRequest_1.BadRequest("Invalid product_id");
    }
    if (prodQtyRaw === undefined || prodQtyRaw === null) {
        throw new BadRequest_1.BadRequest("productQuantity is required");
    }
    const prodQty = Number(prodQtyRaw);
    if (Number.isNaN(prodQty) || prodQty <= 0) {
        throw new BadRequest_1.BadRequest("productQuantity must be a positive number");
    }
    const product = await products_1.ProductModel.findById(product_id).select("name ar_name");
    if (!product)
        throw new Errors_1.NotFound("Product not found");
    const recipes = await Recipe_1.RecipeModel.find({ product_id })
        .populate("material_id", "name ar_name unit quantity");
    if (!recipes.length) {
        throw new BadRequest_1.BadRequest("No recipe found for this product");
    }
    const materials = recipes.map((recipe) => {
        const material = recipe.material_id;
        const required_quantity = recipe.material_quantity * prodQty;
        const available_quantity = material.quantity ?? 0;
        const is_available = available_quantity >= required_quantity;
        const shortage = is_available ? 0 : required_quantity - available_quantity;
        return {
            material_id: material._id,
            name: material.name,
            ar_name: material.ar_name,
            unit: material.unit,
            per_unit_material_quantity: recipe.material_quantity,
            required_quantity,
            available_quantity,
            is_available,
            shortage,
        };
    });
    const is_all_available = materials.every((m) => m.is_available);
    // ❌ لو مفيش ستوك كفاية: نرجع نفس شكل الرد تقريبًا من غير خصم
    if (!is_all_available) {
        return (0, response_1.SuccessResponse)(res, {
            message: "Not enough material stock",
            is_available: false,
            product: {
                _id: product._id,
                name: product.name,
                ar_name: product.ar_name,
                requested_quantity: prodQty,
            },
            materials,
        });
    }
    // ✅ خصم من ستوك المتريال (واحدة واحدة من غير Transaction)
    for (const m of materials) {
        await Materials_1.MaterialModel.findByIdAndUpdate(m.material_id, { $inc: { quantity: -m.required_quantity } });
    }
    // هنا "بيتحفظوا في الداتابيز" = فعليًا الستوك اتهددّل
    // لو حابب كمان تسجل operation في جدول تاني (production log) نقدر نزود موديل بعدين
    return (0, response_1.SuccessResponse)(res, {
        message: "Production submitted successfully",
        is_available: true,
        product: {
            _id: product._id,
            name: product.name,
            ar_name: product.ar_name,
            requested_quantity: prodQty,
        },
        materials,
    });
};
exports.produceProductFromRecipe = produceProductFromRecipe;
