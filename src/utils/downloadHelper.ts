import JSZip from 'jszip';

export interface DownloadItem {
  url: string;
  filename: string;
  photoCode?: string;
  photoTitle?: string;
  width?: number;
  height?: number;
}

export interface DownloadProgress {
  current: number;
  total: number;
  percentage: number;
  statusText: string;
  isComplete: boolean;
  error?: string;
}

/**
 * Converts any URL (data URI, blob URI, or remote HTTP/HTTPS URL) to a Blob reliably
 */
export async function urlToBlob(url: string): Promise<Blob> {
  if (url.startsWith('data:')) {
    try {
      const parts = url.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      const mime = mimeMatch ? mimeMatch[1] : 'image/jpeg';
      const bstr = atob(parts[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new Blob([u8arr], { type: mime });
    } catch {
      // Fallback native fetch
      const res = await fetch(url);
      return await res.blob();
    }
  }

  // Standard remote or relative URL
  try {
    const res = await fetch(url, { mode: 'cors' });
    if (res.ok) {
      return await res.blob();
    }
    throw new Error(`Failed to fetch media (HTTP ${res.status})`);
  } catch (err) {
    // If CORS prevents direct fetch, try loading via Image element and drawing to Canvas
    return new Promise<Blob>((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas 2D context unavailable'));
            return;
          }
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (b) => {
              if (b) resolve(b);
              else reject(new Error('Canvas toBlob returned null'));
            },
            'image/jpeg',
            0.96
          );
        } catch (e) {
          reject(e);
        }
      };
      img.onerror = () => reject(new Error(`Failed to load image from ${url}`));
      img.src = url;
    });
  }
}

/**
 * Triggers a direct single file download in the customer's browser
 */
export async function triggerSingleDownload(url: string, filename: string): Promise<void> {
  try {
    const blob = await urlToBlob(url);
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(objectUrl), 2000);
  } catch (err) {
    // Fallback direct anchor click
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.target = '_blank';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
}

/**
 * Packages all purchased photos into a compressed ZIP archive and triggers download.
 * Provides real-time progress callbacks for delivery feedback.
 */
export async function downloadPhotosAsZip(
  items: DownloadItem[],
  zipFilename: string,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  if (!items || items.length === 0) {
    throw new Error('No photos to download');
  }

  const zip = new JSZip();
  const total = items.length;

  // Track filenames to avoid duplicates inside zip
  const usedFilenames = new Set<string>();

  for (let i = 0; i < total; i++) {
    const item = items[i];
    const code = item.photoCode || `PHOTO_${i + 1}`;
    
    // Format sanitized filename
    let safeName = item.filename;
    if (!safeName || !safeName.toLowerCase().endsWith('.jpg')) {
      safeName = `${code}_ORIGINAL_24MP.jpg`;
    }

    if (usedFilenames.has(safeName)) {
      safeName = `${code}_${i + 1}_ORIGINAL_24MP.jpg`;
    }
    usedFilenames.add(safeName);

    onProgress?.({
      current: i + 1,
      total,
      percentage: Math.round(((i) / total) * 75),
      statusText: `Adding ${code} to delivery bundle (${i + 1}/${total})...`,
      isComplete: false,
    });

    try {
      const blob = await urlToBlob(item.url);
      zip.file(safeName, blob);
    } catch (err) {
      console.warn(`Failed to package ${code}:`, err);
    }
  }

  onProgress?.({
    current: total,
    total,
    percentage: 80,
    statusText: 'Compressing full-resolution package into .ZIP archive...',
    isComplete: false,
  });

  const zipBlob = await zip.generateAsync(
    {
      type: 'blob',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    },
    (metadata) => {
      const dynamicPercent = 80 + Math.round((metadata.percent * 0.18));
      onProgress?.({
        current: total,
        total,
        percentage: Math.min(99, dynamicPercent),
        statusText: `Finalizing archive compression (${Math.round(metadata.percent)}%)...`,
        isComplete: false,
      });
    }
  );

  const cleanZipName = zipFilename.endsWith('.zip') ? zipFilename : `${zipFilename}.zip`;
  const objectUrl = URL.createObjectURL(zipBlob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = cleanZipName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(objectUrl), 3000);

  onProgress?.({
    current: total,
    total,
    percentage: 100,
    statusText: `Successfully created ${cleanZipName}! Download started.`,
    isComplete: true,
  });
}

/**
 * Downloads multiple files one by one with a small sequential delay
 */
export async function downloadPhotosIndividually(
  items: DownloadItem[],
  delayMs: number = 400,
  onProgress?: (progress: DownloadProgress) => void
): Promise<void> {
  const total = items.length;

  for (let i = 0; i < total; i++) {
    const item = items[i];
    const code = item.photoCode || `PHOTO_${i + 1}`;
    let safeName = item.filename;
    if (!safeName || !safeName.toLowerCase().endsWith('.jpg')) {
      safeName = `${code}_ORIGINAL_24MP.jpg`;
    }

    onProgress?.({
      current: i + 1,
      total,
      percentage: Math.round(((i + 1) / total) * 100),
      statusText: `Downloading file ${i + 1} of ${total}: ${code}...`,
      isComplete: i === total - 1,
    });

    await triggerSingleDownload(item.url, safeName);

    if (i < total - 1) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  onProgress?.({
    current: total,
    total,
    percentage: 100,
    statusText: `All ${total} files initiated for download.`,
    isComplete: true,
  });
}
