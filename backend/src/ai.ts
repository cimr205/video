import Anthropic from '@anthropic-ai/sdk';
import { Preset, VideoFormat, ClaudeVideoResponse } from './types';
import { getPresetInstructions } from './presets';

const SYSTEM_PROMPT = `You are a professional video editor and FFmpeg expert.
Your job: analyse the user's editing request and return a single valid FFmpeg command.

ABSOLUTE RULES:
1. Use INPUT_PATH as the exact input placeholder (no quotes around it in the template).
2. Use OUTPUT_PATH as the exact output placeholder (no quotes around it in the template).
3. NEVER use shell operators: ; | \` $() && || >> << < >
4. Return a SINGLE ffmpeg command — no multi-step pipelines.
5. Always preserve audio: include -c:a aac -b:a 192k unless the user asks to mute.
6. Always add -movflags +faststart for web playback.
7. Do NOT specify -y (the runner adds it automatically).
8. Do NOT specify a fontfile in drawtext — use: drawtext=text='...':fontsize=N:fontcolor=white:x=...:y=...:box=1:boxcolor=black@0.5:boxborderw=10
9. For zoompan, always set s= to the target resolution (e.g. s=1920x1080 or s=1080x1920).
10. For fade out, compute st correctly from the video duration provided.
11. Output quality: -c:v libx264 -crf 18 -preset medium.

RETURN FORMAT — valid JSON only, no markdown, no extra text:
{
  "editPlan": "Brief description of the edits",
  "ffmpegCommand": "ffmpeg -i INPUT_PATH -vf \\"...\\" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -movflags +faststart OUTPUT_PATH",
  "description": "One sentence shown to the user"
}`;

function buildUserMessage(
  prompt: string,
  preset: Preset,
  format: VideoFormat,
  duration: number
): string {
  const presetInstructions = getPresetInstructions(preset, format);
  const fadeOutStart = Math.max(duration - 0.8, 0.1).toFixed(2);
  return `VIDEO EDIT REQUEST: ${prompt}

${presetInstructions}

Video duration: ${duration.toFixed(2)} seconds
Fade-out start time: ${fadeOutStart}s

Generate the complete FFmpeg command. Return only valid JSON.`;
}

function parseResponse(text: string): ClaudeVideoResponse {
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('AI did not return JSON');
  const parsed = JSON.parse(jsonMatch[0]) as ClaudeVideoResponse;
  if (!parsed.ffmpegCommand?.startsWith('ffmpeg') || !parsed.editPlan) {
    throw new Error('AI response missing required fields');
  }
  return parsed;
}

// ── Ollama ────────────────────────────────────────────────────────────────────

async function generateWithOllama(
  prompt: string,
  preset: Preset,
  format: VideoFormat,
  duration: number
): Promise<ClaudeVideoResponse> {
  const url   = process.env.OLLAMA_URL   ?? 'http://localhost:11434';
  const model = process.env.OLLAMA_MODEL ?? 'qwen2.5:3b';

  const res = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(120_000),
    body: JSON.stringify({
      model,
      stream: false,
      format: 'json',
      options: { temperature: 0.1 },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user',   content: buildUserMessage(prompt, preset, format, duration) },
      ],
    }),
  });

  if (!res.ok) throw new Error(`Ollama HTTP ${res.status}: ${await res.text()}`);

  const data = (await res.json()) as { message?: { content?: string } };
  const content = data?.message?.content ?? '';
  return parseResponse(content);
}

// ── Claude (fallback if API key provided) ────────────────────────────────────

let _claudeClient: Anthropic | null = null;
function getClaudeClient(): Anthropic {
  if (!_claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');
    _claudeClient = new Anthropic({ apiKey });
  }
  return _claudeClient;
}

async function generateWithClaude(
  prompt: string,
  preset: Preset,
  format: VideoFormat,
  duration: number
): Promise<ClaudeVideoResponse> {
  const msg = await getClaudeClient().messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildUserMessage(prompt, preset, format, duration) }],
  });
  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Claude returned non-text');
  return parseResponse(block.text);
}

// ── Public entry point ────────────────────────────────────────────────────────

export async function generateVideoEdit(
  prompt: string,
  preset: Preset,
  format: VideoFormat,
  duration: number
): Promise<ClaudeVideoResponse> {
  if (process.env.ANTHROPIC_API_KEY) {
    console.log('[AI] Using Claude');
    return generateWithClaude(prompt, preset, format, duration);
  }
  console.log('[AI] Using Ollama');
  return generateWithOllama(prompt, preset, format, duration);
}
