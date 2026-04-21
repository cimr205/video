import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { videoQueue } from '../queue';
import { Job, Preset, VideoFormat } from '../types';

const UPLOADS_DIR = path.resolve(__dirname, '../../uploads');
const OUTPUTS_DIR = path.resolve(__dirname, '../../outputs');

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    cb(null, `${uuidv4()}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: parseInt(process.env.MAX_FILE_SIZE_MB ?? '500', 10) * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) cb(null, true);
    else cb(new Error('Only video files are allowed'));
  },
});

const router = Router();

// POST /api/jobs — create job
router.post('/', upload.single('video'), (req: Request, res: Response) => {
  if (!req.file) {
    res.status(400).json({ error: 'No video file uploaded' });
    return;
  }

  const { prompt, preset = 'custom', format = '16:9' } = req.body as {
    prompt?: string;
    preset?: Preset;
    format?: VideoFormat;
  };

  if (!prompt?.trim()) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: 'prompt is required' });
    return;
  }

  const validPresets: Preset[] = ['saas-demo', 'tiktok', 'ad-style', 'custom'];
  const validFormats: VideoFormat[] = ['16:9', '9:16'];

  if (!validPresets.includes(preset)) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: `Invalid preset. Must be: ${validPresets.join(', ')}` });
    return;
  }

  if (!validFormats.includes(format)) {
    fs.unlink(req.file.path, () => {});
    res.status(400).json({ error: `Invalid format. Must be: ${validFormats.join(', ')}` });
    return;
  }

  const id = uuidv4();
  const outputPath = path.join(OUTPUTS_DIR, `${id}.mp4`);

  const job: Job = {
    id,
    status: 'pending',
    prompt: prompt.trim().slice(0, 2000), // cap prompt length
    preset,
    format,
    inputPath: req.file.path,
    outputPath,
    ffmpegCommand: null,
    editPlan: null,
    description: null,
    error: null,
    retries: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  videoQueue.add(job);
  console.log(`[Jobs] Created job ${id}`);

  res.status(201).json(toPublic(job));
});

// GET /api/jobs
router.get('/', (_req: Request, res: Response) => {
  res.json({ jobs: videoQueue.list().map(toPublic), stats: videoQueue.stats });
});

// GET /api/jobs/:id
router.get('/:id', (req: Request, res: Response) => {
  const job = videoQueue.get(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
  res.json(toPublic(job));
});

// GET /api/jobs/:id/output — stream the output video
router.get('/:id/output', (req: Request, res: Response) => {
  const job = videoQueue.get(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }
  if (job.status !== 'done') { res.status(409).json({ error: 'Job not done yet' }); return; }
  if (!fs.existsSync(job.outputPath)) { res.status(404).json({ error: 'Output file missing' }); return; }

  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="output-${job.id}.mp4"`);
  fs.createReadStream(job.outputPath).pipe(res);
});

// DELETE /api/jobs/:id
router.delete('/:id', (req: Request, res: Response) => {
  const job = videoQueue.get(req.params.id);
  if (!job) { res.status(404).json({ error: 'Job not found' }); return; }

  if (job.status === 'processing') {
    res.status(409).json({ error: 'Cannot delete a job that is currently processing' });
    return;
  }

  // Clean up files
  [job.inputPath, job.outputPath].forEach(p => {
    if (fs.existsSync(p)) fs.unlink(p, () => {});
  });

  videoQueue.remove(job.id);
  res.json({ deleted: true });
});

// GET /api/jobs/stats
router.get('/stats/summary', (_req: Request, res: Response) => {
  res.json(videoQueue.stats);
});

function toPublic(job: Job) {
  return {
    id: job.id,
    status: job.status,
    prompt: job.prompt,
    preset: job.preset,
    format: job.format,
    ffmpegCommand: job.ffmpegCommand,
    editPlan: job.editPlan,
    description: job.description,
    error: job.error,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

export default router;
