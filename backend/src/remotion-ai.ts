import Anthropic from '@anthropic-ai/sdk';

// Inlined from frontend/src/remotion/types.ts (cross-package import not supported by backend tsconfig)
interface ColorScheme {
  bg: string;
  text: string;
  accent: string;
  muted: string;
}

interface TitleScene {
  type: 'title';
  heading: string;
  subtext?: string;
}

interface BulletsScene {
  type: 'bullets';
  heading: string;
  bullets: string[];
}

interface StatScene {
  type: 'stat';
  value: string;
  label: string;
  context?: string;
}

interface CtaScene {
  type: 'cta';
  heading: string;
  subtext?: string;
}

type SceneData = (TitleScene | BulletsScene | StatScene | CtaScene) & {
  durationInFrames: number;
};

export interface PromptVideoProps {
  scenes: SceneData[];
  colorScheme: ColorScheme;
  format: '16:9' | '9:16';
}

const SYSTEM_PROMPT = `You are a professional video director and motion designer. Given a prompt, generate a JSON object for a Remotion video composition.

SCENE TYPES:
- "title": {type, heading, subtext?, durationInFrames}
- "bullets": {type, heading, bullets: string[], durationInFrames}
- "stat": {type, value, label, context?, durationInFrames}
- "cta": {type, heading, subtext?, durationInFrames}

DURATION GUIDELINES (at 30fps):
- title: 90-120 frames (3-4s)
- bullets: 120-180 frames (4-6s, more bullets = more frames)
- stat: 90-120 frames
- cta: 90-120 frames

COLOR SCHEMES (pick one that fits the mood):
- Dark tech: {bg: "#0a0a0a", text: "#ffffff", accent: "#6366f1", muted: "#a1a1aa"}
- Dark green: {bg: "#0a0f0a", text: "#f0fff4", accent: "#22c55e", muted: "#86efac"}
- Dark gold: {bg: "#0c0900", text: "#fffbeb", accent: "#f59e0b", muted: "#d97706"}
- Dark blue: {bg: "#030712", text: "#f8fafc", accent: "#3b82f6", muted: "#94a3b8"}
- Dark red: {bg: "#0f0506", text: "#fff1f2", accent: "#ef4444", muted: "#fca5a5"}

RULES:
1. Create 3-5 scenes that tell a compelling story
2. Keep text short and punchy — max 6 bullets, 8 words per heading
3. Start with a title scene, end with a cta scene
4. Use stats scenes for impressive numbers
5. Choose colors that match the content mood
6. Return ONLY valid JSON, no markdown

RETURN FORMAT:
{"scenes": [...], "colorScheme": {...}, "format": "16:9"}`;

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
  return _client;
}

export async function generateRemotionProps(prompt: string, format: '16:9' | '9:16' = '16:9'): Promise<PromptVideoProps> {
  if (!process.env.ANTHROPIC_API_KEY) {
    return getFallbackProps(prompt, format);
  }

  const msg = await getClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: `Create a professional video for: ${prompt}\nFormat: ${format}` }],
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('No text response');

  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('No JSON in response');

  const parsed = JSON.parse(jsonMatch[0]) as PromptVideoProps;
  parsed.format = format;
  return parsed;
}

function getFallbackProps(prompt: string, format: '16:9' | '9:16'): PromptVideoProps {
  return {
    scenes: [
      { type: 'title', heading: prompt.slice(0, 40), subtext: 'Professional video presentation', durationInFrames: 90 },
      { type: 'bullets', heading: 'Key Highlights', bullets: ['Professional quality', 'AI-powered creation', 'Ready in minutes'], durationInFrames: 120 },
      { type: 'cta', heading: 'Get Started Today', subtext: 'Experience the future of video', durationInFrames: 90 },
    ],
    colorScheme: { bg: '#0a0a0a', text: '#ffffff', accent: '#6366f1', muted: '#a1a1aa' },
    format,
  };
}
