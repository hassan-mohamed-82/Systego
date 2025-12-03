import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel } from "../models/schema/admin/product_price";
import { NotFound } from "../Errors/NotFound";
import { PaperConfig } from "../types/generateLabel";

// ============================================
// Paper Configurations
// ============================================
export const PAPER_CONFIGS: Record<string, PaperConfig> = {
  // ============================================
  // A4 Size (210mm x 297mm)
  // ============================================

  "65_per_sheet_a4": {
    labelsPerSheet: 65,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 38.1,
    labelHeight: 21.2,
    columns: 5,
    rows: 13,
    marginTop: 10.7,
    marginLeft: 4.7,
    gapX: 2.5,
    gapY: 0,
  },

  "40_per_sheet_a4": {
    labelsPerSheet: 40,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 48.5,
    labelHeight: 25.4,
    columns: 4,
    rows: 10,
    marginTop: 22,
    marginLeft: 6,
    gapX: 0,
    gapY: 0,
  },

  "24_per_sheet_a4": {
    labelsPerSheet: 24,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 64,
    labelHeight: 34,
    columns: 3,
    rows: 8,
    marginTop: 15,
    marginLeft: 9,
    gapX: 2.5,
    gapY: 0,
  },

  "21_per_sheet_a4": {
    labelsPerSheet: 21,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 63.5,
    labelHeight: 38.1,
    columns: 3,
    rows: 7,
    marginTop: 15.1,
    marginLeft: 7.2,
    gapX: 2.5,
    gapY: 0,
  },

  "14_per_sheet_a4": {
    labelsPerSheet: 14,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 99.1,
    labelHeight: 38.1,
    columns: 2,
    rows: 7,
    marginTop: 15.1,
    marginLeft: 4.7,
    gapX: 2.5,
    gapY: 0,
  },

  "8_per_sheet_a4": {
    labelsPerSheet: 8,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 99.1,
    labelHeight: 67.7,
    columns: 2,
    rows: 4,
    marginTop: 13.1,
    marginLeft: 4.7,
    gapX: 2.5,
    gapY: 0,
  },

  "4_per_sheet_a4": {
    labelsPerSheet: 4,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 99.1,
    labelHeight: 139,
    columns: 2,
    rows: 2,
    marginTop: 9.5,
    marginLeft: 4.7,
    gapX: 2.5,
    gapY: 0,
  },

  "2_per_sheet_a4": {
    labelsPerSheet: 2,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 199.6,
    labelHeight: 143.5,
    columns: 1,
    rows: 2,
    marginTop: 5,
    marginLeft: 5.2,
    gapX: 0,
    gapY: 5,
  },

  // ============================================
  // Letter Size (8.5" x 11")
  // ============================================

  "80_per_sheet_letter": {
    labelsPerSheet: 80,
    sheetWidth: 215.9,
    sheetHeight: 279.4,
    labelWidth: 44.5,
    labelHeight: 17.5,
    columns: 4,
    rows: 20,
    marginTop: 12.7,
    marginLeft: 9.5,
    gapX: 7.9,
    gapY: 0,
  },

  "30_per_sheet_letter": {
    labelsPerSheet: 30,
    sheetWidth: 215.9,
    sheetHeight: 279.4,
    labelWidth: 66.7,
    labelHeight: 25.4,
    columns: 3,
    rows: 10,
    marginTop: 12.7,
    marginLeft: 4.8,
    gapX: 3.2,
    gapY: 0,
  },

  "20_per_sheet_letter": {
    labelsPerSheet: 20,
    sheetWidth: 215.9,
    sheetHeight: 279.4,
    labelWidth: 101.6,
    labelHeight: 25.4,
    columns: 2,
    rows: 10,
    marginTop: 12.7,
    marginLeft: 4.8,
    gapX: 3.2,
    gapY: 0,
  },

  "10_per_sheet_letter": {
    labelsPerSheet: 10,
    sheetWidth: 215.9,
    sheetHeight: 279.4,
    labelWidth: 101.6,
    labelHeight: 50.8,
    columns: 2,
    rows: 5,
    marginTop: 12.7,
    marginLeft: 4.8,
    gapX: 3.2,
    gapY: 0,
  },

  "6_per_sheet_letter": {
    labelsPerSheet: 6,
    sheetWidth: 215.9,
    sheetHeight: 279.4,
    labelWidth: 101.6,
    labelHeight: 84.7,
    columns: 2,
    rows: 3,
    marginTop: 12.7,
    marginLeft: 4.8,
    gapX: 3.2,
    gapY: 0,
  },

  // ============================================
  // Thermal Labels
  // ============================================

  "1_per_sheet_4x6": {
    labelsPerSheet: 1,
    sheetWidth: 101.6,
    sheetHeight: 152.4,
    labelWidth: 101.6,
    labelHeight: 152.4,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "1_per_sheet_4x4": {
    labelsPerSheet: 1,
    sheetWidth: 101.6,
    sheetHeight: 101.6,
    labelWidth: 101.6,
    labelHeight: 101.6,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "1_per_sheet_3x2": {
    labelsPerSheet: 1,
    sheetWidth: 76.2,
    sheetHeight: 50.8,
    labelWidth: 76.2,
    labelHeight: 50.8,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "1_per_sheet_2x1": {
    labelsPerSheet: 1,
    sheetWidth: 50.8,
    sheetHeight: 25.4,
    labelWidth: 50.8,
    labelHeight: 25.4,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  // ============================================
  // Roll Labels
  // ============================================

  "1_per_sheet_58mm": {
    labelsPerSheet: 1,
    sheetWidth: 58,
    sheetHeight: 40,
    labelWidth: 58,
    labelHeight: 40,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "1_per_sheet_80mm": {
    labelsPerSheet: 1,
    sheetWidth: 80,
    sheetHeight: 50,
    labelWidth: 80,
    labelHeight: 50,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },
};

// ============================================
// Helper Functions
// ============================================

const mmToPoints = (mm: number): number => mm * 2.83465;

interface LabelData {
  productName: string;
  brandName: string;
  businessName: string;
  price: number;
  promotionalPrice?: number | null;
  barcode: string;
}

interface LabelConfig {
  showProductName?: boolean;
  showPrice?: boolean;
  showPromotionalPrice?: boolean;
  showBusinessName?: boolean;
  showBrand?: boolean;
  productNameSize?: number;
  priceSize?: number;
  promotionalPriceSize?: number;
  businessNameSize?: number;
  brandSize?: number;
}

// ============================================
// Main Functions
// ============================================

export const generateLabelsPDF = async (
  products: { productId: string; productPriceId: string; quantity: number }[],
  labelConfig: LabelConfig,
  paperSize: string
): Promise<Buffer> => {
  const paperConfig = PAPER_CONFIGS[paperSize];
  if (!paperConfig) {
    throw new NotFound("Paper size configuration not found");
  }

  const labelsData: LabelData[] = [];

  for (const item of products) {
    const product = await ProductModel.findById(item.productId).populate("brandId");
    if (!product) throw new NotFound(`Product not found: ${item.productId}`);

    const productPrice = await ProductPriceModel.findById(item.productPriceId);
    if (!productPrice) throw new NotFound(`Product price not found: ${item.productPriceId}`);

    const priceDoc = productPrice as any;

    const labelData: LabelData = {
      productName: product.name,
      brandName: (product.brandId as any)?.name || "",
      businessName: "WegoStation",
      price: priceDoc.price,
      promotionalPrice: priceDoc.promotionalPrice || null,
      barcode: priceDoc.code || "",
    };

    for (let i = 0; i < item.quantity; i++) {
      labelsData.push(labelData);
    }
  }

  return await createPDF(labelsData, labelConfig, paperConfig);
};

const createPDF = async (
  labelsData: LabelData[],
  labelConfig: LabelConfig,
  paperConfig: PaperConfig
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [mmToPoints(paperConfig.sheetWidth), mmToPoints(paperConfig.sheetHeight)],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      let labelIndex = 0;
      const totalLabels = labelsData.length;

      while (labelIndex < totalLabels) {
        if (labelIndex > 0) {
          doc.addPage();
        }

        for (let row = 0; row < paperConfig.rows && labelIndex < totalLabels; row++) {
          for (let col = 0; col < paperConfig.columns && labelIndex < totalLabels; col++) {
            const x = mmToPoints(
              paperConfig.marginLeft + col * (paperConfig.labelWidth + paperConfig.gapX)
            );
            const y = mmToPoints(
              paperConfig.marginTop + row * (paperConfig.labelHeight + paperConfig.gapY)
            );

            await drawLabel(
              doc,
              labelsData[labelIndex],
              x,
              y,
              mmToPoints(paperConfig.labelWidth),
              mmToPoints(paperConfig.labelHeight),
              labelConfig
            );

            labelIndex++;
          }
        }
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

const drawLabel = async (
  doc: PDFKit.PDFDocument,
  data: LabelData,
  x: number,
  y: number,
  width: number,
  height: number,
  config: LabelConfig
): Promise<void> => {
  const padding = 5;
  const innerX = x + padding;
  const innerY = y + padding;
  const innerWidth = width - padding * 2;

  let currentY = innerY;
  const lineHeight = 10;

  // Business Name
  if (config.showBusinessName && data.businessName) {
    doc
      .fontSize(config.businessNameSize || 10)
      .font("Helvetica-Bold")
      .text(data.businessName, innerX, currentY, {
        width: innerWidth,
        align: "center",
      });
    currentY += lineHeight;
  }

  // Product Name
  if (config.showProductName && data.productName) {
    doc
      .fontSize(config.productNameSize || 8)
      .font("Helvetica")
      .text(data.productName, innerX, currentY, {
        width: innerWidth,
        align: "center",
        lineBreak: false,
      });
    currentY += lineHeight;
  }

  // Brand
  if (config.showBrand && data.brandName) {
    doc
      .fontSize(config.brandSize || 8)
      .font("Helvetica")
      .text(data.brandName, innerX, currentY, {
        width: innerWidth,
        align: "center",
      });
    currentY += lineHeight;
  }

  // Price
  if (config.showPrice) {
    let priceText: string;

    if (config.showPromotionalPrice && data.promotionalPrice) {
      priceText = `${data.promotionalPrice} (was ${data.price})`;
    } else {
      priceText = `${data.price}`;
    }

    doc
      .fontSize(config.priceSize || 9)
      .font("Helvetica-Bold")
      .text(priceText, innerX, currentY, {
        width: innerWidth,
        align: "center",
      });
    currentY += lineHeight;
  }

  // Barcode
  if (data.barcode) {
    try {
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: data.barcode,
        scale: 2,
        height: 8,
        includetext: true,
        textsize: 8,
      });

      const barcodeWidth = 80;
      const barcodeX = x + (width - barcodeWidth) / 2;

      doc.image(barcodeBuffer, barcodeX, currentY, {
        width: barcodeWidth,
        height: 25,
      });
    } catch (error) {
      console.error("Error generating barcode:", error);
    }
  }
};
