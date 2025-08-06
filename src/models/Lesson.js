import mongoose, { Schema, Types, model } from 'mongoose';

const lessonSchema = new Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  order: {
    type: Number,
    required: true
  },
resources: {
    url: { type: String},
    public_id: { type: String},
    type: {
      type: String,
      enum: ['pdf', 'doc', 'ppt', 'zip', 'other'],
      default: 'pdf'
    },
    filename: { type: String } 
  },
  unitId: {
    type: Types.ObjectId,
    ref: 'Unit',
    required: true
  },

  unlockedForGroups: [{
    type: Types.ObjectId,
    ref: 'Group'
  }],
   completed: {
    type: Boolean,
    default: false 
  },
  completionCriteria: {
    type: String,
    enum: ['view', 'quiz', 'assignment', 'none'],
    default: 'view'
  },
  passingScore: {
    type: Number,
    default: 0
  },
  quizId: {
    type: Types.ObjectId,
    ref: 'Quiz'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for unit relationship
lessonSchema.virtual('unit', {
  ref: 'Unit',
  localField: 'unitId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'courseId' }
});

// Virtual for meetings relationship
lessonSchema.virtual('meetings', {
  ref: 'Meeting',
  localField: '_id',
  foreignField: 'lessonId'
});

// Virtual for active meeting
lessonSchema.virtual('activeMeeting', {
  ref: 'Meeting',
  localField: '_id',
  foreignField: 'lessonId',
  justOne: true,
  match: { status: 'active' }
});

// Indexes
lessonSchema.index({ unitId: 1, order: 1 });
lessonSchema.index({ unlockedForGroups: 1 });

// Instance methods
lessonSchema.methods.hasActiveMeeting = async function() {
  const Meeting = mongoose.model('Meeting');
  const activeMeeting = await Meeting.findOne({
    lessonId: this._id,
    status: 'active'
  });
  return !!activeMeeting;
};

lessonSchema.methods.getActiveMeeting = async function() {
  const Meeting = mongoose.model('Meeting');
  return await Meeting.findOne({
    lessonId: this._id,
    status: 'active'
  }).populate('groupId', 'code').populate('instructorId', 'firstName lastName');
};

lessonSchema.methods.getAllMeetings = async function() {
  const Meeting = mongoose.model('Meeting');
  return await Meeting.find({
    lessonId: this._id
  }).populate('groupId', 'code').populate('instructorId', 'firstName lastName').sort({ createdAt: -1 });
};

const Lesson = model('Lesson', lessonSchema);
export default Lesson;