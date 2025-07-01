// controllers/groupController.js
import { asynchandler } from '../middleware/erroeHandling.js';
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