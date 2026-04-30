import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { CtaScene as CtaSceneProps, ColorScheme } from '../types';

export const CtaScene: React.FC<CtaSceneProps & { colorScheme: ColorScheme; durationInFrames: number }> = ({
  heading, subtext, colorScheme, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const progress = spring({ fps, frame, config: { damping: 200, stiffness: 80 } });
  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const opacity = Math.min(progress, fadeOut);
  const translateY = interpolate(progress, [0, 1], [50, 0]);

  const subProgress = spring({ fps, frame: Math.max(0, frame - 10), config: { damping: 200 } });
  const subOpacity = Math.min(subProgress, fadeOut);

  const pulseScale = 1 + 0.03 * Math.sin(frame * 0.1);

  const headingSize = Math.floor(width * 0.065);
  const subtextSize = Math.floor(width * 0.027);
  const bgCircleSize = Math.min(width, height) * 1.2;

  return (
    <AbsoluteFill style={{ background: colorScheme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10%', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute',
        width: bgCircleSize,
        height: bgCircleSize,
        borderRadius: '50%',
        background: colorScheme.accent,
        opacity: 0.07,
        transform: `scale(${pulseScale})`,
      }} />
      <div style={{ position: 'relative', opacity, transform: `translateY(${translateY}px)`, textAlign: 'center' }}>
        <h1 style={{ fontSize: headingSize, fontWeight: 900, color: colorScheme.text, margin: 0, lineHeight: 1.1, letterSpacing: '-0.03em', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {heading}
        </h1>
      </div>
      {subtext && (
        <p style={{ fontSize: subtextSize, color: colorScheme.muted, textAlign: 'center', marginTop: '1.5rem', opacity: subOpacity, fontWeight: 400, maxWidth: '65%', lineHeight: 1.5, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
          {subtext}
        </p>
      )}
    </AbsoluteFill>
  );
};
