import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { StatScene as StatSceneProps, ColorScheme } from '../types';

export const StatScene: React.FC<StatSceneProps & { colorScheme: ColorScheme; durationInFrames: number }> = ({
  value, label, context, colorScheme, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const progress = spring({ fps, frame, config: { damping: 180, stiffness: 60 } });
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(progress, fadeOut);
  const scale = interpolate(progress, [0, 1], [0.7, 1]);

  const valueSize = Math.floor(width * 0.14);
  const labelSize = Math.floor(width * 0.035);
  const contextSize = Math.floor(width * 0.024);

  return (
    <AbsoluteFill style={{ background: colorScheme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10%' }}>
      <div style={{ opacity, transform: `scale(${scale})`, textAlign: 'center' }}>
        <div style={{ fontSize: valueSize, fontWeight: 900, color: colorScheme.accent, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1, letterSpacing: '-0.04em' }}>
          {value}
        </div>
        <div style={{ fontSize: labelSize, color: colorScheme.text, fontWeight: 700, marginTop: '0.5rem', fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.01em' }}>
          {label}
        </div>
        {context && (
          <div style={{ fontSize: contextSize, color: colorScheme.muted, marginTop: '1rem', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {context}
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
