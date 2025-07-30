


import express from 'express';



import * as unitController from '../controllers/unitController.js';
import { authorize, protect } from '../middleware/auth.js';

import { validation } from '../middleware/validation.js';
import { unitSchema, updateUnitSchema } from '../validations/unitValidation.js';
import { AccessRoles, normalizeUnitBody } from '../utils/helpers.js';


const router = express.Router();

router.post('/:courseId', protect,authorize(AccessRoles.Admin),validation(unitSchema),unitController.createUnit); 
router.get('/:groupId/Units_Status/:courseId', protect,authorize(AccessRoles.general),validation(unitSchema),unitController.getUnitsStatus); 

router.get('/course/:courseId', protect, unitController.getUnitsByCourse); 
router.get('/:id', protect, unitController.getUnitById); 

router.put('/update/:id',protect,authorize(AccessRoles.Admin),normalizeUnitBody,validation(updateUnitSchema),unitController.updateUnit
);
router.patch('/:unitId/toggle_Access/:groupId', protect,authorize(AccessRoles.instructor), unitController.toggleUnitAccess);
router.delete('/:unitId', protect,authorize(AccessRoles.Admin), unitController.deleteUnit); 

export default router;
