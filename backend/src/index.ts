/**
 * Haru AI Teacher backend.
 * Express server: chat, images, transcribe/synthesize, auth, credits.
 */

import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import multer from 'multer';
import { chatRouter } from './routes/chat.js';
import { transcribeRouter } from './routes/transcribe.js';
import { synthesizeRouter } from './routes/synthesize.js';
import { imagesRouter } from './routes/images.js';
import { authRouter } from './routes/auth.js';
import { creditsRouter } from './routes/credits.js';
import { errorHandler, requestLogger, getHealthStatus, logger } from './utils/logger.js';
import { preventSQLInjection } from './middleware/sqlInjectionPrevention.js';
import { preventXSS, setXSSHeaders } from './middleware/xssPrevention.js';
import { validateEnvironmentOrThrow } from './utils/validateEnv.js';

dotenv.config();
validateEnvironmentOrThrow();

const app = express();
const httpServer = createServer(app);
const PORT = parseInt(process.env.PORT || '3001', 10);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`Origin ${origin} not allowed by CORS`));
  },
  credentials: true,
}));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

app.use(setXSSHeaders());
app.use('/api', preventSQLInjection());
app.use('/api', preventXSS());

if (process.env.REDIS_URL) {
  const { rateLimiter } = await import('./middleware/rateLimiter.js');
  app.use('/api', rateLimiter);
}

const upload = multer({ storage: multer.memoryStorage() });

app.use('/api/auth', authRouter);
app.use('/api/credits', creditsRouter);
app.use('/api/chat', chatRouter);
app.use('/api/transcribe', upload.single('audio'), transcribeRouter);
app.use('/api/synthesize', synthesizeRouter);
app.use('/api/images', imagesRouter);

app.get('/health', (_req, res) => res.json(getHealthStatus()));

app.use(errorHandler);

const HOST = process.env.NODE_ENV === 'production' ? '0.0.0.0' : 'localhost';

httpServer.listen(PORT, HOST, () => {
  logger.info(`Haru AI Teacher backend running on http://${HOST}:${PORT}`);
  logger.info(`Health: http://${HOST}:${PORT}/health`);
  logger.info(`AI provider: ${process.env.AI_PROVIDER || 'groq'} | Image provider: ${process.env.IMAGE_PROVIDER || 'wikimedia'}`);
});
