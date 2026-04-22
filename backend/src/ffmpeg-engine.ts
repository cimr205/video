import { spawn } from 'child_process';

// Shell metacharacters that should never appear in a template (before path substitution)
const INJECTION_RE = /[;|`]|\$\(|&&|\|\||>>|<<|\beval\b|\bexec\b/;

/**
 * Parse a FFmpeg command string into an argv array.
 * Handles single-quoted and double-quoted segments.
 */
export function parseFFmpegCommand(command: string): string[] {
  const args: string[] = [];
  let i = 0;
  const len = command.length;

  while (i < len) {
    while (i < len && command[i] === ' ') i++;
    if (i >= len) break;

    let arg = '';

    if (command[i] === '"') {
      i++;
      while (i < len && command[i] !== '"') {
        if (command[i] === '\\' && i + 1 < len) { i++; arg += command[i++]; }
        else arg += command[i++];
      }
      i++; // closing "
    } else if (command[i] === "'") {
      i++;
      while (i < len && command[i] !== "'") arg += command[i++];
      i++; // closing '
    } else {
      while (i < len && command[i] !== ' ') arg += command[i++];
    }

    if (arg) args.push(arg);
  }

  return args;
}

/**
 * Validate and convert a Claude-generated FFmpeg command template into
 * a safe argv array with real paths substituted.
 * Returns null if the command is invalid/dangerous.
 */
export function buildSafeArgs(
  commandTemplate: string,
  inputPath: string,
  outputPath: string
): string[] | null {
  const template = commandTemplate.trim();

  if (INJECTION_RE.test(template)) {
    console.warn('[FFmpeg] Injection pattern detected — rejecting command');
    return null;
  }

  if (!template.startsWith('ffmpeg')) {
    console.warn('[FFmpeg] Command does not start with ffmpeg — rejecting');
    return null;
  }

  const withoutBin = template.replace(/^ffmpeg\s+/, '');
  const parsed = parseFFmpegCommand(withoutBin)
    .filter((a, i) => !(i === 0 && a === '-y')); // runFFmpeg prepends -y, strip duplicate

  // Substitute placeholders
  const args = parsed.map(arg => {
    if (arg === 'INPUT_PATH') return inputPath;
    if (arg === 'OUTPUT_PATH') return outputPath;
    return arg;
  });

  // Must reference both paths
  if (!args.includes(inputPath) || !args.includes(outputPath)) {
    console.warn('[FFmpeg] Command missing input or output path after substitution');
    return null;
  }

  return args;
}

/** Get video duration in seconds via ffprobe. Falls back to 10s on error. */
export function getVideoDuration(inputPath: string): Promise<number> {
  return new Promise(resolve => {
    const proc = spawn('ffprobe', [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      inputPath,
    ]);

    let out = '';
    proc.stdout.on('data', d => { out += d; });
    proc.on('close', code => {
      if (code !== 0) return resolve(10);
      try {
        const dur = parseFloat(JSON.parse(out).format?.duration ?? '10');
        resolve(isNaN(dur) ? 10 : dur);
      } catch {
        resolve(10);
      }
    });
    proc.on('error', () => resolve(10));
  });
}

/**
 * Execute FFmpeg with an argv array (no shell involvement).
 * Always prepends -y (overwrite output without asking).
 */
export function runFFmpeg(args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log('[FFmpeg] spawn args:', ['-y', ...args].join(' '));

    const proc = spawn('ffmpeg', ['-y', ...args], { stdio: ['ignore', 'pipe', 'pipe'] });

    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });

    // 10-minute hard timeout
    const timeout = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('FFmpeg timed out after 10 minutes'));
    }, 600_000);

    proc.on('close', code => {
      clearTimeout(timeout);
      if (code === 0) {
        resolve();
      } else {
        const tail = stderr.slice(-3000);
        console.error('[FFmpeg] stderr tail:\n', tail);
        reject(new Error(`FFmpeg exited ${code}`));
      }
    });

    proc.on('error', err => {
      clearTimeout(timeout);
      reject(new Error(`FFmpeg spawn error: ${err.message}`));
    });
  });
}
