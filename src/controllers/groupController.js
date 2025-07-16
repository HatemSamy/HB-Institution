// controllers/groupController.js
import { AppError, asynchandler } from '../middleware/erroeHandling.js';
import ClassSelectionModel from '../models/ClassSelection.js';
import Group from '../models/Group.js';
import User from '../models/User.js';

export const createGroup = asynchandler(async (req, res) => {
  try {
    const {
      code,
      courseId,
      instructorId,
      level,
      maxStudents,
      schedule
    } = req.body;

    
    const instructor = await User.findOne({ _id: instructorId, role: 'instructor' });
    console.log(instructor);
    
    if (!instructor) {
      return res.status(400).json({ message: 'Invalid instructor ID' });
    }

    const group = await Group.create({
      code,
      courseId,
      instructorId,
      level,
      maxStudents,
      schedule
    });

    res.status(201).json({ message: 'Group created and instructor assigned', group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
}
)





// controllers/groupController.js
export const updateGroup = asynchandler(async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // If updating instructorId, verify the new instructor exists and is actually an instructor
    if (updates.instructorId) {
      const instructor = await User.findOne({ 
        _id: updates.instructorId, 
        role: 'instructor' 
      });
      if (!instructor) {
        return res.status(400).json({ message: 'Invalid instructor ID' });
      }
    }

    const group = await Group.findByIdAndUpdate(
      id,
      updates,
      { new: true, runValidators: true } 
    );

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.status(200).json({ message: 'Group updated successfully', group });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});





export const deleteGroup = asynchandler(async (req, res, next) => {
  const { groupId } = req.params;

  const group = await Group.findById(groupId);
  if (!group) {
    return next(new AppError('Group not found', 404));
  }

  await Group.findByIdAndDelete(groupId);

  await ClassSelectionModel.deleteMany({ groupId });

  res.status(200).json({
    success: true,
    message: 'Group and related class selections deleted successfully'
  });
});