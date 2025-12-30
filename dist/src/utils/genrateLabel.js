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
    "70x40": {
        labelsPerSheet: 1,
        sheetWidth: 70,
        sheetHeight: 40,
        labelWidth: 70,
        labelHeight: 40,
        columns: 1,
        rows: 1,
        marginTop: 0,
        marginLeft: 0,
        gapX: 0,
        gapY: 0,
    },
    "60x40": {
        labelsPerSheet: 1,
        sheetWidth: 60,
        sheetHeight: 40,
        labelWidth: 60,
        labelHeight: 40,
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
};
// ==================================================================
// Thermal Label Drawing - Smart Layout
// ==================================================================
const drawLabelThermal = async (doc, data, labelWidth, labelHeight, config) => {
    const margin = labelWidth * 0.04;
    const innerWidth = labelWidth - margin * 2;
    const startX = margin;
    // تحديد نوع الـ Layout بناءً على حجم الـ Label
    const isSmallLabel = labelHeight < 80; // أقل من ~28mm
    const isMediumLabel = labelHeight >= 80 && labelHeight < 120; // ~28mm - ~42mm
    const isLargeLabel = labelHeight >= 120; // أكبر من ~42mm
    // === حساب المساحات بناءً على الحجم ===
    let headerPercent;
    let barcodePercent;
    let pricePercent;
    if (isSmallLabel) {
        headerPercent = 0.15;
        barcodePercent = 0.55;
        pricePercent = 0.30;
    }
    else if (isMediumLabel) {
        headerPercent = 0.12;
        barcodePercent = 0.60;
        pricePercent = 0.28;
    }
    else {
        headerPercent = 0.10;
        barcodePercent = 0.65;
        pricePercent = 0.25;
    }
    const headerHeight = labelHeight * headerPercent;
    const priceHeight = labelHeight * pricePercent;
    const barcodeAreaHeight = labelHeight * barcodePercent;
    let currentY = margin;
    // ===== 1. BUSINESS NAME (Header) =====
    if (config.showBusinessName && data.businessName) {
        const fontSize = Math.max(6, Math.min(14, labelHeight * 0.09));
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
        doc.text(data.businessName, startX, currentY, {
            width: innerWidth,
            align: "center",
            lineBreak: false,
        });
        currentY = headerHeight * 0.8;
    }
    // ===== 2. PRODUCT NAME =====
    if (config.showProductName && data.productName) {
        const fontSize = Math.max(5, Math.min(10, labelHeight * 0.065));
        doc.fontSize(fontSize).font("Helvetica").fillColor("#333333");
        // Truncate if too long
        const maxLength = isSmallLabel ? 25 : 35;
        const displayName = data.productName.length > maxLength
            ? data.productName.substring(0, maxLength - 2) + ".."
            : data.productName;
        doc.text(displayName, startX, currentY, {
            width: innerWidth,
            align: "center",
            lineBreak: false,
        });
        currentY += fontSize + 3;
    }
    // ===== 3. BRAND NAME =====
    if (config.showBrand && data.brandName) {
        const fontSize = Math.max(4, Math.min(8, labelHeight * 0.05));
        doc.fontSize(fontSize).font("Helvetica").fillColor("#666666");
        doc.text(data.brandName, startX, currentY, {
            width: innerWidth,
            align: "center",
            lineBreak: false,
        });
        currentY += fontSize + 2;
    }
    // ===== 4. BARCODE =====
    if (config.showBarcode && data.barcode) {
        try {
            // حساب مساحة النص تحت الباركود
            const barcodeTextFontSize = Math.max(8, Math.min(14, labelHeight * 0.10));
            const barcodeTextHeight = barcodeTextFontSize + 4;
            // حساب ارتفاع صورة الباركود
            const availableForBarcode = barcodeAreaHeight - barcodeTextHeight;
            const barcodeImageHeight = Math.max(20, availableForBarcode * 0.85);
            // Generate barcode image (بدون نص)
            const pngBuffer = await bwip_js_1.default.toBuffer({
                bcid: "code128",
                text: data.barcode,
                scale: 3,
                height: Math.max(8, Math.floor(barcodeImageHeight / 4)),
                includetext: false,
            });
            const barcodeWidth = innerWidth * 0.88;
            const barcodeX = startX + (innerWidth - barcodeWidth) / 2;
            // رسم صورة الباركود
            doc.image(pngBuffer, barcodeX, currentY, {
                fit: [barcodeWidth, barcodeImageHeight],
                align: "center",
                valign: "center",
            });
            currentY += barcodeImageHeight + 2;
            // رسم رقم الباركود
            doc.fontSize(barcodeTextFontSize).font("Helvetica").fillColor("#000000");
            doc.text(data.barcode, startX, currentY, {
                width: innerWidth,
                align: "center",
            });
        }
        catch (err) {
            console.error("Barcode generation error:", err);
        }
    }
    // ===== 5. PRICE (Bottom) =====
    if (config.showPrice && data.price) {
        const isPromo = config.showPromotionalPrice &&
            data.promotionalPrice &&
            data.promotionalPrice < data.price;
        const priceValue = isPromo ? data.promotionalPrice : data.price;
        const priceText = `${priceValue} EGP`;
        const fontSize = Math.max(10, Math.min(22, labelHeight * 0.16));
        doc.fontSize(fontSize).font("Helvetica-Bold").fillColor("#000000");
        // وضع السعر في أسفل الـ Label
        const priceY = labelHeight - priceHeight + margin * 2;
        doc.text(priceText, startX, priceY, {
            width: innerWidth,
            align: "center",
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
        doc.text(`${price} EGP`, innerX, currentY, {
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
// Create Thermal PDF
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
            for (const labelData of labelsData) {
                doc.addPage({
                    size: [labelWidth, labelHeight],
                    margin: 0,
                });
                await drawLabelThermal(doc, labelData, labelWidth, labelHeight, labelConfig);
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
