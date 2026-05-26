import express from 'express';
import cors from 'cors';
import modelsRouter from './routes/models';
import arenaRouter from './routes/arena';
import evalRouter from './routes/eval';
import logsRouter from './routes/logs';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

// Routes
app.use('/api/models', modelsRouter);
app.use('/api/sessions', arenaRouter);
app.use('/api/evaluation', evalRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(PORT, () => {
  console.log(`🚀 Veritas Arena API listening on http://localhost:${PORT}`);
});
