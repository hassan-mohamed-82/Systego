"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateEAN13Barcode = exports.generateLabelsPDF = exports.PAPER_CONFIGS = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const products_1 = require("../models/schema/admin/products");
const product_price_1 = require("../models/schema/admin/product_price");
const NotFound_1 = require("../Errors/NotFound");
// تحويل من مليمتر إلى نقاط PDF
const mmToPoints = (mm) => mm * 2.83465;
// إعدادات أحجام الورق
exports.PAPER_CONFIGS = {
    // أحجام حرارية (Thermal)
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
    // أحجام A4
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
// توليد صورة الباركود
const generateBarcodeBuffer = async (text, maxWidth, maxHeight) => {
    try {
        const buffer = await bwip_js_1.default.toBuffer({
            bcid: "code128",
            text: text,
            scale: 1.5,
            height: 7,
            includetext: true,
            textxalign: "center",
            textsize: 6,
            rotate: "L",
        });
        return buffer;
    }
    catch (error) {
        throw new Error(`Failed to generate barcode: ${error}`);
    }
};
// رسم نص مع تدوير
const drawRotatedText = (doc, text, x, y, options) => {
    doc.save();
    doc.translate(x, y);
    doc.rotate(90);
    doc.fontSize(options.fontSize);
    if (options.color)
        doc.fillColor(options.color);
    doc.text(text, 0, 0, { align: options.align || "left" });
    doc.restore();
};
// رسم Label مع تدوير (للطابعات الحرارية)
const drawLabelRotated = async (doc, labelData, width, height, config) => {
    const padding = 2;
    // أحجام الخطوط المكبرة
    const businessNameSize = 5;
    const productNameSize = 6;
    const brandSize = 5;
    const priceSize = 8;
    const lineSpacing = 2;
    // تدوير الصفحة 90 درجة
    doc.save();
    doc.translate(width, 0);
    doc.rotate(90);
    const drawWidth = height;
    const drawHeight = width;
    let currentY = padding;
    const centerAlign = "center";
    // Business Name
    if (config.showBusinessName && labelData.businessName) {
        doc.fontSize(businessNameSize).fillColor("black");
        doc.text(labelData.businessName, padding, currentY, {
            width: drawWidth - padding * 2,
            align: centerAlign,
        });
        currentY += businessNameSize + lineSpacing;
    }
    // Product Name
    if (config.showProductName && labelData.productName) {
        const maxChars = Math.floor((drawWidth - padding * 2) / (productNameSize * 0.5));
        const displayName = labelData.productName.length > maxChars
            ? labelData.productName.substring(0, maxChars - 2) + ".."
            : labelData.productName;
        doc.fontSize(productNameSize).fillColor("black");
        doc.text(displayName, padding, currentY, {
            width: drawWidth - padding * 2,
            align: centerAlign,
        });
        currentY += productNameSize + lineSpacing;
    }
    // Brand
    if (config.showBrand && labelData.brandName) {
        doc.fontSize(brandSize).fillColor("gray");
        doc.text(labelData.brandName, padding, currentY, {
            width: drawWidth - padding * 2,
            align: centerAlign,
        });
        currentY += brandSize + lineSpacing;
    }
    // Price
    if (config.showPrice) {
        const priceText = labelData.promotionalPrice && labelData.promotionalPrice < labelData.price
            ? `${labelData.promotionalPrice}`
            : `${labelData.price}`;
        doc.fontSize(priceSize).fillColor("black");
        doc.text(priceText, padding, currentY, {
            width: drawWidth - padding * 2,
            align: centerAlign,
        });
        currentY += priceSize + lineSpacing;
    }
    // Barcode
    if (config.showBarcode && labelData.barcode) {
        try {
            const remainingHeight = drawHeight - currentY - padding;
            const barcodeMaxWidth = drawWidth - padding * 2;
            const barcodeMaxHeight = Math.min(remainingHeight, 20);
            const barcodeBuffer = await generateBarcodeBuffer(labelData.barcode, barcodeMaxWidth, barcodeMaxHeight);
            const barcodeWidth = Math.min(barcodeMaxWidth * 0.9, 60);
            const barcodeHeight = Math.min(barcodeMaxHeight * 0.9, 15);
            const barcodeX = (drawWidth - barcodeWidth) / 2;
            doc.image(barcodeBuffer, barcodeX, currentY, {
                width: barcodeWidth,
                height: barcodeHeight,
            });
        }
        catch (error) {
            doc.fontSize(4).fillColor("black");
            doc.text(labelData.barcode, padding, currentY, {
                width: drawWidth - padding * 2,
                align: centerAlign,
            });
        }
    }
    doc.restore();
};
// رسم Label عادي (لـ A4)
const drawLabelNormal = async (doc, labelData, x, y, width, height, config) => {
    const padding = 2;
    const innerWidth = width - padding * 2;
    const businessNameSize = 5;
    const productNameSize = 6;
    const brandSize = 5;
    const priceSize = 8;
    let currentY = y + padding;
    const lineSpacing = 1;
    const centerAlign = "center";
    // Business Name
    if (config.showBusinessName && labelData.businessName) {
        doc.fontSize(businessNameSize).fillColor("black");
        doc.text(labelData.businessName, x + padding, currentY, {
            width: innerWidth,
            align: centerAlign,
        });
        currentY += businessNameSize + lineSpacing;
    }
    // Product Name
    if (config.showProductName && labelData.productName) {
        const maxChars = Math.floor(innerWidth / (productNameSize * 0.5));
        const displayName = labelData.productName.length > maxChars
            ? labelData.productName.substring(0, maxChars - 2) + ".."
            : labelData.productName;
        doc.fontSize(productNameSize).fillColor("black");
        doc.text(displayName, x + padding, currentY, {
            width: innerWidth,
            align: centerAlign,
        });
        currentY += productNameSize + lineSpacing;
    }
    // Brand
    if (config.showBrand && labelData.brandName) {
        doc.fontSize(brandSize).fillColor("gray");
        doc.text(labelData.brandName, x + padding, currentY, {
            width: innerWidth,
            align: centerAlign,
        });
        currentY += brandSize + lineSpacing;
    }
    // Price
    if (config.showPrice) {
        const priceText = labelData.promotionalPrice && labelData.promotionalPrice < labelData.price
            ? `${labelData.promotionalPrice}`
            : `${labelData.price}`;
        doc.fontSize(priceSize).fillColor("black");
        doc.text(priceText, x + padding, currentY, {
            width: innerWidth,
            align: centerAlign,
        });
        currentY += priceSize + lineSpacing;
    }
    // Barcode
    if (config.showBarcode && labelData.barcode) {
        try {
            const remainingHeight = y + height - currentY - padding;
            const barcodeBuffer = await generateBarcodeBuffer(labelData.barcode, innerWidth, remainingHeight);
            const barcodeWidth = Math.min(innerWidth * 0.9, 50);
            const barcodeHeight = Math.min(remainingHeight * 0.8, 12);
            const barcodeX = x + (width - barcodeWidth) / 2;
            doc.image(barcodeBuffer, barcodeX, currentY, {
                width: barcodeWidth,
                height: barcodeHeight,
            });
        }
        catch (error) {
            doc.fontSize(4).fillColor("black");
            doc.text(labelData.barcode, x + padding, currentY, {
                width: innerWidth,
                align: centerAlign,
            });
        }
    }
};
// إنشاء PDF للطابعات الحرارية (كل label في صفحة منفصلة)
const createPDFThermal = async (labelsData, paperConfig, labelConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const labelWidth = mmToPoints(paperConfig.labelWidth);
            const labelHeight = mmToPoints(paperConfig.labelHeight);
            const doc = new pdfkit_1.default({
                autoFirstPage: false,
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            for (let i = 0; i < labelsData.length; i++) {
                doc.addPage({
                    size: [labelWidth, labelHeight],
                    margin: 0,
                });
                await drawLabelRotated(doc, labelsData[i], labelWidth, labelHeight, labelConfig);
            }
            doc.end();
        }
        catch (error) {
            reject(error);
        }
    });
};
// إنشاء PDF لـ A4
const createPDFA4 = async (labelsData, paperConfig, labelConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const sheetWidth = mmToPoints(paperConfig.sheetWidth);
            const sheetHeight = mmToPoints(paperConfig.sheetHeight);
            const labelWidth = mmToPoints(paperConfig.labelWidth);
            const labelHeight = mmToPoints(paperConfig.labelHeight);
            const marginTop = mmToPoints(paperConfig.marginTop);
            const marginLeft = mmToPoints(paperConfig.marginLeft);
            const gapX = mmToPoints(paperConfig.gapX);
            const gapY = mmToPoints(paperConfig.gapY);
            const doc = new pdfkit_1.default({
                size: [sheetWidth, sheetHeight],
                margin: 0,
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            let labelIndex = 0;
            while (labelIndex < labelsData.length) {
                if (labelIndex > 0) {
                    doc.addPage();
                }
                for (let row = 0; row < paperConfig.rows && labelIndex < labelsData.length; row++) {
                    for (let col = 0; col < paperConfig.columns && labelIndex < labelsData.length; col++) {
                        const x = marginLeft + col * (labelWidth + gapX);
                        const y = marginTop + row * (labelHeight + gapY);
                        await drawLabelNormal(doc, labelsData[labelIndex], x, y, labelWidth, labelHeight, labelConfig);
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
// الدالة الرئيسية لتوليد PDF
const generateLabelsPDF = async (products, labelConfig, paperSize) => {
    const paperConfig = exports.PAPER_CONFIGS[paperSize];
    if (!paperConfig) {
        throw new NotFound_1.NotFound(`Paper size "${paperSize}" not found`);
    }
    const labelsData = [];
    for (const item of products) {
        const product = await products_1.ProductModel.findById(item.productId).populate("brandId");
        if (!product) {
            throw new NotFound_1.NotFound(`Product not found: ${item.productId}`);
        }
        const productPrice = await product_price_1.ProductPriceModel.findById(item.productPriceId);
        if (!productPrice) {
            throw new NotFound_1.NotFound(`Product price not found: ${item.productPriceId}`);
        }
        const priceDoc = productPrice;
        const labelData = {
            productName: product.name || "",
            brandName: product.brandId?.name || "",
            businessName: "WegoStation",
            price: priceDoc.price || 0,
            promotionalPrice: priceDoc.promotionalPrice || undefined,
            barcode: priceDoc.code || "",
        };
        for (let i = 0; i < item.quantity; i++) {
            labelsData.push(labelData);
        }
    }
    if (labelsData.length === 0) {
        throw new NotFound_1.NotFound("No labels to generate");
    }
    if (paperSize.startsWith("a4_")) {
        return createPDFA4(labelsData, paperConfig, labelConfig);
    }
    else {
        return createPDFThermal(labelsData, paperConfig, labelConfig);
    }
};
exports.generateLabelsPDF = generateLabelsPDF;
// توليد باركود EAN-13
const generateEAN13Barcode = () => {
    let code = "";
    for (let i = 0; i < 12; i++) {
        code += Math.floor(Math.random() * 10).toString();
    }
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return code + checkDigit;
};
exports.generateEAN13Barcode = generateEAN13Barcode;
