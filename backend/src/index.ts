import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import winston from 'winston';
import dotenv from 'dotenv';

import authRouter from './routes/auth.js';
import booksRouter from './routes/books.js';
import sessionsRouter from './routes/sessions.js';
import notesRouter from './routes/notes.js';
import circlesRouter from './routes/circles.js';
import shelvesRouter from './routes/shelves.js';
import invitationsRouter from './routes/invitations.js';
import reviewsRouter from './routes/reviews.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Winston Logger Configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console()
  ]
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: '*', // Adjust for production alignment
}));
app.use(express.json());
app.use(morgan('dev'));

// Rate Limiting Config
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// Mount API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/books', booksRouter);
app.use('/api/v1/sessions', sessionsRouter);
app.use('/api/v1/notes', notesRouter);
app.use('/api/v1/circles', circlesRouter);
app.use('/api/v1/shelves', shelvesRouter);
app.use('/api/v1/invitations', invitationsRouter);
app.use('/api/v1', reviewsRouter);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// 404 Route handler fallback
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  logger.error('Unhandled internal error:', err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  logger.info(`Vellune Core Express API running on port ${PORT}`);
});
