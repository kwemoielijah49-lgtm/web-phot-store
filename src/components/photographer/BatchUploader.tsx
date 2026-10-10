import React, { useState, useRef } from 'react';
import { Event, Photo } from '../../types';
import { useApp } from '../../context/AppContext';
import { processUploadedFile } from '../../utils/imageProcessor';
import { formatKES } from '../../utils/mpesa';
import {
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
  FileImage,
} from 'lucide-react';

interface BatchUploaderProps {
  event: Event;
  onClose: () => void;
}

interface UploadQueueItem {
  id: string;
  file: File;
  code: string;
  session: string;
  category: string;
  priceKes: number;
  captureTime: string;
  status: 'pending' | 'processing' | 'done' | 'error';
  errorMessage?: string;
  processedResult?: any;
}

export const BatchUploader: React.FC<BatchUploaderProps> = ({ event, onClose }) => {
  const { photographers, photos, addPhotosToEvent } = useApp();
  const photographer = photographers.find((p) => p.id === event.photographerId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<UploadQueueItem[]>([]);
  const [defaultSession, setDefaultSession] = useState<string>(event.sessions[0] || 'Main Ceremony');
  const [defaultCategory, setDefaultCategory] = useState<string>(event.categories[0] || 'Stage Walk');
  const [defaultPrice, setDefaultPrice] = useState<number>(event.overridePriceKes || event.suggestedPriceKes);
  const [isProcessing, setIsProcessing] = useState(false);

  // Existing photos count for numbering
  const existingCount = photos.filter((p) => p.eventId === event.id).length;

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newItems: UploadQueueItem[] = [];
    const prefix = event.title.split(' ')[0].toUpperCase().replace(/[^A-Z]/g, '').substring(0, 3) || 'EVE';

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Duplicate protection: check if same filename already exists
      const isDuplicate =
        queue.some((q) => q.file.name === file.name && q.file.size === file.size) ||
        photos.some((p) => p.eventId === event.id && p.filename === file.name);

      if (isDuplicate) {
        continue;
      }

      const seqNum = existingCount + queue.length + i + 1;
      const code = `${prefix}-${String(seqNum).padStart(3, '0')}`;

      newItems.push({
        id: `q_${Date.now()}_${i}`,
        file,
        code,
        session: defaultSession,
        category: defaultCategory,
        priceKes: defaultPrice,
        captureTime: new Date(file.lastModified || Date.now()).toISOString().slice(0, 16),
        status: 'pending',
      });
    }

    setQueue((prev) => [...prev, ...newItems]);
  };

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const handleProcessAll = async () => {
    if (queue.length === 0 || isProcessing) return;
    setIsProcessing(true);

    const successfulPhotos: Photo[] = [];
    const photographerName = photographer?.businessName || 'Photographer';

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      if (item.status === 'done') continue;

      setQueue((prev) =>
        prev.map((q, idx) => (idx === i ? { ...q, status: 'processing' } : q))
      );

      try {
        const processed = await processUploadedFile(item.file, photographerName, item.code);

        const newPhoto: Photo = {
          id: `photo_${Date.now()}_${i}`,
          eventId: event.id,
          photographerId: event.photographerId,
          code: item.code,
          filename: item.file.name,
          previewWatermarkedUrl: processed.previewWatermarkedUrl,
          thumbnailUrl: processed.thumbnailUrl,
          originalUrl: processed.originalDataUrl,
          captureTimestamp: new Date(item.captureTime).toISOString(),
          session: item.session,
          category: item.category,
          priceKes: item.priceKes,
          status: 'published',
          viewCount: 0,
          purchaseCount: 0,
          fileSizeBytes: processed.fileSizeBytes,
          width: processed.width,
          height: processed.height,
        };

        successfulPhotos.push(newPhoto);

        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'done', processedResult: processed } : q))
        );
      } catch (err: any) {
        setQueue((prev) =>
          prev.map((q, idx) => (idx === i ? { ...q, status: 'error', errorMessage: err.message || 'Processing failed' } : q))
        );
      }
    }

    if (successfulPhotos.length > 0) {
      addPhotosToEvent(successfulPhotos);
    }

    setIsProcessing(false);
  };

  const allDone = queue.length > 0 && queue.every((q) => q.status === 'done');

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-4xl bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#DCD8CE] flex items-center justify-between bg-[#FAF8F5]">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#252723] flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-[#35594B]" />
              <span>Batch Photo Uploader & Watermark Engine</span>
            </h3>
            <p className="text-xs text-[#696B65] mt-0.5">
              Event: <strong className="text-[#252723]">{event.title}</strong>
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#696B65] hover:text-[#252723] hover:bg-[#F4F0E7]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Defaults strip */}
        <div className="p-4 bg-[#FAF8F5] border-b border-[#DCD8CE] grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
          <div>
            <label className="block text-[#696B65] font-medium mb-1">Default Session</label>
            <select
              value={defaultSession}
              onChange={(e) => setDefaultSession(e.target.value)}
              className="w-full bg-white border border-[#DCD8CE] rounded-lg p-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
            >
              {event.sessions.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#696B65] font-medium mb-1">Default Category</label>
            <select
              value={defaultCategory}
              onChange={(e) => setDefaultCategory(e.target.value)}
              className="w-full bg-white border border-[#DCD8CE] rounded-lg p-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
            >
              {event.categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[#696B65] font-medium mb-1">Price per Photo (KES)</label>
            <input
              type="number"
              value={defaultPrice}
              onChange={(e) => setDefaultPrice(Number(e.target.value))}
              className="w-full bg-white border border-[#DCD8CE] rounded-lg p-2 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
            />
          </div>
        </div>

        {/* Dropzone & Queue Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {/* File Dropzone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-[#DCD8CE] hover:border-[#35594B] rounded-xl p-8 text-center cursor-pointer bg-[#FAF8F5] hover:bg-[#F4F0E7] transition-all space-y-3"
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div className="w-12 h-12 rounded-full bg-white border border-[#DCD8CE] flex items-center justify-center mx-auto text-[#35594B]">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[#252723]">
                Drag and drop camera JPEG photos here, or click to browse
              </p>
              <p className="text-xs text-[#696B65] mt-1">
                Automated security watermarking, responsive thumbnails, and duplicate protection active.
              </p>
            </div>
          </div>

          {/* Queue List */}
          {queue.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs text-[#696B65]">
                <span>Upload Batch ({queue.length} files queued)</span>
                <span className="font-mono">
                  {queue.filter((q) => q.status === 'done').length} of {queue.length} processed
                </span>
              </div>

              <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                {queue.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded bg-white border border-[#DCD8CE] flex items-center justify-center text-[#696B65] shrink-0">
                        <FileImage className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-[#35594B]">{item.code}</span>
                          <span className="truncate text-[#252723]">{item.file.name}</span>
                        </div>
                        <div className="text-[11px] text-[#696B65] flex items-center gap-2 mt-0.5">
                          <span>{item.session}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.category}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono">{formatKES(item.priceKes)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {item.status === 'pending' && (
                        <span className="text-[11px] text-[#696B65]">Ready</span>
                      )}
                      {item.status === 'processing' && (
                        <span className="text-[11px] text-[#35594B] flex items-center gap-1 font-medium">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Watermarking...</span>
                        </span>
                      )}
                      {item.status === 'done' && (
                        <span className="text-[11px] text-emerald-700 flex items-center gap-1 font-semibold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Processed</span>
                        </span>
                      )}
                      {item.status === 'error' && (
                        <span className="text-[11px] text-rose-700 flex items-center gap-1 font-semibold">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span>Error</span>
                        </span>
                      )}

                      {item.status === 'pending' && !isProcessing && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-[#696B65] hover:text-rose-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-[#FAF8F5] border-t border-[#DCD8CE] flex items-center justify-between">
          <span className="text-xs text-[#696B65]">
            Client-side canvas engine adds protected watermarks before gallery storage.
          </span>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg text-xs font-medium"
            >
              {allDone ? 'Done' : 'Cancel'}
            </button>

            {queue.length > 0 && !allDone && (
              <button
                onClick={handleProcessAll}
                disabled={isProcessing}
                className="px-5 py-2 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Processing & Watermarking...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Process & Publish {queue.length} Photos</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
