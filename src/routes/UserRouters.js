import express from 'express';
import * as UserController from '../controllers/temp.js';

import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';


const router = express.Router();

router.get('/instructors', protect,authorize(AccessRoles.Admin),UserController.getInstructors);
router.patch('/:userId', protect,authorize(AccessRoles.Admin),UserController.blockUser);


export default router;