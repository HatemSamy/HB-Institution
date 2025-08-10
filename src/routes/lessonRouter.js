import express from 'express';
import * as lessonMeetingController from '../controllers/lessonController.js';
import * as lessonController from '../controllers/lessonController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { validation } from '../middleware/validation.js';
import { fileValidation, Multer } from '../utils/multer.js';
import * as lessonValidator from '../validations/lessonValidation.js';
import { HME } from '../services/multer.js';

const router = express.Router({ mergeParams: true });

// Get meeting info for lesson and group (for join buttons)
router.get('/:lessonId/meeting/:groupId', protect, authorize(AccessRoles.general), lessonMeetingController.getMeetingInfo);

router.post('/',protect,Multer(fileValidation.pdf).single('resource'),validation(lessonValidator.createLessonSchema),HME,lessonController.createLesson);

router.patch('/:lessonId/toggle-access/:groupId',protect,authorize(AccessRoles.instructor),lessonController.toggleLessonAccess);

router.get('/:groupId/status/:unitId', protect, authorize(AccessRoles.general), lessonController.getLessonsStatus);

router.patch('/:lessonId/complete/:groupId', protect,authorize(AccessRoles.instructor), lessonController.completeLessonByInstructor);

router.get('/calendar',protect,authorize(AccessRoles.general) ,lessonController.getStudentWeeklySchedule);

// Get lessons with meeting information for a specific group
router.get('/:groupId/meetings/:unitId', protect, authorize(AccessRoles.general), lessonController.getLessonsWithMeetings);

// Lesson details endpoint with meeting info and tracked URLs
router.get('/:lessonId/LessonDetails/:groupId', protect, authorize(AccessRoles.general), lessonController.getLessonDetails);

router.route('/:lessonId')
  .put(
    Multer(fileValidation.pdf).single('resource'),
    protect,
    authorize(AccessRoles.instructor),
    validation(lessonValidator.updateLessonSchema),
    lessonController.updateLesson
  )
  .delete(
    protect,
    authorize(AccessRoles.Admin),
    lessonController.deleteLesson
  );

export default router;