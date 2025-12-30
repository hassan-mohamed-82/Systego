"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLabelsPDF = exports.PAPER_CONFIGS = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const products_1 = require("../models/schema/admin/products");
const product_price_1 = require("../models/schema/admin/product_price");
const NotFound_1 = require("../Errors/NotFound");
const mmToPoints = (mm) => (mm / 25.4) * 72;
exports.PAPER_CONFIGS = {
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
// ==================================================================
// Thermal Label Drawing (With Currency & Big Barcode Text)
// ==================================================================
// const drawLabelThermal = async (
//   doc: PDFKit.PDFDocument,
//   data: LabelData,
//   labelWidth: number,
//   labelHeight: number,
//   config: LabelConfig
// ): Promise<void> => {
//   // 1. Setup Margins
//   const margin = Math.min(labelWidth, labelHeight) * 0.05;
//   const innerWidth = labelWidth - (margin * 2);
//   const startX = margin;
//   let currentY = margin;
//   // 2. Count Active Elements
//   const activeElements = [
//     config.showBusinessName && data.businessName,
//     config.showBrand && data.brandName,
//     config.showProductName && data.productName,
//     config.showPrice && data.price,
//     config.showBarcode && data.barcode
//   ].filter(Boolean).length;
//   if (activeElements === 0) return;
//   // 3. Dynamic Font Helper
//   const getFontSize = (percent: number, min: number, max: number) => {
//     const calculated = labelHeight * percent;
//     return Math.max(min, Math.min(max, calculated));
//   };
//   // --- DRAW: BUSINESS NAME ---
//   if (config.showBusinessName && data.businessName) {
//     const fontSize = getFontSize(0.08, 6, 14);
//     doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
//     const textHeight = doc.heightOfString(data.businessName, { width: innerWidth });
//     doc.text(data.businessName, startX, currentY, {
//       width: innerWidth,
//       align: "center",
//       lineBreak: false,
//       ellipsis: true
//     });
//     currentY += textHeight + 2;
//   }
//   // --- DRAW: BRAND NAME ---
//   if (config.showBrand && data.brandName) {
//     const fontSize = getFontSize(0.06, 5, 10);
//     doc.fontSize(fontSize).font("Helvetica").fillColor("#444444");
//     const textHeight = doc.heightOfString(data.brandName, { width: innerWidth });
//     doc.text(data.brandName, startX, currentY, {
//       width: innerWidth,
//       align: "center",
//       lineBreak: false,
//       ellipsis: true
//     });
//     currentY += textHeight + 2;
//   }
//   // --- DRAW: PRODUCT NAME ---
//   if (config.showProductName && data.productName) {
//     const fontSize = getFontSize(0.12, 7, 16);
//     doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
//     const options = {
//       width: innerWidth,
//       align: "center" as const,
//       lineBreak: true,
//       height: fontSize * 2.2,
//       ellipsis: true
//     };
//     const textHeight = Math.min(doc.heightOfString(data.productName, options), fontSize * 2.2);
//     doc.text(data.productName, startX, currentY, options);
//     currentY += textHeight + 4;
//   }
//   // --- CALCULATE REMAINING SPACE ---
//   const bottomMargin = margin;
//   let remainingHeight = labelHeight - bottomMargin - currentY;
//   // --- DRAW: PRICE (With Currency) ---
//   let priceHeight = 0;
//   if (config.showPrice && data.price) {
//     const isPromo = config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;
//     // ADDED: Currency "EGP"
//     const priceValue = isPromo ? data.promotionalPrice : data.price;
//     const priceText = `${priceValue} EGP`;
//     const fontSize = getFontSize(0.15, 8, 24);
//     doc.fontSize(fontSize).font("Helvetica-Bold");
//     priceHeight = doc.heightOfString(priceText, { width: innerWidth });
//     if (remainingHeight > priceHeight) {
//       const priceY = labelHeight - bottomMargin - priceHeight;
//       doc.fillColor("black");
//       doc.text(priceText, startX, priceY, {
//         width: innerWidth,
//         align: "center"
//       });
//       remainingHeight -= (priceHeight + 2);
//     }
//   }
//   // --- DRAW: BARCODE (Image + Big Text) ---
//   if (config.showBarcode && data.barcode && remainingHeight > 15) {
//     try {
//       // 1. Calculate space for the text under the barcode
//       // We want this text to be readable, say ~10-12px or 10% of height
//       const codeFontSize = Math.max(8, Math.min(12, labelHeight * 0.1));
//       doc.fontSize(codeFontSize).font("Helvetica");
//       const codeTextHeight = doc.heightOfString(data.barcode, { width: innerWidth });
//       // 2. The image takes the remaining space MINUS the text height
//       const barcodeImageHeight = remainingHeight - codeTextHeight - 2;
//       if (barcodeImageHeight > 5) {
//         // Generate ONLY the bars (includetext: false)
//         const pngBuffer = await bwipjs.toBuffer({
//           bcid: "code128",
//           text: data.barcode,
//           scale: 2,
//           height: 10,
//           includetext: false, // Turn off bwip-js text
//           textxalign: "center",
//         });
//         const maxWidth = innerWidth * 0.9;
//         // Draw the Bars
//         doc.image(pngBuffer, startX + (innerWidth - maxWidth) / 2, currentY, {
//           fit: [maxWidth, barcodeImageHeight],
//           align: "center",
//           valign: "center"
//         });
//         // Draw the Text (Big and Sharp)
//         const textY = currentY + barcodeImageHeight + 1;
//         doc.text(data.barcode, startX, textY, {
//           width: innerWidth,
//           align: "center"
//         });
//       }
//     } catch (err) {
//       console.error("Barcode generation error:", err);
//     }
//   }
// };
// Draw Labels Rectangular
const drawLabelThermal = async (doc, data, labelWidth, labelHeight, config) => {
    const margin = Math.min(labelWidth, labelHeight) * 0.04; // Slightly tighter margin
    const innerWidth = labelWidth - (margin * 2);
    const innerHeight = labelHeight - (margin * 2);
    const startX = margin;
    const startY = margin;
    // Helper: Dynamic font size based on label height
    const getFontSize = (percent, min, max) => {
        const calculated = labelHeight * percent;
        return Math.max(min, Math.min(max, calculated));
    };
    // Define Grid Areas (Percentages of height)
    const topRowHeight = innerHeight * 0.25; // Top 25% for names
    const middleRowHeight = innerHeight * 0.50; // Middle 50% for barcode lines
    const bottomRowHeight = innerHeight * 0.25; // Bottom 25% for code text and pricebox
    const topRowY = startY;
    const middleRowY = startY + topRowHeight;
    const bottomRowY = startY + topRowHeight + middleRowHeight;
    // --- TOP ROW: Business Name (Left) & Product Name (Right) ---
    // 1. Business Name (Top Left, Small)
    if (config.showBusinessName && data.businessName) {
        // Use manual size if provided, else use a small percentage (e.g., 7%)
        const fontSize = config.businessNameSize || getFontSize(0.07, 5, 10);
        doc.fontSize(fontSize).font("Helvetica").fillColor("#333333");
        // Width constraint: give it 40% of the width
        doc.text(data.businessName, startX, topRowY + 2, {
            width: innerWidth * 0.4,
            align: "left",
            ellipsis: true,
            lineBreak: false
        });
    }
    // 2. Product Name (Top Right, Larger)
    if (config.showProductName && data.productName) {
        // Use manual size if provided, else use larger percentage (e.g., 12%)
        const fontSize = config.productNameSize || getFontSize(0.12, 8, 16);
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
        // Width constraint: give it the right 60% of width
        const productX = startX + (innerWidth * 0.4);
        doc.text(data.productName, productX, topRowY, {
            width: innerWidth * 0.6,
            align: "right",
            ellipsis: true,
            // Allow 2 lines if height permits, else 1
            height: topRowHeight - 2,
            lineBreak: true
        });
    }
    // --- MIDDLE ROW: Barcode Image Only (No Text) ---
    if (config.showBarcode && data.barcode) {
        try {
            const pngBuffer = await bwip_js_1.default.toBuffer({
                bcid: "code128",
                text: data.barcode,
                scale: 2,
                height: 10,
                includetext: false, // IMPORTANT: No text here, just lines
                textxalign: "center",
            });
            // Fit into middle row, leaving slight padding
            const barcodeFitHeight = middleRowHeight * 0.9;
            const barcodeFitWidth = innerWidth * 0.95;
            doc.image(pngBuffer, startX + (innerWidth - barcodeFitWidth) / 2, middleRowY + (middleRowHeight - barcodeFitHeight) / 2, {
                fit: [barcodeFitWidth, barcodeFitHeight],
                align: "center",
                valign: "center"
            });
        }
        catch (err) {
            console.error("Barcode image error:", err);
        }
    }
    // --- BOTTOM ROW: Barcode Text (Left) & Price Box (Right) ---
    // 3. Barcode Text (Bottom Left)
    if (config.showBarcode && data.barcode) {
        // Readable size, around 10% height
        const fontSize = getFontSize(0.10, 7, 12);
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
        // Place at bottom left, give it half width
        // Adjust Y to align nicely with the price box
        doc.text(data.barcode, startX, bottomRowY + (bottomRowHeight - fontSize) / 2 + 2, {
            width: innerWidth * 0.5,
            align: "left"
        });
    }
    // 4. Price Box (Bottom Right)
    if (config.showPrice && data.price) {
        const isPromo = config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;
        const priceValue = isPromo ? data.promotionalPrice : data.price;
        const priceText = `${priceValue} EGP`;
        // Calculate Box dimensions
        const boxWidth = innerWidth * 0.45; // 45% of width
        const boxHeight = bottomRowHeight * 0.9; // 90% of bottom row height
        const boxX = startX + innerWidth - boxWidth;
        const boxY = bottomRowY + (bottomRowHeight - boxHeight) / 2;
        // Draw Black Rectangle
        doc.rect(boxX, boxY, boxWidth, boxHeight).fillAndStroke("black", "black");
        // Determine font size to fit inside the box
        const fontSize = config.priceSize || getFontSize(0.15, 8, 18);
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("white");
        // Calculate vertically centered Y for text inside box
        const textHeight = doc.heightOfString(priceText, { width: boxWidth });
        const textY = boxY + (boxHeight - textHeight) / 2;
        // Draw White Text inside
        doc.text(priceText, boxX, textY, {
            width: boxWidth,
            align: "center"
        });
    }
};
// ==================================================================
// A4 Label Drawing
// ==================================================================
const drawLabelA4 = async (doc, data, x, y, width, height, config) => {
    const padding = mmToPoints(1.5);
    const innerX = x + padding;
    const innerY = y + padding;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    let currentY = innerY;
    let elementsCount = 0;
    if (config.showBusinessName && data.businessName)
        elementsCount++;
    if (config.showProductName && data.productName)
        elementsCount++;
    if (config.showBrand && data.brandName)
        elementsCount++;
    if (config.showPrice && data.price)
        elementsCount++;
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
        const displayName = data.productName.length > maxChars
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
        const isPromo = config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;
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
            const barcodeBuffer = await bwip_js_1.default.toBuffer({
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
        }
        catch (err) {
            console.error("Barcode error:", err);
        }
    }
};
// ==================================================================
// Create Thermal PDF - صفحة لكل label حسب الكمية
// ==================================================================
const createPDFThermal = async (labelsData, labelConfig, paperConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const labelWidth = mmToPoints(paperConfig.labelWidth);
            const labelHeight = mmToPoints(paperConfig.labelHeight);
            const doc = new pdfkit_1.default({
                size: [labelWidth, labelHeight],
                margin: 0,
                autoFirstPage: false,
                bufferPages: true,
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            // // Determine which layout function to use
            // // IMPORTANT: You need to add 'useRectangularLayout' (boolean) to your LabelConfig type definition.
            // // If you cannot change the type, you could trigger this based on specific paper sizes (e.g. if width > height * 1.5)
            // const useRectangularStyle = (labelConfig as any).useRectangularLayout === true;
            // const drawFunction = useRectangularStyle ? drawLabelThermalRectangular : drawLabelThermal;
            // صفحة لكل label حسب الكمية المطلوبة
            for (const labelData of labelsData) {
                doc.addPage({
                    size: [labelWidth, labelHeight],
                    margin: 0,
                });
                await drawLabelThermal(doc, labelData, labelWidth, labelHeight, labelConfig);
                // await drawFunction(doc, labelData, labelWidth, labelHeight, labelConfig);
            }
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
};
// ==================================================================
// Create A4 PDF
// ==================================================================
const createPDFA4 = async (labelsData, labelConfig, paperConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const sheetWidth = mmToPoints(paperConfig.sheetWidth);
            const sheetHeight = mmToPoints(paperConfig.sheetHeight);
            const doc = new pdfkit_1.default({
                size: [sheetWidth, sheetHeight],
                margin: 0,
                autoFirstPage: false,
                bufferPages: true,
            });
            const chunks = [];
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
                        const x = mmToPoints(paperConfig.marginLeft + col * (paperConfig.labelWidth + paperConfig.gapX));
                        const y = mmToPoints(paperConfig.marginTop + row * (paperConfig.labelHeight + paperConfig.gapY));
                        await drawLabelA4(doc, labelsData[labelIndex], x, y, mmToPoints(paperConfig.labelWidth), mmToPoints(paperConfig.labelHeight), labelConfig);
                        labelIndex++;
                    }
                }
            }
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
};
// ==================================================================
// Generate Labels PDF (Main Export)
// ==================================================================
const generateLabelsPDF = async (products, labelConfig, paperSize) => {
    const paperConfig = exports.PAPER_CONFIGS[paperSize];
    if (!paperConfig) {
        throw new NotFound_1.NotFound(`Paper size not found. Available: ${Object.keys(exports.PAPER_CONFIGS).join(", ")}`);
    }
    const labelsData = [];
    for (const item of products) {
        const product = await products_1.ProductModel.findById(item.productId).populate("brandId");
        if (!product)
            throw new NotFound_1.NotFound(`Product not found: ${item.productId}`);
        const productPrice = await product_price_1.ProductPriceModel.findById(item.productPriceId);
        if (!productPrice)
            throw new NotFound_1.NotFound(`Product price not found: ${item.productPriceId}`);
        const priceDoc = productPrice;
        const labelData = {
            productName: product.name,
            brandName: product.brandId?.name || "",
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
        throw new NotFound_1.NotFound("No valid products found to generate labels");
    }
    return paperSize.startsWith("a4_")
        ? await createPDFA4(labelsData, labelConfig, paperConfig)
        : await createPDFThermal(labelsData, labelConfig, paperConfig);
};
exports.generateLabelsPDF = generateLabelsPDF;
