import express from 'express';
// import { createServer } from 'http';
// import { Server } from 'socket.io';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from './src/config/DB/connection.js';
import authRoutes from './src/routes/authRoutes.js';
import courseRoutes from './src/routes/courseRouter.js';
import categoryRoutes from './src/routes/categoryRouter.js';
import groupRoutes from './src/routes/groupRouter.js';
import unitRoutes from './src/routes/unitRoutes.js';
import userRoutes from './src/routes/UserRouters.js';
import newsRoutes from './src/routes/NewsRouter.js';
import ContactRoutes from './src/routes/Contac.js';
import noteRoutes from './src/routes/noteRouter.js';
import historyRoutes from './src/routes/historyRouter.js';
import lessonRoutes from './src/routes/lessonRouter.js';
import meetingRoutes from './src/routes/meetingRouter.js';
import notificationRoutes from './src/routes/notificationRouter.js';
import ClassSelectionRoutes from './src/routes/ClassSelectionRouter.js';
import attendanceRoutes from './src/routes/attendanceRouter.js';
import joinTrackingRoutes from './src/routes/joinTrackingRouter.js';
import { globalErrorHandling } from './src/middleware/erroeHandling.js';
// import socketService from './src/services/socketService.js';

// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration - Open for testing
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: false
}));

// Logging middleware
if (process.env.NODE_ENV === 'DEV') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({}));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Health check route
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HB-Institution Platform API is running!',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

const baseUrl = process.env.BASEURL

// API Routes
app.use(`${baseUrl}/auth`, authRoutes);
app.use(`${baseUrl}/courses`,courseRoutes);
app.use(`${baseUrl}/ClassSelection`,ClassSelectionRoutes);
app.use(`${baseUrl}/category`,categoryRoutes);
app.use(`${baseUrl}/group`,groupRoutes);
app.use(`${baseUrl}/unit`,unitRoutes);
app.use(`${baseUrl}/user`,userRoutes);
app.use(`${baseUrl}/lesson`,lessonRoutes);
app.use(`${baseUrl}/meeting`,meetingRoutes);
app.use(`${baseUrl}/notifications`,notificationRoutes);
app.use(`${baseUrl}/news`,newsRoutes);
app.use(`${baseUrl}/note`,noteRoutes);
app.use(`${baseUrl}/Contact`,ContactRoutes);
app.use(`${baseUrl}/history`,historyRoutes);
app.use(`${baseUrl}/attendance`, attendanceRoutes);
app.use(`${baseUrl}`, joinTrackingRoutes);

// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to HB-Institution Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth',
      attendance: '/api/v1/attendance',
      join: '/api/v1/join'
    }
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`
  });
});

// Error handling middleware (must be last)
app.use(globalErrorHandling);

const PORT = process.env.PORT || 5000;

// Create HTTP server
// const httpServer = createServer(app);

// Initialize Socket.IO with open CORS for testing
// const io = new Server(httpServer, {
//   cors: {
//     origin: "*",
//     methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
//     allowedHeaders: ["*"],
//     credentials: false
//   },
//   transports: ['polling'], // Force polling for Vercel compatibility
//   allowEIO3: true,
//   pingTimeout: 60000,
//   pingInterval: 25000
// });

// Initialize socket service
// socketService.init(io);

// Make io instance available globally
// global.io = io;

// httpServer.listen(PORT, async () => {
app.listen(PORT, async () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  // console.log(`🔌 Socket.IO server initialized`);
  try {
    const { default: MeetingScheduler } = await import('./src/services/meetingScheduler.js');
    MeetingScheduler.init();
  } catch (error) {
    console.error('❌ Failed to initialize meeting scheduler:', error);
  }
});

export default app;