import{Router} from 'express'
import { getDashboard,getQuickStats } from '../../controller/admin/dsashboard';
import { catchAsync } from '../../utils/catchAsync';
import { authorizePermissions } from '../../middlewares/haspremission';
const router = Router();

router.get('/', authorizePermissions("dashboard", "View"), catchAsync(getDashboard));
router.get('/quick-stats', authorizePermissions("dashboard", "View"), catchAsync(getQuickStats));

export default router;