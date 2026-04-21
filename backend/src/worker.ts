import { videoQueue } from './queue';
import { generateVideoEdit } from './claude';
import { buildSafeArgs, getVideoDuration, runFFmpeg } from './ffmpeg-engine';
import { getFallbackArgs } from './presets';
import { Job } from './types';

const MAX_RETRIES = 2;

async function processJob(jobId: string): Promise<void> {
  const job = videoQueue.get(jobId);
  if (!job) return;

  videoQueue.markProcessing(jobId);
  console.log(`[Worker] Starting job ${jobId} | preset=${job.preset} format=${job.format}`);

  let ffmpegArgs: string[] | null = null;
  let claudeResponse: { editPlan: string; ffmpegCommand: string; description: string } | null = null;

  // 1. Get video duration
  const duration = await getVideoDuration(job.inputPath);
  console.log(`[Worker] Video duration: ${duration.toFixed(2)}s`);

  // 2. Try Claude → FFmpeg command
  try {
    claudeResponse = await generateVideoEdit(job.prompt, job.preset, job.format, duration);

    videoQueue.update(jobId, {
      editPlan: claudeResponse.editPlan,
      description: claudeResponse.description,
      ffmpegCommand: claudeResponse.ffmpegCommand,
    });

    console.log(`[Worker] Claude command: ${claudeResponse.ffmpegCommand}`);

    ffmpegArgs = buildSafeArgs(claudeResponse.ffmpegCommand, job.inputPath, job.outputPath);

    if (!ffmpegArgs) {
      console.warn('[Worker] Claude command failed validation — using fallback');
    }
  } catch (err) {
    console.error('[Worker] Claude error:', err);
  }

  // 3. Fallback if Claude failed or command was invalid
  if (!ffmpegArgs) {
    console.log('[Worker] Using fallback FFmpeg command');
    ffmpegArgs = getFallbackArgs(job.inputPath, job.outputPath, job.format, duration);

    const fallbackCmd = `ffmpeg -y -i "${job.inputPath}" ... "${job.outputPath}"`;
    videoQueue.update(jobId, {
      ffmpegCommand: fallbackCmd,
      editPlan: 'Fallback: fade in/out + text overlay',
      description: 'Processed with stable fallback preset.',
    });
  }

  // 4. Execute FFmpeg (with retry)
  let lastError = '';
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        console.log(`[Worker] Retry attempt ${attempt} for job ${jobId}`);
        // On retry, use fallback args
        ffmpegArgs = getFallbackArgs(job.inputPath, job.outputPath, job.format, duration);
      }

      await runFFmpeg(ffmpegArgs);
      videoQueue.markDone(jobId);
      console.log(`[Worker] Job ${jobId} done`);
      return;
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      console.error(`[Worker] FFmpeg error (attempt ${attempt}): ${lastError}`);
    }
  }

  videoQueue.markFailed(jobId, `FFmpeg failed after ${MAX_RETRIES + 1} attempts: ${lastError}`);
}

export function startWorker(): void {
  videoQueue.on('job:ready', (jobId: string) => {
    processJob(jobId).catch(err => {
      console.error('[Worker] Unhandled error in processJob:', err);
      videoQueue.markFailed(jobId, 'Internal worker error');
    });
  });

  console.log(`[Worker] Started — max concurrency: ${videoQueue.maxConcurrency}`);
}
