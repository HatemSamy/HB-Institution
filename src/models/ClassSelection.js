import mongoose from "mongoose";

const ClassSelectionSchema = new mongoose.Schema({
  studentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  instructorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  groupId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true
  },
  selectedSchedule: [{
    dayOfWeek: String,
    startTime: String,
    endTime: String,
    timezone: String
  }],
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled'],
    default: 'pending'
  },
  
}, {
  timestamps: true
});

const ClassSelectionModel = mongoose.model('ClassSelection', ClassSelectionSchema);

export default ClassSelectionModel