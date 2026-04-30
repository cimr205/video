import { useState, useEffect, useRef, FormEvent } from 'react';
import { Player } from '@remotion/player';
import { Job, Preset, VideoFormat, createJob, listJobs, getJob, RemotionJob, createRemotionJob, listRemotionJobs, getRemotionJob, getRemotionOutputUrl } from './api';
import { VideoUpload } from './components/VideoUpload';
import { PresetSelector } from './components/PresetSelector';
import { JobCard } from './components/JobCard';
import { PromptVideo as PromptVideoComponent } from './remotion/PromptVideo';
import type { PromptVideoProps } from './remotion/types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PromptVideoPlayer = PromptVideoComponent as React.ComponentType<any>;

const POLL_INTERVAL = 2500;

export default function App() {
  const [tab, setTab] = useState<'edit' | 'create'>('edit');

  // Edit video state
  const [file, setFile]       = useState<File | null>(null);
  const [prompt, setPrompt]   = useState('');
  const [preset, setPreset]   = useState<Preset>('custom');
  const [format, setFormat]   = useState<VideoFormat>('16:9');
  const [jobs, setJobs]       = useState<Job[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Create video state
  const [createPrompt, setCreatePrompt] = useState('');
  const [createFormat, setCreateFormat] = useState<'16:9' | '9:16'>('16:9');
  const [remotionJobs, setRemotionJobs] = useState<RemotionJob[]>([]);
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');
  const remotionPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Initial load
  useEffect(() => {
    listJobs().then(d => setJobs(d.jobs)).catch(() => {});
    listRemotionJobs().then(d => setRemotionJobs(d.jobs)).catch(() => {});
  }, []);

  // Poll active edit jobs
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

  // Poll active remotion jobs
  useEffect(() => {
    if (remotionPollRef.current) clearInterval(remotionPollRef.current);

    remotionPollRef.current = setInterval(async () => {
      const active = remotionJobs.filter(j => j.status === 'pending' || j.status === 'processing');
      if (active.length === 0) return;

      const updated = await Promise.all(active.map(j => getRemotionJob(j.id).catch(() => j)));
      setRemotionJobs(prev =>
        prev.map(j => updated.find(u => u.id === j.id) ?? j)
      );
    }, POLL_INTERVAL);

    return () => { if (remotionPollRef.current) clearInterval(remotionPollRef.current); };
  }, [remotionJobs]);

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

  async function handleCreateSubmit(e: FormEvent) {
    e.preventDefault();
    if (!createPrompt.trim() || createSubmitting) return;

    setCreateError('');
    setCreateSubmitting(true);

    try {
      const job = await createRemotionJob(createPrompt, createFormat);
      setRemotionJobs(prev => [job, ...prev]);
      setCreatePrompt('');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create job');
    } finally {
      setCreateSubmitting(false);
    }
  }

  function handleDelete(id: string) {
    setJobs(prev => prev.filter(j => j.id !== id));
  }

  const activeCount = jobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
  const doneCount   = jobs.filter(j => j.status === 'done').length;
  const activeCreateCount = remotionJobs.filter(j => j.status === 'pending' || j.status === 'processing').length;
  const doneCreateCount   = remotionJobs.filter(j => j.status === 'done').length;

  const STATUS_COLOR: Record<RemotionJob['status'], string> = {
    pending:    'var(--text-dim)',
    processing: 'var(--warning)',
    done:       'var(--success)',
    failed:     'var(--error)',
  };

  const STATUS_ICON: Record<RemotionJob['status'], string> = {
    pending:    '⏳',
    processing: '⚙️',
    done:       '✅',
    failed:     '❌',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '2rem 1rem' }}>

      {/* Header */}
      <div style={{ width: '100%', maxWidth: '700px', marginBottom: '1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
          Prompt <span style={{ color: 'var(--accent)' }}>→</span> Video
        </h1>
        <p style={{ color: 'var(--text-dim)', fontSize: '0.95rem' }}>
          Edit existing videos or create new ones from scratch with AI.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ width: '100%', maxWidth: '700px', display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        <button
          onClick={() => setTab('edit')}
          style={{
            flex: 1, padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.9rem',
            background: tab === 'edit' ? 'var(--accent)' : 'var(--surface)',
            color: tab === 'edit' ? '#fff' : 'var(--text-dim)',
            border: `1px solid ${tab === 'edit' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', cursor: 'pointer',
          }}
        >
          Edit Video
        </button>
        <button
          onClick={() => setTab('create')}
          style={{
            flex: 1, padding: '0.6rem 1rem', fontWeight: 700, fontSize: '0.9rem',
            background: tab === 'create' ? 'var(--accent)' : 'var(--surface)',
            color: tab === 'create' ? '#fff' : 'var(--text-dim)',
            border: `1px solid ${tab === 'create' ? 'var(--accent)' : 'var(--border)'}`,
            borderRadius: 'var(--radius)', cursor: 'pointer',
          }}
        >
          Create Video
        </button>
      </div>

      {/* Edit Video Tab */}
      {tab === 'edit' && (
        <>
          {jobs.length > 0 && (
            <div style={{ width: '100%', maxWidth: '700px', display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
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
        </>
      )}

      {/* Create Video Tab */}
      {tab === 'create' && (
        <>
          {remotionJobs.length > 0 && (
            <div style={{ width: '100%', maxWidth: '700px', display: 'flex', gap: '1rem', justifyContent: 'center', marginBottom: '0.75rem' }}>
              {activeCreateCount > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--warning)', animation: 'pulse 1.2s infinite' }}>
                  ⚙ {activeCreateCount} processing
                </span>
              )}
              {doneCreateCount > 0 && (
                <span style={{ fontSize: '0.8rem', color: 'var(--success)' }}>
                  ✓ {doneCreateCount} done
                </span>
              )}
            </div>
          )}

          <form onSubmit={handleCreateSubmit} style={{ width: '100%', maxWidth: '700px', marginBottom: '2.5rem' }}>
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
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Video Prompt
                </label>
                <textarea
                  value={createPrompt}
                  onChange={e => setCreatePrompt(e.target.value)}
                  placeholder="Describe the video you want to create… e.g. 'A compelling product launch video for an AI startup with key features and a strong call to action'"
                  rows={4}
                  style={{
                    width: '100%', padding: '0.75rem', resize: 'vertical',
                    fontSize: '0.9rem', lineHeight: 1.5,
                  }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.4rem' }}>
                  Format
                </label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  {(['16:9', '9:16'] as const).map(f => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setCreateFormat(f)}
                      style={{
                        padding: '0.4rem 1rem', fontWeight: 600, fontSize: '0.85rem',
                        background: createFormat === f ? 'var(--accent)' : 'var(--surface2)',
                        color: createFormat === f ? '#fff' : 'var(--text-dim)',
                        border: `1px solid ${createFormat === f ? 'var(--accent)' : 'var(--border)'}`,
                        borderRadius: '6px', cursor: 'pointer',
                      }}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {createError && (
                <div style={{ color: 'var(--error)', fontSize: '0.85rem', padding: '0.5rem 0.75rem', background: '#1f0a0a', borderRadius: '6px', border: '1px solid #3f1010' }}>
                  {createError}
                </div>
              )}

              <button
                type="submit"
                disabled={!createPrompt.trim() || createSubmitting}
                style={{
                  padding: '0.75rem',
                  background: createSubmitting ? 'var(--surface2)' : 'var(--accent)',
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
                {createSubmitting ? (
                  <>
                    <span style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid #555', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                    Creating…
                  </>
                ) : (
                  '▶ Generate Video'
                )}
              </button>
            </div>
          </form>

          {remotionJobs.length > 0 && (
            <div style={{ width: '100%', maxWidth: '700px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-dim)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Jobs ({remotionJobs.length})
              </h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {remotionJobs.map(job => (
                  <div
                    key={job.id}
                    style={{
                      background: 'var(--surface)',
                      border: `1px solid ${job.status === 'processing' ? 'var(--accent)' : 'var(--border)'}`,
                      borderRadius: 'var(--radius)',
                      padding: '1rem',
                      animation: 'fadeIn 0.3s ease',
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
                            <span style={{ animation: 'pulse 1.2s infinite' }}>Processing… {job.progress > 0 ? `${job.progress}%` : ''}</span>
                          ) : (
                            job.status.charAt(0).toUpperCase() + job.status.slice(1)
                          )}
                        </span>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                          {job.format} · {new Date(job.createdAt).toLocaleTimeString()}
                        </span>
                      </div>
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

                    {/* Progress bar */}
                    {job.status === 'processing' && (
                      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 2, marginBottom: '0.5rem', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            width: `${job.progress}%`,
                            background: 'var(--accent)',
                            borderRadius: 2,
                            transition: 'width 0.3s ease',
                          }}
                        />
                      </div>
                    )}

                    {/* Live preview */}
                    {job.props && (() => {
                      const props = job.props as PromptVideoProps;
                      const totalFrames = props.scenes?.reduce((s, sc) => s + sc.durationInFrames, 0) ?? 300;
                      const isVertical = props.format === '9:16';
                      return (
                        <div style={{ marginTop: '0.75rem', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
                          <Player
                            component={PromptVideoPlayer}
                            inputProps={props}
                            durationInFrames={Math.max(totalFrames, 1)}
                            compositionWidth={isVertical ? 1080 : 1920}
                            compositionHeight={isVertical ? 1920 : 1080}
                            fps={30}
                            style={{ width: '100%', display: 'block' }}
                            controls
                            loop
                          />
                        </div>
                      );
                    })()}

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

                    {/* Download */}
                    {job.status === 'done' && (
                      <a
                        href={getRemotionOutputUrl(job.id)}
                        download={`video-${job.id}.mp4`}
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
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
