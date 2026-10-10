import React, { useState } from 'react';
import { Photo, Event } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { Plus, Check, Flag, Download, CheckCircle2, Loader2 } from 'lucide-react';
import { triggerSingleDownload } from '../../utils/downloadHelper';

interface PhotoCardProps {
  photo: Photo;
  event: Event;
  onOpenReportModal?: (photo: Photo) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo, event, onOpenReportModal }) => {
  const {
    addToCart,
    removeFromCart,
    isInCart,
    setSelectedPhotoForLightbox,
    isPhotoPurchased,
    verifyAndDownloadOriginal,
  } = useApp();

  const inCart = isInCart(photo.id);
  const { isPurchased, order, item } = isPhotoPurchased(photo.id);
  const [isDownloading, setIsDownloading] = useState(false);

  const toggleCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (inCart) {
      removeFromCart(photo.id);
    } else {
      addToCart(photo, event);
    }
  };

  const handleOpenLightbox = () => {
    setSelectedPhotoForLightbox(photo);
  };

  const handleDownloadMaster = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!order) return;
    setIsDownloading(true);
    try {
      const verification = verifyAndDownloadOriginal(order.id, photo.id);
      const urlToUse = verification.allowed && verification.originalUrl ? verification.originalUrl : photo.originalUrl;
      await triggerSingleDownload(urlToUse, `${photo.code}_ORIGINAL_24MP.jpg`);
    } catch (err) {
      console.error('Failed to download photo:', err);
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

  return (
    <div
      onClick={handleOpenLightbox}
      className="group relative bg-white border border-[#DCD8CE] rounded-lg overflow-hidden hover:border-[#35594B] hover:shadow-md transition-all flex flex-col cursor-pointer"
    >
      {/* Photo Preview Container */}
      <div className="relative aspect-[4/3] bg-[#FAF8F5] overflow-hidden select-none">
        <img
          src={photo.thumbnailUrl || photo.previewWatermarkedUrl}
          alt={`Photo code ${photo.code}`}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          loading="lazy"
        />

        {/* Diagonal Watermark Visual Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="transform -rotate-25 text-white/35 font-bold text-xs tracking-widest text-center select-none uppercase px-2 py-1 bg-black/15 backdrop-blur-[0.5px]">
            {event.title.substring(0, 18)} · PREVIEW · {photo.code}
          </div>
        </div>

        {/* Top-left Photo Code & Purchased Badge */}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <div className="bg-[#252723]/90 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono tabular-nums text-white">
            {photo.code}
          </div>
          {isPurchased && (
            <div className="bg-emerald-600/95 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-mono font-semibold text-white flex items-center gap-1 shadow-xs">
              <Check className="w-2.5 h-2.5" />
              <span>Purchased</span>
            </div>
          )}
        </div>

        {/* Top-right Quick Actions */}
        <div className="absolute top-2 right-2 flex items-center gap-1.5">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onOpenReportModal?.(photo);
            }}
            title="Report image concern"
            className="p-1.5 rounded bg-black/40 hover:bg-black/70 text-white/80 hover:text-white backdrop-blur-sm transition-colors"
          >
            <Flag className="w-3 h-3" />
          </button>
        </div>

        {/* Bottom Action Scrim */}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-3 flex items-end justify-between">
          <div>
            {isPurchased ? (
              <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-300 font-bold block">
                Master Unlocked
              </span>
            ) : (
              <span className="font-mono tabular-nums text-xs font-semibold text-white">
                {formatKES(photo.priceKes)}
              </span>
            )}
          </div>

          {isPurchased ? (
            <button
              type="button"
              onClick={handleDownloadMaster}
              disabled={isDownloading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm cursor-pointer disabled:opacity-50"
              title="Download Master File"
            >
              {isDownloading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5" />
                  <span>Download</span>
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={toggleCart}
              className={`flex items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors shadow-sm ${
                inCart
                  ? 'bg-[#B66D4D] text-white font-semibold'
                  : 'bg-white hover:bg-[#FAF8F5] text-[#252723]'
              }`}
            >
              {inCart ? (
                <>
                  <Check className="w-3 h-3" />
                  <span>In Cart</span>
                </>
              ) : (
                <>
                  <Plus className="w-3 h-3" />
                  <span>Add</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Metadata Footer */}
      <div className="p-2.5 bg-[#FAF8F5] flex items-center justify-between text-[11px] text-[#696B65]">
        <div className="truncate pr-2">
          <span>{photo.session || 'Main Session'}</span>
          <span className="mx-1.5 text-[#DCD8CE]">·</span>
          <span>{photo.category}</span>
        </div>
        <span className="text-[10px] font-mono text-[#696B65] shrink-0">24MP Master</span>
      </div>
    </div>
  );
};
