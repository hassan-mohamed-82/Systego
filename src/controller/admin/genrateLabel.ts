// controllers/label.controller.ts
import { Request, Response } from "express";
import { generateLabelsPDF } from "../../utils/genrateLabel";
import { BadRequest} from "../../Errors/BadRequest";
import { NotFound } from "../../Errors";
import { SuccessResponse } from "../../utils/response";

export const generateLabelsController = async (req: Request, res: Response) => {
  const { products, labelConfig, paperSize } = req.body;

  // Validation
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new BadRequest("Products array is required");
  }

  // Validate each product
  for (const product of products) {
    if (!product.productId || !product.productPriceId || !product.quantity) {
      throw new BadRequest("Each product must have productId, productPriceId, and quantity");
    }
    if (product.quantity < 1) {
      throw new BadRequest("Quantity must be at least 1");
    }
  }

  // Default config
  const defaultLabelConfig = {
    showProductName: true,
    showPrice: true,
    showPromotionalPrice: true,
    showBusinessName: true,
    showBrand: true,
    productNameSize: 15,
    priceSize: 15,
    promotionalPriceSize: 15,
    businessNameSize: 15,
    brandSize: 15,
  };

  const finalConfig = { ...defaultLabelConfig, ...labelConfig };
  const finalPaperSize = paperSize || "20_per_sheet_8.5x11";

  // Generate PDF
  const pdfBuffer = await generateLabelsPDF(products, finalConfig, finalPaperSize);

  // Send PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=labels.pdf");
  res.send(pdfBuffer);
};