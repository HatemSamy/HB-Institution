import jwt from 'jsonwebtoken';
import User from '../models/User.js';

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map();
  }

  init(io) {
    this.io = io;
    this.setupSocketHandlers();
    console.log('🔌 Socket service initialized');
  }

  setupSocketHandlers() {
    this.io.on('connection', (socket) => {
      console.log(`🔌 New socket connection: ${socket.id}`);

      socket.on('authenticate', async (token) => {
        try {
          await this.authenticateSocket(socket, token);
        } catch (error) {
          console.error('Socket authentication failed:', error);
          socket.emit('auth_error', { message: 'Authentication failed' });
          socket.disconnect();
        }
      });

      socket.on('join_notifications', async (data) => {
        if (socket.userId) {
          const room = `user_${socket.userId}`;
          socket.join(room);
          console.log(`👤 User ${socket.userId} joined notifications room: ${room}`);

          this.connectedUsers.set(socket.userId.toString(), socket.id);

          socket.emit('joined_notifications', {
            message: 'Successfully joined notifications',
            room: room
          });
        } else {
          socket.emit('error', { message: 'Please authenticate first' });
        }
      });

      socket.on('disconnect', () => {
        if (socket.userId) {
          this.connectedUsers.delete(socket.userId.toString());
          console.log(`🔌 User ${socket.userId} disconnected`);
        }
        console.log(`🔌 Socket disconnected: ${socket.id}`);
      });
    });
  }

  async authenticateSocket(socket, token) {
    if (!token) {
      throw new Error('No token provided');
    }

    const cleanToken = token.replace('Bearer ', '');
    const decoded = jwt.verify(cleanToken, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id firstName lastName email role');

    if (!user) {
      throw new Error('User not found');
    }

    socket.userId = user._id;
    socket.userInfo = {
      id: user._id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role
    };

    console.log(`✅ Socket authenticated for user: ${user.firstName} ${user.lastName} (${user._id})`);

    socket.emit('authenticated', {
      message: 'Authentication successful',
      user: socket.userInfo
    });
  }

  sendMeetingReminder(userId, reminderData) {
    if (!this.io) {
      console.error('Socket.IO not initialized');
      return false;
    }

    const room = `user_${userId}`;

    console.log(`⏰ Sending meeting reminder to user ${userId}`);

    this.io.to(room).emit('meeting_reminder', {
      type: 'meeting_reminder',
      meetingId: reminderData.meetingId,
      lessonTitle: reminderData.lessonTitle,
      instructorName: reminderData.instructorName,
      groupCode: reminderData.groupCode,
      joinURL: reminderData.joinURL,
      scheduledTime: reminderData.scheduledTime,
      message: reminderData.message || `Reminder: Your lesson "${reminderData.lessonTitle}" starts soon!`
    });

    return true;
  }
}

const socketService = new SocketService();
export default socketService;
