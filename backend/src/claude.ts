import Anthropic from '@anthropic-ai/sdk';
import { Preset, VideoFormat, ClaudeVideoResponse } from './types';
import { getPresetInstructions } from './presets';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

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
8. Do NOT specify a fontfile in drawtext — use only: drawtext=text='...':fontsize=N:fontcolor=white:x=...:y=...:box=1:boxcolor=black@0.5:boxborderw=10
9. For zoompan, set s= to the target resolution (e.g. s=1920x1080 or s=1080x1920).
10. For fade out, compute st correctly from the video duration provided.
11. Output quality: -c:v libx264 -crf 18 -preset medium (unless a different codec is essential).

RETURN FORMAT — JSON only, no markdown fences, no extra text:
{
  "editPlan": "Brief bullet-point description of the edits",
  "ffmpegCommand": "ffmpeg -i INPUT_PATH -vf \\"...\\" -c:v libx264 -crf 18 -preset medium -c:a aac -b:a 192k -movflags +faststart OUTPUT_PATH",
  "description": "One sentence shown to the user explaining what was done"
}`;

export async function generateVideoEdit(
  prompt: string,
  preset: Preset,
  format: VideoFormat,
  duration: number
): Promise<ClaudeVideoResponse> {
  const presetInstructions = getPresetInstructions(preset, format);
  const fadeOutStart = Math.max(duration - 0.8, 0.1).toFixed(2);

  const userMessage = `VIDEO EDIT REQUEST: ${prompt}

${presetInstructions}

Video duration: ${duration.toFixed(2)} seconds
Fade-out start time: ${fadeOutStart}s

Generate the complete FFmpeg command. Return only valid JSON.`;

  const msg = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: userMessage }],
  });

  const block = msg.content[0];
  if (block.type !== 'text') throw new Error('Claude returned non-text content');

  const text = block.text.trim();
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error('Claude did not return JSON');

  const parsed = JSON.parse(jsonMatch[0]) as ClaudeVideoResponse;

  if (!parsed.ffmpegCommand?.startsWith('ffmpeg') || !parsed.editPlan) {
    throw new Error('Claude response missing required fields');
  }

  return parsed;
}
