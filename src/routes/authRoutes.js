import express from 'express';
import * as authController from '../controllers/authController.js';
import * as ValidationSchema from '../validations/authValidation.js';

import { validation } from '../middleware/validation.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';

const router = express.Router();


router.post('/register', validation(ValidationSchema.registerSchema), authController.registerUser);
router.get('/confirmEmail/:token', authController.confirmEmail);
router.patch('/update-password', protect,authorize(AccessRoles.general), authController.updatePassword);

router.post('/login', validation(ValidationSchema.loginSchema),authController.loginUser);

router.post('/forget-password', validation(ValidationSchema.forgotPasswordSchema), authController.forgotPassword);

router.post('/verify-code', validation(ValidationSchema.verifyResetCodeSchema),authController.verifyResetCode);

router.post('/reset-password', validation(ValidationSchema.resetPasswordSchema), authController.resetPassword);

export default router;