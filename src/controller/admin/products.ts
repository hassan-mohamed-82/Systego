import { Request, Response } from "express";
import { ProductModel } from "../../models/schema/admin/products";
import { ProductPriceModel } from "../../models/schema/admin/product_price";
import { ProductPriceOptionModel } from "../../models/schema/admin/product_price";
import { SuccessResponse } from "../../utils/response";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors/NotFound";
import { saveBase64Image } from "../../utils/handleImages";
import {generateBarcodeImage,generateEAN13Barcode} from "../../utils/barcode"
import { CategoryModel } from "../../models/schema/admin/category";
import { BrandModel } from "../../models/schema/admin/brand";
import { VariationModel } from "../../models/schema/admin/Variation";
import { WarehouseModel } from "../../models/schema/admin/Warehouse";
import { PurchaseItemModel } from "../../models/schema/admin/purchase_item";
import ExcelJS from "exceljs";

export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    ar_name,
    image,
    categoryId,
    brandId,
    unit,
    price,
    quantity,
    ar_description,
    description,
    exp_ability,
    minimum_quantity_sale,
    low_stock,
    cost,
    whole_price,
    start_quantaty,
    taxesId,
    product_has_imei,
    different_price,
    show_quantity,
    maximum_to_show,
    prices,
    gallery_product,
    is_featured,
    code,
  } = req.body;

  if (!name) throw new BadRequest("Product name is required");
  if (!ar_name) throw new BadRequest("Arabic name is required");
  if (!ar_description) throw new BadRequest("Arabic description is required");

  const hasVariations = Array.isArray(prices) && prices.length > 0;

  if (!hasVariations) {
    if (price === undefined || price === null) {
      throw new BadRequest("Product price is required when there are no variations");
    }
    if (quantity === undefined || quantity === null) {
      throw new BadRequest("Product quantity is required when there are no variations");
    }
    if (!code) {
      throw new BadRequest("Product code is required when there are no variations");
    }

    const existingProductWithCode = await ProductModel.findOne({ code });
    if (existingProductWithCode) {
      throw new BadRequest("Product code already exists");
    }
  }

  if (!Array.isArray(categoryId) || categoryId.length === 0) {
    throw new BadRequest("At least one categoryId is required");
  }

  const existitcategories = await CategoryModel.find({
    _id: { $in: categoryId },
  });
  if (existitcategories.length !== categoryId.length) {
    throw new BadRequest("One or more categories not found");
  }

  if (brandId) {
    const existitbrand = await BrandModel.findById(brandId);
    if (!existitbrand) throw new BadRequest("Brand not found");
  }

  for (const cat of existitcategories) {
    cat.product_quantity += 1;
    await cat.save();
  }

  let imageUrl: string | undefined;
  if (image) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "products");
  }

  let galleryUrls: string[] = [];
  if (gallery_product && Array.isArray(gallery_product)) {
    for (const g of gallery_product) {
      if (typeof g === "string") {
        const imgUrl = await saveBase64Image(g, Date.now().toString(), req, "products");
        galleryUrls.push(imgUrl);
      }
    }
  }

  if (show_quantity && !maximum_to_show) {
    throw new BadRequest("Maximum to show is required when show_quantity is true");
  }

  const basePrice = hasVariations ? 0 : Number(price);
  const baseQuantity = hasVariations ? 0 : Number(quantity || 0);

  const product = await ProductModel.create({
    name,
    ar_name,
    ar_description,
    image: imageUrl,
    categoryId,
    brandId,
    unit,
    code,
    price: basePrice,
    quantity: baseQuantity,
    description,
    cost,
    exp_ability,
    minimum_quantity_sale,
    low_stock,
    whole_price,
    start_quantaty,
    taxesId,
    product_has_imei,
    different_price,
    show_quantity,
    maximum_to_show,
    gallery_product: galleryUrls,
    is_featured,
  });

  if (hasVariations) {
    let totalQuantity = 0;
    let minVariantPrice: number | null = null;

    for (const p of prices) {
      if (p.price === undefined || p.price === null) {
        throw new BadRequest("Each variation must have a price");
      }
      if (!p.code) {
        throw new BadRequest("Each variation must have a unique code");
      }

      const variantPrice = Number(p.price);
      const variantQty = Number(p.quantity || 0);
      const variantCost = Number(p.cost || 0);
      const variantStartQty = Number(p.strat_quantaty || 0);

      let priceGalleryUrls: string[] = [];
      if (p.gallery && Array.isArray(p.gallery)) {
        for (const g of p.gallery) {
          if (typeof g === "string") {
            const gUrl = await saveBase64Image(g, Date.now().toString(), req, "product_gallery");
            priceGalleryUrls.push(gUrl);
          }
        }
      }

      const productPrice = await ProductPriceModel.create({
        productId: product._id,
        price: variantPrice,
        code: p.code,
        gallery: priceGalleryUrls,
        quantity: variantQty,
        cost: variantCost,
        strat_quantaty: variantStartQty,
      });

      totalQuantity += variantQty;

      if (minVariantPrice === null || variantPrice < minVariantPrice) {
        minVariantPrice = variantPrice;
      }

      if (p.options && Array.isArray(p.options)) {
        for (const opt of p.options) {
          await ProductPriceOptionModel.create({
            product_price_id: productPrice._id,
            option_id: opt,
          });
        }
      }
    }

    product.quantity = totalQuantity;
    product.price = minVariantPrice ?? 0;
    await product.save();
  }

  SuccessResponse(res, {
    message: "Product created successfully",
    product,
  });
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  const products = await ProductModel.find()
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();

  const variations = await VariationModel.find().lean();

  const formattedProducts = await Promise.all(
    products.map(async (product) => {
      const prices = await ProductPriceModel.find({ productId: product._id }).lean();

      const formattedPrices = await Promise.all(
        prices.map(async (price) => {
          const options = await ProductPriceOptionModel.find({ product_price_id: price._id })
            .populate({
              path: "option_id",
              select: "_id name variationId",
            })
            .lean();

          const groupedOptions: Record<string, any[]> = {};

          for (const po of options) {
            const option = po.option_id as any;
            if (!option?._id) continue;

            const variation = variations.find(
              (v) => v._id.toString() === option.variationId?.toString()
            );

            if (variation) {
              if (!groupedOptions[variation.name]) groupedOptions[variation.name] = [];
              groupedOptions[variation.name].push(option);
            }
          }

          const variationsArray = Object.keys(groupedOptions).map((varName) => ({
            name: varName,
            options: groupedOptions[varName],
          }));

          return {
            ...price,
            variations: variationsArray,
          };
        })
      );

      return { ...product, prices: formattedPrices };
    })
  );

  SuccessResponse(res, { products: formattedProducts });
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    ar_name,
    image,
    categoryId,
    brandId,
    unit,
    cost,
    price,
    description,
    ar_description,
    exp_ability,
    minimum_quantity_sale,
    low_stock,
    whole_price,
    start_quantaty,
    taxesId,
    product_has_imei,
    different_price,
    show_quantity,
    maximum_to_show,
    prices,
    gallery,
    is_featured,
  } = req.body;

  const product = await ProductModel.findById(id);
  if (!product) throw new NotFound("Product not found");

  if (image) {
    product.image = await saveBase64Image(image, Date.now().toString(), req, "products");
  }

  if (gallery && Array.isArray(gallery)) {
    let galleryUrles: string[] = [];
    for (const g of gallery) {
      if (typeof g === "string") {
        const gUrl = await saveBase64Image(g, Date.now().toString(), req, "product_gallery");
        galleryUrles.push(gUrl);
      }
    }
    product.gallery_product = galleryUrles;
  }

  product.name = name ?? product.name;
  product.ar_name = ar_name ?? product.ar_name;
  product.categoryId = categoryId ?? product.categoryId;
  product.brandId = brandId ?? product.brandId;
  product.unit = unit ?? product.unit;
  product.price = price ?? product.price;
  product.description = description ?? product.description;
  product.ar_description = ar_description ?? product.ar_description;
  product.exp_ability = exp_ability ?? product.exp_ability;
  product.minimum_quantity_sale = minimum_quantity_sale ?? product.minimum_quantity_sale;
  product.low_stock = low_stock ?? product.low_stock;
  product.whole_price = whole_price ?? product.whole_price;
  product.start_quantaty = start_quantaty ?? product.start_quantaty;
  product.cost = cost ?? product.cost;
  product.taxesId = taxesId ?? product.taxesId;
  product.product_has_imei = product_has_imei ?? product.product_has_imei;
  product.different_price = different_price ?? product.different_price;
  product.show_quantity = show_quantity ?? product.show_quantity;
  product.maximum_to_show = maximum_to_show ?? product.maximum_to_show;
  product.is_featured = is_featured ?? product.is_featured;

  await product.save();

  let totalQuantity = 0;
  if (prices && Array.isArray(prices)) {
    for (const p of prices) {
      let productPrice;

      if (p._id) {
        productPrice = await ProductPriceModel.findByIdAndUpdate(
          p._id,
          {
            price: p.price,
            code: p.code,
            quantity: p.quantity || 0,
            cost: p.cost || 0,
            strat_quantaty: p.strat_quantaty || 0,
          },
          { new: true }
        );
      } else {
        let galleryUrls: string[] = [];
        if (p.gallery && Array.isArray(p.gallery)) {
          for (const g of p.gallery) {
            if (typeof g === "string") {
              const gUrl = await saveBase64Image(g, Date.now().toString(), req, "product_gallery");
              galleryUrls.push(gUrl);
            }
          }
        }
        productPrice = await ProductPriceModel.create({
          productId: product._id,
          price: p.price,
          code: p.code,
          quantity: p.quantity || 0,
          cost: p.cost || 0,
          strat_quantaty: p.strat_quantaty || 0,
          gallery: galleryUrls,
        });
      }

      totalQuantity += p.quantity || 0;

      if (productPrice && p.options && Array.isArray(p.options)) {
        await ProductPriceOptionModel.deleteMany({ product_price_id: productPrice._id });
        for (const opt of p.options) {
          await ProductPriceOptionModel.create({
            product_price_id: productPrice._id,
            option_id: opt,
          });
        }
      }
    }
  }

  product.quantity = totalQuantity;
  await product.save();

  SuccessResponse(res, { message: "Product updated successfully", product });
};

export const deleteProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await ProductModel.findByIdAndDelete(id);
  if (!product) throw new NotFound("Product not found");

  const prices = await ProductPriceModel.find({ productId: id });
  const priceIds = prices.map((p) => p._id);

  await ProductPriceOptionModel.deleteMany({ product_price_id: { $in: priceIds } });
  await ProductPriceModel.deleteMany({ productId: id });

  SuccessResponse(res, { message: "Product and all related prices/options deleted successfully" });
};

export const getOneProduct = async (req: Request, res: Response): Promise<void> => {
  const { id } = req.params;

  const product = await ProductModel.findById(id)
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();

  if (!product) throw new NotFound("Product not found");

  const variations = await VariationModel.find().lean();

  const prices = await ProductPriceModel.find({ productId: product._id }).lean();

  const formattedPrices = await Promise.all(
    prices.map(async (price) => {
      const options = await ProductPriceOptionModel.find({ product_price_id: price._id })
        .populate({
          path: "option_id",
          select: "_id name variationId",
        })
        .lean();

      const groupedOptions: Record<string, any[]> = {};

      for (const po of options) {
        const option = po.option_id as any;
        if (!option?._id) continue;

        const variation = variations.find(
          (v) => v._id.toString() === option.variationId?.toString()
        );

        if (variation) {
          if (!groupedOptions[variation.name]) groupedOptions[variation.name] = [];
          groupedOptions[variation.name].push({
            _id: option._id,
            name: option.name,
          });
        }
      }

      const variationsArray = Object.keys(groupedOptions).map((varName) => ({
        name: varName,
        options: groupedOptions[varName],
      }));

      return {
        _id: price._id,
        productId: price.productId,
        price: price.price,
        code: price.code,
        gallery: price.gallery,
        quantity: price.quantity,
        cost: price.cost,
        strat_quantaty: price.strat_quantaty,
        createdAt: price.createdAt,
        updatedAt: price.updatedAt,
        __v: price.__v,
        variations: variationsArray,
      };
    })
  );

  (product as any).prices = formattedPrices;

  SuccessResponse(res, {
    product,
    message: "Product fetched successfully",
  });
};

export const getProductByCode = async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) throw new BadRequest("Code is required");

  const productPrice = await ProductPriceModel.findOne({ code }).lean();
  if (!productPrice) throw new NotFound("No product found for this code");

  const product = await ProductModel.findById(productPrice.productId)
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();

  if (!product) throw new NotFound("Product not found");

  const variations = await VariationModel.find().populate("options").lean();
  const categories = await CategoryModel.find().lean();
  const brands = await BrandModel.find().lean();

  const options = await ProductPriceOptionModel.find({ product_price_id: productPrice._id })
    .populate("option_id")
    .lean();

  const groupedOptions: Record<string, any[]> = {};

  options.forEach((po: any) => {
    const option = po.option_id;
    if (!option || !option._id) return;

    const variation = variations.find((v: any) =>
      v.options.some((opt: any) => opt._id.toString() === option._id.toString())
    );

    if (variation) {
      if (!groupedOptions[variation.name]) groupedOptions[variation.name] = [];
      groupedOptions[variation.name].push(option);
    }
  });

  const variationsArray = Object.keys(groupedOptions).map((varName) => ({
    name: varName,
    options: groupedOptions[varName],
  }));

  (product as any).price = {
    ...productPrice,
    variations: variationsArray,
  };

  SuccessResponse(res, {
    product,
    categories,
    brands,
    variations,
  });
};

export const generateBarcodeImageController = async (req: Request, res: Response) => {
  const { product_price_id } = req.params;
  if (!product_price_id) throw new BadRequest("Product price ID is required");

  const productPrice = await ProductPriceModel.findById(product_price_id);
  if (!productPrice) throw new NotFound("Product price not found");

  const productCode = productPrice.code;
  if (!productCode) throw new BadRequest("Product price does not have a code yet");

  const imageLink = await generateBarcodeImage(productCode, productCode);
  const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;

  SuccessResponse(res, {
    image: fullImageUrl,
    code: productCode,
  });
};

export const generateProductCode = async (req: Request, res: Response) => {
  let newCode = generateEAN13Barcode();

  while (await ProductPriceModel.findOne({ code: newCode })) {
    newCode = generateEAN13Barcode();
  }

  SuccessResponse(res, { code: newCode });
};

export const modelsforselect = async (req: Request, res: Response) => {
  const categories = await CategoryModel.find().lean();
  const brands = await BrandModel.find().lean();
  const variations = await VariationModel.find().lean().populate("options");
  const warehouses = await WarehouseModel.find().lean();

  SuccessResponse(res, { categories, brands, variations, warehouses });
};


// controllers/admin/products.ts


// ═══════════════════════════════════════════════════════════
// IMPORT PRODUCTS FROM EXCEL
// ═══════════════════════════════════════════════════════════
export const importProductsFromExcel = async (req: Request, res: Response) => {
  if (!req.file) {
    throw new BadRequest("Excel file is required");
  }

  const workbook = new ExcelJS.Workbook();
  // Convert multer buffer to ArrayBuffer for ExcelJS compatibility
  const arrayBuffer = req.file.buffer.buffer.slice(
    req.file.buffer.byteOffset,
    req.file.buffer.byteOffset + req.file.buffer.byteLength
  ) as ArrayBuffer;
  await workbook.xlsx.load(arrayBuffer);

  const worksheet = workbook.getWorksheet(1);

  if (!worksheet) {
    throw new BadRequest("Invalid Excel file");
  }

  const products: Array<{
    name: string;
    ar_name: string;
    ar_description: string;
    description: string;
    category: string;
    brand: string;
    code: string;
    price: number;
    cost: number;
    quantity: number;
    unit: string;
    low_stock: number;
    image: string;
  }> = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const name = row.getCell(1).value?.toString().trim() || "";
    const ar_name = row.getCell(2).value?.toString().trim() || "";
    const ar_description = row.getCell(3).value?.toString().trim() || "";
    const description = row.getCell(4).value?.toString().trim() || "";
    const category = row.getCell(5).value?.toString().trim() || "";
    const brand = row.getCell(6).value?.toString().trim() || "";
    const code = row.getCell(7).value?.toString().trim() || "";
    const price = Number(row.getCell(8).value) || 0;
    const cost = Number(row.getCell(9).value) || 0;
    const quantity = Number(row.getCell(10).value) || 0;
    const unit = row.getCell(11).value?.toString().trim() || "";
    const low_stock = Number(row.getCell(12).value) || 0;
    const image = row.getCell(13).value?.toString().trim() || "";

    if (name && ar_name) {
      products.push({
        name,
        ar_name,
        ar_description,
        description,
        category,
        brand,
        code,
        price,
        cost,
        quantity,
        unit,
        low_stock,
        image,
      });
    }
  });

  if (products.length === 0) {
    throw new BadRequest("No valid products found in the file");
  }

  const results = {
    success: [] as string[],
    failed: [] as { name: string; reason: string }[],
    skipped: [] as { name: string; reason: string }[],
  };

  // Get existing categories and brands
  const existingCategories = await CategoryModel.find({}).lean();
  const categoryMap: { [key: string]: string } = {};
  existingCategories.forEach((cat: any) => {
    categoryMap[cat.name.toLowerCase()] = cat._id.toString();
  });

  const existingBrands = await BrandModel.find({}).lean();
  const brandMap: { [key: string]: string } = {};
  existingBrands.forEach((brand: any) => {
    brandMap[brand.name.toLowerCase()] = brand._id.toString();
  });

  // Check existing product codes
  const existingCodes = await ProductModel.find({}, { code: 1 }).lean();
  const codeSet = new Set(existingCodes.map((p: any) => p.code));

  const existingPriceCodes = await ProductPriceModel.find({}, { code: 1 }).lean();
  existingPriceCodes.forEach((p: any) => codeSet.add(p.code));

  for (const prod of products) {
    try {
      // Check if code already exists
      if (prod.code && codeSet.has(prod.code)) {
        results.skipped.push({
          name: prod.name,
          reason: `Code "${prod.code}" already exists`,
        });
        continue;
      }

      // Find category
      let categoryIds: string[] = [];
      if (prod.category) {
        const categories = prod.category.split(",").map((c) => c.trim());
        for (const catName of categories) {
          const catId = categoryMap[catName.toLowerCase()];
          if (catId) {
            categoryIds.push(catId);
          } else {
            // Try to find in database
            const cat = await CategoryModel.findOne({
              name: { $regex: new RegExp(`^${catName}$`, "i") },
            });
            if (cat) {
              categoryIds.push(cat._id.toString());
              categoryMap[catName.toLowerCase()] = cat._id.toString();
            }
          }
        }
      }

      if (categoryIds.length === 0) {
        results.failed.push({
          name: prod.name,
          reason: `Category "${prod.category}" not found`,
        });
        continue;
      }

      // Find brand (optional)
      let brandId = null;
      if (prod.brand) {
        brandId = brandMap[prod.brand.toLowerCase()];
        if (!brandId) {
          const brand = await BrandModel.findOne({
            name: { $regex: new RegExp(`^${prod.brand}$`, "i") },
          });
          if (brand) {
            brandId = brand._id.toString();
            brandMap[prod.brand.toLowerCase()] = brandId;
          }
        }
      }

      // Create product
      const newProduct = await ProductModel.create({
        name: prod.name,
        ar_name: prod.ar_name,
        ar_description: prod.ar_description || prod.ar_name,
        description: prod.description || "",
        categoryId: categoryIds,
        brandId: brandId || undefined,
        code: prod.code || undefined,
        price: prod.price,
        cost: prod.cost,
        quantity: prod.quantity,
        unit: prod.unit || undefined,
        low_stock: prod.low_stock || 0,
        image: prod.image || undefined,
      });

      // Update category product count
      for (const catId of categoryIds) {
        await CategoryModel.findByIdAndUpdate(catId, {
          $inc: { product_quantity: 1 },
        });
      }

      if (prod.code) {
        codeSet.add(prod.code);
      }

      results.success.push(prod.name);
    } catch (error: any) {
      results.failed.push({
        name: prod.name,
        reason: error.message || "Unknown error",
      });
    }
  }

  return SuccessResponse(res, {
    message: "Import completed",
    total: products.length,
    success_count: results.success.length,
    failed_count: results.failed.length,
    skipped_count: results.skipped.length,
    success: results.success,
    failed: results.failed,
    skipped: results.skipped,
  });
};





