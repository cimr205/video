import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { TitleScene as TitleSceneProps, ColorScheme } from '../types';

export const TitleScene: React.FC<TitleSceneProps & { colorScheme: ColorScheme; durationInFrames: number }> = ({
  heading, subtext, colorScheme, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const progress = spring({ fps, frame, config: { damping: 200, stiffness: 80 } });
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(progress, fadeOut);
  const translateY = interpolate(progress, [0, 1], [40, 0]);

  const subProgress = spring({ fps, frame: Math.max(0, frame - 8), config: { damping: 200 } });
  const subOpacity = Math.min(subProgress, fadeOut);

  const accentWidth = interpolate(spring({ fps, frame: Math.max(0, frame - 5), config: { damping: 200 } }), [0, 1], [0, 120]);

  const headingSize = Math.floor(width * 0.075);
  const subtextSize = Math.floor(width * 0.028);

  return (
    <AbsoluteFill style={{ background: colorScheme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10%' }}>
      <div style={{ opacity, transform: `translateY(${translateY}px)`, textAlign: 'center' }}>
        <h1 style={{ fontSize: headingSize, fontWeight: 900, color: colorScheme.text, margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {heading}
        </h1>
        <div style={{ width: accentWidth, height: 6, background: colorScheme.accent, margin: '24px auto 0', borderRadius: 3 }} />
      </div>
      {subtext && (
        <p style={{ fontSize: subtextSize, color: colorScheme.muted, textAlign: 'center', marginTop: '2rem', opacity: subOpacity, fontWeight: 400, maxWidth: '70%', lineHeight: 1.5, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {subtext}
        </p>
      )}
    </AbsoluteFill>
  );
};
