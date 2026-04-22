import { videoQueue } from './queue';
import { generateVideoEdit } from './ai';
import { generateWithRules } from './rule-engine';
import { buildSafeArgs, getVideoDuration, runFFmpeg } from './ffmpeg-engine';
import { getFallbackArgs } from './presets';

const MAX_RETRIES = 2;

async function processJob(jobId: string): Promise<void> {
  const job = videoQueue.get(jobId);
  if (!job) return;

  videoQueue.markProcessing(jobId);
  console.log(`[Worker] Starting job ${jobId} | preset=${job.preset} format=${job.format}`);

  const duration = await getVideoDuration(job.inputPath);
  console.log(`[Worker] Duration: ${duration.toFixed(2)}s`);

  let ffmpegArgs: string[] | null = null;

  // ── 1. Try AI (Claude → Ollama) ────────────────────────────────────────────
  try {
    const aiResult = await generateVideoEdit(job.prompt, job.preset, job.format, duration);

    videoQueue.update(jobId, {
      editPlan:      aiResult.editPlan,
      description:   aiResult.description,
      ffmpegCommand: aiResult.ffmpegCommand,
    });

    ffmpegArgs = buildSafeArgs(aiResult.ffmpegCommand, job.inputPath, job.outputPath);
    if (!ffmpegArgs) console.warn('[Worker] AI command failed validation');
  } catch (err) {
    console.error('[Worker] AI generation failed:', (err as Error).message);
  }

  // ── 2. Rule engine (always works, reads prompt intelligently) ──────────────
  if (!ffmpegArgs) {
    console.log('[Worker] Running rule engine');
    try {
      const ruled = generateWithRules(job.prompt, job.preset, job.format, duration);
      const args  = ruled.ffmpegArgs.map(a =>
        a === 'INPUT_PATH'  ? job.inputPath  :
        a === 'OUTPUT_PATH' ? job.outputPath : a
      );
      ffmpegArgs = args;

      videoQueue.update(jobId, {
        editPlan:      ruled.editPlan,
        description:   ruled.description,
        ffmpegCommand: ruled.ffmpegCommand,
      });
    } catch (err) {
      console.error('[Worker] Rule engine failed:', err);
    }
  }

  // ── 3. Hard fallback (guaranteed) ─────────────────────────────────────────
  if (!ffmpegArgs) {
    console.log('[Worker] Using hard fallback');
    ffmpegArgs = getFallbackArgs(job.inputPath, job.outputPath, job.format, duration);
    videoQueue.update(jobId, {
      editPlan:      'Fallback: scale + fade',
      description:   'Processed with safe fallback.',
      ffmpegCommand: `ffmpeg -y -i <input> [fallback filters] <output>`,
    });
  }

  // ── 4. Execute (with retry using hard fallback) ────────────────────────────
  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      console.log(`[Worker] Retry ${attempt} — switching to hard fallback`);
      ffmpegArgs = getFallbackArgs(job.inputPath, job.outputPath, job.format, duration);
    }
    try {
      await runFFmpeg(ffmpegArgs);
      videoQueue.markDone(jobId);
      console.log(`[Worker] Job ${jobId} DONE`);
      return;
    } catch (err) {
      lastError = (err as Error).message;
      console.error(`[Worker] FFmpeg attempt ${attempt} failed:`, lastError);
    }
  }

  videoQueue.markFailed(jobId, `FFmpeg failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
}

export function startWorker(): void {
  videoQueue.on('job:ready', (jobId: string) => {
    processJob(jobId).catch(err => {
      console.error('[Worker] Unhandled error:', err);
      videoQueue.markFailed(jobId, 'Internal worker error');
    });
  });
  console.log(`[Worker] Started — max concurrency: ${videoQueue.maxConcurrency}`);
}
