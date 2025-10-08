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


export const createProduct = async (req: Request, res: Response) => {
  const {
    name,
    image,
    categoryId,
    brandId,
    unit,
    price,
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
    prices,
    gallery
  } = req.body;

  if (!name) throw new BadRequest("Product name is required");

  // ✅ تحقق من أن categoryId مصفوفة
  if (!Array.isArray(categoryId) || categoryId.length === 0) {
    throw new BadRequest("At least one categoryId is required");
  }

  // ✅ التحقق من وجود الكاتيجوريات
  const existitcategories = await CategoryModel.find({ _id: { $in: categoryId } });
  if (existitcategories.length !== categoryId.length) {
    throw new BadRequest("One or more categories not found");
  }

  // ✅ التحقق من وجود البراند
  const existitbrand = await BrandModel.findById(brandId);
  if (!existitbrand) throw new BadRequest("Brand not found");

  // ✅ زيادة عدد المنتجات داخل كل كاتيجوري
  for (const cat of existitcategories) {
    cat.product_quantity += 1;
    await cat.save();
  }

  // 🖼️ حفظ الصورة الرئيسية
  let imageUrl = image;
  if (image && image.startsWith("data:")) {
    imageUrl = await saveBase64Image(image, Date.now().toString(), req, "products");
  }

  // 🖼️ حفظ صور الجاليري
  let galleryUrls: string[] = [];
  if (gallery && Array.isArray(gallery)) {
    for (const g of gallery) {
      if (g.startsWith("data:")) {
        const imgUrl = await saveBase64Image(g, Date.now().toString(), req, "products");
        galleryUrls.push(imgUrl);
      } else {
        galleryUrls.push(g);
      }
    }
  }

  // ✅ تحقق من العلاقات الشرطية
  if (exp_ability && !date_of_expiery) {
    throw new BadRequest("Expiry date is required when exp_ability is true");
  }

  if (show_quantity && !maximum_to_show) {
    throw new BadRequest("Maximum to show is required when show_quantity is true");
  }

  // ✅ إنشاء المنتج الأساسي
  const product = await ProductModel.create({
    name,
    image: imageUrl,
    categoryId,
    brandId,
    unit,
    price,
    quantity: 0,
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
    gallery: galleryUrls,
  });

  // ✅ إنشاء الأسعار (ProductPrice)
  let totalQuantity = 0;
  if (Array.isArray(prices)) {
    for (const p of prices) {
      // 🖼️ حفظ صور الجاليري الخاصة بالسعر
      let priceGalleryUrls: string[] = [];
      if (p.gallery && Array.isArray(p.gallery)) {
        for (const g of p.gallery) {
          if (g.startsWith("data:")) {
            const gUrl = await saveBase64Image(g, Date.now().toString(), req, "product_gallery");
            priceGalleryUrls.push(gUrl);
          } else {
            priceGalleryUrls.push(g);
          }
        }
      }

      // إنشاء سجل السعر
      const productPrice = await ProductPriceModel.create({
        productId: product._id,
        price: p.price,
        code: p.code,
        gallery: priceGalleryUrls,
        quantity: p.quantity || 0,
      });

      totalQuantity += p.quantity || 0;

      // ✅ إضافة الـ Options
      if (p.options && Array.isArray(p.options)) {
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

  SuccessResponse(res, {
    message: "Product created successfully",
    product,
  });
};



// ✅ READ (with populate)
export const getProduct = async (req: Request, res: Response): Promise<void> => {
  const products = await ProductModel.find()
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();


    const categories = await CategoryModel.find().lean();
    const brands = await BrandModel.find().lean();
    const variations = await VariationModel.find()
    .populate("options") // جاي من الـ virtual
    .lean();

  SuccessResponse(res, {products,  categories, brands ,variations  });
};

export const updateProduct = async (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    image,
    categoryId,
    brandId,
    unit,
    price,
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
    prices, // Array of prices with optional _id and options
    gallery
  } = req.body;

  const product = await ProductModel.findById(id);
  if (!product) throw new NotFound("Product not found");

  // ✅ تحديث الصورة
  if (image && image.startsWith("data:")) {
    product.image = await saveBase64Image(image, Date.now().toString(), req, "products");
  } else if (image) {
    product.image = image;
  }

  if (gallery && Array.isArray(gallery)) {
    let galleryUrles: string[] = [];
    for (const g of gallery) {
      if (g.startsWith("data:")) {
        const gUrl = await saveBase64Image(g, Date.now().toString(), req, "product_gallery");
        galleryUrles.push(gUrl);
      } else {
        galleryUrles.push(g);
      }
    }
    product.gallery = galleryUrles;
  }

  // ✅ تحديث باقي الحقول (من غير quantity)
  product.name = name ?? product.name;
  product.categoryId = categoryId ?? product.categoryId;
  product.brandId = brandId ?? product.brandId;
  product.unit = unit ?? product.unit;
  product.price = price ?? product.price;
  product.description = description ?? product.description;
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

  await product.save();

  // ✅ تحديث/اضافة/حذف الأسعار والخيارات
  let totalQuantity = 0;
  if (prices && Array.isArray(prices)) {
    for (const p of prices) {
      let productPrice;

      if (p._id) {
        // update
        productPrice = await ProductPriceModel.findByIdAndUpdate(
          p._id,
          { price: p.price, code: p.code, quantity: p.quantity || 0 },
          { new: true }
        );
      } else {
        // create جديد
        let galleryUrls: string[] = [];
        if (p.gallery && Array.isArray(p.gallery)) {
          for (const g of p.gallery) {
            if (g.startsWith("data:")) {
              const gUrl = await saveBase64Image(g, Date.now().toString(), req, "product_gallery");
              galleryUrls.push(gUrl);
            } else {
              galleryUrls.push(g);
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

      // ✅ تحديث الـ options
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

  // ✅ تحديث الكمية النهائية
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

export const getOneProduct = async (req: Request, res: Response) => {
  const { id } = req.params;

  const product = await ProductModel.findById(id)
    .populate("categoryId")
    .populate("brandId")
    .populate("taxesId")
    .lean();
    const categories = await CategoryModel.find().lean();
    const brands = await BrandModel.find().lean();
 const variations = await VariationModel.find()
    .populate("options") // جاي من الـ virtual
    .lean();


  if (!product) throw new NotFound("Product not found");

  const prices = await ProductPriceModel.find({ productId: product._id }).lean();

  for (const price of prices) {
    const options = await ProductPriceOptionModel.find({
      product_price_id: price._id,
    })
      .populate("option_id")
      .lean();

    (price as any).options = options.map((o) => o.option_id);
  }

  (product as any).prices = prices;

  SuccessResponse(res, {product,  categories, brands , variations  });
};





export const generateBarcodeImageController = async (req: Request, res: Response) => {
     const { product_id } = req.params;
    if (!product_id) throw new BadRequest("Product ID is required");

    // find the product price (not product itself)
    const productPrice = await ProductPriceModel.findById(product_id);
    if (!productPrice) throw new NotFound("Product price not found");

    // get code from product price
    const productCode = productPrice.code;
    if (!productCode) throw new BadRequest("Product price does not have a code yet");

    // generate barcode image file
    const imageLink = await generateBarcodeImage(productCode, productCode);

    // build full url for client access
    const fullImageUrl = `${req.protocol}://${req.get("host")}${imageLink}`;

    SuccessResponse(res, { image: fullImageUrl })
    };

export const generateProductCode = async (req: Request, res: Response) => {
  let newCode = generateEAN13Barcode();

  // التأكد من عدم التكرار
  while (await ProductPriceModel.findOne({ code: newCode })) {
    newCode = generateEAN13Barcode();
  }

  SuccessResponse(res, { code: newCode });
};