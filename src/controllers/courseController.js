// import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import { log } from "console";
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import { paginate } from "../middleware/pagination.js";
// import { asynchandler } from '../middlewares/asyncHandler.js';
import Chapter from '../models/Chapter.js';
import Course from "../models/Course.js";
import mongoose from "mongoose";
import User from "../models/User.js";
import Group from "../models/Group.js";



export const createCourse = async (req, res, next) => {
  try {
    const { title, duration, price, description, levels } = req.body;

    if (!title || !duration || !price || !description || !levels) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const allowedLevels = ['Beginner', 'Intermediate', 'Advanced'];
    const levelsArray = Array.isArray(levels) ? levels : [levels];
    const isValidLevels = levelsArray.every(level => allowedLevels.includes(level));

    if (!isValidLevels) {
      return res.status(400).json({ message: 'Invalid level provided.' });
    }

    const newCourse = new Course({
      title,
      duration,
      price,
      description,
      levels: levelsArray,
      CreatedBy: req.user.id,
      image: req.file?.secure_url || undefined
    });

    const savedCourse = await newCourse.save();

    res.status(201).json({
      message: 'Course created successfully.',
      course: savedCourse
    });
  } catch (error) {
    next(error);
  }
};



// GET /api/courses/:id - Get single course by ID
export const getCourseById = asynchandler(async (req, res, next) => {
  const { id } = req.params;

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return next(new AppError('Invalid course ID format', 400));
  }
  const course = await Course
    .find({ _id: id, isActive: true })
    
    .populate('CreatedBy', 'firstName lastName email')
    .populate('chapters', 'title description topic content attachments')
  if (!course || course.isActive === false) {
    return next(new AppError('Course not found', 404));
  }


  res.status(200).json({
    success: true,
    data: course
  });
});


// 1. GET ALL COURSES
export const getAllCourses = asynchandler(async (req, res) => {

  const courses = await Course.find().select('name description levels');

  if (!courses) {
    return next(new AppError('Courses not found', 404));
  }

  res.status(200).json({
    success: true,
    data: courses
  });
}
);




// 2. GET LEVELS BY COURSE
export const GetLevelByCourse = asynchandler(async (req, res) => {
  const { courseId } = req.params;

  const course = await Course.findById(courseId);
  if (!course) {
    return next(new AppError('Courses not found', 404));
  }

  res.json({
    success: true,
    data: {
      courseId: course._id,
      courseName: course.name,
      levels: course.levels
    }
  });

});


// 3. GET INSTRUCTORS BY COURSE AND LEVEL
export const getInstructorsByCourseAndLevel = asynchandler(async (req, res) => {
  try {
    const { courseId, level } = req.body;

    const instructors = await User.find({
      role: 'instructor',
      isActive: true,
      isBlocked: false,
      'courses.courseId': courseId,
      'courses.levels': level
    }).select('firstName lastName email specialization avatar');
   console.log(instructors);

    // Format the response to match frontend expectations
    const formattedInstructors = instructors.map(instructor => ({
      _id: instructor._id,
      name: `${instructor.firstName} ${instructor.lastName}`,
      firstName: instructor.firstName,
      lastName: instructor.lastName,
      email: instructor.email,
      specialization: instructor.specialization,
      avatar: instructor.avatar
    }));
   console.log(formattedInstructors);
   
    res.json({
      success: true,
      data: formattedInstructors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching instructors',
      error: error.message
    });
  }
});




// 4. GET GROUPS BY COURSE, LEVEL, AND TEACHER
export const getGroupByCourse = asynchandler(async (req, res) => {

  const { courseId, level, teacherId } = req.params;
  const groups = await Group.find({
    courseId,
    level,
    teacherId,
    isActive: true
  }).populate('courseId', 'name')
    .populate('teacherId', 'name')
    .select('name maxStudents currentStudents schedule');

  // Add availability status
  const groupsWithAvailability = groups.map(group => ({
    ...group.toObject(),
    isAvailable: group.currentStudents < group.maxStudents,
    spotsLeft: group.maxStudents - group.currentStudents
  }));

  res.json({
    success: true,
    data: groupsWithAvailability
  });

});


// 4. GET GROUPS BY COURSE, LEVEL, AND INSTRUCTOR
export const getGroupsByCourseAndInstructor = asynchandler( async (req, res) => {
  try {
    const { courseId, level, instructorId } = req.params;

    const groups = await Group.find({
      courseId,
      level,
      instructorId, // Changed from teacherId
      isActive: true
    }).populate('courseId', 'name')
      .populate('instructorId', 'firstName lastName email') // Updated populate
      .select('name maxStudents currentStudents schedule');

    // Add availability status and format instructor name
    const groupsWithAvailability = groups.map(group => ({
      ...group.toObject(),
      instructor: {
        _id: group.instructorId._id,
        name: `${group.instructorId.firstName} ${group.instructorId.lastName}`,
        email: group.instructorId.email
      },
      isAvailable: group.currentStudents < group.maxStudents,
      spotsLeft: group.maxStudents - group.currentStudents
    }));

    res.json({
      success: true,
      data: groupsWithAvailability
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching groups',
      error: error.message
    });
  }
});



// 5. GET TIME SLOTS FOR A GROUP
export const getTimeSlotsForGroup  = asynchandler(async (req, res) => {
  try {
    const { groupId } = req.params;

    const group = await Group.findById(groupId)
      .populate('courseId', 'name')
      .populate('instructorId', 'firstName lastName email'); // Updated populate

    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    res.json({
      success: true,
      data: {
        groupId: group._id,
        groupName: group.name,
        course: group.courseId.name,
        instructor: {
          _id: group.instructorId._id,
          name: `${group.instructorId.firstName} ${group.instructorId.lastName}`,
          email: group.instructorId.email
        },
        level: group.level,
        schedule: group.schedule,
        isAvailable: group.currentStudents < group.maxStudents
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching time slots',
      error: error.message
    });
  }
});



// 6. CREATE CLASS SELECTION (STUDENT SELECTION)
export const ClassSelection = asynchandler( async (req, res) => {
  try {
    const {
      studentId,
      courseId,
      level,
      instructorId, // Changed from teacherId
      groupId,
      selectedSchedule
    } = req.body;

    // Validate if group has available spots
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        message: 'Group not found'
      });
    }

    if (group.currentStudents >= group.maxStudents) {
      return res.status(400).json({
        success: false,
        message: 'Group is full'
      });
    }

    // Check if student already has a selection for this course
    const existingSelection = await ClassSelection.findOne({
      studentId,
      courseId,
      status: { $in: ['pending', 'confirmed'] }
    });

    if (existingSelection) {
      return res.status(400).json({
        success: false,
        message: 'Student already has a selection for this course'
      });
    }

    // Create class selection
    const classSelection = new ClassSelection({
      studentId,
      courseId,
      level,
      instructorId, // Changed from teacherId
      groupId,
      selectedSchedule,
      status: 'pending'
    });

    await classSelection.save();

    // Populate the selection for response
    const populatedSelection = await ClassSelection.findById(classSelection._id)
      .populate('studentId', 'firstName lastName email')
      .populate('courseId', 'name')
      .populate('instructorId', 'firstName lastName email')
      .populate('groupId', 'name schedule');

    res.status(201).json({
      success: true,
      message: 'Class selection created successfully',
      data: populatedSelection
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error creating class selection',
      error: error.message
    });
  }
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








// export const enrollStudent = asynchandler(async (req, res, next) => {

//   const course = await Course.findById(req.params.courseId);

//   if (!course) {
//     return next(new Error('course_not_found'));
//   }

//   if (!course.approved) {
//     return next(new AppError('course_not_approved'));
//   }

//   const studentId = req.user.id;

//   // Already enrolled?
//   if (course.students_enrolled.includes(studentId)) {
//     return next(new Error('already_enrolled'));
//   }

//   course.students_enrolled.push(studentId);
//   course.enrollment_count += 1;

//   await course.save();

//   res.status(200).json({
//     success: true,
//     message: 'student_enrolled_successfully',
//     data: course
//   });
// });





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

  const { courseId, rating } = req.params;
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






