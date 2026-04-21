import { useState, useEffect, useRef, FormEvent } from 'react';
import { Job, Preset, VideoFormat, createJob, listJobs, getJob } from './api';
import { VideoUpload } from './components/VideoUpload';
import { PresetSelector } from './components/PresetSelector';
import { JobCard } from './components/JobCard';

const POLL_INTERVAL = 2500;

export default function App() {
  const [file, setFile]       = useState<File | null>(null);
  const [prompt, setPrompt]   = useState('');
  const [preset, setPreset]   = useState<Preset>('custom');
  const [format, setFormat]   = useState<VideoFormat>('16:9');
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial load
  useEffect(() => {
    listJobs().then(d => setJobs(d.jobs)).catch(() => {});
  }, []);

  // Poll active jobs
  useEffect(() => {
    if (pollRef.current) clearInterval(pollRef.current);

    pollRef.current = setInterval(async () => {
      const active = jobs.filter(j => j.status === 'pending' || j.status === 'processing');
      if (active.length === 0) return;

      const updated = await Promise.all(active.map(j => getJob(j.id).catch(() => j)));
      setJobs(prev =>
        prev.map(j => updated.find(u => u.id === j.id) ?? j)
      );
    }, POLL_INTERVAL);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [jobs]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!file || !prompt.trim() || submitting) return;

    setSubmitError('');
    setSubmitting(true);

    try {
      const job = await createJob(file, prompt, preset, format);
      setJobs(prev => [job, ...prev]);
      setPrompt('');
      setFile(null);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setSubmitting(false);
    }
  }

  function handleDelete(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  const activeCount = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
  const doneCount   = jobs.filter(j => j.status === 'done').length;

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '700px', marginBottom: '2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
          Prompt <span style={{ color: 'var(--accent)' }}>→</span> Video
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
          Upload a video, write a prompt — get a professional edit automatically.
        </p>

        {jobs.length > 0 && (
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center', marginTop: '0.75rem' }}>
            {activeCount > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--warning)', animation: 'pulse 1.2s infinite' }}>
                ⚙ {activeCount} processing
              </span>
            )}
            {doneCount > 0 && (
              <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                ✓ {doneCount} done
              </span>
            )}
          </div>
        )}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '700px', marginBottom: '2.5rem' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            padding: '1.5rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem',
          }}
        >
          <VideoUpload file={file} onChange={setFile} />

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
              Prompt
            </label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the edit you want… e.g. 'Smooth zoom in on the dashboard, add text overlay saying AI Agency Denmark, fade in/out'"
              rows={3}
              style={{
                width: '100%', padding: '0.75rem', resize: 'vertical',
                fontSize: '0.9rem', lineHeight: 1.5,
              }}
            />
          </div>

          <PresetSelector preset={preset} format={format} onPreset={setPreset} onFormat={setFormat} />

          {submitError && (
            <div style={{ color: 'var(--error)', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: '#1f0a0a', borderRadius: '6px', border: '1px solid #3f1010' }}>
              {submitError}
            </div>
          )}

          <button
            type="submit"
            disabled={!file || !prompt.trim() || submitting}
            style={{
              padding: '0.75rem',
              background: submitting ? 'var(--surface2)' : 'var(--accent)',
              color: '#fff',
              fontSize: '1rem',
              fontWeight: 700,
              letterSpacing: '-0.01em',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
            }}
          >
            {submitting ? (
              <>
                <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #555', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Uploading…
              </>
            ) : (
              '▶ Generate Video'
            )}
          </button>
        </div>
      </form>

      {/* Job list */}
      {jobs.length > 0 && (
        <div style={{ width: '100%', maxWidth: '700px' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Jobs ({jobs.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {jobs.map(job => (
              <JobCard key={job.id} job={job} onDelete={handleDelete} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
