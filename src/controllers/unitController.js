
import { AppError, asynchandler } from "../middleware/erroeHandling.js";
import Course from "../models/Course.js";
import Unit from "../models/Unit.js";

export const createUnit = asynchandler(async (req, res, next) => {
  
  console.log(req.body);
  
  const course = await Course.findById(req.body.courseId);
  if (!course) {
    return next(new AppError('Course not found', 404));
  }

  if (course.CreatedBy.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to add unit to this course', 403));
  }

  const attachments = req.files?.length
    ? req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/Course/${file.filename}`)
    : [];

  const unitData = {
    ...req.body,
    attachments,
    CreatedBy: req.user._id
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
    return res.status(404).json({ success: false, message: 'Unit not found' });
  }
  res.json({ success: true, data: unit });
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

  if (unit.CreatedBy.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to update this unit', 403));
  }

  const updateData = {
    ...req.body
  };

  if (req.files && req.files.length > 0) {
    const filePaths = req.files.map(file => `${req.protocol}://${req.get('host')}/uploads/Course/${file.filename}`);
    updateData.attachments = filePaths;
  }

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

  const unit = await Unit.findById(id);
  if (!unit) {
    return next(new AppError('Unit not found', 404));
  }

  if (unit.CreatedBy.toString() !== req.user._id.toString()) {
    return next(new AppError('Not authorized to lock/unlock this unit', 403));
  }

  unit.lock = !unit.lock;
  await unit.save();

  res.status(200).json({
    success: true,
    message: `Unit is now ${unit.lock ? 'locked' : 'unlocked'}`,
    data: unit
  });
});

