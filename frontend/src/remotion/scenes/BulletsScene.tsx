import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BulletsScene as BulletsSceneProps, ColorScheme } from '../types';

export const BulletsScene: React.FC<BulletsSceneProps & { colorScheme: ColorScheme; durationInFrames: number }> = ({
  heading, bullets, colorScheme, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const headingProgress = Math.min(spring({ fps, frame, config: { damping: 200 } }), fadeOut);
  const headingY = interpolate(headingProgress, [0, 1], [30, 0]);

  const headingSize = Math.floor(width * 0.05);
  const bulletSize = Math.floor(width * 0.028);
  const framesPerBullet = 12;

  return (
    <AbsoluteFill style={{ background: colorScheme.bg, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '8% 12%' }}>
      <h2 style={{ fontSize: headingSize, fontWeight: 800, color: colorScheme.text, margin: '0 0 48px', opacity: headingProgress, transform: `translateY(${headingY}px)`, fontFamily: 'system-ui, -apple-system, sans-serif', letterSpacing: '-0.02em' }}>
        {heading}
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
        {bullets.map((bullet, i) => {
          const bulletFrame = Math.max(0, frame - (i * framesPerBullet));
          const bulletProgress = Math.min(spring({ fps, frame: bulletFrame, config: { damping: 200 } }), fadeOut);
          const bulletX = interpolate(bulletProgress, [0, 1], [-40, 0]);
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 20, opacity: bulletProgress, transform: `translateX(${bulletX}px)` }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: colorScheme.accent, flexShrink: 0, marginTop: bulletSize * 0.35 }} />
              <span style={{ fontSize: bulletSize, color: colorScheme.text, fontFamily: 'system-ui, -apple-system, sans-serif', lineHeight: 1.4, fontWeight: 500 }}>
                {bullet}
              </span>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
