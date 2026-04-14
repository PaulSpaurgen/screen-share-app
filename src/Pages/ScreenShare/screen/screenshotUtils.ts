import { mediaRegistry } from './mediaRegistry';
import { canvasRegistry } from '../annotations/canvasRegistry';

/**
 * Captures a screenshot by compositing the current live video frame with the
 * annotation canvas (if active), then triggers a PNG download.
 *
 * Output resolution matches the video's native capture resolution so the
 * downloaded image is full quality.  The annotation layer is scaled up from
 * its rendered size to the native video dimensions before compositing.
 */
export function captureScreenshot(): void {
  const video = mediaRegistry.videoEl;

  if (!video || video.readyState < 2) {
    console.warn('captureScreenshot: video not ready');
    return;
  }

  const outW = video.videoWidth;
  const outH = video.videoHeight;

  if (outW === 0 || outH === 0) {
    console.warn('captureScreenshot: video dimensions are zero');
    return;
  }

  const out = document.createElement('canvas');
  out.width = outW;
  out.height = outH;
  const ctx = out.getContext('2d');
  if (!ctx) return;

  // ── 1. Draw the video frame at native resolution ──────────────────────────
  ctx.drawImage(video, 0, 0, outW, outH);

  // ── 2. Composite the annotation layer (if present) ───────────────────────
  const fabricCanvas = canvasRegistry.canvas;
  if (fabricCanvas) {
    const annotationEl = fabricCanvas.getElement();
    // Scale from the rendered canvas size to the native video resolution.
    ctx.drawImage(
      annotationEl,
      0, 0, annotationEl.width, annotationEl.height,
      0, 0, outW, outH,
    );
  }

  // ── 3. Trigger download ───────────────────────────────────────────────────
  out.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `screenshot-${Date.now()}.png`;
    anchor.click();
    URL.revokeObjectURL(url);
  }, 'image/png');
}
