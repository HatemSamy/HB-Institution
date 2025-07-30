
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import Course from "../models/Course.js";
import Lesson from "../models/Lesson.js";
import Unit from "../models/Unit.js";



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
  const unit = await Unit.findById(req.params.unitId);
  if (!unit) throw new AppError('Unit not found', 404);

  await Unit.findOneAndDelete({ _id: unit._id });

  res.status(200).json({
    success: true,
    message: 'Unit and related lessons deleted successfully'
  });
});






export const toggleUnitAccess = asynchandler(async (req, res) => {
  const { unitId, groupId } = req.params;

  const unit = await Unit.findById(unitId);
  if (!unit) throw new AppError('Unit not found', 404);

  const isUnlocked = unit.unlockedForGroups?.some(id => id.equals(groupId));

  if (isUnlocked) {
    unit.unlockedForGroups = unit.unlockedForGroups.filter(id => !id.equals(groupId));
  } else {
    unit.unlockedForGroups = [...(unit.unlockedForGroups || []), groupId];
  }

  await unit.save();

  res.status(200).json({
    success: true,
    message: `Unit is now ${isUnlocked ? 'locked' : 'unlocked'} for this group`,
    data: {
      unitId: unit._id,
      groupId,
      unlocked: !isUnlocked
    }
  });
});



export const getUnitsStatus = asynchandler(async (req, res, next) => {
  const { groupId ,courseId} = req.params;

  const units = await Unit.find({courseId}).populate('courseId', 'title');

  const formatted = units.map(unit => ({
    id: unit._id,
    title: unit.title,
    course: unit.courseId?.title,
    completed: unit.Completed,
    unlocked: unit.unlockedForGroups.includes(groupId)
  }));

  res.status(200).json({
    success: true,
    count: formatted.length,
    units: formatted
  });
});