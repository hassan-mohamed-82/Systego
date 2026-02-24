// controllers/admin/PandelController.ts
import { Request, Response } from "express";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { ProductModel } from "../../models/schema/admin/products";
import { PandelModel } from "../../models/schema/admin/pandels";
import { ProductPriceModel, ProductPriceOptionModel } from "../../models/schema/admin/product_price";
import { deletePhotoFromServer } from "../../utils/deleteImage";
import mongoose from "mongoose";

// ═══════════════════════════════════════════════════════════
// 📦 GET ALL PANDELS (Admin)
// ═══════════════════════════════════════════════════════════
export const getPandels = async (req: Request, res: Response) => {
  const pandels = await PandelModel.find({ status: true })
    .populate({
      path: "products.productId",
      select: "name ar_name price image",
    })
    .populate({
      path: "products.productPriceId",
      select: "price code",
    })
    .lean();

  return SuccessResponse(res, {
    message: "Pandels found successfully",
    pandels,
  });
};

// ═══════════════════════════════════════════════════════════
// 📦 GET PANDEL BY ID (Admin)
// ═══════════════════════════════════════════════════════════
export const getPandelById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) throw new BadRequest("Pandel id is required");

  const pandel = await PandelModel.findById(id)
    .populate({
      path: "products.productId",
      select: "name ar_name price image",
    })
    .populate({
      path: "products.productPriceId",
      select: "price code",
    })
    .lean();

  if (!pandel) throw new NotFound("Pandel not found");

  // جلب كل الـ Variations لكل منتج
  const productsWithVariations = await Promise.all(
    (pandel.products || []).map(async (p: any) => {
      const variations = await ProductPriceModel.find({
        productId: p.productId?._id || p.productId,
      })
        .select("price code quantity")
        .lean();

      // جلب Options لكل Variation
      const variationsWithOptions = await Promise.all(
        variations.map(async (v: any) => {
          const options = await ProductPriceOptionModel.find({
            product_price_id: v._id,
          })
            .populate("option_id", "name ar_name")
            .lean();

          return {
            ...v,
            options: options.map((o: any) => o.option_id),
          };
        })
      );

      return {
        ...p,
        availableVariations: variationsWithOptions,
        hasVariations: variationsWithOptions.length > 0,
      };
    })
  );

  return SuccessResponse(res, {
    message: "Pandel found successfully",
    pandel: {
      ...pandel,
      products: productsWithVariations,
    },
  });
};

// ═══════════════════════════════════════════════════════════
// ➕ CREATE PANDEL (Admin)
// ═══════════════════════════════════════════════════════════
export const createPandel = async (req: Request, res: Response) => {
  const { name, products, images, startdate, enddate, status = true, price } = req.body;

  // Validation
  if (!name) throw new BadRequest("Name is required");
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new BadRequest("At least one product is required");
  }
  if (!startdate) throw new BadRequest("Start date is required");
  if (!enddate) throw new BadRequest("End date is required");
  if (!price || price <= 0) throw new BadRequest("Valid price is required");

  // Validate each product
  const validatedProducts = [];

  for (const p of products) {
    if (!p.productId) {
      throw new BadRequest("Each product must have productId");
    }

    if (!mongoose.Types.ObjectId.isValid(p.productId)) {
      throw new BadRequest(`Invalid productId: ${p.productId}`);
    }

    // Check product exists
    const product = await ProductModel.findById(p.productId);
    if (!product) {
      throw new BadRequest(`Product ${p.productId} not found`);
    }

    // If productPriceId specified, validate it
    if (p.productPriceId) {
      if (!mongoose.Types.ObjectId.isValid(p.productPriceId)) {
        throw new BadRequest(`Invalid productPriceId: ${p.productPriceId}`);
      }

      const productPrice = await ProductPriceModel.findOne({
        _id: p.productPriceId,
        productId: p.productId,
      });

      if (!productPrice) {
        throw new BadRequest(
          `ProductPrice ${p.productPriceId} not found or doesn't belong to product ${p.productId}`
        );
      }
    }

    validatedProducts.push({
      productId: p.productId,
      productPriceId: p.productPriceId || null,
      quantity: p.quantity || 1,
    });
  }

  // Check duplicate name
  const existingPandel = await PandelModel.findOne({ name });
  if (existingPandel) {
    throw new BadRequest("Pandel name already exists");
  }

  // Save images
  let imageUrls: string[] = [];
  if (images && Array.isArray(images) && images.length > 0) {
    for (const [index, base64Image] of images.entries()) {
      if (base64Image && base64Image.startsWith("data:image")) {
        const imageUrl = await saveBase64Image(
          base64Image,
          `${Date.now()}_${index}`,
          req,
          "pandels"
        );
        imageUrls.push(imageUrl);
      } else if (base64Image) {
        imageUrls.push(base64Image);
      }
    }
  }

  // Create Pandel
  const pandel = await PandelModel.create({
    name,
    products: validatedProducts,
    images: imageUrls,
    startdate: new Date(startdate),
    enddate: new Date(enddate),
    status,
    price,
  });

  // Populate and return
  const populatedPandel = await PandelModel.findById(pandel._id)
    .populate({
      path: "products.productId",
      select: "name ar_name price image",
    })
    .populate({
      path: "products.productPriceId",
      select: "price code",
    })
    .lean();

  return SuccessResponse(res, {
    message: "Pandel created successfully",
    pandel: populatedPandel,
  });
};

// ═══════════════════════════════════════════════════════════
// ✏️ UPDATE PANDEL (Admin)
// ═══════════════════════════════════════════════════════════
export const updatePandel = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) throw new BadRequest("Pandel id is required");

  const pandel = await PandelModel.findById(id);
  if (!pandel) throw new NotFound("Pandel not found");

  const updateData: any = {};

  // Update name
  if (req.body.name !== undefined) {
    const existingPandel = await PandelModel.findOne({
      name: req.body.name,
      _id: { $ne: id },
    });
    if (existingPandel) {
      throw new BadRequest("Pandel name already exists");
    }
    updateData.name = req.body.name;
  }

  // Update products
  if (req.body.products) {
    const validatedProducts = [];

    for (const p of req.body.products) {
      if (!p.productId) {
        throw new BadRequest("Each product must have productId");
      }

      const product = await ProductModel.findById(p.productId);
      if (!product) {
        throw new BadRequest(`Product ${p.productId} not found`);
      }

      if (p.productPriceId) {
        const productPrice = await ProductPriceModel.findOne({
          _id: p.productPriceId,
          productId: p.productId,
        });

        if (!productPrice) {
          throw new BadRequest(
            `ProductPrice ${p.productPriceId} not found or doesn't belong to product ${p.productId}`
          );
        }
      }

      validatedProducts.push({
        productId: p.productId,
        productPriceId: p.productPriceId || null,
        quantity: p.quantity || 1,
      });
    }

    updateData.products = validatedProducts;
  }

  // Update images
  if (req.body.images) {
    const imageUrls = [];
    for (const [index, base64Image] of req.body.images.entries()) {
      if (base64Image && base64Image.startsWith("data:image")) {
        const imageUrl = await saveBase64Image(
          base64Image,
          `${Date.now()}_${index}`,
          req,
          "pandels"
        );
        imageUrls.push(imageUrl);
      } else if (base64Image) {
        imageUrls.push(base64Image);
      }
    }
    updateData.images = imageUrls;
  }

  // Update other fields
  if (req.body.startdate !== undefined) updateData.startdate = new Date(req.body.startdate);
  if (req.body.enddate !== undefined) updateData.enddate = new Date(req.body.enddate);
  if (req.body.status !== undefined) updateData.status = req.body.status;
  if (req.body.price !== undefined) updateData.price = req.body.price;

  const updatedPandel = await PandelModel.findByIdAndUpdate(id, updateData, { new: true })
    .populate({
      path: "products.productId",
      select: "name ar_name price image",
    })
    .populate({
      path: "products.productPriceId",
      select: "price code",
    })
    .lean();

  return SuccessResponse(res, {
    message: "Pandel updated successfully",
    pandel: updatedPandel,
  });
};

// ═══════════════════════════════════════════════════════════
// 🗑️ DELETE PANDEL (Admin)
// ═══════════════════════════════════════════════════════════
export const deletePandel = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) throw new BadRequest("Pandel id is required");

  const pandel = await PandelModel.findByIdAndDelete(id);

  if (!pandel) throw new NotFound("Pandel not found");

  // Delete images from server
  for (const imageUrl of pandel.images || []) {
    await deletePhotoFromServer(imageUrl);
  }

  return SuccessResponse(res, { message: "Pandel deleted successfully" });
};

// ═══════════════════════════════════════════════════════════
// 🛒 GET ACTIVE BUNDLES FOR POS (مع الـ Variations)
// ═══════════════════════════════════════════════════════════
