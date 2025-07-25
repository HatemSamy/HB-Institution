import { asynchandler } from "../middleware/erroeHandling.js";
import { paginate } from "../middleware/pagination.js";
import ContactMessage from "../models/Contac.js";




export const sendContactMessage = asynchandler(async (req, res) => {
  const {
    fullName,
    phoneNumber,
    subject,
    message
  } = req.body;

  const email = req.user?.email; 
  const newMessage = await ContactMessage.create({
    fullName,
    email,
    phoneNumber,
    subject,
    message
  });

  res.status(201).json({
    message: 'Message sent successfully',
    data: newMessage
  });
});



export const getContactMessages = asynchandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const size = parseInt(req.query.size) || 10;

  const { skip, limit } = paginate(page, size);

  const [messages, total] = await Promise.all([
    ContactMessage.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    ContactMessage.countDocuments()
  ]);

  if (messages.length === 0) {
    return res.status(404).json({
      message: 'No contact messages found'
    });
  }

  res.status(200).json({
    page,
    size,
    total,
    totalPages: Math.ceil(total / size),
    data: messages
  });
});




export const deleteAllContactMessages = asynchandler(async (req, res) => {
  const result = await ContactMessage.deleteMany({});

  if (result.deletedCount === 0) {
    return res.status(404).json({
      message: 'No messages found to delete'
    });
  }

  res.status(200).json({
    message: 'All messages deleted successfully',
    deletedCount: result.deletedCount
  });
});





export const deleteContactMessage = asynchandler(async (req, res) => {
  const { id } = req.params;

  const deletedMessage = await ContactMessage.findByIdAndDelete(id);

  if (!deletedMessage) {
    return res.status(404).json({ message: 'Message not found' });
  }

  res.status(200).json({
    message: 'Message deleted successfully',
    deletedMessage
  });
});
