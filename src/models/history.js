// models/history.model.js
import mongoose from 'mongoose';

const historySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: true,
    enum: ['VIEW_LESSON', 'SUBMIT_EXAM', 'SEND_NOTE', 'LOGIN', 'LOGOUT','ENROLL_COURSE'],
  },
  metadata: {
    type: Map,
    of: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
});

const History = mongoose.model('History', historySchema);
export default History;
