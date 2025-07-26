import express from 'express';
import * as UserController from '../controllers/UserController.js';

import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { fileValidation, HME, Multer } from '../utils/multer.js';


const router = express.Router();

router.get('/instructors', protect,authorize(AccessRoles.Admin),UserController.getInstructors);
router.get('/InstructorDashboardData', protect,authorize(AccessRoles.instructor),UserController.getInstructorDashboard);
router.get('/StudentDashboardData', protect,authorize(AccessRoles.Student), UserController.getStudentDashboardData); 
router.get('/profile', protect, UserController.getProfile);


router.put(
  '/update-profile',
  protect,
  Multer(fileValidation.image).single('image'), 
  HME,
  UserController.updateProfile
);

router.put(
  '/:instructorId/availability',
  protect,
  authorize(AccessRoles.Admin),
  UserController.setInstructorAvailability
);

router.patch('/:userId', protect,authorize(AccessRoles.Admin),UserController.blockUser);


export default router;