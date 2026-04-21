import { useRef, useState, DragEvent, ChangeEvent } from 'react';

interface Props {
  file: File | null;
  onChange: (file: File | null) => void;
}

export function VideoUpload({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    setDrag(false);
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith('video/')) onChange(f);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (f) onChange(f);
  }

  return (
    <div
      style={{
        border: `2px dashed ${drag ? 'var(--accent)' : file ? 'var(--success)' : 'var(--border)'}`,
        borderRadius: 'var(--radius)',
        padding: '2rem',
        textAlign: 'center',
        cursor: 'pointer',
        background: drag ? '#1a1a2e' : 'var(--surface2)',
        transition: 'all 0.2s',
      }}
      onClick={() => inputRef.current?.click()}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={handleDrop}
    >
      <input ref={inputRef} type="file" accept="video/*" style={{ display: 'none' }} onChange={handleChange} />

      {file ? (
        <div>
          <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🎬</div>
          <div style={{ color: 'var(--success)', fontWeight: 600 }}>{file.name}</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem', marginTop: '0.25rem' }}>
            {(file.size / 1024 / 1024).toFixed(1)} MB — click to change
          </div>
        </div>
      ) : (
        <div>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📁</div>
          <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>Drop video here or click to browse</div>
          <div style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>MP4, MOV, AVI, MKV · up to 500 MB</div>
        </div>
      )}
    </div>
  );
}
