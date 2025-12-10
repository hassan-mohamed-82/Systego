import {Request, Response} from 'express';
import { CashierShift } from '../../models/schema/admin/POS/CashierShift';
import { SaleModel } from '../../models/schema/admin/POS/Sale';
import { SuccessResponse } from '../../utils/response';
import { NotFound } from '../../Errors';
import { BadRequest } from '../../Errors/BadRequest';
import { UserModel } from '../../models/schema/admin/User';
import { ExpenseModel } from '../../models/schema/admin/POS/expenses';

