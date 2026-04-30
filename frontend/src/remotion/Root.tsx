import { Composition } from 'remotion';
import { PromptVideo, defaultProps } from './PromptVideo';
import { PromptVideoProps } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PromptVideoAny = PromptVideo as React.ComponentType<any>;

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="PromptVideo"
      component={PromptVideoAny}
      durationInFrames={300}
      fps={30}
      width={1920}
      height={1080}
      defaultProps={defaultProps}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      calculateMetadata={async ({ props }: any) => {
        props = props as PromptVideoProps;
        const scenes: PromptVideoProps['scenes'] = props.scenes ?? defaultProps.scenes;
        const totalFrames = scenes.reduce((sum: number, s: { durationInFrames: number }) => sum + s.durationInFrames, 0);
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
