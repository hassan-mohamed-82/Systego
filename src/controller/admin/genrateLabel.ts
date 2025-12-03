import { Request, Response } from "express";
import { generateLabelsPDF, PAPER_CONFIGS } from "../../utils/genrateLabel";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { LabelSize } from "../../types/generateLabel";

// ============================================
// Get Available Label Sizes
// ============================================
export const getAvailableLabelSizes = async (req: Request, res: Response) => {
  const labelSizes: LabelSize[] = [
    // A4 Sheets
    {
      id: "65_per_sheet_a4",
      name: "65 Labels - A4",
      description: "5 أعمدة × 13 صف",
      paperType: "A4",
      labelsPerSheet: 65,
      labelSize: "38.1mm × 21.2mm",
      recommended: true,
      useCase: "أسعار صغيرة - باركود",
    },
    {
      id: "40_per_sheet_a4",
      name: "40 Labels - A4",
      description: "4 أعمدة × 10 صفوف",
      paperType: "A4",
      labelsPerSheet: 40,
      labelSize: "48.5mm × 25.4mm",
      recommended: false,
      useCase: "باركود متوسط",
    },
    {
      id: "24_per_sheet_a4",
      name: "24 Labels - A4",
      description: "3 أعمدة × 8 صفوف",
      paperType: "A4",
      labelsPerSheet: 24,
      labelSize: "64mm × 34mm",
      recommended: true,
      useCase: "منتجات متوسطة",
    },
    {
      id: "21_per_sheet_a4",
      name: "21 Labels - A4",
      description: "3 أعمدة × 7 صفوف",
      paperType: "A4",
      labelsPerSheet: 21,
      labelSize: "63.5mm × 38.1mm",
      recommended: false,
      useCase: "منتجات متوسطة",
    },
    {
      id: "14_per_sheet_a4",
      name: "14 Labels - A4",
      description: "2 أعمدة × 7 صفوف",
      paperType: "A4",
      labelsPerSheet: 14,
      labelSize: "99.1mm × 38.1mm",
      recommended: false,
      useCase: "منتجات عريضة",
    },
    {
      id: "8_per_sheet_a4",
      name: "8 Labels - A4",
      description: "2 أعمدة × 4 صفوف",
      paperType: "A4",
      labelsPerSheet: 8,
      labelSize: "99.1mm × 67.7mm",
      recommended: false,
      useCase: "منتجات كبيرة",
    },
    {
      id: "4_per_sheet_a4",
      name: "4 Labels - A4",
      description: "2 أعمدة × 2 صفوف",
      paperType: "A4",
      labelsPerSheet: 4,
      labelSize: "99.1mm × 139mm",
      recommended: false,
      useCase: "شحن - صناديق",
    },
    {
      id: "2_per_sheet_a4",
      name: "2 Labels - A4",
      description: "1 عمود × 2 صفوف",
      paperType: "A4",
      labelsPerSheet: 2,
      labelSize: "199.6mm × 143.5mm",
      recommended: false,
      useCase: "ملصقات كبيرة",
    },

    // Letter Sheets
    {
      id: "80_per_sheet_letter",
      name: "80 Labels - Letter",
      description: "4 أعمدة × 20 صف",
      paperType: "Letter",
      labelsPerSheet: 80,
      labelSize: "44.5mm × 17.5mm",
      recommended: false,
      useCase: "أسعار صغيرة جداً",
    },
    {
      id: "30_per_sheet_letter",
      name: "30 Labels - Letter",
      description: "3 أعمدة × 10 صفوف",
      paperType: "Letter",
      labelsPerSheet: 30,
      labelSize: "66.7mm × 25.4mm",
      recommended: true,
      useCase: "عناوين - Avery 5160",
    },
    {
      id: "20_per_sheet_letter",
      name: "20 Labels - Letter",
      description: "2 أعمدة × 10 صفوف",
      paperType: "Letter",
      labelsPerSheet: 20,
      labelSize: "101.6mm × 25.4mm",
      recommended: false,
      useCase: "عناوين عريضة",
    },
    {
      id: "10_per_sheet_letter",
      name: "10 Labels - Letter",
      description: "2 أعمدة × 5 صفوف",
      paperType: "Letter",
      labelsPerSheet: 10,
      labelSize: "101.6mm × 50.8mm",
      recommended: false,
      useCase: "شحن متوسط",
    },
    {
      id: "6_per_sheet_letter",
      name: "6 Labels - Letter",
      description: "2 أعمدة × 3 صفوف",
      paperType: "Letter",
      labelsPerSheet: 6,
      labelSize: "101.6mm × 84.7mm",
      recommended: false,
      useCase: "شحن كبير",
    },

    // Thermal Labels
    {
      id: "1_per_sheet_4x6",
      name: "4×6 inch",
      description: "Label واحد - حراري",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "101.6mm × 152.4mm",
      recommended: true,
      useCase: "شحن - DHL, FedEx",
    },
    {
      id: "1_per_sheet_4x4",
      name: "4×4 inch",
      description: "Label واحد - حراري",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "101.6mm × 101.6mm",
      recommended: false,
      useCase: "منتجات مربعة",
    },
    {
      id: "1_per_sheet_3x2",
      name: "3×2 inch",
      description: "Label واحد - حراري",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "76.2mm × 50.8mm",
      recommended: true,
      useCase: "منتجات صغيرة",
    },
    {
      id: "1_per_sheet_2x1",
      name: "2×1 inch",
      description: "Label واحد - حراري",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "50.8mm × 25.4mm",
      recommended: false,
      useCase: "باركود صغير",
    },

    // Roll Labels
    {
      id: "1_per_sheet_58mm",
      name: "58mm Roll",
      description: "لفة 58mm",
      paperType: "Roll",
      labelsPerSheet: 1,
      labelSize: "58mm × 40mm",
      recommended: true,
      useCase: "طابعات الفواتير",
    },
    {
      id: "1_per_sheet_80mm",
      name: "80mm Roll",
      description: "لفة 80mm",
      paperType: "Roll",
      labelsPerSheet: 1,
      labelSize: "80mm × 50mm",
      recommended: false,
      useCase: "طابعات الفواتير الكبيرة",
    },
  ];

  SuccessResponse(res, { labelSizes }, 200);
};

// ============================================
// Generate Labels PDF
// ============================================
export const generateLabelsController = async (req: Request, res: Response) => {
  const { products, labelConfig, paperSize } = req.body;

  // Validation
  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new BadRequest("Products array is required");
  }

  // Validate paper size
  if (!paperSize || !PAPER_CONFIGS[paperSize]) {
    throw new BadRequest(
      `Invalid paper size. Available sizes: ${Object.keys(PAPER_CONFIGS).join(", ")}`
    );
  }

  // Validate each product
  for (const product of products) {
    if (!product.productId || !product.productPriceId || !product.quantity) {
      throw new BadRequest(
        "Each product must have productId, productPriceId, and quantity"
      );
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

  // Generate PDF
  const pdfBuffer = await generateLabelsPDF(products, finalConfig, paperSize);

  // Send PDF
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", "inline; filename=labels.pdf");
  res.send(pdfBuffer);
};
