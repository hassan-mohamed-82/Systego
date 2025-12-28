import PDFDocument from "pdfkit";
import bwipjs from "bwip-js";
import { ProductModel } from "../models/schema/admin/products";
import { ProductPriceModel } from "../models/schema/admin/product_price";
import { NotFound } from "../Errors/NotFound";
import { PaperConfig, LabelConfig, LabelData } from "../types/generateLabel";

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
    height: 12,
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
  labelX: number,
  labelY: number,
  labelWidth: number,
  labelHeight: number,
  config: LabelConfig
): Promise<void> => {
  const paddingX = 8;
  const paddingTop = 10;
  const paddingBottom = 8;
  const innerWidth = labelWidth - paddingX * 2;
  const innerHeight = labelHeight - paddingTop - paddingBottom;

  // حساب مساحة الباركود
  const barcodeHeight =
    config.showBarcode && data.barcode ? innerHeight * 0.32 : 0;
  const textAreaHeight = innerHeight - barcodeHeight;

  // عد العناصر النصية
  let textElements = 0;
  if (config.showProductName && data.productName) textElements++;
  if (config.showBrand && data.brandName) textElements++;
  if (config.showPrice && data.price) textElements++;
  if (config.showBusinessName && data.businessName) textElements++;

  const lineHeight = textElements > 0 ? textAreaHeight / textElements : 15;
  let currentY = labelY + paddingTop;

  // ============ Product Name ============
  if (config.showProductName && data.productName) {
    const fontSize = Math.min(config.productNameSize || 14, lineHeight * 0.65);
    const maxChars = Math.floor(innerWidth / (fontSize * 0.55));
    const displayName =
      data.productName.length > maxChars
        ? data.productName.substring(0, maxChars - 2) + ".."
        : data.productName;

    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(displayName, labelX + paddingX, currentY, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // ============ Brand ============
  if (config.showBrand && data.brandName) {
    const fontSize = Math.min(config.brandSize || 10, lineHeight * 0.55);
    doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
    doc.text(data.brandName, labelX + paddingX, currentY, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // ============ Price ============
  if (config.showPrice && data.price) {
    const fontSize = Math.min(config.priceSize || 16, lineHeight * 0.75);
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
    doc.text(priceText, labelX + paddingX, currentY, {
      width: innerWidth,
      align: "center",
    });
    currentY += lineHeight;
  }

  // ============ Business Name ============
  if (config.showBusinessName && data.businessName) {
    const fontSize = Math.min(config.businessNameSize || 10, lineHeight * 0.5);
    doc.fontSize(fontSize).font("Helvetica").fillColor("black");
    doc.text(data.businessName, labelX + paddingX, currentY, {
      width: innerWidth,
      align: "center",
    });
  }

  // ============ Barcode ============
  if (config.showBarcode && data.barcode && barcodeHeight > 15) {
    try {
      const barcodeBuffer = await generateBarcodeBuffer(data.barcode);
      const barcodeImgWidth = innerWidth * 0.8;
      const barcodeImgHeight = barcodeHeight - 5;
      const barcodeX = labelX + paddingX + (innerWidth - barcodeImgWidth) / 2;
      const barcodeY = labelY + labelHeight - paddingBottom - barcodeHeight;

      doc.image(barcodeBuffer, barcodeX, barcodeY, {
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
// Draw Label - Normal for A4
// ============================================
const drawLabelNormal = async (
  doc: PDFKit.PDFDocument,
  data: LabelData,
  x: number,
  y: number,
  width: number,
  height: number,
  config: LabelConfig
): Promise<void> => {
  const padding = 3;
  const innerX = x + padding;
  const innerWidth = width - padding * 2;
  const innerHeight = height - padding * 2;
  let currentY = y + padding;

  let elementsCount = 0;
  if (config.showBusinessName && data.businessName) elementsCount++;
  if (config.showProductName && data.productName) elementsCount++;
  if (config.showBrand && data.brandName) elementsCount++;
  if (config.showPrice && data.price) elementsCount++;

  const barcodeHeight =
    config.showBarcode && data.barcode ? innerHeight * 0.4 : 0;
  const textAreaHeight = innerHeight - barcodeHeight;
  const lineHeight = elementsCount > 0 ? textAreaHeight / elementsCount : 12;

  // Business Name
  if (config.showBusinessName && data.businessName) {
    const fontSize = Math.min(config.businessNameSize || 8, lineHeight * 0.7);
    doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
    doc.text(data.businessName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += lineHeight;
  }

  // Product Name
  if (config.showProductName && data.productName) {
    const fontSize = Math.min(config.productNameSize || 10, lineHeight * 0.75);
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

  // Brand
  if (config.showBrand && data.brandName) {
    const fontSize = Math.min(config.brandSize || 8, lineHeight * 0.6);
    doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
    doc.text(data.brandName, innerX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    doc.fillColor("black");
    currentY += lineHeight;
  }

  // Price
  if (config.showPrice && data.price) {
    const fontSize = Math.min(config.priceSize || 12, lineHeight * 0.8);
    if (
      config.showPromotionalPrice &&
      data.promotionalPrice &&
      data.promotionalPrice < data.price
    ) {
      doc.fontSize(fontSize * 0.6).font("Helvetica").fillColor("gray");
      doc.text(`${data.price}`, innerX, currentY, {
        width: innerWidth / 2,
        align: "right",
        lineBreak: false,
      });
      doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("red");
      doc.text(
        `${data.promotionalPrice}`,
        innerX + innerWidth / 2 + 2,
        currentY,
        {
          width: innerWidth / 2,
          align: "left",
          lineBreak: false,
        }
      );
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

  // Barcode
  if (config.showBarcode && data.barcode && barcodeHeight > 10) {
    try {
      const barcodeBuffer = await generateBarcodeBuffer(data.barcode);
      const barcodeImgWidth = Math.min(innerWidth * 0.9, 100);
      const barcodeImgHeight = barcodeHeight - 4;
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
// Create PDF - Thermal Printer
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
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        autoFirstPage: false,
      });

      const chunks: Buffer[] = [];
      doc.on("data", (chunk) => chunks.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(chunks)));
      doc.on("error", reject);

      for (let i = 0; i < labelsData.length; i++) {
        doc.addPage({
          size: [labelWidth, labelHeight],
          margins: { top: 0, bottom: 0, left: 0, right: 0 },
        });

        await drawLabelThermal(
          doc,
          labelsData[i],
          0,
          0,
          labelWidth,
          labelHeight,
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
// Create PDF - A4
// ============================================
const createPDFA4 = async (
  labelsData: LabelData[],
  labelConfig: LabelConfig,
  paperConfig: PaperConfig
): Promise<Buffer> => {
  return new Promise(async (resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: [
          mmToPoints(paperConfig.sheetWidth),
          mmToPoints(paperConfig.sheetHeight),
        ],
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
        for (
          let row = 0;
          row < paperConfig.rows && labelIndex < totalLabels;
          row++
        ) {
          for (
            let col = 0;
            col < paperConfig.columns && labelIndex < totalLabels;
            col++
          ) {
            const x = mmToPoints(
              paperConfig.marginLeft +
                col * (paperConfig.labelWidth + paperConfig.gapX)
            );
            const y = mmToPoints(
              paperConfig.marginTop +
                row * (paperConfig.labelHeight + paperConfig.gapY)
            );
            await drawLabelNormal(
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
    const product = await ProductModel.findById(item.productId).populate(
      "brandId"
    );
    if (!product) throw new NotFound(`Product not found: ${item.productId}`);

    const productPrice = await ProductPriceModel.findById(item.productPriceId);
    if (!productPrice)
      throw new NotFound(`Product price not found: ${item.productPriceId}`);

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
