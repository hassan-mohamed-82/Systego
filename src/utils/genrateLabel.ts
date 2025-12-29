import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel } from "../models/schema/admin/product_price";
import { NotFound } from "../Errors/NotFound";
import { PaperConfig, LabelConfig, LabelData } from "../types/generateLabel";

const mmToPoints = (mm: number): number => (mm / 25.4) * 72;

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

// ==================================================================
// Thermal Label Drawing
// ==================================================================
const drawLabelThermal = async (
  doc: PDFKit.PDFDocument,
  data: LabelData,
  labelWidth: number,
  labelHeight: number,
  config: LabelConfig
): Promise<void> => {
  // 1. Setup Margins
  // Use a small 5% margin, but ensure it's not too huge on large labels
  const margin = Math.min(labelWidth, labelHeight) * 0.05;
  const innerWidth = labelWidth - (margin * 2);
  const startX = margin;
  let currentY = margin;

  // 2. Helper: Get Font Size (Manual Config -> Fallback to Auto)
  // This checks if you sent a size in config. If not, it calculates one based on height percentage.
  const resolveFontSize = (
    manualSize: number | undefined,
    autoPercent: number,
    min: number,
    max: number
  ) => {
    if (manualSize && manualSize > 0) return manualSize;
    const calculated = labelHeight * autoPercent;
    return Math.max(min, Math.min(max, calculated));
  };

  // --- DRAW: BUSINESS NAME ---
  if (config.showBusinessName && data.businessName) {
    const fontSize = resolveFontSize(config.businessNameSize, 0.08, 6, 14);

    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");

    // Calculate how much height this text actually takes
    const textHeight = doc.heightOfString(data.businessName, { width: innerWidth });

    doc.text(data.businessName, startX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false, // Force single line if preferred, or remove to allow wrapping
      ellipsis: true
    });

    currentY += textHeight + 2; // Add padding
  }

  // --- DRAW: BRAND NAME ---
  if (config.showBrand && data.brandName) {
    const fontSize = resolveFontSize(config.brandSize, 0.06, 5, 10);

    doc.fontSize(fontSize).font("Helvetica").fillColor("#444444");

    const textHeight = doc.heightOfString(data.brandName, { width: innerWidth });

    doc.text(data.brandName, startX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
      ellipsis: true
    });

    currentY += textHeight + 2;
  }

  // --- DRAW: PRODUCT NAME ---
  if (config.showProductName && data.productName) {
    const fontSize = resolveFontSize(config.productNameSize, 0.12, 7, 16);

    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");

    // Allow product name to wrap to a second line if needed
    const options = {
      width: innerWidth,
      align: "center" as const,
      lineBreak: true,
      ellipsis: true
    };

    const textHeight = doc.heightOfString(data.productName, options);

    doc.text(data.productName, startX, currentY, options);

    currentY += textHeight + 4; // Slightly more padding after product name
  }

  // --- CALCULATE REMAINING SPACE ---
  const bottomMargin = margin;
  let remainingHeight = labelHeight - bottomMargin - currentY;

  // --- DRAW: PRICE (Bottom Priority) ---
  let priceHeight = 0;
  if (config.showPrice && data.price) {
    const isPromo = config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;
    const priceText = isPromo ? `${data.promotionalPrice}` : `${data.price}`;

    // Choose size based on whether it is promo or normal
    const manualSize = isPromo ? config.promotionalPriceSize : config.priceSize;
    const fontSize = resolveFontSize(manualSize, 0.15, 8, 24);

    doc.fontSize(fontSize).font("Helvetica-Bold");
    priceHeight = doc.heightOfString(priceText, { width: innerWidth });

    // Check if we have enough vertical space to draw the price
    if (remainingHeight > priceHeight) {
      // Position price at the bottom
      const priceY = labelHeight - bottomMargin - priceHeight;

      doc.fillColor("black"); // Always black for thermal
      doc.text(priceText, startX, priceY, {
        width: innerWidth,
        align: "center"
      });

      // Reserve this space so barcode doesn't overwrite it
      remainingHeight -= (priceHeight + 2);
    }
  }

  // --- DRAW: BARCODE (Fill Remaining Space) ---
  if (config.showBarcode && data.barcode && remainingHeight > 10) {
    try {
      const barcodeHeight = remainingHeight - 4; // Leave small buffer

      // Only draw if there is actually enough height for a readable barcode
      if (barcodeHeight > 5) {
        const pngBuffer = await bwipjs.toBuffer({
          bcid: "code128",
          text: data.barcode,
          scale: 2,
          height: 10, // Abstract height, we control fit below
          includetext: true,
          textxalign: "center",
          textsize: 6 // Text inside barcode
        });

        const maxWidth = innerWidth * 0.9;

        // Fit the image into the remaining space
        doc.image(pngBuffer, startX + (innerWidth - maxWidth) / 2, currentY, {
          fit: [maxWidth, barcodeHeight],
          align: "center",
          valign: "center"
        });
      }
    } catch (err) {
      console.error("Barcode generation error:", err);
    }
  }
};
// ==================================================================
// A4 Label Drawing
// ==================================================================
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

  let elementsCount = 0;
  if (config.showBusinessName && data.businessName) elementsCount++;
  if (config.showProductName && data.productName) elementsCount++;
  if (config.showBrand && data.brandName) elementsCount++;
  if (config.showPrice && data.price) elementsCount++;

  const barcodeHeight = config.showBarcode && data.barcode ? innerHeight * 0.4 : 0;
  const textAreaHeight = innerHeight - barcodeHeight;
  const lineHeight = elementsCount > 0 ? textAreaHeight / elementsCount : mmToPoints(4);

  if (config.showBusinessName && data.businessName) {
    const fontSize = config.businessNameSize || 6;
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(data.businessName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += lineHeight;
  }

  if (config.showProductName && data.productName) {
    const fontSize = config.productNameSize || 7;
    const maxChars = 20;
    const displayName =
      data.productName.length > maxChars
        ? data.productName.substring(0, maxChars - 2) + ".."
        : data.productName;
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(displayName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += lineHeight;
  }

  if (config.showBrand && data.brandName) {
    const fontSize = config.brandSize || 5;
    doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
    doc.text(data.brandName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += lineHeight;
  }

  if (config.showPrice && data.price) {
    const isPromo =
      config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;

    const price = isPromo ? data.promotionalPrice : data.price;
    const color = isPromo ? "red" : "black";
    const fontSize = isPromo ? config.promotionalPriceSize || 8 : config.priceSize || 8;

    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor(color);
    doc.text(`${price}`, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += lineHeight;
  }

  if (config.showBarcode && data.barcode && barcodeHeight > mmToPoints(5)) {
    try {
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: data.barcode,
        scale: 2,
        height: 8,
        includetext: true,
        textxalign: "center",
        textsize: 6,
      });
      const barcodeImgWidth = innerWidth * 0.8;
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

// ==================================================================
// Create Thermal PDF - صفحة لكل label حسب الكمية
// ==================================================================
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

      // صفحة لكل label حسب الكمية المطلوبة
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

// ==================================================================
// Create A4 PDF
// ==================================================================
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

// ==================================================================
// Generate Labels PDF (Main Export)
// ==================================================================
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

    // إضافة الـ label حسب الكمية المطلوبة
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
