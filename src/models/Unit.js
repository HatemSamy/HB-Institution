// models/chapter.model.js
import mongoose, { Schema } from 'mongoose';

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



  lock: {
    type: Boolean,
   default: true
  },
 
  
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

const Unit = mongoose.model('Unit', UnitSchema);
export default Unit;
