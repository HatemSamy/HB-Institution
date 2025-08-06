import mongoose, { Schema, Types, model } from 'mongoose';

const meetingSchema = new Schema({
  // BigBlueButton meeting ID
  meetingID: {
    type: String,
    required: true,
    unique: true
  },
  
  // Meeting title (usually lesson title)
  title: {
    type: String,
    required: true,
    trim: true
  },
  
  // Related lesson
  lessonId: {
    type: Types.ObjectId,
    ref: 'Lesson',
    required: true
  },
  
  // Related group
  groupId: {
    type: Types.ObjectId,
    ref: 'Group',
    required: true
  },
  
  // Meeting instructor
  instructorId: {
    type: Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Meeting status
  status: {
    type: String,
    enum: ['scheduled', 'active', 'ended', 'cancelled'],
    default: 'scheduled'
  },
  
  // Meeting timing
  scheduledStartTime: {
    type: Date,
    default: Date.now
  },
  
  actualStartTime: {
    type: Date,
    default: null
  },
  
  actualEndTime: {
    type: Date,
    default: null
  },
  
  // Duration in minutes
  duration: {
    type: Number,
    default: 120,
    min: 15,
    max: 480 // 8 hours max
  },
  
  // Meeting URLs
  meetingUrls: {
    instructorJoinUrl: {
      type: String,
      default: null
    },
    studentJoinUrl: {
      type: String,
      default: null
    }
  },
  
  // Reminder tracking
  reminderSent: {
    type: Boolean,
    default: false
  },
  
  // Basic meeting statistics
  statistics: {
    totalParticipants: {
      type: Number,
      default: 0
    },
    maxConcurrentParticipants: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Essential indexes only
meetingSchema.index({ meetingID: 1 }, { unique: true });
meetingSchema.index({ lessonId: 1 });
meetingSchema.index({ groupId: 1 });
meetingSchema.index({ instructorId: 1 });
meetingSchema.index({ status: 1 });
meetingSchema.index({ scheduledStartTime: 1 });
meetingSchema.index({ reminderSent: 1 });
meetingSchema.index({ createdAt: -1 });

// Compound indexes
meetingSchema.index({ lessonId: 1, groupId: 1 });
meetingSchema.index({ instructorId: 1, status: 1 });
meetingSchema.index({ status: 1, scheduledStartTime: 1, reminderSent: 1 }); // For reminder queries

// Virtual for checking if meeting is currently active
meetingSchema.virtual('isActive').get(function() {
  return this.status === 'active';
});

// Virtual for actual duration calculation
meetingSchema.virtual('actualDuration').get(function() {
  if (this.actualStartTime && this.actualEndTime) {
    return Math.round((this.actualEndTime - this.actualStartTime) / (1000 * 60));
  }
  return null;
});

// Essential instance methods
meetingSchema.methods.startMeeting = function() {
  this.status = 'active';
  this.actualStartTime = new Date();
  return this.save();
};

meetingSchema.methods.endMeeting = function() {
  this.status = 'ended';
  this.actualEndTime = new Date();
  return this.save();
};

meetingSchema.methods.cancelMeeting = function() {
  this.status = 'cancelled';
  return this.save();
};

// Essential static methods
meetingSchema.statics.findActiveMeetings = function() {
  return this.find({ status: 'active' })
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .populate('instructorId', 'firstName lastName')
    .sort({ actualStartTime: -1 });
};

meetingSchema.statics.findMeetingsByInstructor = function(instructorId) {
  return this.find({ instructorId })
    .populate('lessonId', 'title')
    .populate('groupId', 'code')
    .sort({ createdAt: -1 });
};

// Static method to find meetings needing reminders
meetingSchema.statics.findMeetingsNeedingReminders = function() {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + 30 * 60 * 1000); // 30 minutes from now
  const reminderTimeEnd = new Date(now.getTime() + 31 * 60 * 1000); // 31 minutes from now
  
  return this.find({
    status: 'scheduled',
    scheduledStartTime: {
      $gte: reminderTime,
      $lt: reminderTimeEnd
    },
    reminderSent: false
  })
  .populate('lessonId', 'title')
  .populate('groupId', 'code')
  .populate('instructorId', 'firstName lastName');
};

const Meeting = model('Meeting', meetingSchema);
export default Meeting;