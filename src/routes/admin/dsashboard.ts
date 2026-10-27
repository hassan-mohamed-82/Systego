import{Router} from 'express'
import { getDashboard,getQuickStats } from '../../controller/admin/dsashboard';
import { catchAsync } from '../../utils/catchAsync';
import { authorizeAnyPermission } from '../../middlewares/haspremission';
const router = Router();

// 🔐 لوحة التحكم محمية بصلاحية "الرئيسية ولوحة التحكم" — عرض
// (بنقبل الاسم القديم dashboard كمان للتوافق مع أي دور متخزن قبل الدمج)
router.get(
  '/',
  authorizeAnyPermission(['home', 'dashboard'], 'View'),
  catchAsync(getDashboard)
);
router.get('/quick-stats', catchAsync(getQuickStats));

export default router;