import React from 'react';
import { Photo, Event } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { Plus, Check, Flag } from 'lucide-react';

interface PhotoCardProps {
  photo: Photo;
  event: Event;
  onOpenReportModal?: (photo: Photo) => void;
}

export const PhotoCard: React.FC<PhotoCardProps> = ({ photo, event, onOpenReportModal }) => {
  const { addToCart, removeFromCart, isInCart, setSelectedPhotoForLightbox } = useApp();
  const inCart = isInCart(photo.id);

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

        {/* Top-left Photo Code Badge */}
        <div className="absolute top-2 left-2 bg-[#252723]/90 backdrop-blur-sm px-2 py-0.5 rounded text-[11px] font-mono tabular-nums text-white">
          {photo.code}
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
            <span className="font-mono tabular-nums text-xs font-semibold text-white">
              {formatKES(photo.priceKes)}
            </span>
          </div>

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
