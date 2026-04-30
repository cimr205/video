export type JobStatus = 'pending' | 'processing' | 'done' | 'failed';
export type Preset = 'saas-demo' | 'tiktok' | 'ad-style' | 'custom';
export type VideoFormat = '16:9' | '9:16';

export interface Job {
  id: string;
  status: JobStatus;
  prompt: string;
  preset: Preset;
  format: VideoFormat;
  ffmpegCommand: string | null;
  editPlan: string | null;
  description: string | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

const BASE = '/api';

export async function createJob(
  file: File,
  prompt: string,
  preset: Preset,
  format: VideoFormat
): Promise<Job> {
  const body = new FormData();
  body.append('video', file);
  body.append('prompt', prompt);
  body.append('preset', preset);
  body.append('format', format);

  const res = await fetch(`${BASE}/jobs`, { method: 'POST', body });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(err.error ?? 'Upload failed');
  }
  return res.json();
}

export async function getJob(id: string): Promise<Job> {
  const res = await fetch(`${BASE}/jobs/${id}`);
  if (!res.ok) throw new Error('Job not found');
  return res.json();
}

export async function listJobs(): Promise<{ jobs: Job[] }> {
  const res = await fetch(`${BASE}/jobs`);
  if (!res.ok) throw new Error('Failed to load jobs');
  return res.json();
}

export async function deleteJob(id: string): Promise<void> {
  await fetch(`${BASE}/jobs/${id}`, { method: 'DELETE' });
}

export function getOutputUrl(id: string): string {
  return `${BASE}/jobs/${id}/output`;
}

export interface RemotionJob {
  id: string;
  status: 'pending' | 'processing' | 'done' | 'failed';
  prompt: string;
  format: '16:9' | '9:16';
  progress: number;
  error: string | null;
  props: object | null;
  createdAt: string;
}

export async function createRemotionJob(prompt: string, format: '16:9' | '9:16'): Promise<RemotionJob> {
  const res = await fetch(`${BASE}/remotion`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, format }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getRemotionJob(id: string): Promise<RemotionJob> {
  const res = await fetch(`${BASE}/remotion/${id}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function listRemotionJobs(): Promise<{ jobs: RemotionJob[] }> {
  const res = await fetch(`${BASE}/remotion`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export function getRemotionOutputUrl(id: string): string {
  return `${BASE}/remotion/${id}/output`;
}
