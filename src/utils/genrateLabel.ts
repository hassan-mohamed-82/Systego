import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel } from "../models/schema/admin/product_price";
import { NotFound } from "../Errors/NotFound";
import { PaperConfig, LabelConfig, LabelData } from "../types/generateLabel";
// ============================================
// Helper Function
// ============================================
const mmToPoints = (mm: number): number => mm * 2.83465;

// ============================================
// Paper Configurations
// ============================================
export const PAPER_CONFIGS: Record<string, PaperConfig> = {
  "100x150": {
    labelsPerSheet: 1,
    sheetWidth: 100,
    sheetHeight: 150,
    labelWidth: 100,
    labelHeight: 150,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "100x100": {
    labelsPerSheet: 1,
    sheetWidth: 100,
    sheetHeight: 100,
    labelWidth: 100,
    labelHeight: 100,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "100x50": {
    labelsPerSheet: 1,
    sheetWidth: 100,
    sheetHeight: 50,
    labelWidth: 100,
    labelHeight: 50,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "80x50": {
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

  "58x40": {
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

  "50x30": {
    labelsPerSheet: 1,
    sheetWidth: 50,
    sheetHeight: 30,
    labelWidth: 50,
    labelHeight: 30,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "50x25": {
    labelsPerSheet: 1,
    sheetWidth: 50,
    sheetHeight: 25,
    labelWidth: 50,
    labelHeight: 25,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  "38x25": {
    labelsPerSheet: 1,
    sheetWidth: 38,
    sheetHeight: 25,
    labelWidth: 38,
    labelHeight: 25,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },

  // A4 Sheets
  "a4_65": {
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

  "a4_24": {
    labelsPerSheet: 24,
    sheetWidth: 210,
    sheetHeight: 297,
    labelWidth: 64,
    labelHeight: 34,
    columns: 3,
    rows: 8,
    marginTop: 12.5,
    marginLeft: 9,
    gapX: 2.5,
    gapY: 2.5,
  },

  "a4_21": {
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

  "a4_14": {
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
};

// ============================================
// Generate Barcode Buffer
// ============================================
const generateBarcodeBuffer = async (
  text: string,
  maxWidth: number
): Promise<Buffer> => {
  // حساب الـ scale بناءً على عرض الـ label
  let scale = 1;
  let height = 6;
  let textsize = 6;

  if (maxWidth >= 250) {
    scale = 2;
    height = 10;
    textsize = 9;
  } else if (maxWidth >= 140) {
    scale = 1.5;
    height = 8;
    textsize = 7;
  } else {
    scale = 1;
    height = 6;
    textsize = 6;
  }

  return await bwipjs.toBuffer({
    bcid: "code128",
    text: text,
    scale: scale,
    height: height,
    includetext: true,
    textxalign: "center",
    textsize: textsize,
    rotate: "N",
  });
};

// ============================================
// Draw Label Vertical (تحت بعض)
// ============================================
const drawLabelVertical = async (
  doc: PDFKit.PDFDocument,
  data: LabelData,
  x: number,
  y: number,
  width: number,
  height: number,
  config: LabelConfig
): Promise<void> => {
  const padding = 2;
  const innerX = x + padding;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  let currentY = y + padding;

  // حساب المساحات
  let textHeight = 0;
  let elementsCount = 0;

  if (config.showBusinessName && data.businessName) elementsCount++;
  if (config.showProductName && data.productName) elementsCount++;
  if (config.showBrand && data.brandName) elementsCount++;
  if (config.showPrice && data.price) elementsCount++;

  // الباركود ياخد 40% من المساحة
  const barcodeHeight = config.showBarcode && data.barcode ? innerHeight * 0.4 : 0;
  const availableTextHeight = innerHeight - barcodeHeight;
  const lineHeight = elementsCount > 0 ? availableTextHeight / elementsCount : 0;

  // ============ Business Name ============
  if (config.showBusinessName && data.businessName) {
    const fontSize = Math.min(7, lineHeight * 0.8);
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(data.businessName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += lineHeight;
  }

  // ============ Product Name ============
  if (config.showProductName && data.productName) {
    const fontSize = Math.min(8, lineHeight * 0.85);
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");

    const maxChars = Math.floor(innerWidth / (fontSize * 0.45));
    const displayName =
      data.productName.length > maxChars
        ? data.productName.substring(0, maxChars - 2) + ".."
        : data.productName;

    doc.text(displayName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += lineHeight;
  }

  // ============ Brand ============
  if (config.showBrand && data.brandName) {
    const fontSize = Math.min(6, lineHeight * 0.7);
    doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
    doc.text(data.brandName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    doc.fillColor("black");
    currentY += lineHeight;
  }

  // ============ Price ============
  if (config.showPrice && data.price) {
    const fontSize = Math.min(10, lineHeight * 0.9);

    if (
      config.showPromotionalPrice &&
      data.promotionalPrice &&
      data.promotionalPrice < data.price
    ) {
      // سعر قديم
      doc.fontSize(fontSize * 0.6).font("Helvetica").fillColor("gray");
      doc.text(`${data.price}`, innerX, currentY, {
        width: innerWidth / 2,
        align: "right",
        lineBreak: false,
      });

      // سعر العرض
      doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("red");
      doc.text(`${data.promotionalPrice}`, innerX + innerWidth / 2 + 2, currentY, {
        width: innerWidth / 2,
        align: "left",
        lineBreak: false,
      });
      doc.fillColor("black");
    } else {
      doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
      doc.text(`${data.price}`, innerX, currentY, {
        width: innerWidth,
        align: "center",
        lineBreak: false,
      });
    }
    currentY += lineHeight;
  }

  // ============ Barcode ============
  if (config.showBarcode && data.barcode && barcodeHeight > 10) {
    try {
      const barcodeBuffer = await generateBarcodeBuffer(data.barcode, innerWidth);

      const barcodeImgWidth = Math.min(innerWidth * 0.85, 120);
      const barcodeImgHeight = barcodeHeight - 4;
      const barcodeX = innerX + (innerWidth - barcodeImgWidth) / 2;

      doc.image(barcodeBuffer, barcodeX, currentY, {
        fit: [barcodeImgWidth, barcodeImgHeight],
        align: "center",
        valign: "center",
      });
    } catch (err) {
      console.error("Barcode error:", err);
      doc.fontSize(5).font("Helvetica").fillColor("black");
      doc.text(data.barcode, innerX, currentY, {
        width: innerWidth,
        align: "center",
      });
    }
  }
};

// ============================================
// Create PDF for Thermal Printer (كل الـ labels تحت بعض)
// ============================================
const createPDFThermal = async (
  labelsData: LabelData[],
  labelConfig: LabelConfig,
  paperConfig: PaperConfig
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const totalLabels = labelsData.length;
      const labelWidthPts = mmToPoints(paperConfig.labelWidth);
      const labelHeightPts = mmToPoints(paperConfig.labelHeight);

      // ✅ صفحة واحدة طويلة فيها كل الـ labels
      const totalHeightPts = labelHeightPts * totalLabels;

      const doc = new PDFDocument({
        size: [labelWidthPts, totalHeightPts],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      // ✅ رسم كل الـ labels تحت بعض
      for (let i = 0; i < totalLabels; i++) {
        const x = 0;
        const y = labelHeightPts * i;

        await drawLabelVertical(
          doc,
          labelsData[i],
          x,
          y,
          labelWidthPts,
          labelHeightPts,
          labelConfig
        );
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// ============================================
// Create PDF for A4
// ============================================
const createPDFA4 = async (
  labelsData: LabelData[],
  labelConfig: LabelConfig,
  paperConfig: PaperConfig
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [mmToPoints(paperConfig.sheetWidth), mmToPoints(paperConfig.sheetHeight)],
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: false,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      let labelIndex = 0;
      const totalLabels = labelsData.length;

      while (labelIndex < totalLabels) {
        doc.addPage();

        for (let row = 0; row < paperConfig.rows && labelIndex < totalLabels; row++) {
          for (let col = 0; col < paperConfig.columns && labelIndex < totalLabels; col++) {
            const x = mmToPoints(
              paperConfig.marginLeft + col * (paperConfig.labelWidth + paperConfig.gapX)
            );
            const y = mmToPoints(
              paperConfig.marginTop + row * (paperConfig.labelHeight + paperConfig.gapY)
            );

            await drawLabelVertical(
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

// ============================================
// Main Function
// ============================================
export const generateLabelsPDF = async (
  products: { productId: string; productPriceId: string; quantity: number }[],
  labelConfig: LabelConfig,
  paperSize: string
): Promise<Buffer> => {
  const paperConfig = PAPER_CONFIGS[paperSize];
  if (!paperConfig) {
    throw new NotFound(
      `Paper size not found. Available: ${Object.keys(PAPER_CONFIGS).join(", ")}`
    );
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

  if (labelsData.length === 0) {
    throw new NotFound("No valid products found to generate labels");
  }

  if (paperSize.startsWith("a4_")) {
    return await createPDFA4(labelsData, labelConfig, paperConfig);
  } else {
    return await createPDFThermal(labelsData, labelConfig, paperConfig);
  }
};