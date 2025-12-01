 import { Request, Response } from "express";
import { RecipeModel ,ProductionModel } from "../../models/schema/admin/Recipe";
import { saveBase64Image } from "../../utils/handleImages";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { ProductModel } from "../../models/schema/admin/products";
import { MaterialModel } from "../../models/schema/admin/Materials";
import mongoose from "mongoose";


export const createRecipe = async (req: Request, res: Response) => {
  const { product_id, material_id, material_quantity, unit } = req.body;

  // ✅ تحقق من البيانات الأساسية
  if (!product_id || !material_id || !material_quantity || !unit) {
    throw new BadRequest("Please provide all required fields");
  }

  const product = await ProductModel.findById(product_id);
  if (!product) throw new BadRequest("Invalid product ID");

  const material = await MaterialModel.findById(material_id);
  if (!material) throw new BadRequest("Invalid material ID");

  const recipe = await RecipeModel.create({ product_id, material_id, material_quantity, unit });

  return SuccessResponse(res, { message: "Recipe created successfully", recipe });
};

export const getRecipesByProductId = async (req: Request, res: Response) => {
  const { productId } = req.params;
  if (!productId) throw new BadRequest("Product ID is required");
  if (!mongoose.Types.ObjectId.isValid(productId)) throw new BadRequest("Invalid product ID");
  const recipes = await RecipeModel.find({ product_id: productId })
    .populate("material_id", "name ar_name unit ");
  return SuccessResponse(res, { message: "Recipes fetched successfully", recipes });
}
export const deleteRecipe = async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) throw new BadRequest("Recipe ID is required");
  const recipe = await RecipeModel.findByIdAndDelete(id);
  if (!recipe) throw new NotFound("Recipe not found");
  return SuccessResponse(res, { message: "Recipe deleted successfully" });
}
export const updateRecipe = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { product_id, material_id, material_quantity, unit } = req.body;
  if (!id) throw new BadRequest("Recipe ID is required");

  const updateData: any = {}; 
  if (product_id) {
    const product = await ProductModel.findById(product_id);
    if (!product) throw new BadRequest("Invalid product ID");
    updateData.product_id = product_id;
  }
  if (material_id) {
    const material = await MaterialModel.findById(material_id);
    if (!material) throw new BadRequest("Invalid material ID");
    updateData.material_id = material_id;
  }
  if (material_quantity) updateData.material_quantity = material_quantity;
  if (unit) updateData.unit = unit;
  
  const recipe = await RecipeModel.findByIdAndUpdate(id, updateData, { new: true });
  if (!recipe) throw new NotFound("Recipe not found");
  return SuccessResponse(res, { message: "Recipe updated successfully", recipe });
} 


export const getAllRecipes = async (req: Request, res: Response) => {
  const recipes = await RecipeModel.find()
    .populate("product_id", "name ar_name")
    .populate("material_id", "name ar_name unit");
  return SuccessResponse(res, { message: "All recipes fetched successfully", recipes });
}

export const selecttion = async (req: Request, res: Response) => {
  const products = await ProductModel.find({}, "name ar_name image");
  const materials = await MaterialModel.find({}, "name ar_name unit");
  return SuccessResponse(res, { message: "Selection data fetched successfully", products, materials });
}


export const checkProductRecipe = async (req: Request, res: Response) => {
  const { product_id, productQuantity } = req.body;

  // ✅ validation
  if (!product_id) throw new BadRequest("product_id is required");
  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    throw new BadRequest("Invalid product_id");
  }

  if (productQuantity === undefined || productQuantity === null) {
    throw new BadRequest("productQuantity is required");
  }

  const prodQty = Number(productQuantity);
  if (Number.isNaN(prodQty) || prodQty <= 0) {
    throw new BadRequest("productQuantity must be a positive number");
  }

  // ✅ تأكد إن المنتج موجود
  const product = await ProductModel.findById(product_id).select("name ar_name");
  if (!product) throw new NotFound("Product not found");

  // ✅ هات الريسبى بتاعة المنتج
  const recipes = await RecipeModel.find({ product_id })
    .populate("material_id", "name ar_name unit quantity"); 
    // 👈 بافترض إن حقل الستوك في Material اسمه quantity

  if (!recipes.length) {
    return SuccessResponse(res, {
      message: "No recipe found for this product",
      is_available: false,
      product: {
        _id: product._id,
        name: product.name,
        ar_name: (product as any).ar_name,
        requested_quantity: prodQty,
      },
      materials: [],
    });
  }

  const materials = recipes.map((recipe: any) => {
    const material: any = recipe.material_id;
    const required_quantity = recipe.material_quantity * prodQty; // 👈 الكمية المطلوبة من المتريال
    const available_quantity = material.quantity ?? 0;           // 👈 الستوك الحالي
    const is_available = available_quantity >= required_quantity;
    const shortage = is_available ? 0 : required_quantity - available_quantity;

    return {
      material_id: material._id,
      name: material.name,
      ar_name: material.ar_name,
      unit: material.unit,
      per_unit_material_quantity: recipe.material_quantity, // كمية المتريال لو هتنتج 1 منتج
      required_quantity,                                    // كمية المتريال المطلوبة للكمية اللي طلبتها
      available_quantity,                                   // اللي موجود في الستوك
      is_available,
      shortage,                                             // العجز لو في
    };
  });

  const is_all_available = materials.every((m) => m.is_available);

  return SuccessResponse(res, {
    message: "Recipe checked successfully",
    is_available: is_all_available, // المنتج كله ينفع يتعمل ولا لأ
    product: {
      _id: product._id,
      name: product.name,
      ar_name: (product as any).ar_name,
      requested_quantity: prodQty,
    },
    materials,
  });
};




export const produceProductFromRecipe = async (req: Request, res: Response) => {
  const { product_id, productQuantity, product_quantity } = req.body;
  const prodQtyRaw = productQuantity ?? product_quantity;

  if (!product_id) throw new BadRequest("product_id is required");
  if (!mongoose.Types.ObjectId.isValid(product_id)) {
    throw new BadRequest("Invalid product_id");
  }

  if (prodQtyRaw === undefined || prodQtyRaw === null) {
    throw new BadRequest("productQuantity is required");
  }

  const prodQty = Number(prodQtyRaw);
  if (Number.isNaN(prodQty) || prodQty <= 0) {
    throw new BadRequest("productQuantity must be a positive number");
  }

  const product = await ProductModel.findById(product_id).select("name ar_name");
  if (!product) throw new NotFound("Product not found");

  const recipes = await RecipeModel.find({ product_id })
    .populate("material_id", "name ar_name unit quantity");

  if (!recipes.length) {
    throw new BadRequest("No recipe found for this product");
  }

  const materials = recipes.map((recipe: any) => {
    const material: any = recipe.material_id;

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
    return SuccessResponse(res, {
      message: "Not enough material stock",
      is_available: false,
      product: {
        _id: product._id,
        name: product.name,
        ar_name: (product as any).ar_name,
        requested_quantity: prodQty,
      },
      materials,
    });
  }

  // ✅ خصم من ستوك المتريال (واحدة واحدة من غير Transaction)
  for (const m of materials) {
    await MaterialModel.findByIdAndUpdate(
      m.material_id,
      { $inc: { quantity: -m.required_quantity } }, // quantity = الستوك في Material
    );
  }

  // هنا "بيتحفظوا في الداتابيز" = فعليًا الستوك اتهددّل
  // لو حابب كمان تسجل operation في جدول تاني (production log) نقدر نزود موديل بعدين

  return SuccessResponse(res, {
    message: "Production submitted successfully",
    is_available: true,
    product: {
      _id: product._id,
      name: product.name,
      ar_name: (product as any).ar_name,
      requested_quantity: prodQty,
    },
    materials,
  });
};


export const getAllProductions = async (req: Request, res: Response) => {
  const productions = await ProductionModel.find();
  return SuccessResponse(res, { message: "Productions fetched successfully", productions });
};