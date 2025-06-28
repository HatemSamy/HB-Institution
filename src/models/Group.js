import mongoose from "mongoose";

// Group Model
const groupSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true,
    trim: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  teacherId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  level: {
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  },
  maxStudents: {
    type: Number,
    required: true,
    default: 30
  },
  currentStudents: {
    type: Number,
    default: 0
  },
  schedule: [{
    dayOfWeek: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      required: true
    },
    startTime: {
      type: String,
      required: true // Format: "HH:MM" (24-hour format)
    },
    endTime: {
      type: String,
      required: true // Format: "HH:MM" (24-hour format)
    },
    timezone: {
      type: String,
      default: 'UTC'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

const Group = mongoose.model('Group', groupSchema);
export default Group;
