/**
 * Automated Image Processing Engine for Vault
 * - Client-side high-fidelity watermarked preview generation via Canvas
 * - Responsive thumbnail generation
 * - Protection against unauthorized unwatermarked image extraction
 */

export interface ProcessedPhotoResult {
  originalDataUrl: string;
  previewWatermarkedUrl: string;
  thumbnailUrl: string;
  width: number;
  height: number;
  fileSizeBytes: number;
}

/**
 * Applies a robust diagonal repeating security watermark and protective seal onto an image canvas
 */
export async function generateWatermarkedPreview(
  imageSource: HTMLImageElement | ImageBitmap,
  photographerName: string,
  photoCode: string
): Promise<string> {
  const canvas = document.createElement('canvas');
  // Target preview size: max 1280px wide/tall for responsive preview
  const maxDim = 1200;
  let targetWidth = imageSource.width;
  let targetHeight = imageSource.height;

  if (targetWidth > maxDim || targetHeight > maxDim) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
      targetWidth = maxDim;
    } else {
      targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
      targetHeight = maxDim;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  // Draw base image
  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);

  // Apply subtle micro-contrast reduction across preview to deter screen scraping
  ctx.fillStyle = 'rgba(0, 0, 0, 0.04)';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // Watermark styling
  ctx.save();
  ctx.font = 'bold 20px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.65)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 1;

  // Diagonal angle for repeating text
  const angle = -Math.PI / 6; // -30 degrees
  ctx.rotate(angle);

  const watermarkText = `© ${photographerName.toUpperCase()} · VAULT PREVIEW · [ ${photoCode} ]`;
  const stepX = 420;
  const stepY = 140;

  // Render repeating watermark pattern across bounding box
  const startX = -targetWidth;
  const endX = targetWidth * 2;
  const startY = -targetHeight;
  const endY = targetHeight * 2;

  for (let y = startY; y < endY; y += stepY) {
    for (let x = startX; x < endX; x += stepX) {
      ctx.fillText(watermarkText, x, y);
    }
  }
  ctx.restore();

  // Draw subtle center protective stamp
  ctx.save();
  const centerX = targetWidth / 2;
  const centerY = targetHeight / 2;
  ctx.translate(centerX, centerY);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(-180, -32, 360, 64);

  ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  ctx.fillRect(-180, -32, 360, 64);

  ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.font = '600 13px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('PROTECTED WATERMARKED PREVIEW', 0, -8);

  ctx.font = '400 11px "Space Mono", monospace';
  ctx.fillStyle = 'rgba(245, 158, 11, 0.9)'; // Amber KES accent
  ctx.fillText(`BUY ORIGINAL [${photoCode}] FOR FULL RESOLUTION`, 0, 12);
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.82);
}

/**
 * Creates an optimized thumbnail for fast grid rendering
 */
export async function generateThumbnail(
  imageSource: HTMLImageElement | ImageBitmap,
  maxSize: number = 480
): Promise<string> {
  const canvas = document.createElement('canvas');
  let targetWidth = imageSource.width;
  let targetHeight = imageSource.height;

  if (targetWidth > targetHeight) {
    targetHeight = Math.round((targetHeight * maxSize) / targetWidth);
    targetWidth = maxSize;
  } else {
    targetWidth = Math.round((targetWidth * maxSize) / targetHeight);
    targetHeight = maxSize;
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.85);
}

/**
 * Generates an ultra-clear, high-resolution cover preview (up to 1600px) with bicubic smoothing
 * for landing page hero cards and event banners
 */
export async function generateCrispCoverImage(
  imageSource: HTMLImageElement | ImageBitmap,
  maxSize: number = 1600
): Promise<string> {
  const canvas = document.createElement('canvas');
  let targetWidth = imageSource.width;
  let targetHeight = imageSource.height;

  if (targetWidth > maxSize || targetHeight > maxSize) {
    if (targetWidth > targetHeight) {
      targetHeight = Math.round((targetHeight * maxSize) / targetWidth);
      targetWidth = maxSize;
    } else {
      targetWidth = Math.round((targetWidth * maxSize) / targetHeight);
      targetHeight = maxSize;
    }
  }

  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(imageSource, 0, 0, targetWidth, targetHeight);
  return canvas.toDataURL('image/jpeg', 0.94);
}

/**
 * Processes an uploaded raw File into original data, watermarked preview, and thumbnail
 */
export async function processUploadedFile(
  file: File,
  photographerName: string,
  photoCode: string
): Promise<ProcessedPhotoResult> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.onload = async () => {
      const originalDataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file'));
      img.onload = async () => {
        try {
          const previewWatermarkedUrl = await generateWatermarkedPreview(img, photographerName, photoCode);
          const thumbnailUrl = await generateThumbnail(img, 450);
          resolve({
            originalDataUrl,
            previewWatermarkedUrl,
            thumbnailUrl,
            width: img.width,
            height: img.height,
            fileSizeBytes: file.size,
          });
        } catch (err) {
          reject(err);
        }
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Generates an authentic photographic simulation canvas
 * for seed events (Graduation, Wedding, Tech Summit, Sports)
 */
export function createSyntheticPhotoCanvas(
  theme: 'graduation' | 'wedding' | 'tech' | 'sports' | 'birthday',
  variant: number,
  title: string
): { originalUrl: string; width: number; height: number } {
  const width = 1200;
  const height = 900;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) return { originalUrl: '', width, height };

  // Palettes per event theme
  const palettes = {
    graduation: [
      ['#0f172a', '#1e293b', '#3b82f6', '#fbbf24'],
      ['#18181b', '#27272a', '#6366f1', '#e2e8f0'],
      ['#09090b', '#1c1917', '#ca8a04', '#475569'],
    ],
    wedding: [
      ['#2e1065', '#581c87', '#ec4899', '#fdf2f8'],
      ['#14532d', '#166534', '#ca8a04', '#fef9c3'],
      ['#451a03', '#78350f', '#fbbf24', '#fffbeb'],
    ],
    tech: [
      ['#020617', '#0f172a', '#0284c7', '#38bdf8'],
      ['#052e16', '#064e3b', '#10b981', '#6ee7b7'],
      ['#18181b', '#27272a', '#8b5cf6', '#c084fc'],
    ],
    sports: [
      ['#1c1917', '#44403c', '#ea580c', '#fdba74'],
      ['#0f172a', '#1e3a8a', '#22c55e', '#86efac'],
      ['#18181b', '#3f3f46', '#e11d48', '#fda4af'],
    ],
    birthday: [
      ['#2e1065', '#701a75', '#f43f5e', '#fed7aa'],
      ['#1e1b4b', '#312e81', '#f59e0b', '#fef08a'],
      ['#0f172a', '#1e293b', '#06b6d4', '#bae6fd'],
    ],
  };

  const currentThemePalettes = palettes[theme] || palettes.graduation;
  const [c1, c2, c3, c4] = currentThemePalettes[variant % currentThemePalettes.length];

  // Radial / Linear atmospheric gradient
  const grad = ctx.createLinearGradient(0, 0, width, height);
  grad.addColorStop(0, c1);
  grad.addColorStop(0.5, c2);
  grad.addColorStop(1, c3);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, width, height);

  // Soft bokeh circles (lens flare effect)
  ctx.save();
  const seed = (variant + 1) * 31;
  for (let i = 0; i < 18; i++) {
    const rx = ((seed * (i + 3) * 97) % width);
    const ry = ((seed * (i + 7) * 73) % height);
    const radius = 40 + ((seed * (i + 1)) % 160);
    const radGrad = ctx.createRadialGradient(rx, ry, 5, rx, ry, radius);
    radGrad.addColorStop(0, `${c4}55`);
    radGrad.addColorStop(1, 'transparent');
    ctx.fillStyle = radGrad;
    ctx.beginPath();
    ctx.arc(rx, ry, radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Subtle photographic framing / rule-of-thirds grid hint
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(width / 3, 0);
  ctx.lineTo(width / 3, height);
  ctx.moveTo((width * 2) / 3, 0);
  ctx.lineTo((width * 2) / 3, height);
  ctx.moveTo(0, height / 3);
  ctx.lineTo(width, height / 3);
  ctx.moveTo(0, (height * 2) / 3);
  ctx.lineTo(width, (height * 2) / 3);
  ctx.stroke();
  ctx.restore();

  // Central photographic subject silhouette / card graphics
  ctx.save();
  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.font = '700 24px "Plus Jakarta Sans", sans-serif';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
  ctx.shadowBlur = 10;
  ctx.fillText(title, width / 2, height / 2 - 20);

  ctx.font = '500 15px "Space Mono", monospace';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.fillText(`CAPTURE SESSION #${variant + 1} · ORIGINAL 24MP RAW MASTER`, width / 2, height / 2 + 18);

  ctx.font = '400 12px "Plus Jakarta Sans", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('f/2.8 · 1/500s · ISO 200 · 70-200mm f/2.8 GM OSS', width / 2, height / 2 + 45);
  ctx.restore();

  const originalUrl = canvas.toDataURL('image/jpeg', 0.92);
  return { originalUrl, width, height };
}
