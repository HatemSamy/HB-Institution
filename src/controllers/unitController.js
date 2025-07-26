
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Unit from "../models/Unit.js";
// import { uploadToCloudinary } from "../utils/multer.js";

// export const createUnit = asynchandler(async (req, res, next) => {
  
//   const course = await Course.findById(req.params.courseId);
//   console.log(req.params.courseId);
  
//   if (!course) {
//     return next(new AppError('Course not found', 404));
//   }

//   if (course.CreatedBy.toString() !== req.user._id.toString()) {
//     return next(new AppError('Not authorized to add unit to this course', 403));
//   }

//   const attachments = req.files?.length
//     ? req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/Course/${file.filename}`)
//     : [];

//   const unitData = {
//     ...req.body,
//     attachments,
//     CreatedBy: req.user._id,
//     courseId: req.params.courseId

//   };

//   const unit = await Unit.create(unitData);

//   res.status(201).json({
//     success: true,
//     message: 'Unit created successfully',
//     data: unit
//   });
// });


// export const createUnit = asynchandler(async (req, res, next) => {
//   const course = await Course.findById(req.params.courseId);
//   if (!course) {
//     return next(new AppError('Course not found', 404));
//   }

//   if (course.CreatedBy.toString() !== req.user._id.toString()) {
//     return next(new AppError('Not authorized to add unit to this course', 403));
//   }

//   // رفع المرفقات إلى Cloudinary
//   let attachments = [];
//   if (req.files?.length) {
//     const uploadPromises = req.files.map(file =>
//       uploadToCloudinaryRaw(file.buffer, file.originalname)
//     );
//     attachments = await Promise.all(uploadPromises);
//   }

//   const unitData = {
//     ...req.body,
//     attachments,
//     CreatedBy: req.user._id,
//     courseId: req.params.courseId
//   };

//   const unit = await Unit.create(unitData);

//   res.status(201).json({
//     success: true,
//     message: 'Unit created successfully',
//     data: unit
//   });
// });



export const createUnit = asynchandler(async (req, res, next) => {
  const course = await Course.findById(req.params.courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }
console.log(req.body);


  const unitData = {
    ...req.body,
    CreatedBy: req.user._id,
    courseId: req.params.courseId,
  };

  const unit = await Unit.create(unitData);

  res.status(201).json({
    success: true,
    message: 'Unit created successfully',
    data: unit
  });
});


export const getUnitsByCourse = asynchandler(async (req, res) => {
  const { courseId } = req.params;
  const units = await Unit.find({ courseId }).sort({ createdAt: 1 });
  if (!units) {
    return res.status(404).json({ success: false, message: 'Units not found' });
  }
  res.json({ success: true, data: units });
});



export const getUnitById = asynchandler(async (req, res) => {
  const unit = await Unit.findById(req.params.id);
  
  if (!unit) {
    return res.status(404).json({ 
      success: false, 
      message: 'Unit not found' 
    });
  }

  const lessons = await Lesson.find({ unitId: unit._id })
    .sort('order')
    .select('-__v -updatedAt'); 

  const response = {
    success: true,
    data: {
      unit: {
        _id: unit._id,
        title: unit.title,
        description: unit.description,
        order: unit.order,
        courseId: unit.courseId,
        createdAt: unit.createdAt
      },
      lessons: lessons.map(lesson => ({
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description,
        order: lesson.order,
        islocked: lesson.islocked,
        createdAt: lesson.createdAt
      }))
    }
  };

  res.json(response);
});
// @desc    Update a unit
// @route   PUT /api/unit/update/:id
// @access  Private (Instructor/Owner)
export const updateUnit = asynchandler(async (req, res, next) => {
  const { id } = req.params;

  const unit = await Unit.findById(id);
  if (!unit) {
    return next(new AppError('Unit not found', 404));
  }
  const updateData = {
    ...req.body
  };

  const updatedUnit = await Unit.findByIdAndUpdate(id, updateData, { new: true });

  res.status(200).json({
    success: true,
    message: 'Unit updated successfully',
    data: updatedUnit
  });
});

// @desc    Delete a unit
export const deleteUnit = asynchandler(async (req, res) => {
  const unit = await Unit.findById(req.params.id);
  if (!unit) {
    return res.status(404).json({ success: false, message: 'Unit not found' });
  }

  if (unit.CreatedBy.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Not authorized' });
  }

  await unit.deleteOne();
  res.json({ success: true, message: 'Unit deleted successfully' });
});

// @desc    Toggle lock status of a unit
// @route   PATCH /api/units/:id/lock
// @access  Protected (must be the creator of the unit)
export const toggleUnitLock = asynchandler(async (req, res, next) => {
  const { id } = req.params;

  const unit = await Unit.findById(id).select('title locked Completed');
  if (!unit) {
    return next(new AppError('Unit not found', 404));
  }

  unit.lock = !unit.lock;
  await unit.save();

  res.status(200).json({
    success: true,
    message: `Unit is now ${unit.lock ? 'locked' : 'unlocked'}`,
    data: unit
  });
});

