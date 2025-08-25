import express from 'express';
import * as courseController from '../controllers/courseController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { fileValidation, HME, Multer } from '../utils/multer.js';
import { validation } from '../middleware/validation.js';
import { ratingParamsSchema, updateCourseSchema } from '../validations/CourseValidation.js';

const router = express.Router();

router.get('/CourseLevel/:level/:courseId',protect, courseController.getInstructorsByCourseAndLevel); 
router.get('/:level/:courseId/:instructorId', protect, courseController.getGroupsByCourseAndInstructor); 
router.get('/Get-Level-ByCourse/:courseId', courseController.GetLevelByCourse);

router.put('/:courseId/rating/:rating', protect, validation(ratingParamsSchema), courseController.rateCourse);

router.post('/:CategoryId', protect, Multer(fileValidation.image).single('image'), HME, courseController.createCourse);

// Update course endpoint - update existing course only
router.put('/:id', protect,authorize(AccessRoles.Admin), Multer(fileValidation.image).single('image'), HME, validation(updateCourseSchema), courseController.updateCourse);

router.get('/:id', courseController.getCourseById);
router.get('/', courseController.getAllCourses);
router.delete('/:id',protect,authorize(AccessRoles.Admin) ,courseController.deleteCourse);
 

export default router;