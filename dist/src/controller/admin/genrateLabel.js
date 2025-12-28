"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLabelsController = exports.getAvailableLabelSizes = void 0;
const genrateLabel_1 = require("../../utils/genrateLabel");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
// الحصول على الأحجام المتاحة
const getAvailableLabelSizes = async (req, res) => {
    const sizes = [
        // أحجام حرارية
        {
            id: "100x150",
            name: "100 × 150 مم",
            description: "ملصق شحن كبير",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "100mm × 150mm",
            recommended: true,
            useCase: "بوليصات الشحن",
        },
        {
            id: "100x100",
            name: "100 × 100 مم",
            description: "ملصق مربع كبير",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "100mm × 100mm",
            recommended: false,
            useCase: "ملصقات المنتجات الكبيرة",
        },
        {
            id: "100x50",
            name: "100 × 50 مم",
            description: "ملصق عريض",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "100mm × 50mm",
            recommended: false,
            useCase: "ملصقات الأرفف",
        },
        {
            id: "80x50",
            name: "80 × 50 مم",
            description: "ملصق متوسط",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "80mm × 50mm",
            recommended: false,
            useCase: "طابعات الكاشير",
        },
        {
            id: "58x40",
            name: "58 × 40 مم",
            description: "ملصق كاشير",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "58mm × 40mm",
            recommended: true,
            useCase: "طابعات الكاشير",
        },
        {
            id: "50x30",
            name: "50 × 30 مم",
            description: "ملصق باركود قياسي",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "50mm × 30mm",
            recommended: true,
            useCase: "باركود المنتجات",
        },
        {
            id: "50x25",
            name: "50 × 25 مم",
            description: "ملصق صغير",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "50mm × 25mm",
            recommended: false,
            useCase: "باركود صغير",
        },
        {
            id: "38x25",
            name: "38 × 25 مم",
            description: "ملصق صيدليات",
            paperType: "thermal",
            labelsPerSheet: 1,
            labelSize: "38mm × 25mm",
            recommended: false,
            useCase: "صيدليات ومستحضرات",
        },
        // أحجام A4
        {
            id: "a4_65",
            name: "A4 - 65 ملصق",
            description: "65 ملصق في الصفحة",
            paperType: "A4",
            labelsPerSheet: 65,
            labelSize: "38.1mm × 21.2mm",
            recommended: true,
            useCase: "ملصقات صغيرة متعددة",
        },
        {
            id: "a4_24",
            name: "A4 - 24 ملصق",
            description: "24 ملصق في الصفحة",
            paperType: "A4",
            labelsPerSheet: 24,
            labelSize: "64mm × 34mm",
            recommended: true,
            useCase: "ملصقات متوسطة",
        },
        {
            id: "a4_21",
            name: "A4 - 21 ملصق",
            description: "21 ملصق في الصفحة",
            paperType: "A4",
            labelsPerSheet: 21,
            labelSize: "63.5mm × 38.1mm",
            recommended: false,
            useCase: "ملصقات عناوين",
        },
        {
            id: "a4_14",
            name: "A4 - 14 ملصق",
            description: "14 ملصق في الصفحة",
            paperType: "A4",
            labelsPerSheet: 14,
            labelSize: "99.1mm × 38.1mm",
            recommended: false,
            useCase: "ملصقات كبيرة",
        },
    ];
    (0, response_1.SuccessResponse)(res, {
        message: "Label sizes fetched successfully",
        sizes,
    });
};
exports.getAvailableLabelSizes = getAvailableLabelSizes;
// توليد الملصقات
const generateLabelsController = async (req, res) => {
    const { products, labelConfig, paperSize } = req.body;
    // التحقق من المدخلات
    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new BadRequest_1.BadRequest("Products array is required");
    }
    if (!paperSize) {
        throw new BadRequest_1.BadRequest("Paper size is required");
    }
    if (!genrateLabel_1.PAPER_CONFIGS[paperSize]) {
        throw new BadRequest_1.BadRequest(`Invalid paper size: ${paperSize}`);
    }
    // التحقق من كل منتج
    for (const product of products) {
        if (!product.productId || !product.productPriceId) {
            throw new BadRequest_1.BadRequest("Each product must have productId and productPriceId");
        }
        if (!product.quantity || product.quantity < 1) {
            throw new BadRequest_1.BadRequest("Each product must have quantity >= 1");
        }
    }
    // إعدادات افتراضية
    const defaultLabelConfig = {
        showProductName: true,
        showPrice: true,
        showPromotionalPrice: true,
        showBusinessName: true,
        showBrand: true,
        showBarcode: true,
    };
    // دمج الإعدادات
    const finalConfig = {
        ...defaultLabelConfig,
        ...labelConfig,
    };
    // توليد PDF
    const pdfBuffer = await (0, genrateLabel_1.generateLabelsPDF)(products, finalConfig, paperSize);
    // إرسال الـ PDF
    const timestamp = Date.now();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=labels_${paperSize}_${timestamp}.pdf`);
    res.send(pdfBuffer);
};
exports.generateLabelsController = generateLabelsController;
