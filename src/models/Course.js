import { Schema, model } from 'mongoose';

const courseSchema = new Schema({
  title: {
    type: String,
    required: true,
    index: true  
  },

  course_imageId: String,
  course_imageUrl: String,

  description: {
    type: String,
    required: true
  },


  instructorId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  total_duration: String,

  price: {
    type: Number,
    required: true
  },

  students_enrolled: [
    {
      type: Schema.Types.ObjectId,
      ref: 'User'
    }
  ],

  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner',
    required: true
  },

  duration: {
    days: { type: Number, default: 0 },
    hours: { type: Number, default: 0 }
  },

  enrollment_count: {
    type: Number,
    default: 0
  },

  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
  },

  approved: {
    type: Boolean,
    required: true,
    default: false
  },

  chapters: [
    {
      type: Schema.Types.ObjectId,
      ref: 'Chapter',
    }
  ],

  CreatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }

}, { timestamps: true });



courseSchema.pre('remove', async function (next) {
  try {
    await this.model('Chapter').deleteMany({ _id: { $in: this.chapters } });
    next();
  } catch (error) {
    next(error);
  }
});

const Course = model('Course', courseSchema);
export default Course;
