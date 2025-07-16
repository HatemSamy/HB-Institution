// routes/groupRoutes.js
import express from 'express';
import { createGroup } from '../controllers/groupController.js';
import { validation } from '../middleware/validation.js';
import * as ValidatorSchema from '../validations/groupValidation.js';
import * as GroupController from '../controllers/groupController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';



const router = express.Router();

router.post('/',protect,authorize(AccessRoles.Admin),validation(ValidatorSchema.createGroupSchema) ,createGroup);
router.put('/:id',protect,authorize(AccessRoles.Admin),validation(ValidatorSchema.updateGroupSchema), GroupController.updateGroup);
router.delete('/:groupId',protect,authorize(AccessRoles.Admin), GroupController.deleteGroup);


export default router;