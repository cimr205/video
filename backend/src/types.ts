export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';
export type Preset = 'saas-demo' | 'tiktok' | 'ad-style' | 'custom';
export type VideoFormat = '16:9' | '9:16';

export interface Job {
  id: string;
  status: JobStatus;
  prompt: string;
  preset: Preset;
  format: VideoFormat;
  inputPath: string;
  outputPath: string;
  ffmpegCommand: string | null;
  editPlan: string | null;
  description: string | null;
  error: string | null;
  retries: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateJobBody {
  prompt: string;
  preset: Preset;
  format: VideoFormat;
}

export interface ClaudeVideoResponse {
  editPlan: string;
  ffmpegCommand: string;
  description: string;
}
