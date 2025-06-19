// import path from 'path'
// import { fileURLToPath } from 'url'
// import dotenv from 'dotenv'
// //set directory dirname 
// const __dirname = path.dirname(fileURLToPath(import.meta.url))
// dotenv.config({ path: path.join(__dirname, './config/.env') })
// import express from 'express'
// import * as indexRouter from './src/modules/index.router.js'
// import connectDB from './DB/connection.js'
// const app = express()
// // setup port and the baseUrl
// const port = process.env.PORT || 5000
// const baseUrl = process.env.BASEURL
// //convert Buffer Data
// app.use(express.json())
// //Setup API Routing 
// app.use(`${baseUrl}/auth`, indexRouter.authRouter)
// app.use(`${baseUrl}/user`, indexRouter.userRouter)
// app.use(`${baseUrl}/product`, indexRouter.productRouter)
// app.use(`${baseUrl}/category`, indexRouter.cartRouter)
// app.use(`${baseUrl}/subCategory`, indexRouter.subcategoryRouter)
// app.use(`${baseUrl}/reviews`, indexRouter.reviewsRouter)
// app.use(`${baseUrl}/coupon`, indexRouter.couponRouter)
// app.use(`${baseUrl}/cart`, indexRouter.cartRouter)
// app.use(`${baseUrl}/order`, indexRouter.orderRouter)
// app.use(`${baseUrl}/brand`, indexRouter.branRouter)

// app.use('*', (req, res, next) => {
//     res.send("In-valid Routing Plz check url  or  method")
// })


// connectDB()
// // Handling Error
// app.use(globalErrorHandling)
// app.listen(port, () => console.log(`Example app listening on port ${port}!`))



import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import connectDB from './src/config/DB/connection.js';
import authRoutes from './src/routes/authRoutes.js';
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
if (process.env.NODE_ENV === 'development') {
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

const server = app.listen(PORT, () => {
  console.log(`🚀 Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  // Close server & exit process
  server.close(() => {
    process.exit(1);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log(`Error: ${err.message}`);
  console.log('Shutting down the server due to Uncaught Exception');
  process.exit(1);
});

export default app;