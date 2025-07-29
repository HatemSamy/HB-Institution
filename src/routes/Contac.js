import express from 'express';
import * as ContactController  from '../controllers/contactController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';

const router = express.Router();

// POST /api/v1/contact
router.post('/',protect,authorize(AccessRoles.general), ContactController.sendContactMessage);
router.get('/',protect,authorize(AccessRoles.Admin), ContactController.getContactMessages);

router.delete('/',protect,authorize(AccessRoles.Admin), ContactController.deleteAllContactMessages);

router.delete('/:id',protect,authorize(AccessRoles.Admin), ContactController.deleteContactMessage);



export default router;
