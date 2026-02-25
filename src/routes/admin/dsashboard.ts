import{Router} from 'express'
import { getDashboard,getQuickStats } from '../../controller/admin/dsashboard';
import { catchAsync } from '../../utils/catchAsync';
const router = Router();

router.post('/', catchAsync(getDashboard));
router.get('/quick-stats', catchAsync(getQuickStats));

export default router;