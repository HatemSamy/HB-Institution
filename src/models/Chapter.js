// models/chapter.model.js
import mongoose from 'mongoose';

const chapterSchema = new mongoose.Schema({
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
 
  attachments: [String]

  },
    
}, { timestamps: true });

const Chapter = mongoose.model('Chapter', chapterSchema);
export default Chapter;
