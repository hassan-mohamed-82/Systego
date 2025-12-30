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
    {
      id: "100x50",
      name: "100×50mm (كراتين كبيرة)",
      description: "كراتين كبيرة",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "100mm × 50mm",
      recommended: false,
      useCase: "كراتين - شحن",
    },
    {
      id: "80x50",
      name: "80×50mm (منتجات كبيرة)",
      description: "منتجات كبيرة",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "80mm × 50mm",
      recommended: false,
      useCase: "منتجات كبيرة",
    },
    {
      id: "70x40",
      name: "70×40mm (باركود واضح)",
      description: "باركود واضح",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "70mm × 40mm",
      recommended: true,
      useCase: "منتجات متوسطة - باركود كبير",
    },
    {
      id: "60x40",
      name: "60×40mm (الأكثر استخداماً)",
      description: "الأكثر استخداماً",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "60mm × 40mm",
      recommended: true,
      useCase: "منتجات متوسطة - باركود واضح",
    },
    {
      id: "57x45",
      name: "57×45mm (طابعات Xprinter)",
      description: "طابعات Xprinter",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "57mm × 45mm",
      recommended: true,
      useCase: "Xprinter XP-370B وما شابه",
    },
    {
      id: "57x40",
      name: "57×40mm (طابعات الكاشير)",
      description: "طابعات الكاشير",
      paperType: "Roll",
      labelsPerSheet: 1,
      labelSize: "57mm × 40mm",
      recommended: true,
      useCase: "طابعات POS - فواتير",
    },
    {
      id: "50x30",
      name: "50×30mm (باركود متوسط)",
      description: "باركود متوسط",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "50mm × 30mm",
      recommended: true,
      useCase: "منتجات متوسطة",
    },
    {
      id: "50x25",
      name: "50×25mm (باركود صغير)",
      description: "باركود صغير",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "50mm × 25mm",
      recommended: false,
      useCase: "منتجات صغيرة",
    },
    {
      id: "40x30",
      name: "40×30mm (ملصق صغير)",
      description: "ملصق صغير",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "40mm × 30mm",
      recommended: false,
      useCase: "منتجات صغيرة",
    },
    {
      id: "38x25",
      name: "38×25mm (صيدليات)",
      description: "صيدليات",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "38mm × 25mm",
      recommended: true,
      useCase: "أدوية - منتجات صغيرة",
    },
  ];

  SuccessResponse(res, { labelSizes });
};

// ============================================
// Generate Labels PDF
// ============================================
export const generateLabelsController = async (req: Request, res: Response) => {
  const { products, labelConfig, paperSize } = req.body;

  if (!products || !Array.isArray(products) || products.length === 0) {
    throw new BadRequest("Products array is required");
  }

  if (!paperSize || !PAPER_CONFIGS[paperSize]) {
    throw new BadRequest(
      `Invalid paper size. Available: ${Object.keys(PAPER_CONFIGS).join(", ")}`
    );
  }

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

  const defaultLabelConfig = {
    showProductName: true,
    showPrice: true,
    showPromotionalPrice: true,
    showBusinessName: true,
    showBrand: true,
    showBarcode: true,
    productNameSize: 11,
    priceSize: 13,
    promotionalPriceSize: 13,
    businessNameSize: 7,
    brandSize: 8,
  };

  const finalConfig = { ...defaultLabelConfig, ...labelConfig };

  const pdfBuffer = await generateLabelsPDF(products, finalConfig, paperSize);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=labels_${paperSize}_${Date.now()}.pdf`
  );
  res.send(pdfBuffer);
};
