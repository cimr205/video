import { Composition } from 'remotion';
import { PromptVideo, defaultProps } from './PromptVideo';
import { PromptVideoProps } from './types';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PromptVideo"
      component={PromptVideo}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
      calculateMetadata={async ({ props }: { props: PromptVideoProps }) => {
        const totalFrames = (props.scenes ?? defaultProps.scenes).reduce((sum, s) => sum + s.durationInFrames, 0);
        const isVertical = props.format === '9:16';
        return {
          durationInFrames: Math.max(totalFrames, 1),
          fps: 30,
          width: isVertical ? 1080 : 1920,
          height: isVertical ? 1920 : 1080,
        };
      }}
    />
  );
};
