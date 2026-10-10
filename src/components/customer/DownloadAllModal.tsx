import React, { useState } from 'react';
import { Order, OrderItem, Photo } from '../../types';
import { useApp } from '../../context/AppContext';
import {
  Download,
  CheckCircle2,
  X,
  FileArchive,
  Layers,
  ShieldCheck,
  Clock,
  Sparkles,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import {
  DownloadItem,
  DownloadProgress,
  downloadPhotosAsZip,
  downloadPhotosIndividually,
} from '../../utils/downloadHelper';

interface DownloadAllModalProps {
  isOpen: boolean;
  onClose: () => void;
  order?: Order | null;
  customItems?: { item: OrderItem; photo?: Photo; order: Order }[];
  eventTitle?: string;
}

export const DownloadAllModal: React.FC<DownloadAllModalProps> = ({
  isOpen,
  onClose,
  order,
  customItems,
  eventTitle,
}) => {
  const { photos, verifyAndDownloadOriginal } = useApp();

  const [downloadMode, setDownloadMode] = useState<'zip' | 'individual'>('zip');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [hasCompleted, setHasCompleted] = useState(false);

  if (!isOpen) return null;

  // Determine items to download
  const itemsToDownload: { item: OrderItem; orderId: string; photoObj?: Photo }[] = [];

  if (customItems && customItems.length > 0) {
    customItems.forEach((c) => {
      itemsToDownload.push({
        item: c.item,
        orderId: c.order.id,
        photoObj: c.photo || photos.find((p) => p.id === c.item.photoId),
      });
    });
  } else if (order && order.items) {
    order.items.forEach((item) => {
      itemsToDownload.push({
        item,
        orderId: order.id,
        photoObj: photos.find((p) => p.id === item.photoId),
      });
    });
  }

  const effectiveTitle =
    eventTitle ||
    order?.eventTitle ||
    itemsToDownload[0]?.item.eventTitle ||
    'Event Photos';

  const orderNumber = order?.orderNumber || 'CUSTOM-BUNDLE';

  // Sanitize filename for ZIP
  const safeZipName = `${effectiveTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}_${orderNumber}_Masters.zip`;

  const handleStartDownload = async (mode: 'zip' | 'individual') => {
    setIsProcessing(true);
    setErrorMessage(null);
    setHasCompleted(false);

    try {
      // Gather resolved URLs via verifyAndDownloadOriginal
      const resolvedList: DownloadItem[] = [];

      for (const entry of itemsToDownload) {
        const verification = verifyAndDownloadOriginal(entry.orderId, entry.item.photoId);
        const resolvedUrl =
          verification.allowed && verification.originalUrl
            ? verification.originalUrl
            : entry.photoObj?.originalUrl || entry.item.thumbnailUrl;

        if (!resolvedUrl) {
          throw new Error(`Media file for ${entry.item.photoCode} could not be resolved.`);
        }

        resolvedList.push({
          url: resolvedUrl,
          filename: `${entry.item.photoCode}_ORIGINAL_24MP.jpg`,
          photoCode: entry.item.photoCode,
          photoTitle: entry.item.photoTitle,
        });
      }

      if (mode === 'zip') {
        await downloadPhotosAsZip(resolvedList, safeZipName, (prog) => {
          setProgress(prog);
        });
      } else {
        await downloadPhotosIndividually(resolvedList, 450, (prog) => {
          setProgress(prog);
        });
      }

      setHasCompleted(true);
    } catch (err: any) {
      console.error('Download error:', err);
      setErrorMessage(err?.message || 'An error occurred during media packaging. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    if (isProcessing) return; // Prevent closing while in progress
    setProgress(null);
    setHasCompleted(false);
    setErrorMessage(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="bg-white border border-[#DCD8CE] rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl space-y-0"
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="bg-[#FAF8F5] border-b border-[#DCD8CE] px-6 py-4 flex items-center justify-between">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-[#35594B] font-semibold">
                Customer Delivery Center
              </span>
              <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-mono font-medium">
                Verified Unwatermarked
              </span>
            </div>
            <h3 className="font-serif text-lg font-bold text-[#252723]">
              Download All Purchased Photos
            </h3>
          </div>

          <button
            onClick={handleClose}
            disabled={isProcessing}
            aria-label="Close dialog"
            className="p-1.5 text-[#696B65] hover:text-[#252723] hover:bg-[#EFE9DC] rounded-lg transition-colors disabled:opacity-30"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5">
          {/* Summary Box */}
          <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium text-[#252723] text-sm leading-snug">
                  {effectiveTitle}
                </p>
                {order && (
                  <p className="text-xs text-[#696B65] font-mono">
                    Order Ref: <span className="text-[#35594B] font-semibold">{order.orderNumber}</span>
                  </p>
                )}
              </div>
              <div className="text-right shrink-0">
                <span className="inline-block bg-[#35594B] text-white px-2.5 py-1 rounded text-xs font-mono font-bold">
                  {itemsToDownload.length} {itemsToDownload.length === 1 ? 'Master Photo' : 'Master Photos'}
                </span>
              </div>
            </div>

            {/* Photo Thumbnails Preview Row */}
            <div className="flex items-center gap-2 overflow-x-auto py-1 pt-2 border-t border-[#DCD8CE]">
              {itemsToDownload.map((it, idx) => (
                <div
                  key={idx}
                  className="relative w-12 h-12 rounded-md overflow-hidden bg-white border border-[#DCD8CE] shrink-0 group"
                  title={`${it.item.photoCode} - ${it.item.photoTitle}`}
                >
                  <img
                    src={it.item.thumbnailUrl || it.photoObj?.thumbnailUrl || it.photoObj?.originalUrl}
                    alt={it.item.photoCode}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-black/70 text-[8px] font-mono text-white text-center py-0.5 truncate px-0.5">
                    {it.item.photoCode}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between text-[11px] text-[#696B65] pt-1">
              <div className="flex items-center gap-1.5 text-emerald-800">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Original 24MP · No Watermarks · Full Commercial Rights</span>
              </div>
            </div>
          </div>

          {/* Delivery Mode Selection (if not in progress) */}
          {!isProcessing && !hasCompleted && (
            <div className="space-y-3">
              <p className="text-xs font-semibold text-[#252723]">Choose Delivery Format:</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* ZIP Package Card */}
                <button
                  type="button"
                  onClick={() => setDownloadMode('zip')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    downloadMode === 'zip'
                      ? 'border-[#35594B] bg-emerald-50/40 ring-1 ring-[#35594B]'
                      : 'border-[#DCD8CE] hover:border-[#35594B] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-[#35594B] font-semibold text-xs">
                      <FileArchive className="w-4 h-4" />
                      <span>ZIP Archive (.zip)</span>
                    </div>
                    <span className="text-[10px] bg-emerald-100 text-[#35594B] px-1.5 py-0.5 rounded font-mono font-semibold">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-[#696B65] leading-relaxed">
                    Single compressed file containing all {itemsToDownload.length} photos in full resolution. No multi-tab browser prompts.
                  </p>
                </button>

                {/* Individual Files Card */}
                <button
                  type="button"
                  onClick={() => setDownloadMode('individual')}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between gap-2 ${
                    downloadMode === 'individual'
                      ? 'border-[#35594B] bg-emerald-50/40 ring-1 ring-[#35594B]'
                      : 'border-[#DCD8CE] hover:border-[#35594B] bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-2 text-[#252723] font-semibold text-xs">
                      <Layers className="w-4 h-4 text-[#696B65]" />
                      <span>Individual Files (.jpg)</span>
                    </div>
                  </div>
                  <p className="text-[11px] text-[#696B65] leading-relaxed">
                    Directly downloads each unwatermarked photo as a standalone master JPEG into your Downloads folder.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* Progress Bar & Status (when processing) */}
          {isProcessing && progress && (
            <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#252723] flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-[#35594B] animate-spin" />
                  <span>{progress.statusText}</span>
                </span>
                <span className="font-mono font-bold text-[#35594B]">{progress.percentage}%</span>
              </div>

              {/* Progress track */}
              <div className="w-full bg-[#DCD8CE] h-2 rounded-full overflow-hidden">
                <div
                  className="bg-[#35594B] h-full transition-all duration-300 rounded-full"
                  style={{ width: `${progress.percentage}%` }}
                />
              </div>

              <p className="text-[11px] text-[#696B65]">
                Preparing unwatermarked full-resolution assets. Please keep this window open while files package.
              </p>
            </div>
          )}

          {/* Success State */}
          {hasCompleted && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center space-y-2 animate-in zoom-in-95">
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <p className="text-sm font-bold text-emerald-950">
                Delivery Complete!
              </p>
              <p className="text-xs text-emerald-800">
                Your high-resolution master photos have started downloading. Check your browser’s Downloads folder.
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-start gap-2.5 text-xs text-rose-800">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
              <p>{errorMessage}</p>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="bg-[#FAF8F5] border-t border-[#DCD8CE] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] text-[#696B65] flex items-center gap-1.5 order-2 sm:order-1">
            <Clock className="w-3.5 h-3.5 text-[#35594B]" />
            <span>30-Day Authenticated Re-download Window</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto order-1 sm:order-2">
            {!hasCompleted ? (
              <>
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isProcessing}
                  className="flex-1 sm:flex-initial px-4 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-xl text-xs font-semibold transition-colors disabled:opacity-40"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleStartDownload(downloadMode)}
                  disabled={isProcessing || itemsToDownload.length === 0}
                  className="flex-1 sm:flex-initial px-5 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-xl text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Packaging...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>
                        Download All ({itemsToDownload.length} Photos{downloadMode === 'zip' ? ' · ZIP' : ''})
                      </span>
                    </>
                  )}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => handleStartDownload(downloadMode)}
                  className="flex-1 sm:flex-initial px-4 py-2 bg-white hover:bg-[#FAF8F5] text-[#35594B] border border-[#35594B] rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Again</span>
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 sm:flex-initial px-6 py-2 bg-[#35594B] hover:bg-[#29473B] text-white rounded-xl text-xs font-semibold transition-colors shadow-sm"
                >
                  Done
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
