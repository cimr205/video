import { useState } from 'react';

interface Props {
  command: string | null;
  editPlan: string | null;
}

export function FFmpegDisplay({ command, editPlan }: Props) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!command && !editPlan) return null;

  function copy() {
    if (!command) return;
    navigator.clipboard.writeText(command).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ marginTop: '0.75rem', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '0.6rem 0.75rem', background: 'var(--surface2)', color: 'var(--text-dim)',
          borderRadius: 0, fontSize: '0.8rem',
        }}
      >
        <span>🔧 FFmpeg command {open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div style={{ padding: '0.75rem', background: '#0d0d12' }}>
          {editPlan && (
            <div style={{ marginBottom: '0.75rem' }}>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Edit Plan</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{editPlan}</div>
            </div>
          )}

          {command && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Command</span>
                <button
                  onClick={copy}
                  style={{ padding: '0.2rem 0.5rem', background: copied ? 'var(--success)' : 'var(--surface)', color: 'var(--text)', fontSize: '0.7rem', border: '1px solid var(--border)' }}
                >
                  {copied ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <pre
                className="scrollbar"
                style={{
                  fontSize: '0.72rem', color: '#a5f3fc', lineHeight: 1.6,
                  overflowX: 'auto', padding: '0.5rem',
                  background: '#060608', borderRadius: '6px',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                }}
              >
                {command}
              </pre>
            </>
          )}
        </div>
      )}
    </div>
  );
}
