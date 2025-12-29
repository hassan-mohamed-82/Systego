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
// ==================================================================
// "Shrink-to-Fit" Thermal Label Drawing
// ==================================================================
// ==================================================================
// Improved Thermal Label Drawing
// ==================================================================
const drawLabelThermal = async (
  doc: PDFKit.PDFDocument,
  data: LabelData,
  labelWidth: number,
  labelHeight: number,
  config: LabelConfig
): Promise<void> => {
  // 1. Setup Margins & Working Area
  // Use smaller margins for small labels (e.g. 50x25)
  const margin = Math.min(labelWidth, labelHeight) * 0.05; 
  const innerWidth = labelWidth - (margin * 2);
  const startX = margin;
  let currentY = margin;

  // 2. Count Active Elements to Distribute Space
  // We determine which elements are active to calculate how much vertical space we have
  const activeElements = [
    config.showBusinessName && data.businessName,
    config.showBrand && data.brandName,
    config.showProductName && data.productName,
    config.showPrice && data.price,
    config.showBarcode && data.barcode
  ].filter(Boolean).length;

  if (activeElements === 0) return;

  // 3. Dynamic Font Sizing Strategy
  // Fonts are calculated as a percentage of the TOTAL label height, clamped to min/max values
  const getFontSize = (percent: number, min: number, max: number) => {
    const calculated = labelHeight * percent;
    return Math.max(min, Math.min(max, calculated));
  };

  // --- DRAW: BUSINESS NAME ---
  if (config.showBusinessName && data.businessName) {
    const fontSize = getFontSize(0.08, 6, 14); // 8% of height
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
    
    const textHeight = doc.heightOfString(data.businessName, { width: innerWidth });
    
    doc.text(data.businessName, startX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
      ellipsis: true
    });
    
    currentY += textHeight + 2; // Add small padding
  }

  // --- DRAW: BRAND NAME ---
  if (config.showBrand && data.brandName) {
    const fontSize = getFontSize(0.06, 5, 10); // 6% of height
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
    // Product name gets slightly larger emphasis
    const fontSize = getFontSize(0.12, 7, 16); 
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
    
    // We allow max 2 lines for product name if space permits
    const options = {
      width: innerWidth,
      align: "center" as const,
      lineBreak: true,
      height: fontSize * 2.2, // Limit height to roughly 2 lines
      ellipsis: true
    };

    const textHeight = Math.min(doc.heightOfString(data.productName, options), fontSize * 2.2);
    
    doc.text(data.productName, startX, currentY, options);
    
    currentY += textHeight + 4; // Extra padding after product name
  }

  // --- CALCULATE REMAINING SPACE ---
  // We need to know how much space is left for Barcode and Price
  const bottomMargin = margin;
  let remainingHeight = labelHeight - bottomMargin - currentY;

  // --- DRAW: PRICE (Bottom Priority) ---
  // We draw price first logic-wise to reserve its space, or draw it at the very bottom
  let priceHeight = 0;
  if (config.showPrice && data.price) {
    const isPromo = config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;
    const priceText = isPromo ? `${data.promotionalPrice}` : `${data.price}`;
    
    const fontSize = getFontSize(0.15, 8, 24); // Price is usually large
    doc.fontSize(fontSize).font("Helvetica-Bold");
    priceHeight = doc.heightOfString(priceText, { width: innerWidth });

    // Ensure we have space
    if (remainingHeight > priceHeight) {
      // Draw Price at the very bottom of the label area
      const priceY = labelHeight - bottomMargin - priceHeight;
      
      doc.fillColor(isPromo ? "black" : "black"); // Thermal printers only print black
      doc.text(priceText, startX, priceY, {
        width: innerWidth,
        align: "center"
      });
      
      // Reduce remaining height for the barcode
      remainingHeight -= (priceHeight + 2);
    }
  }

  // --- DRAW: BARCODE (Fill Remaining Space) ---
  if (config.showBarcode && data.barcode && remainingHeight > 10) {
    try {
      // Barcode takes whatever vertical space is left between (Product Name) and (Price)
      // We leave a small buffer
      const barcodeHeight = remainingHeight - 4; 
      
      // Generate barcode with bwip-js
      // scaleX/Y logic helps resolution but we strictly fit by dimensions
      const pngBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: data.barcode,
        scale: 2,             // Higher scale for better resolution, then we shrink it down
        height: 10,           // arbitrary abstract height
        includetext: true,
        textxalign: "center",
        textsize: 6
      });

      // Maintain Aspect Ratio manually to prevent squishing
      // We prioritize fitting the WIDTH first, then limit by HEIGHT
      const maxWidth = innerWidth * 0.9;
      
      doc.image(pngBuffer, startX + (innerWidth - maxWidth) / 2, currentY, {
        fit: [maxWidth, barcodeHeight], 
        align: "center",
        valign: "center"
      });

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
