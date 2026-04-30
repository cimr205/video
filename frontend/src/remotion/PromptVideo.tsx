import { Series } from 'remotion';
import { PromptVideoProps } from './types';
import { TitleScene } from './scenes/TitleScene';
import { BulletsScene } from './scenes/BulletsScene';
import { StatScene } from './scenes/StatScene';
import { CtaScene } from './scenes/CtaScene';

export const PromptVideo: React.FC<PromptVideoProps> = ({ scenes, colorScheme }) => {
  return (
    <Series>
      {scenes.map((scene, i) => (
        <Series.Sequence key={i} durationInFrames={scene.durationInFrames}>
          {scene.type === 'title' && <TitleScene {...scene} colorScheme={colorScheme} />}
          {scene.type === 'bullets' && <BulletsScene {...scene} colorScheme={colorScheme} />}
          {scene.type === 'stat' && <StatScene {...scene} colorScheme={colorScheme} />}
          {scene.type === 'cta' && <CtaScene {...scene} colorScheme={colorScheme} />}
        </Series.Sequence>
      ))}
    </Series>
  );
};

export const defaultProps: PromptVideoProps = {
  scenes: [
    { type: 'title', heading: 'Your Video Title', subtext: 'A compelling subtitle goes here', durationInFrames: 90 },
    { type: 'bullets', heading: 'Key Points', bullets: ['Point one', 'Point two', 'Point three'], durationInFrames: 120 },
    { type: 'cta', heading: 'Get Started Today', subtext: 'Visit our website to learn more', durationInFrames: 90 },
  ],
  colorScheme: { bg: '#0a0a0a', text: '#ffffff', accent: '#6366f1', muted: '#a1a1aa' },
  format: '16:9',
};
