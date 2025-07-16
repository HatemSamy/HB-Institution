
import express from 'express';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { fileValidation, HME, Multer, myMulter, pathName } from '../utils/multer.js';
import { validation } from '../middleware/validation.js';
import { ratingParamsSchema } from '../validations/CourseValidation.js';

import * as ClassSelectionController from '../controllers/ClassSelectionController.js';
const router = express.Router();

router.post('/', protect, ClassSelectionController.ClassSelection); 













export default router