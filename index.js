
import express from 'express';
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
import ClassSelectionRoutes from './src/routes/ClassSelectionRouter.js';

import { globalErrorHandling } from './src/middleware/erroeHandling.js'



// Load env vars
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({}));

// Logging middleware
if (process.env.NODE_ENV === 'DEV') {
  app.use(morgan('dev'));
}

// Body parsing middleware
app.use(express.json({

 }));
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
app.use(`${baseUrl}/news`,newsRoutes);
app.use(`${baseUrl}/note`,noteRoutes);
app.use(`${baseUrl}/Contact`,ContactRoutes);
app.use(`${baseUrl}/history`,historyRoutes);









// Welcome route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to HB-Institution Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/api/v1/health',
      auth: '/api/v1/auth'
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

app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});


export default app;