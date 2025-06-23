// import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import { log } from "console";
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import { paginate } from "../middleware/pagination.js";
// import { asynchandler } from '../middlewares/asyncHandler.js';
import Chapter from '../models/Chapter.js'; 
import Course from "../models/Course.js";
import mongoose from "mongoose";



export const createCourse = async (req, res, next) => {

  if (!req.file) {
    return next(new AppError('image_required'));
  }

  const { title, description, instructorId,level,price } = req.body;

  const courseData = {
    title,
    description,
    level,// Default to beginner if not provided
    price,
    instructorId: instructorId || req.user.id, 
    CreatedBy: req.user.id,
    course_imageId: req.file.filename,
    course_imageUrl: `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`
  };
log('Course data:', courseData);
  const course = await Course.create(courseData);

  await course.populate('instructorId', 'name email');
  await course.populate('CreatedBy', 'name email');

  res.status(201).json({
    success: true,
    message: 'course_created',
    data: course
  });
};



// GET /api/courses/:id - Get single course by ID
export const getCourseById = asynchandler(async (req, res, next) => {
    const { id } = req.params;
    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return next(new AppError('Invalid course ID format', 400));
    }
    const course = await Course
        .find({ _id: id, approved: true })
        .populate('instructorId', 'name email profile')
        .populate('CreatedBy', 'name email')
        .populate('students_enrolled', 'name email')
        .populate('chapters', 'title description topic content attachments')
    if (!course ||course.approved === false) {
        return next(new AppError('Course not found', 404));
    }

   
    res.status(200).json({
        success: true,
        data: course
    });
});



export const getAllCourses = asynchandler(async (req, res, next) => {
  const courses = await Course.find({ approved: true })
    .populate('instructorId', 'name email')
    .populate('CreatedBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    total: courses.length,
    message: 'Approved courses retrieved successfully',
    data: courses
  });
});


export const approveCourse = asynchandler(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { approved: true },
    { new: true, runValidators: true }
  ).populate('instructorId', 'name email');

  if (!course) {
    return next(new Error('course_not_found'));
  }

  res.status(200).json({
    success: true,
    message: 'course_approved_successfully',
    data: course
  });
});




export const enrollStudent = asynchandler(async (req, res, next) => {

  const course = await Course.findById(req.params.courseId);

  if (!course) {
    return next(new Error('course_not_found'));
  }

  if (!course.approved) {
    return next(new AppError('course_not_approved'));
  }

  const studentId = req.user.id;

  // Already enrolled?
  if (course.students_enrolled.includes(studentId)) {
    return next(new Error('already_enrolled'));
  }

  course.students_enrolled.push(studentId);
  course.enrollment_count += 1;

  await course.save();

  res.status(200).json({
    success: true,
    message: 'student_enrolled_successfully',
    data: course
  });
});





export const updateCourse = asynchandler(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) {
    return next(new Error('course_not_found'));
  }

  // Check authorization
  if (
    course.CreatedBy.toString() !== req.user.id &&
    course.instructorId.toString() !== req.user.id
  ) {
    return next(new Error('not_authorized'));
  }

  // If image is uploaded, update it
  if (req.file) {
    req.body.course_imageId = req.file.filename;
    req.body.course_imageUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  }

  const updatedCourse = await CourseModel.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  })
    .populate('instructorId', 'name email')
    .populate('CreatedBy', 'name email');

  res.status(200).json({
    success: true,
    message: 'course_updated',
    data: updatedCourse
  });
});




export const rateCourse = asynchandler(async (req, res, next) => {

const {courseId,rating} = req.params;
const studentId = req.user.id;

  const course = await Course.findById(courseId);
  if (!course) return next(new Error('course_not_found'));

  if (!course.approved) {
    return res.status(400).json({
      success: false,
      message: 'Course is not approved for rating'
    });
  }

  // ✅ Check if student is enrolled
  const isEnrolled = course.students_enrolled.includes(studentId);
  if (!isEnrolled) {
    return res.status(403).json({
      success: false,
      message: 'You must be enrolled in the course to rate it'
    });
  }

  // ✅ Set the rating
  course.rating = Number(rating);
  await course.save();

  res.status(200).json({
    success: true,
    message: 'Rating submitted successfully',
    data: { rating: course.rating }
  });
});






