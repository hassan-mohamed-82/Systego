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
  const paddingX = mmToPoints(2);
  const paddingY = mmToPoints(1.5);
  const innerWidth = labelWidth - paddingX * 2;
  const innerHeight = labelHeight - paddingY * 2;

  // حساب توزيع المساحات بنسب مئوية من الارتفاع الكلي
  const businessNameHeight = innerHeight * 0.10;
  const brandHeight = innerHeight * 0.08;
  const productNameHeight = innerHeight * 0.15;
  const barcodeHeight = innerHeight * 0.45;
  const priceHeight = innerHeight * 0.22;

  let currentY = paddingY;

  // 1. اسم المحل (فوق خالص)
  if (config.showBusinessName && data.businessName) {
    doc.fontSize(8).font("Helvetica-Bold").fillColor("#333333");
    doc.text(data.businessName, paddingX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += businessNameHeight;
  }

  // 2. البراند
  if (config.showBrand && data.brandName) {
    doc.fontSize(6).font("Helvetica").fillColor("#666666");
    doc.text(data.brandName, paddingX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += brandHeight;
  }

  // 3. اسم المنتج
  if (config.showProductName && data.productName) {
    const maxChars = 20;
    const displayName =
      data.productName.length > maxChars
        ? data.productName.substring(0, maxChars - 2) + ".."
        : data.productName;

    doc.fontSize(10).font("Helvetica-Bold").fillColor("black");
    doc.text(displayName, paddingX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
    currentY += productNameHeight;
  }

  // 4. الباركود (في النص)
  if (config.showBarcode && data.barcode) {
    try {
      const barcodeBuffer = await bwipjs.toBuffer({
        bcid: "code128",
        text: data.barcode,
        scale: 2,
        height: 12,
        includetext: true,
        textxalign: "center",
        textsize: 8,
      });

      const barcodeImgWidth = innerWidth * 0.80;
      const barcodeImgHeight = barcodeHeight * 0.85;
      const barcodeX = paddingX + (innerWidth - barcodeImgWidth) / 2;

      doc.image(barcodeBuffer, barcodeX, currentY, {
        fit: [barcodeImgWidth, barcodeImgHeight],
        align: "center",
      });

      currentY += barcodeHeight;
    } catch (err) {
      console.error("Barcode error:", err);
      currentY += barcodeHeight;
    }
  }

  // 5. السعر (تحت)
  if (config.showPrice && data.price) {
    const isPromo =
      config.showPromotionalPrice &&
      data.promotionalPrice &&
      data.promotionalPrice < data.price;

    const priceText = isPromo ? `${data.promotionalPrice}` : `${data.price}`;
    const color = isPromo ? "red" : "black";

    doc.fontSize(14).font("Helvetica-Bold").fillColor(color);
    doc.text(priceText, paddingX, currentY, {
      width: innerWidth,
      align: "center",
      lineBreak: false,
    });
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
