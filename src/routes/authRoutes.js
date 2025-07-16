import express from 'express';
import * as authController from '../controllers/authController.js';
import * as ValidationSchema from '../validations/authValidation.js';

import { validation } from '../middleware/validation.js';
import { authorize } from '../middleware/auth.js';

const router = express.Router();

// @route   POST /api/v1/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', validation(ValidationSchema.registerSchema), authController.registerUser);
router.get('/confirmEmail/:token', authController.confirmEmail);


 //@route   POST /api/v1/auth/login
// @desc    login to account 
// @access  Public
router.post('/login', validation(ValidationSchema.loginSchema),authController.loginUser);


router.post('/forget-password', validation(ValidationSchema.forgotPasswordSchema), authController.forgotPassword);



router.post('/verify-code', validation(ValidationSchema.verifyResetCodeSchema),authController.verifyResetCode);

router.post('/reset-password', validation(ValidationSchema.resetPasswordSchema), authController.resetPassword);

export default router;