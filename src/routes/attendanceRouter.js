import express from 'express';
import {
  getLessonAttendance,
  markLessonAttendance,
  exportLessonAttendance
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';

const router = express.Router();

// All attendance routes require authentication
router.use(protect);

// Lesson attendance routes
router.get('/lesson/:lessonId', authorize(AccessRoles.general), getLessonAttendance);
router.get('/lesson/:lessonId/export', authorize(AccessRoles.instructor), exportLessonAttendance);

// Manual lesson attendance marking (instructor only)
router.patch('/lesson/:lessonId/mark', authorize(AccessRoles.instructor), markLessonAttendance);

export default router;