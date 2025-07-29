import mongoose from 'mongoose';

const noteSchema = new mongoose.Schema({
    userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['student', 'instructor'],
    required: true,
  },
  note: {
    type: String,
    required: true,
  },
}, {
  timestamps: true,
});

 const Note = mongoose.model('Note', noteSchema);
export default Note