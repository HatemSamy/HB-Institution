import express from 'express';
import * as courseController from '../controllers/courseController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { fileValidation, HME, Multer, myMulter, pathName } from '../utils/multer.js';
import { validation } from '../middleware/validation.js';
import { ratingParamsSchema } from '../validations/CourseValidation.js';

const router = express.Router();

/* ---------- Public and Utility Routes (Static and Specific) ---------- */
router.get('/CourseLevel/:level/:courseId',protect, courseController.getInstructorsByCourseAndLevel); 
router.get('/:level/:courseId/:instructorId', protect, courseController.getGroupsByCourseAndInstructor); 
router.get('/Get-Level-ByCourse/:courseId', courseController.GetLevelByCourse);

/* ---------- Enrollment & Rating ---------- */
router.put('/:courseId/rating/:rating', protect, validation(ratingParamsSchema), courseController.rateCourse);

/* ---------- Admin Routes (if needed) ---------- */
// router.put('/:id/approve', protect, authorize(AccessRoles.Admin), courseController.approveCourse); 

/* ---------- Course Creation ---------- */
router.post('/:CategoryId', protect, Multer(fileValidation.image).single('image'), HME, courseController.createCourse);

/* ---------- Dynamic Routes (Must be Last) ---------- */
router.get('/:id', courseController.getCourseById); // MUST BE AFTER ALL SPECIFIC ROUTES
router.get('/', courseController.getAllCourses);   
// DELETE /api/courses/:id
router.delete('/:id',protect,authorize(AccessRoles.Admin) ,courseController.deleteCourse);
 

export default router;