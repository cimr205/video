import { EventEmitter } from 'events';
import { Job, JobStatus } from './types';

class VideoQueue extends EventEmitter {
  private jobs = new Map<string, Job>();
  private pending: string[] = [];
  private processing = new Set<string>();
  readonly maxConcurrency: number;

  constructor(maxConcurrency = 3) {
    super();
    this.maxConcurrency = maxConcurrency;
  }

  add(job: Job): void {
    this.jobs.set(job.id, job);
    this.pending.push(job.id);
    this.scheduleNext();
  }

  get(id: string): Job | undefined {
    return this.jobs.get(id);
  }

  list(): Job[] {
    return Array.from(this.jobs.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  update(id: string, updates: Partial<Job>): Job | null {
    const job = this.jobs.get(id);
    if (!job) return null;
    const updated = { ...job, ...updates, updatedAt: new Date().toISOString() };
    this.jobs.set(id, updated);
    return updated;
  }

  setStatus(id: string, status: JobStatus, error?: string): void {
    this.update(id, { status, error: error ?? null });
  }

  remove(id: string): boolean {
    if (this.processing.has(id)) return false;
    this.pending = this.pending.filter(pid => pid !== id);
    return this.jobs.delete(id);
  }

  markProcessing(id: string): void {
    this.processing.add(id);
    this.update(id, { status: 'processing' });
  }

  markDone(id: string): void {
    this.processing.delete(id);
    this.update(id, { status: 'done', error: null });
    this.scheduleNext();
  }

  markFailed(id: string, error: string): void {
    this.processing.delete(id);
    this.update(id, { status: 'failed', error });
    this.scheduleNext();
  }

  get stats() {
    const all = this.list();
    return {
      total: all.length,
      pending: all.filter(j => j.status === 'pending').length,
      processing: all.filter(j => j.status === 'processing').length,
      done: all.filter(j => j.status === 'done').length,
      failed: all.filter(j => j.status === 'failed').length,
    };
  }

  private scheduleNext(): void {
    if (this.processing.size >= this.maxConcurrency) return;

    const nextId = this.pending.find(
      id => !this.processing.has(id) && this.jobs.get(id)?.status === 'pending'
    );

    if (nextId) {
      this.emit('job:ready', nextId);
    }
  }
}

export const videoQueue = new VideoQueue(
  parseInt(process.env.MAX_WORKERS ?? '3', 10)
);
