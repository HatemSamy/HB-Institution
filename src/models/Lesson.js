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
  resources: [{
    title: String,
    url: String,
    type: {
      type: String,
      enum: ['pdf', 'doc', 'ppt', 'zip', 'other']
    }
  }],
  unitId: {
    type: Types.ObjectId,
    ref: 'Unit',
    required: true
  },
  islocked: {
    type: Boolean,
    default: true 
  },

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

// Virtual population to get course through unit
lessonSchema.virtual('course', {
  ref: 'Unit',
  localField: 'unitId',
  foreignField: '_id',
  justOne: true,
  options: { select: 'courseId' }
});

// Indexes
lessonSchema.index({ unitId: 1, order: 1 });

const Lesson = model('Lesson', lessonSchema);
export default Lesson;