import { Job, getOutputUrl, deleteJob } from '../api';
import { FFmpegDisplay } from './FFmpegDisplay';

interface Props {
  job: Job;
  onDelete: (id: string) => void;
}

const STATUS_COLOR: Record<Job['status'], string> = {
  pending:    'var(--text-dim)',
  processing: 'var(--warning)',
  done:       'var(--success)',
  failed:     'var(--error)',
};

const STATUS_ICON: Record<Job['status'], string> = {
  pending:    '⏳',
  processing: '⚙️',
  done:       '✅',
  failed:     '❌',
};

export function JobCard({ job, onDelete }: Props) {
  const ts = new Date(job.createdAt).toLocaleTimeString();

  async function handleDelete() {
    if (!confirm('Delete this job?')) return;
    await deleteJob(job.id).catch(() => {});
    onDelete(job.id);
  }

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1px solid ${job.status === 'processing' ? 'var(--accent)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '1rem',
        animation: 'fadeIn 0.3s ease',
        position: 'relative',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            style={{
              color: STATUS_COLOR[job.status],
              fontWeight: 700,
              fontSize: '0.85rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
            }}
          >
            {STATUS_ICON[job.status]}{' '}
            {job.status === 'processing' ? (
              <span style={{ animation: 'pulse 1.2s infinite' }}>Processing…</span>
            ) : (
              job.status.charAt(0).toUpperCase() + job.status.slice(1)
            )}
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
            {job.preset} · {job.format} · {ts}
          </span>
        </div>

        <button
          onClick={handleDelete}
          disabled={job.status === 'processing'}
          style={{ padding: '0.2rem 0.5rem', background: 'transparent', color: 'var(--text-dim)', border: '1px solid var(--border)', fontSize: '0.75rem' }}
        >
          Delete
        </button>
      </div>

      {/* Prompt */}
      <div
        style={{
          fontSize: '0.875rem', color: 'var(--text)', lineHeight: 1.5,
          padding: '0.5rem 0.75rem', background: 'var(--surface2)',
          borderRadius: '6px', marginBottom: '0.5rem',
        }}
      >
        "{job.prompt}"
      </div>

      {/* Description */}
      {job.description && (
        <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', marginBottom: '0.5rem' }}>
          {job.description}
        </div>
      )}

      {/* Error */}
      {job.error && (
        <div
          style={{
            fontSize: '0.78rem', color: 'var(--error)', padding: '0.4rem 0.75rem',
            background: '#1f0a0a', borderRadius: '6px', marginBottom: '0.5rem',
            border: '1px solid #3f1010',
          }}
        >
          {job.error}
        </div>
      )}

      {/* FFmpeg details */}
      <FFmpegDisplay command={job.ffmpegCommand} editPlan={job.editPlan} />

      {/* Download */}
      {job.status === 'done' && (
        <a
          href={getOutputUrl(job.id)}
          download={`output-${job.id}.mp4`}
          style={{
            display: 'inline-block', marginTop: '0.75rem',
            padding: '0.5rem 1.25rem', background: 'var(--success)',
            color: '#fff', borderRadius: 'var(--radius)',
            fontSize: '0.875rem', fontWeight: 600, textDecoration: 'none',
          }}
        >
          ⬇ Download Video
        </a>
      )}
    </div>
  );
}
