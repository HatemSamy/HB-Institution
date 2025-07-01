


import express from 'express';



import * as unitController from '../controllers/unitController.js';
import { protect } from '../middleware/auth.js';
import { HME, myMulter, pathName } from '../utils/multer.js';
import { validation } from '../middleware/validation.js';
import { unitSchema, updateUnitSchema } from '../validations/unitValidation.js';
import { normalizeUnitBody } from '../utils/helpers.js';


const router = express.Router();

router.post('/', protect, myMulter(pathName.Units).array('attachments'),HME,normalizeUnitBody,validation(unitSchema),unitController.createUnit); 
router.get('/course/:courseId', protect, unitController.getUnitsByCourse); 
router.get('/:id', protect, unitController.getUnitById); 

router.put('/update/:id',protect,myMulter(pathName.Units).array('attachments'),HME ,normalizeUnitBody,validation(updateUnitSchema),unitController.updateUnit
);
router.patch('/:id/lock', protect, unitController.toggleUnitLock);
router.delete('/:id', protect, unitController.deleteUnit); 

export default router;
