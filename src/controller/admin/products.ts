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

export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    ar_name,
    image,
    categoryId,
    brandId,
    unit,
    price,            // السعر الأساسي (لو مفيش variations)
    quantity,         // الكمية الأساسية (لو مفيش variations)
    ar_description,
    description,
    exp_ability,
    date_of_expiery,
    minimum_quantity_sale,
    low_stock,
    whole_price,
    start_quantaty,
    taxesId,
    product_has_imei,
    different_price,
    show_quantity,
    maximum_to_show,
    prices,           // variations
    gallery_product,
    is_featured,
  } = req.body;

  if (!name) throw new BadRequest("Product name is required");
  if (!ar_name) throw new BadRequest("Arabic name is required");
  if (!ar_description) throw new BadRequest("Arabic description is required");

  // 🎯 هل في variations ولا لأ؟
  const hasVariations = Array.isArray(prices) && prices.length > 0;

  // لو مفيش variations لازم price + quantity
  if (!hasVariations) {
    if (price === undefined || price === null) {
      throw new BadRequest("Product price is required when there are no variations");
    }
    if (quantity === undefined || quantity === null) {
      throw new BadRequest("Product quantity is required when there are no variations");
    }
  }

  // categoryId لازم تبقى array فيها واحد على الأقل
  if (!Array.isArray(categoryId) || categoryId.length === 0) {
    throw new BadRequest("At least one categoryId is required");
  }

  // تأكد إن كل الـ categories موجودة
  const existitcategories = await CategoryModel.find({
    _id: { $in: categoryId },
  });
  if (existitcategories.length !== categoryId.length) {
    throw new BadRequest("One or more categories not found");
  }

  // تأكد من الـ brand
  if (brandId) {
    const existitbrand = await BrandModel.findById(brandId);
    if (!existitbrand) throw new BadRequest("Brand not found");
  }

  // زوّد عدّاد المنتجات في كل كاتيجوري
  for (const cat of existitcategories) {
    cat.product_quantity += 1;
    await cat.save();
  }

  // 🖼️ الصورة الرئيسية
  let imageUrl: string | undefined;
  if (image) {
    imageUrl = await saveBase64Image(
      image,
      Date.now().toString(),
      req,
      "products"
    );
  }

  // 🖼️ صور الجاليري للمنتج
  let galleryUrls: string[] = [];
  if (gallery_product && Array.isArray(gallery_product)) {
    for (const g of gallery_product) {
      if (typeof g === "string") {
        const imgUrl = await saveBase64Image(
          g,
          Date.now().toString(),
          req,
          "products"
        );
        galleryUrls.push(imgUrl);
      }
    }
  }

  // علاقات الـ expiry
  if (exp_ability && !date_of_expiery) {
    throw new BadRequest("Expiry date is required when exp_ability is true");
  }

  if (date_of_expiery) {
    const expiryDate = new Date(date_of_expiery);
    const today = new Date();
    expiryDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);
    if (expiryDate < today) {
      throw new BadRequest("Expiry date cannot be before today");
    }
  }

  if (show_quantity && !maximum_to_show) {
    throw new BadRequest(
      "Maximum to show is required when show_quantity is true"
    );
  }

  // ✅ قيم مبدئية عشان السكيمة بتطلب price / quantity required
  const basePrice = hasVariations ? 0 : Number(price);
  const baseQuantity = hasVariations ? 0 : Number(quantity || 0);

  // إنشاء المنتج الأساسي
  const product = await ProductModel.create({
    name,
    ar_name,
    ar_description,
    image: imageUrl,
    categoryId,
    brandId,
    unit,
    price: basePrice,            // هيتعدل لو فيه variations
    quantity: baseQuantity,      // هيتعدل لو فيه variations
    description,
    exp_ability,
    date_of_expiery,
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

  // ======================================================
  // ✅ لو فيه variations: ننشئ ProductPrice + Options
  //    ونحسب أقل سعر + مجموع الكميات
  // ======================================================
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

      // 🖼️ صور الجاليري لكل variation
      let priceGalleryUrls: string[] = [];
      if (p.gallery && Array.isArray(p.gallery)) {
        for (const g of p.gallery) {
          if (typeof g === "string") {
            const gUrl = await saveBase64Image(
              g,
              Date.now().toString(),
              req,
              "product_gallery"
            );
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
      });

      totalQuantity += variantQty;

      if (minVariantPrice === null || variantPrice < minVariantPrice) {
        minVariantPrice = variantPrice;
      }

      // Options لو موجودة
      if (p.options && Array.isArray(p.options)) {
        for (const opt of p.options) {
          await ProductPriceOptionModel.create({
            product_price_id: productPrice._id,
            option_id: opt,
          });
        }
      }
    }

    // بعد إنشاء كل الـ variations:
    product.quantity = totalQuantity;              // مجموع الكميات
    product.price = minVariantPrice ?? 0;          // أقل سعر
    await product.save();
  }

  SuccessResponse(res, {
    message: "Product created successfully",
    product,
  });
};


// ✅ READ (with populate)
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  // 🟢 1️⃣ جلب كل المنتجات
  const products = await ProductModel.find()
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();

  // 🟢 2️⃣ جلب كل الـ variations مرة واحدة فقط
  const variations = await VariationModel.find().lean();

  // 🟢 3️⃣ تجهيز الاستعلامات بشكل متوازي لكل منتج
  const formattedProducts = await Promise.all(
    products.map(async (product) => {
      // 🔹 جلب الأسعار الخاصة بالمنتج
      const prices = await ProductPriceModel.find({ productId: product._id }).lean();

      // 🔹 تجهيز الأسعار + options في توازي
      const formattedPrices = await Promise.all(
        prices.map(async (price) => {
          const options = await ProductPriceOptionModel.find({ product_price_id: price._id })
            .populate({
              path: "option_id",
              select: "_id name variationId", // ✅ عشان نتأكد إن variationId متجاب
            })
            .lean();

          // 🔹 تجميع الخيارات حسب الـ variation
          const groupedOptions: Record<string, any[]> = {};

          for (const po of options) {
            // ✅ تعريف option بشكل صريح بعد الـ populate
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

  // 🟢 4️⃣ إرسال الريسبونس النهائي
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
    price,
    description,
    ar_description,
    exp_ability,
    date_of_expiery,
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
    is_featured
  } = req.body;

  const product = await ProductModel.findById(id);
  if (!product) throw new NotFound("Product not found");

  // ✅ تحقق من أن تاريخ الانتهاء اليوم أو بعد اليوم
  if (date_of_expiery) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(date_of_expiery);
    expiry.setHours(0, 0, 0, 0);

    if (expiry < today) {
      return res.status(400).json({ message: "Expiry date cannot be in the past" });
    }
  }

  // ✅ تحديث الصورة (يدعم base64 مع أو بدون prefix)
  if (image) {
    product.image = await saveBase64Image(image, Date.now().toString(), req, "products");
  }

  // ✅ تحديث الجاليري (يدعم base64 مع أو بدون prefix)
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

  // ✅ تحديث باقي الحقول
  product.name = name ?? product.name;
  product.ar_name = ar_name ?? product.ar_name;
  product.categoryId = categoryId ?? product.categoryId;
  product.brandId = brandId ?? product.brandId;
  product.unit = unit ?? product.unit;
  product.price = price ?? product.price;
  product.description = description ?? product.description;
  product.ar_description = ar_description ?? product.ar_description;
  product.exp_ability = exp_ability ?? product.exp_ability;
  product.date_of_expiery = date_of_expiery ?? product.date_of_expiery;
  product.minimum_quantity_sale = minimum_quantity_sale ?? product.minimum_quantity_sale;
  product.low_stock = low_stock ?? product.low_stock;
  product.whole_price = whole_price ?? product.whole_price;
  product.start_quantaty = start_quantaty ?? product.start_quantaty;
  product.taxesId = taxesId ?? product.taxesId;
  product.product_has_imei = product_has_imei ?? product.product_has_imei;
  product.different_price = different_price ?? product.different_price;
  product.show_quantity = show_quantity ?? product.show_quantity;
  product.maximum_to_show = maximum_to_show ?? product.maximum_to_show;
  product.is_featured = is_featured ?? product.is_featured;

  await product.save();

  // ✅ تحديث / إنشاء / حذف الأسعار والخيارات
  let totalQuantity = 0;
  if (prices && Array.isArray(prices)) {
    for (const p of prices) {
      let productPrice;

      if (p._id) {
        // تحديث سعر موجود
        productPrice = await ProductPriceModel.findByIdAndUpdate(
          p._id,
          { price: p.price, code: p.code, quantity: p.quantity || 0 },
          { new: true }
        );
      } else {
        // إنشاء سعر جديد
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
          gallery: galleryUrls,
        });
      }

      totalQuantity += p.quantity || 0;

      // ✅ تحديث الخيارات
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

  // ✅ تحديث كمية المنتج النهائية
  product.quantity = totalQuantity;
  await product.save();

  SuccessResponse(res, { message: "Product updated successfully", product });
};

// ✅ DELETE
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

  // 🟢 1️⃣ جلب المنتج الأساسي
  const product = await ProductModel.findById(id)
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();

  if (!product) throw new NotFound("Product not found");

  // 🟢 2️⃣ جلب كل الـ variations مرة واحدة فقط
  const variations = await VariationModel.find().lean();

  // 🟢 3️⃣ جلب الأسعار الخاصة بالمنتج
  const prices = await ProductPriceModel.find({ productId: product._id }).lean();

  // 🟢 4️⃣ تجهيز الأسعار + الخيارات المرتبطة بها
  const formattedPrices = await Promise.all(
    prices.map(async (price) => {
      const options = await ProductPriceOptionModel.find({ product_price_id: price._id })
        .populate({
          path: "option_id",
          select: "_id name variationId", // ✅ لازم يكون الحقل في الـ Option schema
        })
        .lean();

      // 🔹 تجميع الخيارات حسب الـ variation
      const groupedOptions: Record<string, any[]> = {};

      for (const po of options) {
        const option = po.option_id as any;
        if (!option?._id) continue;

        // 🔹 ربط الخيار بالـ variation
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

      // 🔹 تحويلها إلى مصفوفة نهائية
      const variationsArray = Object.keys(groupedOptions).map((varName) => ({
        name: varName,
        options: groupedOptions[varName],
      }));

      // ✅ ترتيب النتيجة النهائية
      return {
        _id: price._id,
        productId: price.productId,
        price: price.price,
        code: price.code,
        gallery: price.gallery,
        quantity: price.quantity,
        createdAt: price.createdAt,
        updatedAt: price.updatedAt,
        __v: price.__v,
        variations: variationsArray,
      };
    })
  );

  // 🟢 5️⃣ دمج الأسعار داخل المنتج
  (product as any).prices = formattedPrices;

  // 🟢 6️⃣ إرسال الريسبونس النهائي
  SuccessResponse(res, {
    product,
    message: "Product fetched successfully",
  });
};

export const getProductByCode = async (req: Request, res: Response) => {
  const { code } = req.body;

  if (!code) throw new BadRequest("Code is required");

  // 1️⃣ ابحث عن السعر اللي بالكود ده
  const productPrice = await ProductPriceModel.findOne({ code }).lean();
  if (!productPrice) throw new NotFound("No product found for this code");

  // 2️⃣ ابحث عن المنتج المرتبط بالسعر ده
  const product = await ProductModel.findById(productPrice.productId)
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();

  if (!product) throw new NotFound("Product not found");

  // 3️⃣ جيب كل الـ variations مع options
  const variations = await VariationModel.find().populate("options").lean();

  // 4️⃣ جيب الكاتيجوريز و البراندز
  const categories = await CategoryModel.find().lean();
  const brands = await BrandModel.find().lean();

  // 5️⃣ جيب الخيارات المرتبطة بالسعر ده
  const options = await ProductPriceOptionModel.find({ product_price_id: productPrice._id })
    .populate("option_id")
    .lean();

  // 6️⃣ جمّع الخيارات حسب الـ variation
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

  // 7️⃣ أضف السعر داخل المنتج
  (product as any).price = {
    ...productPrice,
    variations: variationsArray,
  };

  // 8️⃣ رجّع كل البيانات
  SuccessResponse(res, {
    product,
    categories,
    brands,
    variations,
  });
};




export const generateBarcodeImageController = async (req: Request, res: Response) => {
  
    const { product_price_id } = req.params; // 👈 غيرنا الاسم ليكون واضح أكثر
    if (!product_price_id) throw new BadRequest("Product price ID is required");

    const productPrice = await ProductPriceModel.findById(product_price_id);
    if (!productPrice) throw new NotFound("Product price not found");

    // 🟢 ناخد الكود الخاص بالسعر
    const productCode = productPrice.code;
    if (!productCode) throw new BadRequest("Product price does not have a code yet");

    // 🟢 نولّد صورة الباركود
    const imageLink = await generateBarcodeImage(productCode, productCode);

    // 🟢 نكوّن لينك كامل يوصل للعميل
    const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;

    SuccessResponse(res, {
      image: fullImageUrl,
      code: productCode,
    });
  
};


export const generateProductCode = async (req: Request, res: Response) => {
  let newCode = generateEAN13Barcode();

  // التأكد من عدم التكرار
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