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
const mmToPoints = (mm) => mm * 2.83465;
// ============================================
// Paper Configurations
// ============================================
exports.PAPER_CONFIGS = {
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
// Generate Barcode
// ============================================
const generateBarcodeBuffer = async (text, rotated = true) => {
    return await bwip_js_1.default.toBuffer({
        bcid: "code128",
        text: text,
        scale: 2,
        height: 8,
        includetext: true,
        textxalign: "center",
        textsize: 8,
        rotate: rotated ? "L" : "N",
    });
};
// ============================================
// Draw Label - Rotated for Thermal Printer
// ============================================
const drawLabelRotated = async (doc, data, labelX, labelY, labelWidth, labelHeight, config) => {
    const padding = 3;
    const contentWidth = labelHeight - padding * 2;
    const contentHeight = labelWidth - padding * 2;
    let currentX = labelX + padding;
    let elementsCount = 0;
    if (config.showBusinessName && data.businessName)
        elementsCount++;
    if (config.showProductName && data.productName)
        elementsCount++;
    if (config.showBrand && data.brandName)
        elementsCount++;
    if (config.showPrice && data.price)
        elementsCount++;
    const barcodeWidth = config.showBarcode && data.barcode ? contentHeight * 0.4 : 0;
    const textAreaWidth = contentHeight - barcodeWidth;
    const lineSpacing = elementsCount > 0 ? textAreaWidth / elementsCount : 10;
    // ============ Barcode ============
    if (config.showBarcode && data.barcode && barcodeWidth > 10) {
        try {
            const barcodeBuffer = await generateBarcodeBuffer(data.barcode, true);
            const barcodeImgWidth = barcodeWidth - 4;
            const barcodeImgHeight = contentWidth * 0.85;
            const barcodeY = labelY + (labelHeight - barcodeImgHeight) / 2;
            doc.image(barcodeBuffer, currentX, barcodeY, {
                fit: [barcodeImgWidth, barcodeImgHeight],
                align: "center",
                valign: "center",
            });
            currentX += barcodeWidth;
        }
        catch (err) {
            console.error("Barcode error:", err);
            currentX += barcodeWidth;
        }
    }
    // ============ Price ============
    if (config.showPrice && data.price) {
        const fontSize = config.priceSize || 12;
        let priceText = `${data.price}`;
        let priceColor = "black";
        if (config.showPromotionalPrice &&
            data.promotionalPrice &&
            data.promotionalPrice < data.price) {
            priceText = `${data.promotionalPrice}`;
            priceColor = "red";
        }
        doc.save();
        doc.translate(currentX + lineSpacing / 2, labelY + labelHeight / 2);
        doc.rotate(90);
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor(priceColor);
        doc.text(priceText, -contentWidth / 2, -fontSize / 2, {
            width: contentWidth,
            align: "center",
            lineBreak: false,
        });
        doc.restore();
        currentX += lineSpacing;
    }
    // ============ Brand ============
    if (config.showBrand && data.brandName) {
        const fontSize = config.brandSize || 8;
        doc.save();
        doc.translate(currentX + lineSpacing / 2, labelY + labelHeight / 2);
        doc.rotate(90);
        doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
        doc.text(data.brandName, -contentWidth / 2, -fontSize / 2, {
            width: contentWidth,
            align: "center",
            lineBreak: false,
        });
        doc.restore();
        currentX += lineSpacing;
    }
    // ============ Product Name ============
    if (config.showProductName && data.productName) {
        const fontSize = config.productNameSize || 10;
        const maxChars = Math.floor(contentWidth / (fontSize * 0.5));
        const displayName = data.productName.length > maxChars
            ? data.productName.substring(0, maxChars - 2) + ".."
            : data.productName;
        doc.save();
        doc.translate(currentX + lineSpacing / 2, labelY + labelHeight / 2);
        doc.rotate(90);
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
        doc.text(displayName, -contentWidth / 2, -fontSize / 2, {
            width: contentWidth,
            align: "center",
            lineBreak: false,
        });
        doc.restore();
        currentX += lineSpacing;
    }
    // ============ Business Name ============
    if (config.showBusinessName && data.businessName) {
        const fontSize = config.businessNameSize || 8;
        doc.save();
        doc.translate(currentX + lineSpacing / 2, labelY + labelHeight / 2);
        doc.rotate(90);
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
        doc.text(data.businessName, -contentWidth / 2, -fontSize / 2, {
            width: contentWidth,
            align: "center",
            lineBreak: false,
        });
        doc.restore();
    }
};
// ============================================
// Draw Label - Normal for A4
// ============================================
const drawLabelNormal = async (doc, data, x, y, width, height, config) => {
    const padding = 3;
    const innerX = x + padding;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    let currentY = y + padding;
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
        const displayName = data.productName.length > maxChars
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
        if (config.showPromotionalPrice &&
            data.promotionalPrice &&
            data.promotionalPrice < data.price) {
            doc.fontSize(fontSize * 0.6).font("Helvetica").fillColor("gray");
            doc.text(`${data.price}`, innerX, currentY, {
                width: innerWidth / 2,
                align: "right",
                lineBreak: false,
            });
            doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("red");
            doc.text(`${data.promotionalPrice}`, innerX + innerWidth / 2 + 2, currentY, {
                width: innerWidth / 2,
                align: "left",
                lineBreak: false,
            });
            doc.fillColor("black");
        }
        else {
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
            const barcodeBuffer = await generateBarcodeBuffer(data.barcode, false);
            const barcodeImgWidth = Math.min(innerWidth * 0.9, 100);
            const barcodeImgHeight = barcodeHeight - 4;
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
// ============================================
// Create PDF - Thermal Printer
// ============================================
const createPDFThermal = async (labelsData, labelConfig, paperConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const totalLabels = labelsData.length;
            const labelWidth = mmToPoints(paperConfig.labelWidth);
            const labelHeight = mmToPoints(paperConfig.labelHeight);
            const pageHeight = labelHeight * totalLabels;
            const doc = new pdfkit_1.default({
                size: [labelWidth, pageHeight],
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                autoFirstPage: true,
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            for (let i = 0; i < totalLabels; i++) {
                await drawLabelRotated(doc, labelsData[i], 0, labelHeight * i, labelWidth, labelHeight, labelConfig);
            }
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
};
// ============================================
// Create PDF - A4
// ============================================
const createPDFA4 = async (labelsData, labelConfig, paperConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({
                size: [
                    mmToPoints(paperConfig.sheetWidth),
                    mmToPoints(paperConfig.sheetHeight),
                ],
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
                autoFirstPage: false,
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            let labelIndex = 0;
            const totalLabels = labelsData.length;
            while (labelIndex < totalLabels) {
                doc.addPage();
                for (let row = 0; row < paperConfig.rows && labelIndex < totalLabels; row++) {
                    for (let col = 0; col < paperConfig.columns && labelIndex < totalLabels; col++) {
                        const x = mmToPoints(paperConfig.marginLeft +
                            col * (paperConfig.labelWidth + paperConfig.gapX));
                        const y = mmToPoints(paperConfig.marginTop +
                            row * (paperConfig.labelHeight + paperConfig.gapY));
                        await drawLabelNormal(doc, labelsData[labelIndex], x, y, mmToPoints(paperConfig.labelWidth), mmToPoints(paperConfig.labelHeight), labelConfig);
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
// ============================================
// Main Function
// ============================================
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
