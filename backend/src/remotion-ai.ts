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

interface QuoteScene {
  type: 'quote';
  quote: string;
  attribution?: string;
}

interface HighlightScene {
  type: 'highlight';
  emoji: string;
  heading: string;
  subtext?: string;
}

type SceneData = (TitleScene | BulletsScene | StatScene | CtaScene | QuoteScene | HighlightScene) & {
  durationInFrames: number;
};

export interface PromptVideoProps {
  scenes: SceneData[];
  colorScheme: ColorScheme;
  format: '16:9' | '9:16';
}

const SYSTEM_PROMPT = `You are a world-class video director and motion designer. Given a prompt, generate a JSON object for a cinematic Remotion video composition. Your goal is maximum visual impact and storytelling quality.

SCENE TYPES — use the best mix for the story:
- "title":     {type, heading, subtext?, durationInFrames}           — hero opener
- "bullets":   {type, heading, bullets: string[], durationInFrames}  — list of points (max 5 bullets, each ≤7 words)
- "stat":      {type, value, label, context?, durationInFrames}      — big number/metric (e.g. value:"3x", label:"faster delivery")
- "quote":     {type, quote, attribution?, durationInFrames}         — impactful quote (≤25 words)
- "highlight": {type, emoji, heading, subtext?, durationInFrames}    — emoji icon + punchy line
- "cta":       {type, heading, subtext?, durationInFrames}           — closing call to action

DURATION GUIDELINES (30fps):
- title: 90-120 frames
- bullets: 30 + (bullets.length × 25) frames  e.g. 4 bullets = 130 frames
- stat: 90-105 frames
- quote: 120-150 frames
- highlight: 80-100 frames
- cta: 90-120 frames

SCENE COUNT: 4-6 scenes. Always: title first, cta last. Mix types for visual variety.

COLOR SCHEMES — bg supports CSS gradients for depth:
- Dark tech gradient:   {bg:"linear-gradient(135deg,#0a0a0a 0%,#0f0a1e 100%)", text:"#ffffff", accent:"#6366f1", muted:"#a1a1aa"}
- Dark neon:            {bg:"linear-gradient(135deg,#050510 0%,#0a0520 100%)", text:"#f0f0ff", accent:"#a855f7", muted:"#8b8baa"}
- Dark emerald:         {bg:"linear-gradient(135deg,#020d08 0%,#021a0f 100%)", text:"#f0fff4", accent:"#10b981", muted:"#6ee7b7"}
- Dark amber:           {bg:"linear-gradient(135deg,#0c0800 0%,#1a0f00 100%)", text:"#fffbeb", accent:"#f59e0b", muted:"#d97706"}
- Dark sapphire:        {bg:"linear-gradient(135deg,#020818 0%,#040d28 100%)", text:"#f8fafc", accent:"#3b82f6", muted:"#93c5fd"}
- Dark crimson:         {bg:"linear-gradient(135deg,#0f0204 0%,#200408 100%)", text:"#fff1f2", accent:"#ef4444", muted:"#fca5a5"}
- Dark rose-gold:       {bg:"linear-gradient(135deg,#0f080a 0%,#1a0c10 100%)", text:"#fff5f7", accent:"#f43f5e", muted:"#fda4af"}
- Midnight teal:        {bg:"linear-gradient(135deg,#030d0f 0%,#051518 100%)", text:"#f0fffe", accent:"#14b8a6", muted:"#5eead4"}

RULES:
1. Pick the color scheme that BEST fits the content mood
2. Text must be SHORT and punchy: headings ≤7 words, subtext ≤12 words
3. Stats scenes: use real-looking impressive numbers from the prompt context
4. Highlight scenes: pick the most fitting single emoji
5. Quote scenes: write a punchy 1-2 sentence statement that resonates with the topic
6. Tell a story arc: hook → build → climax → action
7. Return ONLY valid JSON — no markdown fences, no extra text

RETURN FORMAT:
{"scenes":[...],"colorScheme":{...},"format":"16:9"}`;

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
      { type: 'title', heading: prompt.slice(0, 40), subtext: 'Professional video presentation', durationInFrames: 100 },
      { type: 'highlight', emoji: '🚀', heading: 'Built for Impact', subtext: 'AI-powered, instantly generated', durationInFrames: 90 },
      { type: 'bullets', heading: 'Key Highlights', bullets: ['Professional quality', 'AI-powered creation', 'Ready in minutes'], durationInFrames: 120 },
      { type: 'cta', heading: 'Get Started Today', subtext: 'Experience the future of video', durationInFrames: 100 },
    ],
    colorScheme: { bg: 'linear-gradient(135deg,#0a0a0a 0%,#0f0a1e 100%)', text: '#ffffff', accent: '#6366f1', muted: '#a1a1aa' },
    format,
  };
}
