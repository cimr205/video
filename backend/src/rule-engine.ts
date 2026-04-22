import { Preset, VideoFormat, ClaudeVideoResponse } from './types';

interface RuleContext {
  prompt: string;
  lower: string;
  preset: Preset;
  format: VideoFormat;
  duration: number;
  fadeOutStart: string;
  targetW: number;
  targetH: number;
}

// ── Keyword helpers ───────────────────────────────────────────────────────────

const has = (ctx: RuleContext, ...terms: string[]) =>
  terms.some(t => ctx.lower.includes(t));

function extractOverlayText(prompt: string, preset: Preset): string {
  // 1. Quoted text  e.g.  add text "AI Agency Denmark"
  const quoted = prompt.match(/['"]([^'"]{2,60})['"]/);
  if (quoted) return quoted[1].trim();

  // 2. "saying/text/caption/write X" — stop at comma, period, or end
  const kw = prompt.match(
    /(?:saying|text|caption|write|display|show|overlay)\s+([A-Za-zÆØÅæøå0-9 ]{2,50?}?)(?:[,.]|$)/i
  );
  if (kw) return kw[1].trim().replace(/[;|`$<>\\]/g, '');

  // 3. Preset defaults
  switch (preset) {
    case 'saas-demo': return 'AI Demo';
    case 'tiktok':    return 'Watch this';
    case 'ad-style':  return 'Start Now';
    default:          return '';
  }
}

// ── Filter builders ───────────────────────────────────────────────────────────

function scaleFilter(ctx: RuleContext): string {
  const { targetW: w, targetH: h } = ctx;
  return `scale=${w}:${h}:force_original_aspect_ratio=decrease,pad=${w}:${h}:(ow-iw)/2:(oh-ih)/2`;
}

/**
 * Fast zoom using scale+crop (NOT zoompan — zoompan is O(n²) slow on CPU).
 * Achieves smooth Ken Burns / zoom-in / zoom-out at full FPS without huge RAM usage.
 */
function zoomFilter(ctx: RuleContext, style: 'in' | 'out' | 'breathe' | 'pan'): string {
  const { targetW: w, targetH: h, duration } = ctx;
  const dur = duration || 5;

  // Zoom factor: 1.0 → 1.25 (zoom in) or 1.25 → 1.0 (zoom out)
  // We pre-scale to 1.25× and use crop with an animated offset.
  // trunc(x/2)*2 keeps dimensions even (required by libx264).
  const bigW = Math.ceil(w * 1.25 / 2) * 2;
  const bigH = Math.ceil(h * 1.25 / 2) * 2;
  const dxMax = bigW - w;
  const dyMax = bigH - h;

  const preScale = `scale=${bigW}:${bigH}:flags=lanczos`;

  switch (style) {
    case 'in':
      // Start wide (showing edges), zoom into centre — crop moves inward
      return `${preScale},crop=${w}:${h}:x='${dxMax}-(${dxMax}*min(t,${dur})/${dur})':y='${dyMax/2}'`;

    case 'out':
      // Start tight on centre, pull back
      return `${preScale},crop=${w}:${h}:x='${dxMax}*min(t,${dur})/${dur}':y='${dyMax/2}'`;

    case 'breathe':
      // Slow pulse
      return `${preScale},crop=${w}:${h}:x='${dxMax/2}+${Math.round(dxMax/4)}*sin(2*3.14159*t/4)':y='${dyMax/2}'`;

    case 'pan':
    default:
      // Pan left to right while slightly zoomed in (Ken Burns)
      return `${preScale},crop=${w}:${h}:x='${dxMax}*min(t,${dur})/${dur}':y='${dyMax/2}'`;
  }
}

function fadeFilters(ctx: RuleContext, inDur = 0.5, outDur = 0.5): string[] {
  const f: string[] = [];
  if (inDur > 0)  f.push(`fade=t=in:st=0:d=${inDur}`);
  if (outDur > 0) f.push(`fade=t=out:st=${ctx.fadeOutStart}:d=${outDur}`);
  return f;
}

function textFilter(
  text: string,
  position: 'bottom' | 'center' | 'top',
  size: number,
  ctx: RuleContext
): string {
  // Sanitise: remove single-quotes and colons (both break drawtext syntax)
  const safe = text.replace(/'/g, '’').replace(/:/g, ' ').slice(0, 60);
  const y    =
    position === 'bottom' ? 'h-th-50'    :
    position === 'top'    ? '50'          : '(h-th)/2';
  const bgA  = ctx.preset === 'tiktok' ? '0.75' : '0.55';
  const bw   = ctx.preset === 'tiktok' ? '22'   : '14';
  return `drawtext=text='${safe}':fontsize=${size}:fontcolor=white:x=(w-text_w)/2:y=${y}:box=1:boxcolor=black@${bgA}:boxborderw=${bw}`;
}

function colorGrade(
  style: 'vivid' | 'cinematic' | 'warm' | 'cold' | 'bw'
): string {
  switch (style) {
    case 'vivid':     return 'eq=saturation=1.4:contrast=1.1:brightness=0.03';
    case 'cinematic': return 'eq=saturation=0.85:contrast=1.1:brightness=-0.02,vignette=PI/4.5';
    case 'warm':      return 'colorbalance=rs=0.08:gs=-0.02:bs=-0.08';
    case 'cold':      return 'colorbalance=rs=-0.08:gs=0:bs=0.1';
    case 'bw':        return 'hue=s=0,eq=contrast=1.2';
  }
}

// ── Main builder ──────────────────────────────────────────────────────────────

function buildFilterChain(ctx: RuleContext): string[] {
  const { lower, preset } = ctx;
  const filters: string[] = [];

  // 1. Scale / format
  filters.push(scaleFilter(ctx));

  // 2. Zoom (fast scale+crop method — no zoompan)
  const wantsZoomIn  = has(ctx, 'zoom in',  'push in', 'close up', 'closeup', 'zoom');
  const wantsZoomOut = has(ctx, 'zoom out', 'pull back', 'wide shot');
  const wantsBreathe = has(ctx, 'breathe',  'pulse', 'pulsing', 'heartbeat');
  const wantsPan     = has(ctx, 'ken burns','pan', 'slow pan', 'drift');

  const presetWantsZoom = preset === 'saas-demo' || preset === 'ad-style';

  if      (wantsZoomOut)            filters.push(zoomFilter(ctx, 'out'));
  else if (wantsBreathe)            filters.push(zoomFilter(ctx, 'breathe'));
  else if (wantsPan)                filters.push(zoomFilter(ctx, 'pan'));
  else if (wantsZoomIn || presetWantsZoom) filters.push(zoomFilter(ctx, 'in'));

  // 3. Colour grade
  const isBW        = has(ctx, 'black and white', 'grayscale', 'monochrome', 'noir');
  const isCinematic = has(ctx, 'cinematic', 'film look', 'filmic', 'movie look');
  const isVivid     = has(ctx, 'vivid', 'vibrant', 'punchy', 'colorful');
  const isWarm      = has(ctx, 'warm', 'golden', 'sunset');
  const isCold      = has(ctx, 'cold', 'cool', 'blue', 'winter');

  if      (isBW)                          filters.push(colorGrade('bw'));
  else if (isCinematic)                   filters.push(colorGrade('cinematic'));
  else if (isVivid || preset === 'tiktok') filters.push(colorGrade('vivid'));
  else if (isWarm)                        filters.push(colorGrade('warm'));
  else if (isCold)                        filters.push(colorGrade('cold'));

  // 4. Fade in / out
  const noFade     = has(ctx, 'hard cut', 'no fade');
  const fastFade   = preset === 'tiktok';
  const fadeInDur  = noFade ? 0 : fastFade ? 0.2 : 0.5;
  const fadeOutDur = has(ctx, 'no fade out') ? 0 : fastFade ? 0.2 : 0.5;
  filters.push(...fadeFilters(ctx, fadeInDur, fadeOutDur));

  // 5. Text overlay
  const noText     = has(ctx, 'no text', 'without text', 'clean shot', 'no caption', 'no overlay');
  const overlayText = noText ? '' : extractOverlayText(ctx.prompt, preset);

  if (overlayText) {
    const textSize = preset === 'tiktok' ? 72 : 54;
    const pos: 'bottom' | 'center' | 'top' =
      has(ctx, 'center text', 'middle text') ? 'center' :
      has(ctx, 'top text')                   ? 'top'    : 'bottom';
    filters.push(textFilter(overlayText, pos, textSize, ctx));
  }

  return filters;
}

// ── Public API ────────────────────────────────────────────────────────────────

export function generateWithRules(
  prompt: string,
  preset: Preset,
  format: VideoFormat,
  duration: number
): { ffmpegArgs: string[]; editPlan: string; description: string; ffmpegCommand: string } {
  const [targetW, targetH] = format === '9:16' ? [1080, 1920] : [1920, 1080];
  const fadeOutStart       = Math.max(duration - 0.8, 0.1).toFixed(2);

  const ctx: RuleContext = {
    prompt,
    lower: prompt.toLowerCase(),
    preset,
    format,
    duration,
    fadeOutStart,
    targetW,
    targetH,
  };

  const filters = buildFilterChain(ctx);
  const vf      = filters.join(',');

  const editPlan = [
    `Format: ${format} (${targetW}×${targetH})`,
    `Filters: ${filters.map(f => f.split('=')[0]).join(' → ')}`,
    `Duration: ${duration.toFixed(1)}s  Fade-out at: ${fadeOutStart}s`,
  ].join('\n');

  const description = `${preset} preset — ${filters.length} filters: ${filters.map(f => f.split('=')[0]).join(', ')}.`;

  // Args for spawn() — no -y (runFFmpeg adds it), no shell quoting needed
  const ffmpegArgs: string[] = [
    '-i',        'INPUT_PATH',
    '-vf',       vf,
    '-c:v',      'libx264',
    '-crf',      '18',
    '-preset',   'medium',
    '-r',        '30',
    '-c:a',      'aac',
    '-b:a',      '192k',
    '-movflags', '+faststart',
    'OUTPUT_PATH',
  ];

  // Display string (for UI — -y shown for clarity)
  const ffmpegCommand =
    `ffmpeg -i INPUT_PATH -vf "${vf}" -c:v libx264 -crf 18 -preset medium -r 30 -c:a aac -b:a 192k -movflags +faststart OUTPUT_PATH`;

  return { ffmpegArgs, editPlan, description, ffmpegCommand };
}
