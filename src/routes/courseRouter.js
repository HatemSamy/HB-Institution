import express from 'express';
import * as courseController from '../controllers/courseController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { HME, myMulter, pathName } from '../utils/multer.js';
import { validation } from '../middleware/validation.js';
import { ratingParamsSchema } from '../validations/CourseValidation.js';

const router = express.Router();
// Public routes (more specific routes first)
router.get('/getGroupByCourse/:id', courseController.getGroupByCourse); // GET /api/courses/getGroupByCourse/:id
router.get('/Get-Level-ByCourse/:courseId', courseController.GetLevelByCourse); // GET /api/courses/Get-Level-ByCourse
router.get('/CourseLevel', courseController.getInstructorsByCourseAndLevel); // GET /api/courses/instructor/:instructorId

// Enroll in course
router.post('/:courseId/enroll', protect, courseController.ClassSelection); // POST /api/courses/:courseId/enroll

// Rating route
router.put('/:courseId/rating/:rating', protect, validation(ratingParamsSchema), courseController.rateCourse); // PUT /api/courses/:courseId/rating/:rating

// Admin approve course
// router.put('/:id/approve', protect, authorize(AccessRoles.Student), courseController.approveCourse); // PUT /api/courses/:id/approve

// Get course by ID (must come after more specific routes)
router.get('/:id', courseController.getCourseById); // GET /api/courses/:id

// Get all courses
router.get('/', courseController.getAllCourses); // GET /api/courses

// Create new course
router.post('/', protect, myMulter(pathName.Course).single('image'), HME, courseController.createCourse); // POST /api/courses

export default router;