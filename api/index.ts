/**
 * Vercel Serverless Function Entry Point
 * 
 * This file exports the Express app for Vercel's serverless environment.
 * It wraps the main backend application to work with Vercel's function runtime.
 * 
 * Note: Socket.io may have limitations in Vercel's serverless environment.
 * For production, consider deploying Socket.io separately (Railway, Render, etc.)
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';

// Import routes
import { chatRouter } from '../backend/src/routes/chat.js';
import { transcribeRouter } from '../backend/src/routes/transcribe.js';
import { synthesizeRouter } from '../backend/src/routes/synthesize.js';
import { imagesRouter } from '../backend/src/routes/images.js';
import { imagePromptsRouter } from '../backend/src/routes/imagePrompts.js';
import { teacherRouter } from '../backend/src/routes/teacher.js';
import { studentRouter } from '../backend/src/routes/student.js';
import parentRouter from '../backend/src/routes/parent.js';
import whatsappRouter from '../backend/src/routes/whatsapp.js';

// Import middleware
import { errorHandler, requestLogger, getHealthStatus } from '../backend/src/utils/logger.js';
import { rateLimiter } from '../backend/src/middleware/rateLimiter.js';
import { preventSQLInjection } from '../backend/src/middleware/sqlInjectionPrevention.js';
import { preventXSS, setXSSHeaders } from '../backend/src/middleware/xssPrevention.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://finxan-edu.vercel.app',
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Initialize Socket.io
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  socket.on('student:join', (data: { studentId: string; sessionId: string }) => {
    socket.join(`student:${data.studentId}`);
    socket.join(`session:${data.sessionId}`);
  });
  
  socket.on('teacher:join', (data: { teacherId: string; classroomId: string }) => {
    socket.join(`teacher:${data.teacherId}`);
    socket.join(`classroom:${data.classroomId}`);
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

// Make io available to routes
app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);
app.use(setXSSHeaders());
app.use('/api', preventSQLInjection());
app.use('/api', preventXSS());
app.use('/api', rateLimiter);

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() });

// Routes
app.use('/api/chat', chatRouter);
app.use('/api/transcribe', upload.single('audio'), transcribeRouter);
app.use('/api/synthesize', synthesizeRouter);
app.use('/api/images', imagesRouter);
app.use('/api/image-prompts', imagePromptsRouter);
app.use('/api/teacher', teacherRouter);
app.use('/api/student', studentRouter);
app.use('/api/parent', parentRouter);
app.use('/api/whatsapp', whatsappRouter);

// Health check
app.get('/health', (req, res) => {
  const health = getHealthStatus();
  res.json(health);
});

// Error handling
app.use(errorHandler);

// Export for Vercel
export default app;
