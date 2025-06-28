import mongoose, { Schema, model } from 'mongoose';

// Course Model
const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  duration: {
    type: String,
    required: true,
    trim: true
  },
   price: {
    type: Number,
    required: true,
    trim: true
  },
  description: {
  
      type: String,
    required: true
  },

  levels: [{
    type: String,
    enum: ['Beginner', 'Intermediate', 'Advanced'],
    required: true
  }],
  isActive: {
    type: Boolean,
    default: true
  },
   rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5,
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
}, {
  timestamps: true
});



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
