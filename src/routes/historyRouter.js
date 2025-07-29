
import express from 'express';
import { authorize, protect } from '../middleware/auth.js';
import { getUserHistoryByAdmin } from '../controllers/historyController.js';
import { AccessRoles } from '../utils/helpers.js';

const router = express.Router();
router.get('/user-history/:userId', protect,authorize(AccessRoles.Admin),getUserHistoryByAdmin );



export default router;

