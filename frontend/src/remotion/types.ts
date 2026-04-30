export interface ColorScheme {
  bg: string;
  text: string;
  accent: string;
  muted: string;
}

export interface TitleScene {
  type: 'title';
  heading: string;
  subtext?: string;
}

export interface BulletsScene {
  type: 'bullets';
  heading: string;
  bullets: string[];
}

export interface StatScene {
  type: 'stat';
  value: string;
  label: string;
  context?: string;
}

export interface CtaScene {
  type: 'cta';
  heading: string;
  subtext?: string;
}

export interface QuoteScene {
  type: 'quote';
  quote: string;
  attribution?: string;
}

export interface HighlightScene {
  type: 'highlight';
  emoji: string;
  heading: string;
  subtext?: string;
}

export type SceneData = (TitleScene | BulletsScene | StatScene | CtaScene | QuoteScene | HighlightScene) & {
  durationInFrames: number;
};

export interface PromptVideoProps {
  scenes: SceneData[];
  colorScheme: ColorScheme;
  format: '16:9' | '9:16';
}
