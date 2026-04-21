import { Preset, VideoFormat } from './types';

export function getPresetInstructions(preset: Preset, format: VideoFormat): string {
  const formatNote =
    format === '9:16'
      ? 'Output must be 9:16 vertical (1080x1920). Use: scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2'
      : 'Output must be 16:9 horizontal (1920x1080). Use: scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';

  switch (preset) {
    case 'saas-demo':
      return `
PRESET: SaaS Demo
${formatNote}
- Apply smooth Ken Burns zoom: zoompan=z='min(zoom+0.0015,1.5)':d=150:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)'
- Fade in (0.5s): fade=t=in:st=0:d=0.5
- Fade out (0.5s): fade=t=out:st=FADE_OUT_START:d=0.5
- Text overlay at bottom with key message from prompt (drawtext, no fontfile, white text, semi-transparent box)
- High quality H.264 output: -c:v libx264 -crf 18 -preset slow
- Preserve audio: -c:a aac -b:a 192k`;

    case 'tiktok':
      return `
PRESET: TikTok
Output must be 9:16 vertical (1080x1920). Use: scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2
- Large bold captions at bottom: drawtext (fontsize=72, white text, black semi-transparent box)
- Fade in (0.3s): fade=t=in:st=0:d=0.3
- Energetic feel: slight brightness and contrast boost via eq=brightness=0.05:contrast=1.1
- High quality: -c:v libx264 -crf 18 -preset medium
- Preserve audio: -c:a aac -b:a 192k`;

    case 'ad-style':
      return `
PRESET: Ad Style
${formatNote}
- Hook zoom: start with zoompan zoom at 1.3 pulling back to 1.0 in first 3 seconds
- Fade in from black (0.5s): fade=t=in:st=0:d=0.5
- Bold text overlay for headline from the prompt (drawtext, large font, centered, semi-transparent background)
- Subtle vignette: vignette=PI/4
- High quality: -c:v libx264 -crf 18 -preset slow
- Preserve audio: -c:a aac -b:a 192k`;

    case 'custom':
      return `
PRESET: Custom
${formatNote}
Follow the user prompt exactly. Be creative but stable and safe.
Always include: fade in, text overlay if mentioned, high quality output, audio preservation.`;

    default:
      return `Apply professional video editing. ${formatNote}`;
  }
}

export function getFallbackArgs(
  inputPath: string,
  outputPath: string,
  format: VideoFormat,
  duration: number
): string[] {
  const fadeOutStart = Math.max(duration - 0.8, 0.1).toFixed(2);

  const scaleFilter =
    format === '9:16'
      ? 'scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2'
      : 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2';

  const vf = [
    scaleFilter,
    'fade=t=in:st=0:d=0.5',
    `fade=t=out:st=${fadeOutStart}:d=0.5`,
    "drawtext=text='AI Video':fontsize=48:fontcolor=white:x=(w-text_w)/2:y=h-th-50:box=1:boxcolor=black@0.5:boxborderw=10",
  ].join(',');

  return [
    '-i', inputPath,
    '-vf', vf,
    '-c:v', 'libx264', '-crf', '20', '-preset', 'medium',
    '-c:a', 'aac', '-b:a', '192k',
    '-movflags', '+faststart',
    outputPath,
  ];
}
