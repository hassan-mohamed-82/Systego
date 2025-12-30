// import { Request, Response } from "express";
// import { generateLabelsPDF, PAPER_CONFIGS } from "../../utils/genrateLabel";
// import { BadRequest } from "../../Errors/BadRequest";
// import { SuccessResponse } from "../../utils/response";
// import { LabelSize } from "../../types/generateLabel";

// // ============================================
// // Get Available Label Sizes
// // ============================================
// export const getAvailableLabelSizes = async (req: Request, res: Response) => {
//   const labelSizes: LabelSize[] = [


//     {
//       id: "100x50",
//       name: "100×50mm (منتجات كبيرة)",
//       description: "منتجات كبيرة",
//       paperType: "Thermal",
//       labelsPerSheet: 1,
//       labelSize: "100mm × 50mm",
//       recommended: false,
//       useCase: "كراتين - منتجات كبيرة",
//     },
//     {
//       id: "80x50",
//       name: "80×50mm (باركود كبير)",
//       description: "باركود كبير",
//       paperType: "Thermal",
//       labelsPerSheet: 1,
//       labelSize: "80mm × 50mm",
//       recommended: false,
//       useCase: "منتجات كبيرة",
//     },
//     {
//       id: "57x45",
//       name: "57×45mm (طابعات Xprinter)",
//       description: "طابعات Xprinter",
//       paperType: "Thermal",
//       labelsPerSheet: 1,
//       labelSize: "57mm × 45mm",
//       recommended: true,
//       useCase: "Xprinter XP-370B وما شابه",
//     },
//     {
//       id: "57x40",
//       name: "57×40mm(طابعات الكاشير)",
//       description: "طابعات الكاشير",
//       paperType: "Roll",
//       labelsPerSheet: 1,
//       labelSize: "57mm × 40mm",
//       recommended: true,
//       useCase: "طابعات POS - فواتير",
//     },
//     {
//       id: "50x30",
//       name: "50×30mm (باركود متوسط)",
//       description: "باركود متوسط",
//       paperType: "Thermal",
//       labelsPerSheet: 1,
//       labelSize: "50mm × 30mm",
//       recommended: true,
//       useCase: "منتجات متوسطة",
//     },
//     {
//       id: "50x25",
//       name: "50×25mm  (باركود صغير)",
//       description: "باركود صغير",
//       paperType: "Thermal",
//       labelsPerSheet: 1,
//       labelSize: "50mm × 25mm",
//       recommended: false,
//       useCase: "منتجات صغيرة",
//     },
//     {
//       id: "40x30",
//       name: "40×30mm (ملصق صغير)",
//       description: "ملصق صغير",
//       paperType: "Thermal",
//       labelsPerSheet: 1,
//       labelSize: "40mm × 30mm",
//       recommended: false,
//       useCase: "منتجات صغيرة",
//     },
//     {
//       id: "38x25",
//       name: "38×25mm (صيدليات)",
//       description: "صيدليات",
//       paperType: "Thermal",
//       labelsPerSheet: 1,
//       labelSize: "38mm × 25mm",
//       recommended: true,
//       useCase: "أدوية - منتجات صغيرة",
//     },




//   ];

//   SuccessResponse(res, { labelSizes });
// };

// // ============================================
// // Generate Labels PDF
// // ============================================
// export const generateLabelsController = async (req: Request, res: Response) => {
//   const { products, labelConfig, paperSize } = req.body;

//   if (!products || !Array.isArray(products) || products.length === 0) {
//     throw new BadRequest("Products array is required");
//   }

//   if (!paperSize || !PAPER_CONFIGS[paperSize]) {
//     throw new BadRequest(
//       `Invalid paper size. Available: ${Object.keys(PAPER_CONFIGS).join(", ")}`
//     );
//   }

//   for (const product of products) {
//     if (!product.productId || !product.productPriceId || !product.quantity) {
//       throw new BadRequest(
//         "Each product must have productId, productPriceId, and quantity"
//       );
//     }
//     if (product.quantity < 1) {
//       throw new BadRequest("Quantity must be at least 1");
//     }
//   }

//   const defaultLabelConfig = {
//     showProductName: true,
//     showPrice: true,
//     showPromotionalPrice: true,
//     showBusinessName: true,
//     showBrand: true,
//     showBarcode: true,
//     productNameSize: 11,
//     priceSize: 13,
//     promotionalPriceSize: 13,
//     businessNameSize: 7,
//     brandSize: 8,
//   };

//   const finalConfig = { ...defaultLabelConfig, ...labelConfig };

//   const pdfBuffer = await generateLabelsPDF(products, finalConfig, paperSize);

//   res.setHeader("Content-Type", "application/pdf");
//   res.setHeader(
//     "Content-Disposition",
//     `inline; filename=labels_${paperSize}_${Date.now()}.pdf`
//   );
//   res.send(pdfBuffer);
// };


import { Request, Response } from "express";
import { generateLabelsPDF, PAPER_CONFIGS } from "../../utils/genrateLabel";
import { BadRequest } from "../../Errors/BadRequest";
import { SuccessResponse } from "../../utils/response";
import { LabelSize } from "../../types/generateLabel";

// ============================================
// Get Available Label Sizes
// ============================================
export const getAvailableLabelSizes = async (req: Request, res: Response) => {
  // We added 'useRectangularLayout' to sizes that are wide/short 
  // and benefit from the Grid layout (like the image you shared).
  const labelSizes: LabelSize[] = [
    {
      id: "100x50",
      name: "100×50mm (منتجات كبيرة)",
      description: "منتجات كبيرة",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "100mm × 50mm",
      recommended: false,
      useCase: "كراتين - منتجات كبيرة",
      // useRectangularLayout: true, // Supports the new layout
    },
    {
      id: "80x50",
      name: "80×50mm (باركود كبير)",
      description: "باركود كبير",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "80mm × 50mm",
      recommended: false,
      useCase: "منتجات كبيرة",
      // useRectangularLayout: true,
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
      // useRectangularLayout: true,
    },
    {
      id: "57x40",
      name: "57×40mm(طابعات الكاشير)",
      description: "طابعات الكاشير",
      paperType: "Roll",
      labelsPerSheet: 1,
      labelSize: "57mm × 40mm",
      recommended: true,
      useCase: "طابعات POS - فواتير",
      // useRectangularLayout: true,
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
      // useRectangularLayout: true,
    },
    {
      id: "50x25",
      name: "50×25mm  (باركود صغير)",
      description: "باركود صغير",
      paperType: "Thermal",
      labelsPerSheet: 1,
      labelSize: "50mm × 25mm",
      recommended: false,
      useCase: "منتجات صغيرة",
      // useRectangularLayout: true, // Ideally fits the image you sent
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
      // useRectangularLayout: true,
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
      // useRectangularLayout: true,
    },
  ];

  SuccessResponse(res, { labelSizes });
};

// ============================================
// Generate Labels PDF
// ============================================
export const generateLabelsController = async (req: Request, res: Response) => {
  // 1. Extract params, including the config from Frontend
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
    // // Default to FALSE unless the frontend sends it specifically
    // useRectangularLayout: false
  };

  // 2. Merge defaults with user request
  // If the Frontend sees "useRectangularLayout: true" in the size list, 
  // it should send { useRectangularLayout: true } in labelConfig here.
  const finalConfig = { ...defaultLabelConfig, ...labelConfig };

  const pdfBuffer = await generateLabelsPDF(products, finalConfig, paperSize);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename=labels_${paperSize}_${Date.now()}.pdf`
  );
  res.send(pdfBuffer);
};