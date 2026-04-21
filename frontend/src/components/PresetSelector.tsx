import { Preset, VideoFormat } from '../api';

const PRESETS: { id: Preset; label: string; icon: string; desc: string }[] = [
  { id: 'custom',    label: 'Custom',    icon: '✏️', desc: 'Follow prompt exactly' },
  { id: 'saas-demo', label: 'SaaS Demo', icon: '💻', desc: 'Zoom + highlight + text' },
  { id: 'tiktok',    label: 'TikTok',    icon: '📱', desc: '9:16 + big captions' },
  { id: 'ad-style',  label: 'Ad Style',  icon: '📣', desc: 'Hook + text + dynamic zoom' },
];

interface Props {
  preset: Preset;
  format: VideoFormat;
  onPreset: (p: Preset) => void;
  onFormat: (f: VideoFormat) => void;
}

export function PresetSelector({ preset, format, onPreset, onFormat }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Preset
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
          {PRESETS.map(p => (
            <button
              key={p.id}
              onClick={() => onPreset(p.id)}
              style={{
                padding: '0.6rem 0.75rem',
                background: preset === p.id ? 'var(--accent)' : 'var(--surface2)',
                color: 'var(--text)',
                border: `1px solid ${preset === p.id ? 'var(--accent)' : 'var(--border)'}`,
                textAlign: 'left',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.1rem',
              }}
            >
              <span style={{ fontSize: '0.9rem' }}>{p.icon} {p.label}</span>
              <span style={{ fontSize: '0.7rem', color: preset === p.id ? '#c7d2fe' : 'var(--text-dim)' }}>{p.desc}</span>
            </button>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.5rem' }}>
          Format
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['16:9', '9:16'] as VideoFormat[]).map(f => (
            <button
              key={f}
              onClick={() => onFormat(f)}
              style={{
                flex: 1,
                padding: '0.5rem',
                background: format === f ? 'var(--accent)' : 'var(--surface2)',
                color: 'var(--text)',
                border: `1px solid ${format === f ? 'var(--accent)' : 'var(--border)'}`,
                fontWeight: format === f ? 600 : 400,
              }}
            >
              {f === '16:9' ? '⬛ 16:9 Landscape' : '📱 9:16 Vertical'}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
