import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { QuoteScene as QuoteSceneProps, ColorScheme } from '../types';

export const QuoteScene: React.FC<QuoteSceneProps & { colorScheme: ColorScheme; durationInFrames: number }> = ({
  quote, attribution, colorScheme, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const progress = spring({ fps, frame, config: { damping: 200, stiffness: 60 } });
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });
  const opacity = Math.min(progress, fadeOut);
  const scale = interpolate(progress, [0, 1], [0.96, 1]);

  const attrProgress = spring({ fps, frame: Math.max(0, frame - 18), config: { damping: 200 } });
  const attrOpacity = Math.min(attrProgress, fadeOut);

  const lineProgress = spring({ fps, frame: Math.max(0, frame - 6), config: { damping: 200, stiffness: 80 } });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, width * 0.12]);

  const quoteSize = Math.floor(width * 0.042);
  const attrSize = Math.floor(width * 0.022);
  const markSize = Math.floor(width * 0.11);

  return (
    <AbsoluteFill style={{ background: colorScheme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10% 16%' }}>
      <div style={{ width: lineWidth, height: 3, background: colorScheme.accent, marginBottom: '2.5rem', borderRadius: 2 }} />
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center' }}>
        <div style={{ fontSize: markSize, color: colorScheme.accent, lineHeight: 0.7, marginBottom: '1rem', opacity: 0.5, fontFamily: 'Georgia, serif' }}>
          "
        </div>
        <p style={{
          fontSize: quoteSize,
          color: colorScheme.text,
          fontFamily: 'Georgia, "Times New Roman", serif',
          fontStyle: 'italic',
          lineHeight: 1.65,
          margin: 0,
          fontWeight: 400,
        }}>
          {quote}
        </p>
      </div>
      {attribution && (
        <div style={{ opacity: attrOpacity, marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ width: 32, height: 2, background: colorScheme.accent, borderRadius: 1 }} />
          <span style={{ fontSize: attrSize, color: colorScheme.muted, fontFamily: 'system-ui, -apple-system, sans-serif', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {attribution}
          </span>
        </div>
      )}
    </AbsoluteFill>
  );
};
