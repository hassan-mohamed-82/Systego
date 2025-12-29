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
const drawLabelThermal = async (doc, data, labelWidth, labelHeight, config) => {
    const margin = Math.min(labelWidth, labelHeight) * 0.05;
    const innerWidth = labelWidth - (margin * 2);
    const availableHeight = labelHeight - (margin * 2);
    // --------------------------------------------------------
    // STEP 1: PRE-CALCULATE HEIGHTS (Without Drawing)
    // --------------------------------------------------------
    // Helper to resolve font size (User Preference OR Auto)
    const getFontSize = (manualSize, defaultPercent) => {
        if (manualSize && manualSize > 0)
            return manualSize;
        return Math.max(6, labelHeight * defaultPercent); // Fallback to auto
    };
    // We store the calculated heights here to use them later
    const layout = {
        business: { height: 0, fontSize: 0 },
        brand: { height: 0, fontSize: 0 },
        product: { height: 0, fontSize: 0 },
        price: { height: 0, fontSize: 0 },
        barcode: { height: 0 }
    };
    // 1. Measure Business Name
    if (config.showBusinessName && data.businessName) {
        layout.business.fontSize = getFontSize(config.businessNameSize, 0.08);
        doc.fontSize(layout.business.fontSize).font("Helvetica-Bold");
        layout.business.height = doc.heightOfString(data.businessName, { width: innerWidth }) + 2;
    }
    // 2. Measure Brand
    if (config.showBrand && data.brandName) {
        layout.brand.fontSize = getFontSize(config.brandSize, 0.06);
        doc.fontSize(layout.brand.fontSize).font("Helvetica");
        layout.brand.height = doc.heightOfString(data.brandName, { width: innerWidth }) + 2;
    }
    // 3. Measure Product Name
    if (config.showProductName && data.productName) {
        layout.product.fontSize = getFontSize(config.productNameSize, 0.12);
        doc.fontSize(layout.product.fontSize).font("Helvetica-Bold");
        layout.product.height = doc.heightOfString(data.productName, { width: innerWidth }) + 4;
    }
    // 4. Measure Price
    if (config.showPrice && data.price) {
        const isPromo = config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;
        const manualSize = isPromo ? config.promotionalPriceSize : config.priceSize;
        layout.price.fontSize = getFontSize(manualSize, 0.15);
        doc.fontSize(layout.price.fontSize).font("Helvetica-Bold");
        const priceText = isPromo ? `${data.promotionalPrice}` : `${data.price}`;
        layout.price.height = doc.heightOfString(priceText, { width: innerWidth }) + 2;
    }
    // 5. Measure Barcode (We assign it a "Target" height)
    // We want the barcode to be at least 25% of the label or 30 points, whichever is reasonable
    if (config.showBarcode && data.barcode) {
        const targetBarcodeHeight = Math.max(20, labelHeight * 0.25);
        layout.barcode.height = targetBarcodeHeight;
    }
    // --------------------------------------------------------
    // STEP 2: CALCULATE SCALING FACTOR
    // --------------------------------------------------------
    const totalRequiredHeight = layout.business.height +
        layout.brand.height +
        layout.product.height +
        layout.barcode.height +
        layout.price.height;
    // If required height > available height, we shrink EVERYTHING (< 1.0)
    // If we have extra space, we stay at 1.0 (we don't stretch)
    let scaleFactor = 1;
    if (totalRequiredHeight > availableHeight) {
        scaleFactor = availableHeight / totalRequiredHeight;
    }
    // --------------------------------------------------------
    // STEP 3: DRAW WITH SCALING
    // --------------------------------------------------------
    let currentY = margin;
    // If we are scaling down, center the block vertically? No, usually start from top.
    // Actually, if scaleFactor is 1 (plenty of space), let's center vertically for better looks.
    if (scaleFactor === 1) {
        const extraSpace = availableHeight - totalRequiredHeight;
        currentY += extraSpace / 2;
    }
    // --- DRAW: BUSINESS ---
    if (layout.business.height > 0) {
        const finalFontSize = layout.business.fontSize * scaleFactor;
        doc.fontSize(finalFontSize).font("Helvetica-Bold").fillColor("black");
        doc.text(data.businessName, margin, currentY, { width: innerWidth, align: "center", lineBreak: false, ellipsis: true });
        currentY += layout.business.height * scaleFactor;
    }
    // --- DRAW: BRAND ---
    if (layout.brand.height > 0) {
        const finalFontSize = layout.brand.fontSize * scaleFactor;
        doc.fontSize(finalFontSize).font("Helvetica").fillColor("#444444");
        doc.text(data.brandName, margin, currentY, { width: innerWidth, align: "center", lineBreak: false, ellipsis: true });
        currentY += layout.brand.height * scaleFactor;
    }
    // --- DRAW: PRODUCT ---
    if (layout.product.height > 0) {
        const finalFontSize = layout.product.fontSize * scaleFactor;
        doc.fontSize(finalFontSize).font("Helvetica-Bold").fillColor("black");
        doc.text(data.productName, margin, currentY, { width: innerWidth, align: "center", lineBreak: true, ellipsis: true });
        currentY += layout.product.height * scaleFactor;
    }
    // --- DRAW: BARCODE ---
    if (layout.barcode.height > 0) {
        try {
            // Calculate final barcode height after scaling
            const finalBarcodeHeight = layout.barcode.height * scaleFactor;
            // Only draw if it's not microscopic (e.g., > 5 points)
            if (finalBarcodeHeight > 5) {
                const pngBuffer = await bwip_js_1.default.toBuffer({
                    bcid: "code128",
                    text: data.barcode,
                    scale: 2, // Keep generation scale high for quality
                    height: 10,
                    includetext: true,
                    textxalign: "center",
                    textsize: 6
                });
                // We fit the image into the scaled height
                const maxWidth = innerWidth * 0.9;
                doc.image(pngBuffer, margin + (innerWidth - maxWidth) / 2, currentY, {
                    fit: [maxWidth, finalBarcodeHeight],
                    align: "center",
                    valign: "center"
                });
            }
            currentY += finalBarcodeHeight;
        }
        catch (err) {
            console.error("Barcode Error", err);
        }
    }
    // --- DRAW: PRICE ---
    if (layout.price.height > 0) {
        const finalFontSize = layout.price.fontSize * scaleFactor;
        doc.fontSize(finalFontSize).font("Helvetica-Bold").fillColor("black");
        const isPromo = config.showPromotionalPrice && data.promotionalPrice && data.promotionalPrice < data.price;
        const priceText = isPromo ? `${data.promotionalPrice}` : `${data.price}`;
        doc.text(priceText, margin, currentY, { width: innerWidth, align: "center" });
        // currentY += layout.price.height * scaleFactor; // Not needed as it's the last element
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
            // صفحة لكل label حسب الكمية المطلوبة
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
