/**
 * Haru AI Teacher Backend Server
 * Handles AI processing, speech services, and image generation
 */

import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import cron from 'node-cron';
import { chatRouter } from './routes/chat.js';
import { transcribeRouter } from './routes/transcribe.js';
import { synthesizeRouter } from './routes/synthesize.js';
import { imagesRouter } from './routes/images.js';
import { imagePromptsRouter } from './routes/imagePrompts.js';
import { teacherRouter } from './routes/teacher.js';
import { studentRouter } from './routes/student.js';
import parentRouter from './routes/parent.js';
import whatsappRouter from './routes/whatsapp.js';
import { monitoringRouter } from './routes/monitoring.js';
import { ProviderRegistry } from './providers/registry.js';
import { errorHandler, requestLogger, getHealthStatus } from './utils/logger.js';
import { performanceMonitoring } from './middleware/performanceMonitoring.js';
import { monitoringService } from './services/MonitoringService.js';
import { alertingService } from './services/AlertingService.js';
import { initializeSchema as initializeWeaviate, testConnection as testWeaviateConnection } from './config/weaviate.js';
import { testConnection as testNeo4jConnection } from './config/neo4j.js';
import { testConnection as testSupabaseConnection } from './config/supabase.js';
// import { runNightlyPredictions } from './services/PredictiveFailureDetection.js';
import { runNightlyReports } from './scripts/nightlyReportJob.js';
import { rateLimiter, strictRateLimiter } from './middleware/rateLimiter.js';
import { preventSQLInjection } from './middleware/sqlInjectionPrevention.js';
import { preventXSS, setXSSHeaders } from './middleware/xssPrevention.js';
import { validateEnvironmentOrThrow } from './utils/validateEnv.js';

dotenv.config();

// Validate environment variables at startup
validateEnvironmentOrThrow();

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);

// Middleware - CORS configuration for production
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://finxan-edu.vercel.app'
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

// Initialize Socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log(`✅ Client connected: ${socket.id}`);
  
  // Student events
  socket.on('student:join', (data: { studentId: string; sessionId: string }) => {
    socket.join(`student:${data.studentId}`);
    socket.join(`session:${data.sessionId}`);
    console.log(`👨‍🎓 Student ${data.studentId} joined session ${data.sessionId}`);
  });
  
  // Teacher events
  socket.on('teacher:join', (data: { teacherId: string; classroomId: string }) => {
    socket.join(`teacher:${data.teacherId}`);
    socket.join(`classroom:${data.classroomId}`);
    console.log(`👩‍🏫 Teacher ${data.teacherId} joined classroom ${data.classroomId}`);
    
    // Start periodic heatmap updates for this classroom (REQ-4.1.3)
    startHeatmapUpdates(socket, data.classroomId);
  });
  
  socket.on('disconnect', () => {
    console.log(`❌ Client disconnected: ${socket.id}`);
  });
});

/**
 * Task 14.3: Start periodic heatmap updates
 * REQ-4.1.3: Update heatmap every 30 seconds via Socket.io
 */
async function startHeatmapUpdates(socket: any, classroomId: string) {
  const { broadcastHeatmapUpdate } = await import('./routes/teacher.js');
  
  // Send initial heatmap immediately
  const studentIds = ['demo_student']; // TODO: Fetch from database
  await broadcastHeatmapUpdate(io, classroomId, studentIds);
  
  // Set up periodic updates every 30 seconds
  const intervalId = setInterval(async () => {
    // Check if socket is still connected
    if (!socket.connected) {
      clearInterval(intervalId);
      return;
    }
    
    await broadcastHeatmapUpdate(io, classroomId, studentIds);
  }, 30000); // 30 seconds
  
  // Clean up interval when socket disconnects
  socket.on('disconnect', () => {
    clearInterval(intervalId);
  });
}

// Make io available to routes
app.set('io', io);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use(requestLogger);

// Performance monitoring middleware (Task 37.5)
app.use(performanceMonitoring);

// Security headers (REQ-11.4)
// Set XSS protection headers on all responses
app.use(setXSSHeaders());

// SQL Injection Prevention (REQ-11.4)
// Apply to all API routes before rate limiting
app.use('/api', preventSQLInjection());

// XSS Prevention (REQ-11.4)
// Apply to all API routes to prevent cross-site scripting attacks
app.use('/api', preventXSS());

// Rate limiting middleware (REQ-11.5)
// Apply global rate limiter to all API routes
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
app.use('/api/monitoring', monitoringRouter);

// Health check
app.get('/health', (req, res) => {
  const health = getHealthStatus();
  res.json(health);
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Start server - bind to 0.0.0.0 for cloud deployment (Render, Railway, etc.)
const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

// Initialize database connections
async function initializeDatabases() {
  console.log('\n🔌 Initializing database connections...');
  
  // Test Supabase connection
  const supabaseOk = await testSupabaseConnection();
  if (!supabaseOk) {
    console.warn('⚠️  Supabase connection failed - some features may be unavailable');
  }
  
  // Test Neo4j connection
  const neo4jOk = await testNeo4jConnection();
  if (!neo4jOk) {
    console.warn('⚠️  Neo4j connection failed - knowledge graph features will be unavailable');
  }
  
  // Test and initialize Weaviate
  const weaviateOk = await testWeaviateConnection();
  if (weaviateOk) {
    await initializeWeaviate();
  } else {
    console.warn('⚠️  Weaviate connection failed - vector search features will be unavailable');
  }
  
  console.log('✅ Database initialization complete\n');
}

/**
 * Task 15.4: Initialize nightly prediction job
 * REQ-4.2.1: System SHALL run nightly risk predictions for all students
 * 
 * Runs at 2:00 AM every day
 */
function initializeNightlyPredictionJob() {
  // Temporarily disabled - will be enabled when database is fully connected
  console.log('⏰ Nightly prediction job (temporarily disabled)');
  
  // Schedule job to run at 2:00 AM every day
  // Cron format: minute hour day month weekday
  // '0 2 * * *' = At 02:00 every day
  /*
  cron.schedule('0 2 * * *', async () => {
    console.log('🌙 Running nightly prediction job...');
    try {
      // Pass Socket.io instance to enable real-time alerts
      await runNightlyPredictions(io);
      console.log('✅ Nightly prediction job completed');
    } catch (error) {
      console.error('❌ Nightly prediction job failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata' // IST timezone
  });
  
  console.log('⏰ Nightly prediction job scheduled (runs at 2:00 AM IST)');
  */
}

/**
 * Task 18.4: Initialize nightly report job
 * REQ-6.1.5: System SHALL send reports via WhatsApp when enabled
 * 
 * Runs at 8:00 PM every day (evening report for parents)
 */
function initializeNightlyReportJob() {
  // Temporarily disabled - will be enabled when database is fully connected
  console.log('⏰ Nightly report job (temporarily disabled)');
  
  // Schedule job to run at 8:00 PM every day
  // Cron format: minute hour day month weekday
  // '0 20 * * *' = At 20:00 (8:00 PM) every day
  /*
  cron.schedule('0 20 * * *', async () => {
    console.log('🌙 Running nightly report job...');
    try {
      await runNightlyReports();
      console.log('✅ Nightly report job completed');
    } catch (error) {
      console.error('❌ Nightly report job failed:', error);
    }
  }, {
    timezone: 'Asia/Kolkata' // IST timezone
  });
  
  console.log('⏰ Nightly report job scheduled (runs at 8:00 PM IST)');
  */
}

httpServer.listen(PORT, HOST, async () => {
  console.log(`🚀 Haru AI Teacher Backend running on ${HOST}:${PORT}`);
  console.log(`📍 Health check: http://${HOST}:${PORT}/health`);
  console.log(`📊 Monitoring: http://${HOST}:${PORT}/api/monitoring/health`);
  console.log(`🔌 Socket.io server ready for real-time connections`);
  
  // Initialize databases
  await initializeDatabases();
  
  // Initialize nightly prediction job
  initializeNightlyPredictionJob();
  
  // Initialize nightly report job
  initializeNightlyReportJob();
  
  // Initialize alert handling (Task 37.5)
  monitoringService.onAlert((alert) => {
    alertingService.sendAlert(alert).catch(err => {
      logger.error('Failed to send alert', err);
    });
  });
  
  console.log('\n📊 Monitoring & Alerting:');
  console.log('   Health checks: Every 30 seconds');
  console.log('   Performance tracking: Enabled');
  console.log('   Alert channels: Check environment variables');
  
  // Log configured providers (environment-based selection)
  console.log('\n📦 Provider Configuration:');
  console.log(`   AI Provider: ${process.env.AI_PROVIDER || 'aws-bedrock (default)'}`);
  console.log(`   TTS Provider: ${process.env.TTS_PROVIDER || 'aws-polly (default)'}`);
  console.log(`   STT Provider: ${process.env.STT_PROVIDER || 'aws-transcribe (default)'}`);
  console.log(`   Image Provider: ${process.env.IMAGE_PROVIDER || 'aws-bedrock (default)'}`);
  console.log('\n✅ Server initialization complete - providers will be instantiated on first use\n');
});

export { io };
