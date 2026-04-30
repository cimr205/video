import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { startWorker } from './worker';
import jobsRouter from './routes/jobs';
import remotionRouter from './routes/remotion';

const PORT = parseInt(process.env.PORT ?? '3001', 10);
const UPLOADS_DIR = path.resolve(__dirname, '../uploads');
const OUTPUTS_DIR = path.resolve(__dirname, '../outputs');
const FRONTEND_DIST = path.resolve(__dirname, '../../frontend/dist');

// Ensure storage dirs exist
[UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '1mb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/jobs', jobsRouter);
app.use('/api/remotion', remotionRouter);

// Serve frontend in production
if (fs.existsSync(FRONTEND_DIST)) {
  app.use(express.static(FRONTEND_DIST));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(FRONTEND_DIST, 'index.html'));
  });
}

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Server] Unhandled error:', err.message);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`[Server] Running on http://localhost:${PORT}`);

  if (process.env.ANTHROPIC_API_KEY) {
    console.log('[AI] Provider: Claude (claude-sonnet-4-6)');
  } else {
    const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b';
    const url   = process.env.OLLAMA_URL   ?? 'http://localhost:11434';
    console.log(`[AI] Provider: Ollama  model=${model}  url=${url}`);
  }

  startWorker();
});

export default app;
