import express from 'express';
import * as lessonController from '../controllers/lessonController.js';
import * as lessonValidator from '../validations/lessonValidation.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { validation } from '../middleware/validation.js';
import { fileValidation, Multer } from '../utils/multer.js';
import { HME } from '../services/multer.js';
const router = express.Router({ mergeParams: true });



router.post('/',protect,Multer(fileValidation.pdf).single('resource'),validation(lessonValidator.createLessonSchema),HME,lessonController.createLesson);

router.patch('/:lessonId/toggle-access/:groupId',protect,authorize(AccessRoles.instructor),lessonController.toggleLessonAccess);

router.get('/status/:groupId', protect, authorize(AccessRoles.instructor), lessonController.getLessonsStatus);


router.patch('/:lessonId/complete/:groupId', protect,authorize(AccessRoles.instructor), lessonController.completeLessonByInstructor);

router.get('/calendar',protect,authorize(AccessRoles.general) ,lessonController.getStudentWeeklySchedule);

router.route('/:lessonId')
  .get(lessonController.getLessonDetails)
  .put(
    Multer(fileValidation.pdf).single('resource'),
    protect,
    authorize(AccessRoles.Admin),
    validation(lessonValidator.updateLessonSchema),
    lessonController.updateLesson
  )
  .delete(
    protect,
    authorize(AccessRoles.Admin),
    lessonController.deleteLesson
  );






export default router;
