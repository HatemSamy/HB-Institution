
import  Note  from '../models/Note.js';
import { AppError, asynchandler } from '../middleware/erroeHandling.js';
import { addHistory } from '../services/history.service.js';
import { HISTORY_ACTIONS } from '../utils/historyActions.js';




export const sendNote = asynchandler(async (req, res) => {
  const { note } = req.body;
  const { firstName, email, role } = req.user;

  const createdNote = await Note.create({
    userId:req.user._id,
    name: firstName,
    email,
    role,
    note,
  });

  if (!createdNote) throw new AppError('Failed to create note', 500);


  await addHistory({
    userId:req.user._id,
    action: HISTORY_ACTIONS.SEND_NOTE,
    metadata: {
      userName: createdNote.name,
      noteText: note,
    },
  });
  res.status(201).json({
    success: true,
    data: createdNote
  });
});



export const getAllNotes = asynchandler(async (req, res) => {
  const notes = await Note.find().sort('-createdAt');

  res.status(200).json({
    success: true,
    count: notes.length,
    data: notes.map(note => ({
      id: note._id,
      name: note.name,
      email: note.email,
      role: note.role,
      note: note.note,
      createdAt: note.createdAt,
    })),
  });
});


export const deleteNote = asynchandler(async (req, res) => {
  const note = await Note.findById(req.params.id);
  if (!note) throw new AppError('Note not found', 404);

  await note.deleteOne();

  res.status(200).json({
    success: true,
    message: 'Note deleted successfully',
  });
});

