"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLabelsPDF = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const bwip_js_1 = __importDefault(require("bwip-js"));
const products_1 = require("../models/schema/admin/products");
const product_price_1 = require("../models/schema/admin/product_price");
const NotFound_1 = require("../Errors/NotFound");
const PAPER_CONFIGS = {
    "20_per_sheet_8.5x11": {
        labelsPerSheet: 20,
        sheetWidth: 215.9,
        sheetHeight: 279.4,
        labelWidth: 101.6,
        labelHeight: 25.4,
        columns: 2,
        rows: 10,
        marginTop: 12.7,
        marginLeft: 4.8,
        gapX: 3,
        gapY: 0,
    },
    "30_per_sheet_8.5x11": {
        labelsPerSheet: 30,
        sheetWidth: 215.9,
        sheetHeight: 279.4,
        labelWidth: 66.7,
        labelHeight: 25.4,
        columns: 3,
        rows: 10,
        marginTop: 12.7,
        marginLeft: 4.8,
        gapX: 3,
        gapY: 0,
    },
};
const mmToPoints = (mm) => mm * 2.83465;
const generateLabelsPDF = async (products, labelConfig, paperSize) => {
    const paperConfig = PAPER_CONFIGS[paperSize];
    if (!paperConfig) {
        throw new NotFound_1.NotFound("Paper size configuration not found");
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
    return await createPDF(labelsData, labelConfig, paperConfig);
};
exports.generateLabelsPDF = generateLabelsPDF;
const createPDF = async (labelsData, labelConfig, paperConfig) => {
    return new Promise(async (resolve, reject) => {
        try {
            const doc = new pdfkit_1.default({
                size: [mmToPoints(paperConfig.sheetWidth), mmToPoints(paperConfig.sheetHeight)],
                margins: { top: 0, bottom: 0, left: 0, right: 0 },
            });
            const chunks = [];
            doc.on("data", (chunk) => chunks.push(chunk));
            doc.on("end", () => resolve(Buffer.concat(chunks)));
            doc.on("error", reject);
            let labelIndex = 0;
            const totalLabels = labelsData.length;
            while (labelIndex < totalLabels) {
                if (labelIndex > 0) {
                    doc.addPage();
                }
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
const drawLabel = async (doc, data, x, y, width, height, config) => {
    const padding = 5;
    const innerX = x + padding;
    const innerY = y + padding;
    const innerWidth = width - padding * 2;
    let currentY = innerY;
    const lineHeight = 10;
    // Business Name
    if (config.showBusinessName && data.businessName) {
        doc.fontSize(config.businessNameSize || 10)
            .font("Helvetica-Bold")
            .text(data.businessName, innerX, currentY, {
            width: innerWidth,
            align: "center",
        });
        currentY += lineHeight;
    }
    // Product Name
    if (config.showProductName && data.productName) {
        doc.fontSize(config.productNameSize || 8)
            .font("Helvetica")
            .text(data.productName, innerX, currentY, {
            width: innerWidth,
            align: "center",
            lineBreak: false,
        });
        currentY += lineHeight;
    }
    // Brand
    if (config.showBrand && data.brandName) {
        doc.fontSize(config.brandSize || 8)
            .font("Helvetica")
            .text(data.brandName, innerX, currentY, {
            width: innerWidth,
            align: "center",
        });
        currentY += lineHeight;
    }
    // Price - بدون currency
    if (config.showPrice) {
        let priceText;
        if (config.showPromotionalPrice && data.promotionalPrice) {
            priceText = `${data.promotionalPrice} (was ${data.price})`;
        }
        else {
            priceText = `${data.price}`;
        }
        doc.fontSize(config.priceSize || 9)
            .font("Helvetica-Bold")
            .text(priceText, innerX, currentY, {
            width: innerWidth,
            align: "center",
        });
        currentY += lineHeight;
    }
    // Barcode
    if (data.barcode) {
        try {
            const barcodeBuffer = await bwip_js_1.default.toBuffer({
                bcid: "code128",
                text: data.barcode,
                scale: 2,
                height: 8,
                includetext: true,
                textsize: 8,
            });
            const barcodeWidth = 80;
            const barcodeX = x + (width - barcodeWidth) / 2;
            doc.image(barcodeBuffer, barcodeX, currentY, {
                width: barcodeWidth,
                height: 25,
            });
        }
        catch (error) {
            console.error("Error generating barcode:", error);
        }
    }
};
