import { Request, Response } from 'express';
import { CashierShift } from '../../../models/schema/admin/POS/CashierShift'; 
import { SaleModel } from '../../../models/schema/admin/POS/Sale'; 
import { SuccessResponse } from '../../../utils/response';
import { NotFound } from '../../../Errors';
import { BadRequest } from '../../../Errors/BadRequest';
import { UserModel } from '../../../models/schema/admin/User';


export const startCashierShift = async (req: Request, res: Response): Promise<void> => {
    const cashier_id = req.user?.id;
    console.log(cashier_id)

    if (!cashier_id) {
        throw new BadRequest("User ID is required");
    }
        const user = await UserModel.findById(cashier_id)
            .populate('positionId', 'name')
            .select('username email positionId status');

        if (!user) {
            throw new NotFound("User not found");
        }

        if (user.status !== 'active') {
            throw new BadRequest("User account is inactive");
        }

        if (!user.positionId) {
            throw new BadRequest("User does not have a position assigned");
        }

        const positionName = (user.positionId as any).name;
        console.log(positionName)
        if (positionName !== 'cashierShift') {
            throw new BadRequest(`User position is not authorized to start cashier shifts. Only 'cashier' position is allowed.`);
        }

        const activeShift = await CashierShift.findOne({
            cashier_id,
            end_time: { $exists: false }
        });

        if (activeShift) {
            throw new BadRequest("Cashier already has an active shift. Please end the current shift first.");
        }

        // Create new shift
        const newShift = new CashierShift({
            start_time: new Date(),
            cashier_id,
            total_sale_amount: 0
        });

        const savedShift = await newShift.save();
        
        SuccessResponse(res, { 
            message: "Cashier shift started successfully", 
            shift: savedShift 
        });
}

export const endCashierShift = async (req: Request, res: Response): Promise<void> => {
    const { shiftId } = req.params;

    const shift = await CashierShift.findById(shiftId);
    if (!shift) {
        throw new NotFound("Cashier shift not found");
    }

    if (shift.end_time) {
        throw new BadRequest("Cashier shift already ended");
    }

    const salesDuringShift = await SaleModel.find({
        createdAt: { $gte: shift.start_time, $lte: new Date() },
       // sale_status: { $in: ['completed', 'processing'] }
    })

    const totalSaleAmount = salesDuringShift.reduce((total, sale) => {
        return total + (sale.grand_total || 0);
    }, 0);

    shift.end_time = new Date();
    shift.total_sale_amount = totalSaleAmount;
    
    const updatedShift = await shift.save();

    SuccessResponse(res, { 
        message: "Cashier shift ended successfully", 
        shift: updatedShift,
        salesCount: salesDuringShift.length,
        totalSaleAmount
    });
}
