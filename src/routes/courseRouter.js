import express from 'express';
import * as courseController from '../controllers/courseController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { fileValidation, HME, Multer, myMulter, pathName } from '../utils/multer.js';
import { validation } from '../middleware/validation.js';
import { ratingParamsSchema } from '../validations/CourseValidation.js';

const router = express.Router();
// Public routes (more specific routes first)
// router.get('/CourseLevel', courseController.getInstructorsByCourseAndLevel); // GET /api/courses/instructor/:instructorId
// router.get('/level/:courseId/:instructorId',protect ,courseController.getGroupsByCourseAndInstructor); 

// // router.get('/getGroupByCourse/:id', courseController.getGroupByCourse); 
// router.get('/Get-Level-ByCourse/:courseId', courseController.GetLevelByCourse); 

// // Enroll in course
// router.post('/enroll', protect, courseController.ClassSelection); // POST /api/courses/:courseId/enroll

// // Rating route
// router.put('/:courseId/rating/:rating', protect, validation(ratingParamsSchema), courseController.rateCourse); // PUT /api/courses/:courseId/rating/:rating

// // Admin approve course
// // router.put('/:id/approve', protect, authorize(AccessRoles.Student), courseController.approveCourse); // PUT /api/courses/:id/approve

// // Get course by ID (must come after more specific routes)
// router.get('/:id', courseController.getCourseById); // GET /api/courses/:id

// // Get all courses
// router.get('/', courseController.getAllCourses); // GET /api/courses

// // Create new course
// router.post('/:CategoryId', protect, Multer(fileValidation.image).single('image'), HME, courseController.createCourse); // POST /api/courses
/* ---------- Public and Utility Routes (Static and Specific) ---------- */
router.get('/CourseLevel/:level/:courseId',protect, courseController.getInstructorsByCourseAndLevel); 
router.get('/:level/:courseId/:instructorId', protect, courseController.getGroupsByCourseAndInstructor); 
router.get('/Get-Level-ByCourse/:courseId', courseController.GetLevelByCourse);

/* ---------- Enrollment & Rating ---------- */
router.post('/enroll', protect, courseController.ClassSelection); 
router.put('/:courseId/rating/:rating', protect, validation(ratingParamsSchema), courseController.rateCourse);

/* ---------- Admin Routes (if needed) ---------- */
// router.put('/:id/approve', protect, authorize(AccessRoles.Admin), courseController.approveCourse); 

/* ---------- Course Creation ---------- */
router.post('/:CategoryId', protect, Multer(fileValidation.image).single('image'), HME, courseController.createCourse);

/* ---------- Dynamic Routes (Must be Last) ---------- */
router.get('/:id', courseController.getCourseById); // MUST BE AFTER ALL SPECIFIC ROUTES
router.get('/', courseController.getAllCourses);    // CAN BE HERE (
export default router;