import { Request, Response } from "express";
import { BadRequest } from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";
import { saveBase64Image } from "../../utils/handleImages";
import { ProductModel } from "../../models/schema/admin/products";
import { PandelModel } from "../../models/schema/admin/pandels";
import { deletePhotoFromServer } from "../../utils/deleteImage";

export const getPandels = async (req: Request, res: Response) => {
    const pandels = await PandelModel.find({status: true}).populate('productsId', 'name price');
    return SuccessResponse(res, { message: "Pandels found successfully", pandels });
}
export const getPandelById = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Pandel id is required");
    const pandel = await PandelModel.findById(id).populate('productsId', 'name');
    if (!pandel) throw new NotFound("Pandel not found");
    return SuccessResponse(res, { message: "Pandel found successfully", pandel });
}

export const createPandel = async (req: Request, res: Response) => {
    const { name, productsId, images,startdate, enddate, status ,price } = req.body;
    if (!name || !productsId || !images || !startdate || !enddate || status===true || !price) throw new BadRequest("All fields are required");
    const imageUrls = [];
    for (const [index, base64Image] of images.entries()) {
        const imageUrl = await saveBase64Image(base64Image, `${Date.now()}_${index}`, req, "pandels");
        imageUrls.push(imageUrl);
    }
    const existingProducts = await ProductModel.find({ _id: { $in: productsId } });
    if (existingProducts.length !== productsId.length) {
        throw new BadRequest("Some products not found");
    }

    const existingPandel = await PandelModel.findOne({ name });
    if (existingPandel) {
        throw new BadRequest("Pandel name already exists");
    }

    const pandel = await PandelModel.create({ name, productsId, images: imageUrls ,startdate, enddate, status,price});
    return SuccessResponse(res, { message: "Pandel created successfully", pandel });
}

export const updatePandel = async (req: Request, res: Response) => {
    const { id } = req.params;
    if (!id) throw new BadRequest("Pandel id is required");
    const updateData: any = { ...req.body };
    if (req.body.images) {
        const imageUrls = [];
        for (const [index, base64Image] of req.body.images.entries()) {
            const imageUrl = await saveBase64Image(base64Image, `${Date.now()}_${index}`, req, "pandels");
            imageUrls.push(imageUrl);
        }
        updateData.images = imageUrls;
    }
    if (req.body.productsId) {
        const existingProducts = await ProductModel.find({ _id: { $in: req.body.productsId } });
        if (existingProducts.length !== req.body.productsId.length) {
            throw new BadRequest("Some products not found");
        }
    }
    const pandel = await PandelModel.findByIdAndUpdate(id, updateData, { new: true });
    if (!pandel) throw new NotFound("Pandel not found");
    return SuccessResponse(res, { message: "Pandel updated successfully", pandel });
  }

export const deletePandel = async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) throw new BadRequest("Pandel id is required");
  
  const pandel = await PandelModel.findByIdAndDelete(id);
  
  if (!pandel) throw new NotFound("Pandel not found");
  
  // Delete images from server
  for (const imageUrl of pandel.images) {
    await deletePhotoFromServer(imageUrl); // ← بدون req
  }
  
  return SuccessResponse(res, { message: "Pandel deleted successfully" });
};



// get active bundles (pandels) for POS
export const getActiveBundles = async (req: Request, res: Response) => {
  const currentDate = new Date();

  // جلب الـ Bundles النشطة فقط (في نطاق التاريخ)
  const bundles = await PandelModel.find({
    status: true,
    startdate: { $lte: currentDate },
    enddate: { $gte: currentDate },
  }).populate("productsId", "name price image ar_name");

  // حساب السعر الأصلي ونسبة التوفير
  const bundlesWithPricing = bundles.map((bundle) => {
    const products = bundle.productsId as any[];

    // حساب السعر الأصلي (مجموع أسعار المنتجات)
    const originalPrice = products.reduce((sum, product) => {
      return sum + (product.price || 0);
    }, 0);

    // حساب التوفير
    const savings = originalPrice - bundle.price;
    const savingsPercentage =
      originalPrice > 0 ? Math.round((savings / originalPrice) * 100) : 0;

    return {
      _id: bundle._id,
      name: bundle.name,
      images: bundle.images,
      products: products.map((p) => ({
        _id: p._id,
        name: p.name,
        ar_name: p.ar_name,
        price: p.price,
        image: p.image,
      })),
      originalPrice: originalPrice,
      bundlePrice: bundle.price,
      savings: savings,
      savingsPercentage: savingsPercentage,
      startdate: bundle.startdate,
      enddate: bundle.enddate,
    };
  });

  SuccessResponse(res, {
    message: "Active bundles",
    bundles: bundlesWithPricing,
  });
};
