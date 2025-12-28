"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLabelsController = exports.getAvailableLabelSizes = void 0;
const response_1 = require("../../utils/response");
const Errors_1 = require("../../Errors");
const genrateLabel_1 = require("../../utils/genrateLabel");
// توليد الباركود كـ Buffer
const getAvailableLabelSizes = async (req, res) => {
    const labelSizes = [
        // Thermal Labels
        {
            id: "100x150",
            name: "100×150mm",
            description: "بوليصة شحن",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "100mm × 150mm",
            recommended: true,
            useCase: "شحن - DHL, Aramex, بوسطة",
        },
        {
            id: "100x100",
            name: "100×100mm",
            description: "شحن مربع",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "100mm × 100mm",
            recommended: false,
            useCase: "صناديق مربعة",
        },
        {
            id: "100x50",
            name: "100×50mm",
            description: "منتجات كبيرة",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "100mm × 50mm",
            recommended: false,
            useCase: "كراتين - منتجات كبيرة",
        },
        {
            id: "80x50",
            name: "80×50mm",
            description: "باركود كبير",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "80mm × 50mm",
            recommended: false,
            useCase: "منتجات كبيرة",
        },
        {
            id: "58x40",
            name: "58×40mm",
            description: "طابعات الكاشير",
            paperType: "Roll",
            labelsPerSheet: 1,
            labelSize: "58mm × 40mm",
            recommended: true,
            useCase: "طابعات POS - فواتير",
        },
        {
            id: "50x30",
            name: "50×30mm",
            description: "باركود متوسط",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "50mm × 30mm",
            recommended: true,
            useCase: "منتجات متوسطة",
        },
        {
            id: "50x25",
            name: "50×25mm",
            description: "باركود صغير",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "50mm × 25mm",
            recommended: false,
            useCase: "منتجات صغيرة",
        },
        {
            id: "38x25",
            name: "38×25mm",
            description: "صيدليات",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "38mm × 25mm",
            recommended: true,
            useCase: "أدوية - منتجات صغيرة",
        },
        // A4 Sheets
        {
            id: "a4_65",
            name: "A4 - 65 ملصق",
            description: "5 أعمدة × 13 صف",
            paperType: "A4",
            labelsPerSheet: 65,
            labelSize: "38.1mm × 21.2mm",
            recommended: true,
            useCase: "طباعة جماعية - باركود صغير",
        },
        {
            id: "a4_24",
            name: "A4 - 24 ملصق",
            description: "3 أعمدة × 8 صفوف",
            paperType: "A4",
            labelsPerSheet: 24,
            labelSize: "64mm × 34mm",
            recommended: false,
            useCase: "طباعة جماعية - منتجات متوسطة",
        },
        {
            id: "a4_21",
            name: "A4 - 21 ملصق",
            description: "3 أعمدة × 7 صفوف",
            paperType: "A4",
            labelsPerSheet: 21,
            labelSize: "63.5mm × 38.1mm",
            recommended: false,
            useCase: "طباعة جماعية",
        },
        {
            id: "a4_14",
            name: "A4 - 14 ملصق",
            description: "2 أعمدة × 7 صفوف",
            paperType: "A4",
            labelsPerSheet: 14,
            labelSize: "99.1mm × 38.1mm",
            recommended: false,
            useCase: "طباعة جماعية - عريض",
        },
    ];
    (0, response_1.SuccessResponse)(res, { labelSizes });
};
exports.getAvailableLabelSizes = getAvailableLabelSizes;
// ============================================
// Generate Labels PDF
// ============================================
const generateLabelsController = async (req, res) => {
    const { products, labelConfig, paperSize } = req.body;
    // Validation
    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new Errors_1.BadRequest("Products array is required");
    }
    if (!paperSize || !genrateLabel_1.PAPER_CONFIGS[paperSize]) {
        throw new Errors_1.BadRequest(`Invalid paper size. Available: ${Object.keys(genrateLabel_1.PAPER_CONFIGS).join(", ")}`);
    }
    for (const product of products) {
        if (!product.productId || !product.productPriceId || !product.quantity) {
            throw new Errors_1.BadRequest("Each product must have productId, productPriceId, and quantity");
        }
        if (product.quantity < 1) {
            throw new Errors_1.BadRequest("Quantity must be at least 1");
        }
    }
    // Default config
    const defaultLabelConfig = {
        showProductName: true,
        showPrice: true,
        showPromotionalPrice: true,
        showBusinessName: false,
        showBrand: true,
        showBarcode: true,
        productNameSize: 10,
        priceSize: 12,
        promotionalPriceSize: 12,
        businessNameSize: 8,
        brandSize: 8,
    };
    const finalConfig = { ...defaultLabelConfig, ...labelConfig };
    // Generate PDF
    const pdfBuffer = await (0, genrateLabel_1.generateLabelsPDF)(products, finalConfig, paperSize);
    // Send PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=labels_${paperSize}_${Date.now()}.pdf`);
    res.send(pdfBuffer);
};
exports.generateLabelsController = generateLabelsController;
