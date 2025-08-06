import mongoose, { Schema, Types, model } from 'mongoose';

const attendanceSchema = new Schema({
  // Meeting information
  meetingId: {
    type: String,
    required: true,
    index: true
  },
  
  // Related entities
  lessonId: {
    type: Types.ObjectId,
    ref: 'Lesson',
    required: true,
    index: true
  },
  
  groupId: {
    type: Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true
  },
  
  studentId: {
    type: Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  studentName: {
    type: String,
    required: true
  },
  
  // Attendance timing
  joinTime: {
    type: Date,
    default: null
  },
  
  leaveTime: {
    type: Date,
    default: null
  },
  
  duration: {
    type: Number, // in minutes
    default: 0
  },
  
  // Attendance status (including instructor-joined for tracking instructor presence)
  status: {
    type: String,
    enum: ['present', 'late', 'absent', 'left-early', 'instructor-joined'],
    default: 'absent',
    index: true
  },
  
  // Manual override
  isManuallyMarked: {
    type: Boolean,
    default: false
  },
  
  manuallyMarkedBy: {
    type: Types.ObjectId,
    ref: 'User',
    default: null
  },
  
  manuallyMarkedAt: {
    type: Date,
    default: null
  },
  
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for efficient queries
attendanceSchema.index({ meetingId: 1, studentId: 1 }, { unique: true });
attendanceSchema.index({ lessonId: 1, groupId: 1 });
attendanceSchema.index({ studentId: 1, createdAt: -1 });
attendanceSchema.index({ groupId: 1, status: 1 });
attendanceSchema.index({ meetingId: 1, status: 1 }); // For checking instructor presence

// Virtual for attendance percentage
attendanceSchema.virtual('attendancePercentage').get(function() {
  if (!this.joinTime || !this.leaveTime) return 0;
  
  // Calculate based on scheduled meeting duration
  const scheduledDuration = 60; // Default 60 minutes, should come from meeting
  return Math.min(100, Math.round((this.duration / scheduledDuration) * 100));
});

// Static methods
attendanceSchema.statics.getMeetingAttendance = function(meetingId) {
  return this.find({ 
    meetingId,
    status: { $ne: 'instructor-joined' } // Exclude instructor records from student attendance
  })
    .populate('studentId', 'firstName lastName email')
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .sort({ studentName: 1 });
};

attendanceSchema.statics.getStudentAttendance = function(studentId, groupId = null) {
  const query = { 
    studentId,
    status: { $ne: 'instructor-joined' } // Exclude instructor records
  };
  if (groupId) query.groupId = groupId;
  
  return this.find(query)
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .sort({ createdAt: -1 });
};

attendanceSchema.statics.getAttendanceStats = function(groupId, lessonId = null) {
  const matchStage = { 
    groupId: new mongoose.Types.ObjectId(groupId),
    status: { $ne: 'instructor-joined' } // Exclude instructor records from stats
  };
  if (lessonId) matchStage.lessonId = new mongoose.Types.ObjectId(lessonId);
  
  return this.aggregate([
    { $match: matchStage },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
        students: { $push: '$studentName' }
      }
    }
  ]);
};

// Check if instructor has joined a meeting
attendanceSchema.statics.hasInstructorJoined = function(meetingId) {
  return this.findOne({
    meetingId,
    status: 'instructor-joined'
  });
};

// Instance methods
attendanceSchema.methods.markManually = function(status, markedBy, notes = '') {
  this.status = status;
  this.isManuallyMarked = true;
  this.manuallyMarkedBy = markedBy;
  this.manuallyMarkedAt = new Date();
  this.notes = notes;
  return this.save();
};

const Attendance = model('Attendance', attendanceSchema);
export default Attendance;