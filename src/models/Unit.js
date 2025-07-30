// models/chapter.model.js
import mongoose, { Schema } from 'mongoose';
import Lesson from './Lesson.js';

const UnitSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
   required: true
  },
  topic:[ {
    type: String,
    maxlength: 300,
    trim: true
  }],

 content: {
 type: String,
 },
 Completed: {
    type: Boolean,
   default: false
  },



   unlockedForGroups: [{
    type: Schema.Types.ObjectId,
    ref: 'Group'
  }],
  
   courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  }, 

   CreatedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },

  }
    
, { timestamps: true });



// delete related lessons
UnitSchema.pre('findOneAndDelete', async function (next) {
  const unit = await this.model.findOne(this.getFilter());
  if (unit) {
    await Lesson.deleteMany({ unitId: unit._id });
  }
  next();
});

const Unit = mongoose.model('Unit', UnitSchema);
export default Unit;
