import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel } from "../models/schema/admin/product_price";
import { NotFound } from "../Errors/NotFound";
import { PaperConfig, LabelConfig, LabelData } from "../types/generateLabel";

// تحويل mm لـ points (72 points = 1 inch, 1 inch = 25.4mm)
const mmToPoints = (mm: number): number => (mm / 25.4) * 72;

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
  "57x45": {
    labelsPerSheet: 1,
    sheetWidth: 56.9,
    sheetHeight: 44.45,
    labelWidth: 56.9,
    labelHeight: 44.45,
    columns: 1,
    rows: 1,
    marginTop: 0,
    marginLeft: 0,
    gapX: 0,
    gapY: 0,
  },
  "57x40": {
    labelsPerSheet: 1,
    sheetWidth: 57,
    sheetHeight: 40,
    labelWidth: 57,
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
  "40x30": {
    labelsPerSheet: 1,
    sheetWidth: 40,
    sheetHeight: 30,
    labelWidth: 40,
    labelHeight: 30,
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
  a4_65: {
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
  a4_24: {
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
  a4_21: {
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
  a4_14: {
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
// Generate Barcode
// ============================================
const generateBarcodeBuffer = async (text: string): Promise<Buffer> => {
  return await bwipjs.toBuffer({
    bcid: "code128",
    text: text,
    scale: 3,
    height: 15,
    includetext: true,
    textxalign: "center",
    textsize: 10,
  });
};

// ============================================
// Draw Label - Thermal
// ============================================
const drawLabelThermal = async (
  doc: PDFKit.PDFDocument,
  data: LabelData,
  labelWidth: number,
  labelHeight: number,
  config: LabelConfig
): Promise<void> => {
  const padding = mmToPoints(2);
  const innerWidth = labelWidth - padding * 2;
  const innerHeight = labelHeight - padding * 2;

  // حساب المساحات
  const barcodeHeightRatio = config.showBarcode && data.barcode ? 0.38 : 0;
  const barcodeHeight = innerHeight * barcodeHeightRatio;
  const textAreaHeight = innerHeight - barcodeHeight;

  // عد العناصر
  let textElements = 0;
  if (config.showProductName && data.productName) textElements++;
  if (config.showBrand && data.brandName) textElements++;
  if (config.showPrice && data.price) textElements++;
  if (config.showBusinessName && data.businessName) textElements++;

  const lineHeight = textElements > 0 ? textAreaHeight / textElements : mmToPoints(6);

  let currentY = padding;

  // ============ Barcode ============
  if (config.showBarcode && data.barcode) {
    try {
      const barcodeBuffer = await generateBarcodeBuffer(data.barcode);
      const barcodeImgWidth = innerWidth * 0.75;
      const barcodeImgHeight = barcodeHeight - mmToPoints(1);
      const barcodeX = padding + (innerWidth - barcodeImgWidth) / 2;

      doc.image(barcodeBuffer, barcodeX, currentY, {
        fit: [barcodeImgWidth, barcodeImgHeight],
        align: "center",
        valign: "center",
      });
      currentY += barcodeHeight;
    } catch (err) {
      console.error("Barcode error:", err);
      currentY += barcodeHeight;
    }
  }

  // ============ Product Name ============
  if (config.showProductName && data.productName) {
    const fontSize = Math.min(config.productNameSize || 11, lineHeight * 0.7);
    const maxChars = Math.floor(innerWidth / (fontSize * 0.5));
    const displayName =
      data.productName.length > maxChars
        ? data.productName.substring(0, maxChars - 2) + ".."
        : data.productName;

    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(displayName, padding, currentY + (lineHeight - fontSize) / 2, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // ============ Brand ============
  if (config.showBrand && data.brandName) {
    const fontSize = Math.min(config.brandSize || 8, lineHeight * 0.5);
    doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
    doc.text(data.brandName, padding, currentY + (lineHeight - fontSize) / 2, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // ============ Price ============
  if (config.showPrice && data.price) {
    const fontSize = Math.min(config.priceSize || 13, lineHeight * 0.75);
    let priceText = `${data.price}`;
    let priceColor: string = "black";

    if (
      config.showPromotionalPrice &&
      data.promotionalPrice &&
      data.promotionalPrice < data.price
    ) {
      priceText = `${data.promotionalPrice}`;
      priceColor = "red";
    }

    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor(priceColor);
    doc.text(priceText, padding, currentY + (lineHeight - fontSize) / 2, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // ============ Business Name ============
  if (config.showBusinessName && data.businessName) {
    const fontSize = Math.min(config.businessNameSize || 7, lineHeight * 0.45);
    doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
    doc.text(data.businessName, padding, currentY + (lineHeight - fontSize) / 2, {
      width: innerWidth,
      align: "center",
    });
  }
};

// ============================================
// Draw Label - A4
// ============================================
const drawLabelA4 = async (
  doc: PDFKit.PDFDocument,
  data: LabelData,
  x: number,
  y: number,
  width: number,
  height: number,
  config: LabelConfig
): Promise<void> => {
  const padding = mmToPoints(1.5);
  const innerX = x + padding;
  const innerY = y + padding;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;

  let currentY = innerY;

  // عد العناصر
  let elementsCount = 0;
  if (config.showBusinessName && data.businessName) elementsCount++;
  if (config.showProductName && data.productName) elementsCount++;
  if (config.showBrand && data.brandName) elementsCount++;
  if (config.showPrice && data.price) elementsCount++;

  const barcodeHeight = config.showBarcode && data.barcode ? innerHeight * 0.4 : 0;
  const textAreaHeight = innerHeight - barcodeHeight;
  const lineHeight = elementsCount > 0 ? textAreaHeight / elementsCount : mmToPoints(4);

  // Business Name
  if (config.showBusinessName && data.businessName) {
    const fontSize = Math.min(config.businessNameSize || 7, lineHeight * 0.7);
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(data.businessName, innerX, currentY, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // Product Name
  if (config.showProductName && data.productName) {
    const fontSize = Math.min(config.productNameSize || 8, lineHeight * 0.75);
    const maxChars = Math.floor(innerWidth / (fontSize * 0.45));
    const displayName =
      data.productName.length > maxChars
        ? data.productName.substring(0, maxChars - 2) + ".."
        : data.productName;
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(displayName, innerX, currentY, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // Brand
  if (config.showBrand && data.brandName) {
    const fontSize = Math.min(config.brandSize || 6, lineHeight * 0.6);
    doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
    doc.text(data.brandName, innerX, currentY, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // Price
  if (config.showPrice && data.price) {
    const fontSize = Math.min(config.priceSize || 9, lineHeight * 0.8);
    const price =
      config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price
        ? data.promotionalPrice
        : data.price;
    const color =
      config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price
        ? "red"
        : "black";

    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor(color);
    doc.text(`${price}`, innerX, currentY, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // Barcode
  if (config.showBarcode && data.barcode && barcodeHeight > mmToPoints(5)) {
    try {
      const barcodeBuffer = await generateBarcodeBuffer(data.barcode);
      const barcodeImgWidth = innerWidth * 0.85;
      const barcodeImgHeight = barcodeHeight - mmToPoints(1);
      const barcodeX = innerX + (innerWidth - barcodeImgWidth) / 2;

      doc.image(barcodeBuffer, barcodeX, currentY, {
        fit: [barcodeImgWidth, barcodeImgHeight],
        align: "center",
        valign: "center",
      });
    } catch (err) {
      console.error("Barcode error:", err);
    }
  }
};

// ============================================
// Create PDF - Thermal
// ============================================
const createPDFThermal = async (
  labelsData: LabelData[],
  labelConfig: LabelConfig,
  paperConfig: PaperConfig
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const labelWidth = mmToPoints(paperConfig.labelWidth);
      const labelHeight = mmToPoints(paperConfig.labelHeight);

      const doc = new PDFDocument({
        size: [labelWidth, labelHeight],
        margin: 0,
        autoFirstPage: false,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      for (const labelData of labelsData) {
        doc.addPage({
          size: [labelWidth, labelHeight],
          margin: 0,
        });

        await drawLabelThermal(doc, labelData, labelWidth, labelHeight, labelConfig);
      }

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// ============================================
// Create PDF - A4
// ============================================
const createPDFA4 = async (
  labelsData: LabelData[],
  labelConfig: LabelConfig,
  paperConfig: PaperConfig
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const sheetWidth = mmToPoints(paperConfig.sheetWidth);
      const sheetHeight = mmToPoints(paperConfig.sheetHeight);

      const doc = new PDFDocument({
        size: [sheetWidth, sheetHeight],
        margin: 0,
        autoFirstPage: false,
        bufferPages: true,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      let labelIndex = 0;
      const totalLabels = labelsData.length;

      while (labelIndex < totalLabels) {
        doc.addPage({
          size: [sheetWidth, sheetHeight],
          margin: 0,
        });

        for (let row = 0; row < paperConfig.rows && labelIndex < totalLabels; row++) {
          for (let col = 0; col < paperConfig.columns && labelIndex < totalLabels; col++) {
            const x = mmToPoints(
              paperConfig.marginLeft + col * (paperConfig.labelWidth + paperConfig.gapX)
            );
            const y = mmToPoints(
              paperConfig.marginTop + row * (paperConfig.labelHeight + paperConfig.gapY)
            );

            await drawLabelA4(
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

  return paperSize.startsWith("a4_")
    ? await createPDFA4(labelsData, labelConfig, paperConfig)
    : await createPDFThermal(labelsData, labelConfig, paperConfig);
};
