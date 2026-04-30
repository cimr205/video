import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { HighlightScene as HighlightSceneProps, ColorScheme } from '../types';

export const HighlightScene: React.FC<HighlightSceneProps & { colorScheme: ColorScheme; durationInFrames: number }> = ({
  emoji, heading, subtext, colorScheme, durationInFrames,
}) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();

  const fadeOut = interpolate(frame, [durationInFrames - 15, durationInFrames], [1, 0], {
    extrapolateLeft: 'clamp', extrapolateRight: 'clamp',
  });

  const emojiProgress = spring({ fps, frame, config: { damping: 150, stiffness: 60 } });
  const emojiScale = interpolate(emojiProgress, [0, 1], [0.4, 1]);
  const emojiOpacity = Math.min(emojiProgress, fadeOut);

  const textProgress = spring({ fps, frame: Math.max(0, frame - 12), config: { damping: 200 } });
  const textOpacity = Math.min(textProgress, fadeOut);
  const textY = interpolate(textProgress, [0, 1], [30, 0]);

  const subProgress = spring({ fps, frame: Math.max(0, frame - 20), config: { damping: 200 } });
  const subOpacity = Math.min(subProgress, fadeOut);

  const emojiSize = Math.floor(width * 0.12);
  const headingSize = Math.floor(width * 0.055);
  const subtextSize = Math.floor(width * 0.026);

  // Gentle float animation for the emoji
  const floatY = Math.sin(frame * 0.05) * 8;

  return (
    <AbsoluteFill style={{ background: colorScheme.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10%' }}>
      <div style={{ opacity: emojiOpacity, transform: `scale(${emojiScale}) translateY(${floatY}px)`, fontSize: emojiSize, lineHeight: 1, marginBottom: '1.5rem', textAlign: 'center' }}>
        {emoji}
      </div>
      <div style={{ opacity: textOpacity, transform: `translateY(${textY}px)`, textAlign: 'center' }}>
        <h2 style={{
          fontSize: headingSize,
          fontWeight: 900,
          color: colorScheme.text,
          margin: 0,
          lineHeight: 1.1,
          letterSpacing: '-0.03em',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {heading}
        </h2>
      </div>
      {subtext && (
        <p style={{
          fontSize: subtextSize,
          color: colorScheme.muted,
          textAlign: 'center',
          marginTop: '1.25rem',
          opacity: subOpacity,
          fontWeight: 400,
          maxWidth: '65%',
          lineHeight: 1.5,
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}>
          {subtext}
        </p>
      )}
    </AbsoluteFill>
  );
};
