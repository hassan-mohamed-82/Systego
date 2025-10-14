"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.endCashierShift = exports.startCashierShift = void 0;
const CashierShift_1 = require("../../../models/schema/admin/POS/CashierShift");
const Sale_1 = require("../../../models/schema/admin/POS/Sale");
const response_1 = require("../../../utils/response");
const Errors_1 = require("../../../Errors");
const BadRequest_1 = require("../../../Errors/BadRequest");
const User_1 = require("../../../models/schema/admin/User");
const startCashierShift = async (req, res) => {
    const cashier_id = req.user?.id;
    console.log(cashier_id);
    if (!cashier_id) {
        throw new BadRequest_1.BadRequest("User ID is required");
    }
    const user = await User_1.UserModel.findById(cashier_id)
        .populate('positionId', 'name')
        .select('username email positionId status');
    if (!user) {
        throw new Errors_1.NotFound("User not found");
    }
    if (user.status !== 'active') {
        throw new BadRequest_1.BadRequest("User account is inactive");
    }
    if (!user.positionId) {
        throw new BadRequest_1.BadRequest("User does not have a position assigned");
    }
    const positionName = user.positionId.name;
    console.log(positionName);
    if (positionName !== 'cashierShift') {
        throw new BadRequest_1.BadRequest(`User position is not authorized to start cashier shifts. Only 'cashier' position is allowed.`);
    }
    const activeShift = await CashierShift_1.CashierShift.findOne({
        cashier_id,
        end_time: { $exists: false }
    });
    if (activeShift) {
        throw new BadRequest_1.BadRequest("Cashier already has an active shift. Please end the current shift first.");
    }
    // Create new shift
    const newShift = new CashierShift_1.CashierShift({
        start_time: new Date(),
        cashier_id,
        total_sale_amount: 0
    });
    const savedShift = await newShift.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift started successfully",
        shift: savedShift
    });
};
exports.startCashierShift = startCashierShift;
const endCashierShift = async (req, res) => {
    const { shiftId } = req.params;
    const shift = await CashierShift_1.CashierShift.findById(shiftId);
    if (!shift) {
        throw new Errors_1.NotFound("Cashier shift not found");
    }
    if (shift.end_time) {
        throw new BadRequest_1.BadRequest("Cashier shift already ended");
    }
    const salesDuringShift = await Sale_1.SaleModel.find({
        createdAt: { $gte: shift.start_time, $lte: new Date() },
        // sale_status: { $in: ['completed', 'processing'] }
    });
    const totalSaleAmount = salesDuringShift.reduce((total, sale) => {
        return total + (sale.grand_total || 0);
    }, 0);
    shift.end_time = new Date();
    shift.total_sale_amount = totalSaleAmount;
    const updatedShift = await shift.save();
    (0, response_1.SuccessResponse)(res, {
        message: "Cashier shift ended successfully",
        shift: updatedShift,
        salesCount: salesDuringShift.length,
        totalSaleAmount
    });
};
exports.endCashierShift = endCashierShift;
