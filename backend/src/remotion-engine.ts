import path from 'path';
import fs from 'fs';

let cachedBundlePath: string | null = null;

async function getBundlePath(): Promise<string> {
  // In production (Docker), use pre-built bundle
  const prodBundle = process.env.REMOTION_BUNDLE_PATH ?? path.resolve(__dirname, '../remotion-bundle/index.html');
  if (fs.existsSync(prodBundle)) {
    return prodBundle;
  }

  // In dev, build bundle from source
  if (cachedBundlePath && fs.existsSync(cachedBundlePath)) {
    return cachedBundlePath;
  }

  console.log('[Remotion] Bundling compositions (first run)...');
  const { bundle } = await import('@remotion/bundler');
  const entryPoint = path.resolve(__dirname, '../../frontend/src/remotion/entry.tsx');

  if (!fs.existsSync(entryPoint)) {
    throw new Error(`Remotion entry point not found: ${entryPoint}`);
  }

  const bundleDir = await bundle({ entryPoint });
  cachedBundlePath = path.join(bundleDir, 'index.html');
  console.log('[Remotion] Bundle ready:', cachedBundlePath);
  return cachedBundlePath;
}

export async function renderPromptVideo(
  props: Record<string, unknown>,
  outputPath: string,
  onProgress?: (p: number) => void,
): Promise<void> {
  const { renderMedia, selectComposition } = await import('@remotion/renderer');

  const bundlePath = await getBundlePath();

  const browserExecutable = process.env.REMOTION_CHROME_EXECUTABLE ?? undefined;

  const composition = await selectComposition({
    serveUrl: bundlePath,
    id: 'PromptVideo',
    inputProps: props,
    browserExecutable,
  });

  await renderMedia({
    composition,
    serveUrl: bundlePath,
    codec: 'h264',
    outputLocation: outputPath,
    inputProps: props,
    browserExecutable,
    onProgress: ({ progress }) => onProgress?.(Math.round(progress * 100)),
    chromiumOptions: {
      disableWebSecurity: true,
    },
    timeoutInMilliseconds: 120_000,
  });
}
