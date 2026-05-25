"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLabelsController = exports.getAvailableLabelSizes = void 0;
const genrateLabel_1 = require("../../utils/genrateLabel");
const BadRequest_1 = require("../../Errors/BadRequest");
const response_1 = require("../../utils/response");
// ✅ استيراد Models
const User_1 = require("../../models/schema/admin/User");
const Warehouse_1 = require("../../models/schema/admin/Warehouse");
// ============================================
// Get Available Label Sizes
// ============================================
const getAvailableLabelSizes = async (req, res) => {
    const labelSizes = [
        {
            id: "100x50",
            name: "100×50mm (منتجات كبيرة)",
            description: "منتجات كبيرة",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "100mm × 50mm",
            recommended: false,
            useCase: "كراتين - منتجات كبيرة",
        },
        {
            id: "80x50",
            name: "80×50mm (باركود كبير)",
            description: "باركود كبير",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "80mm × 50mm",
            recommended: false,
            useCase: "منتجات كبيرة",
        },
        {
            id: "57x45",
            name: "57×45mm (طابعات Xprinter)",
            description: "طابعات Xprinter",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "57mm × 45mm",
            recommended: true,
            useCase: "Xprinter XP-370B وما شابه",
        },
        {
            id: "57x40",
            name: "57×40mm(طابعات الكاشير)",
            description: "طابعات الكاشير",
            paperType: "Roll",
            labelsPerSheet: 1,
            labelSize: "57mm × 40mm",
            recommended: true,
            useCase: "طابعات POS - فواتير",
        },
        {
            id: "50x30",
            name: "50×30mm (باركود متوسط)",
            description: "باركود متوسط",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "50mm × 30mm",
            recommended: true,
            useCase: "منتجات متوسطة",
        },
        {
            id: "50x25",
            name: "50×25mm  (باركود صغير)",
            description: "باركود صغير",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "50mm × 25mm",
            recommended: false,
            useCase: "منتجات صغيرة",
        },
        {
            id: "40x30",
            name: "40×30mm (ملصق صغير)",
            description: "ملصق صغير",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "40mm × 30mm",
            recommended: false,
            useCase: "منتجات صغيرة",
        },
        {
            id: "38x25",
            name: "38×25mm (صيدليات)",
            description: "صيدليات",
            paperType: "Thermal",
            labelsPerSheet: 1,
            labelSize: "38mm × 25mm",
            recommended: true,
            useCase: "أدوية - منتجات صغيرة",
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
    if (!products || !Array.isArray(products) || products.length === 0) {
        throw new BadRequest_1.BadRequest("Products array is required");
    }
    if (!paperSize || !genrateLabel_1.PAPER_CONFIGS[paperSize]) {
        throw new BadRequest_1.BadRequest(`Invalid paper size. Available: ${Object.keys(genrateLabel_1.PAPER_CONFIGS).join(", ")}`);
    }
    for (const product of products) {
        if (!product.productId || !product.productPriceId || !product.quantity) {
            throw new BadRequest_1.BadRequest("Each product must have productId, productPriceId, and quantity");
        }
        if (product.quantity < 1) {
            throw new BadRequest_1.BadRequest("Quantity must be at least 1");
        }
    }
    const defaultLabelConfig = {
        showProductName: true,
        showPrice: true,
        showPromotionalPrice: true,
        showBusinessName: true,
        showBrand: true,
        showBarcode: true,
        productNameSize: 11,
        priceSize: 13,
        promotionalPriceSize: 13,
        businessNameSize: 7,
        brandSize: 8,
    };
    const finalConfig = { ...defaultLabelConfig, ...labelConfig };
    // ✅ جلب اسم البراند من السوبر أدمن (صاحب البزنس)
    let businessName = "";
    // 1. جيب اسم البراند من الـ superadmin
    const superAdmin = await User_1.UserModel.findOne({ role: "superadmin" })
        .select("company_name warehouse_id")
        .lean();
    if (superAdmin?.company_name) {
        businessName = superAdmin.company_name;
    }
    else if (superAdmin?.warehouse_id) {
        const warehouse = await Warehouse_1.WarehouseModel.findById(superAdmin.warehouse_id).select("name").lean();
        if (warehouse?.name) {
            businessName = warehouse.name;
        }
    }
    else {
        // Fallback: لو مفيش superadmin، جرب اليوزر الحالي
        const jwtUser = req.user;
        if (jwtUser?.id || jwtUser?._id) {
            const userId = jwtUser.id || jwtUser._id;
            const user = await User_1.UserModel.findById(userId).select("company_name warehouse_id").lean();
            if (user?.company_name) {
                businessName = user.company_name;
            }
            else if (user?.warehouse_id) {
                const warehouse = await Warehouse_1.WarehouseModel.findById(user.warehouse_id).select("name").lean();
                if (warehouse?.name) {
                    businessName = warehouse.name;
                }
            }
        }
    }
    const pdfBuffer = await (0, genrateLabel_1.generateLabelsPDF)(products, finalConfig, paperSize, businessName);
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename=labels_${paperSize}_${Date.now()}.pdf`);
    res.send(pdfBuffer);
};
exports.generateLabelsController = generateLabelsController;
