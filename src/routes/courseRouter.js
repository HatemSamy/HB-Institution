import express from 'express';
import * as courseController from '../controllers/courseController.js';
import { authorize, protect } from '../middleware/auth.js';
import { AccessRoles } from '../utils/helpers.js';
import { HME, myMulter, pathName } from '../utils/multer.js';
import { validation } from '../middleware/validation.js';
import { ratingParamsSchema } from '../validations/CourseValidation.js';

// // Import your auth middleware
// import { authenticate, authorize } from '../middleware/auth.js'; // Adjust path as needed

const router = express.Router();

// // Public routes
router.get('/', courseController.getAllCourses); // GET /api/courses
router.get('/:id', courseController.getCourseById); // GET /api/courses/:id

// // Protected routes (require authentication)
// router.use(authenticate); // Apply authentication to all routes below

// // Student/User routes
// router.get('/my/enrolled', getMyEnrolledCourses); // GET /api/courses/my/enrolled
router.post('/:courseId/enroll',protect ,courseController.enrollStudent); // POST /api/courses/:id/enroll
// router.delete('/:id/unenroll', unenrollStudent); // DELETE /api/courses/:id/unenroll

// // Instructor routes
// router.get('/instructor/:instructorId', getCoursesByInstructor); // GET /api/courses/instructor/:instructorId

router.post('/', protect,myMulter(pathName.Course).single('image'),HME,courseController.createCourse); // POST /api/courses

// router.put('/:id', updateCourse); // PUT /api/courses/:id
// router.delete('/:id', deleteCourse); // DELETE /api/courses/:id

// // Admin routes (require admin role)
router.put('/:id/approve', protect,authorize(AccessRoles.Student), courseController.approveCourse); // PUT /api/courses/:id/approve

// // Rating route (can be used by enrolled students or admins)
router.put('/:courseId/rating/:rating', protect,validation(ratingParamsSchema) ,courseController.rateCourse); // PUT /api/courses/:id/rating

export default router;