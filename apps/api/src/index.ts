import express from 'express';
import cors from 'cors';
import compression from 'compression';
import http from 'http';
import modelsRouter from './routes/models';
import arenaRouter from './routes/arena';
import evalRouter from './routes/eval';
import logsRouter from './routes/logs';
import { initWebSocketServer } from './services/websocket';

const app = express();
const PORT = process.env.PORT || 3001;

// Performance: gzip/brotli compression for all responses
app.use(compression());

app.use(cors());
app.use(express.json({ limit: '1mb' }));

// Request logging middleware with response time tracking
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
  });
  next();
});

// Request timeout middleware (30s)
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) {
      res.status(408).json({ error: 'Request timeout' });
    }
  });
  next();
});

// Routes
app.use('/api/models', modelsRouter);
app.use('/api/sessions', arenaRouter);
app.use('/api/evaluation', evalRouter);
app.use('/api/logs', logsRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

const server = http.createServer(app);

initWebSocketServer(server);

server.listen(PORT, () => {
  console.log(`🚀 ModelVerdict API listening on http://localhost:${PORT}`);
});
