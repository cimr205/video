import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { generateRemotionProps } from '../remotion-ai';
import { renderPromptVideo } from '../remotion-engine';

const OUTPUTS_DIR = path.resolve(__dirname, '../../outputs');

const router = Router();

// In-memory job store for remotion jobs
const jobs = new Map<string, {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  prompt: string;
  format: '16:9' | '9:16';
  progress: number;
  error: string | null;
  outputPath: string;
  props: object | null;
  createdAt: string;
}>();

// POST /api/remotion — create render job
router.post('/', async (req: Request, res: Response) => {
  const { prompt, format = '16:9' } = req.body as { prompt?: string; format?: '16:9' | '9:16' };

  if (!prompt?.trim()) {
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const id = uuidv4();
  const outputPath = path.join(OUTPUTS_DIR, `remotion-${id}.mp4`);

  const job = {
    id,
    status: 'pending' as const,
    prompt: prompt.trim().slice(0, 2000),
    format: format as '16:9' | '9:16',
    progress: 0,
    error: null,
    outputPath,
    props: null,
    createdAt: new Date().toISOString(),
  };

  jobs.set(id, job);
  res.status(201).json(toPublic(job));

  // Process async
  processJob(id).catch(err => {
    const j = jobs.get(id);
    if (j) { j.status = 'failed'; j.error = err.message; }
    console.error('[Remotion] Job failed:', err);
  });
});

async function processJob(id: string) {
  const job = jobs.get(id);
  if (!job) return;

  job.status = 'processing';
  console.log(`[Remotion] Starting job ${id}`);

  const props = await generateRemotionProps(job.prompt, job.format);
  job.props = props;
  console.log(`[Remotion] Props generated for ${id}`);

  await renderPromptVideo(props, job.outputPath, (progress) => {
    job.progress = progress;
  });

  job.status = 'done';
  job.progress = 100;
  console.log(`[Remotion] Job ${id} DONE`);
}

// GET /api/remotion
router.get('/', (_req: Request, res: Response) => {
  res.json({ jobs: [...jobs.values()].map(toPublic).reverse() });
});

// GET /api/remotion/:id
router.get('/:id', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) { res.status(404).json({ error: 'Not found' }); return; }
  res.json(toPublic(job));
});

// GET /api/remotion/:id/output
router.get('/:id/output', (req: Request, res: Response) => {
  const job = jobs.get(req.params.id);
  if (!job) { res.status(404).json({ error: 'Not found' }); return; }
  if (job.status !== 'done') { res.status(409).json({ error: 'Not done yet' }); return; }
  if (!fs.existsSync(job.outputPath)) { res.status(404).json({ error: 'Output missing' }); return; }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="video-${job.id}.mp4"`);
  fs.createReadStream(job.outputPath).pipe(res);
});

function toPublic(job: ReturnType<typeof jobs.get>!) {
  return {
    id: job.id,
    status: job.status,
    prompt: job.prompt,
    format: job.format,
    progress: job.progress,
    error: job.error,
    props: job.props,
    createdAt: job.createdAt,
  };
}

export default router;
