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
// ============================================
// Helper Function
// ============================================
const mmToPoints = (mm) => mm * 2.83465;
// ============================================
// Paper Configurations - الأحجام الشائعة في السوق
// ============================================
exports.PAPER_CONFIGS = {
    // ==================== Thermal Labels ====================
    // شحن - بوليصات (الأكثر شيوعاً)
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
    // شحن مربع
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
    // منتجات كبيرة
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
    // باركود كبير
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
    // طابعات الكاشير
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
    // باركود متوسط
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
    // باركود صغير
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
    // صيدليات
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
    // ==================== A4 Sheets ====================
    // 65 ملصق - باركود صغير
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
    // 24 ملصق - منتجات متوسطة
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
    // 21 ملصق
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
    // 14 ملصق - عريض
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
const generateBarcodeBuffer = async (text, maxWidth, maxHeight) => {
    const scale = Math.max(1, Math.min(3, Math.floor(maxWidth / 30)));
    const height = Math.max(4, Math.min(12, Math.floor(maxHeight / 4)));
    return await bwip_js_1.default.toBuffer({
        bcid: "code128",
        text: text,
        scale: scale,
        height: height,
        includetext: true,
        textxalign: "center",
        textsize: Math.max(6, Math.min(10, scale * 3)),
    });
};
// ============================================
// Draw Single Label
// ============================================
const drawLabel = async (doc, data, x, y, width, height, config) => {
    const padding = Math.min(4, width * 0.03);
    const innerX = x + padding;
    const innerWidth = width - padding * 2;
    const innerHeight = height - padding * 2;
    let currentY = y + padding;
    // حساب الـ scale factor بناءً على حجم الـ label
    const scaleFactor = Math.min(width / 150, height / 80, 1);
    // ============ Business Name ============
    if (config.showBusinessName && data.businessName) {
        const fontSize = Math.max(5, Math.min(config.businessNameSize * scaleFactor, 10));
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
        doc.text(data.businessName, innerX, currentY, {
            width: innerWidth,
            align: "center",
            lineBreak: false,
        });
        currentY += fontSize + 2;
    }
    // ============ Product Name ============
    if (config.showProductName && data.productName) {
        const fontSize = Math.max(5, Math.min(config.productNameSize * scaleFactor, 11));
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
        const maxChars = Math.floor(innerWidth / (fontSize * 0.5));
        const displayName = data.productName.length > maxChars
            ? data.productName.substring(0, maxChars - 2) + ".."
            : data.productName;
        doc.text(displayName, innerX, currentY, {
            width: innerWidth,
            align: "center",
            lineBreak: false,
        });
        currentY += fontSize + 2;
    }
    // ============ Brand ============
    if (config.showBrand && data.brandName) {
        const fontSize = Math.max(4, Math.min(config.brandSize * scaleFactor, 8));
        doc.fontSize(fontSize).font("Helvetica").fillColor("gray");
        doc.text(data.brandName, innerX, currentY, {
            width: innerWidth,
            align: "center",
            lineBreak: false,
        });
        doc.fillColor("black");
        currentY += fontSize + 2;
    }
    // ============ Price ============
    if (config.showPrice && data.price) {
        const fontSize = Math.max(6, Math.min(config.priceSize * scaleFactor, 14));
        if (config.showPromotionalPrice &&
            data.promotionalPrice &&
            data.promotionalPrice < data.price) {
            const oldPriceSize = fontSize * 0.7;
            const halfWidth = innerWidth / 2 - 4;
            // السعر الأصلي (مشطوب)
            doc.fontSize(oldPriceSize).font("Helvetica").fillColor("gray");
            const oldPriceText = `${data.price}`;
            const oldPriceWidth = doc.widthOfString(oldPriceText);
            doc.text(oldPriceText, innerX, currentY, {
                width: halfWidth,
                align: "right",
            });
            // خط على السعر القديم
            const strikeY = currentY + oldPriceSize / 2;
            const strikeStartX = innerX + halfWidth - oldPriceWidth - 2;
            doc
                .moveTo(strikeStartX, strikeY)
                .lineTo(strikeStartX + oldPriceWidth, strikeY)
                .strokeColor("gray")
                .lineWidth(0.5)
                .stroke();
            // سعر العرض
            doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("red");
            doc.text(`${data.promotionalPrice}`, innerX + halfWidth + 8, currentY, {
                width: halfWidth,
                align: "left",
            });
            doc.fillColor("black");
            currentY += fontSize + 2;
        }
        else {
            doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("black");
            doc.text(`${data.price}`, innerX, currentY, {
                width: innerWidth,
                align: "center",
            });
            currentY += fontSize + 2;
        }
    }
    // ============ Barcode ============
    if (config.showBarcode && data.barcode) {
        const remainingHeight = height - (currentY - y) - padding;
        const barcodeHeight = Math.min(remainingHeight * 0.9, innerHeight * 0.4);
        if (barcodeHeight > 15) {
            try {
                const barcodeBuffer = await generateBarcodeBuffer(data.barcode, innerWidth, barcodeHeight);
                const barcodeImgWidth = Math.min(innerWidth * 0.9, 120);
                const barcodeImgHeight = Math.min(barcodeHeight, 40);
                const barcodeX = innerX + (innerWidth - barcodeImgWidth) / 2;
                doc.image(barcodeBuffer, barcodeX, currentY, {
                    fit: [barcodeImgWidth, barcodeImgHeight],
                    align: "center",
                    valign: "center",
                });
            }
            catch (err) {
                console.error("Barcode generation error:", err);
                const fontSize = Math.max(5, 7 * scaleFactor);
                doc.fontSize(fontSize).font("Helvetica");
                doc.text(data.barcode, innerX, currentY + 5, {
                    width: innerWidth,
                    align: "center",
                });
            }
        }
    }
};
// ============================================
// Create PDF
// ============================================
const createPDF = async (labelsData, labelConfig, paperConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({
                size: [mmToPoints(paperConfig.sheetWidth), mmToPoints(paperConfig.sheetHeight)],
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
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
                doc.addPage();
                for (let row = 0; row < paperConfig.rows && labelIndex < totalLabels; row++) {
                    for (let col = 0; col < paperConfig.columns && labelIndex < totalLabels; col++) {
                        const x = mmToPoints(paperConfig.marginLeft + col * (paperConfig.labelWidth + paperConfig.gapX));
                        const y = mmToPoints(paperConfig.marginTop + row * (paperConfig.labelHeight + paperConfig.gapY));
                        await drawLabel(doc, labelsData[labelIndex], x, y, mmToPoints(paperConfig.labelWidth), mmToPoints(paperConfig.labelHeight), labelConfig);
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
// Main Function - Generate Labels PDF
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
    return await createPDF(labelsData, labelConfig, paperConfig);
};
exports.generateLabelsPDF = generateLabelsPDF;
