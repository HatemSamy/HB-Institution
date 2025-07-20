import express from 'express';
import * as lessonController from '../controllers/lessonController.js';
import * as lessonValidator from '../validations/lessonValidation.js';

import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { validation } from '../middleware/validation.js';

const router = express.Router({ mergeParams: true });


router.route('/')
  .post(protect, validation(lessonValidator.createLessonSchema), lessonController.createLesson);

router.get('/calendar',protect,authorize(AccessRoles.general) ,lessonController.getStudentWeeklySchedule);

router.route('/:lessonId')
  .get(lessonController.getLessonDetails)
  .patch(
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

  // Add the toggle lock as a separate route
router.patch(
  '/:lessonId/toggle-lock',
  protect,
  authorize(AccessRoles.instructor),
  lessonController.toggleLessonLock
);


router.patch(
  '/:lessonId/completed',
  protect,
  authorize(AccessRoles.instructor),
  lessonController.markLessonAsCompleted
);







export default router;
