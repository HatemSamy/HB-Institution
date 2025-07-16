// models/news.model.js
import mongoose from 'mongoose';

const newsSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Title is required'],
    trim: true
  },
  content: {
    type: String,
    required: [true, 'Content is required']
  },
  image: {
    type: String,
    default: 'default.jpg' 
  }
}, { timestamps: true });

export default mongoose.model('News', newsSchema);
