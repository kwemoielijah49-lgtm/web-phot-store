import React, { useEffect } from 'react';
import { Photo, Event } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { X, Plus, Check, ShieldCheck, Flag } from 'lucide-react';

interface PhotoLightboxProps {
  photo: Photo;
  onClose: () => void;
  onOpenReportModal?: (photo: Photo) => void;
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photo,
  onClose,
  onOpenReportModal,
}) => {
  const { events, photographers, addToCart, removeFromCart, isInCart, setIsCartOpen, setActivePaymentModal } = useApp();

  const event = events.find((e) => e.id === photo.eventId);
  const photographer = photographers.find((p) => p.id === photo.photographerId);
  const inCart = isInCart(photo.id);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleInstantBuy = () => {
    if (event) {
      if (!inCart) addToCart(photo, event);
      onClose();
      setIsCartOpen(false);
      setActivePaymentModal(true);
    }
  };

  const handleToggleCart = () => {
    if (!event) return;
    if (inCart) {
      removeFromCart(photo.id);
    } else {
      addToCart(photo, event);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl flex flex-col lg:flex-row my-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-20 p-2 rounded-full bg-white/90 hover:bg-white text-[#252723] transition-colors border border-[#DCD8CE] shadow-sm"
          aria-label="Close modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media Preview Column */}
        <div className="relative flex-1 bg-[#181917] flex items-center justify-center min-h-[360px] lg:min-h-[540px] p-4 select-none">
          <img
            src={photo.previewWatermarkedUrl || photo.thumbnailUrl}
            alt={`Photo ${photo.code}`}
            referrerPolicy="no-referrer"
            className="max-h-[70vh] w-auto max-w-full object-contain mx-auto"
          />

          {/* Persistent security watermark across display */}
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="transform -rotate-25 text-white/35 font-bold text-sm tracking-widest text-center select-none uppercase px-4 py-2 bg-black/25 backdrop-blur-[1px] border border-white/10 rounded">
              {photographer?.businessName || 'VAULT'} · WATERMARKED PREVIEW · [{photo.code}]
            </div>
          </div>
        </div>

        {/* Details & Commerce Column */}
        <div className="w-full lg:w-96 p-6 flex flex-col justify-between space-y-6 bg-white border-t lg:border-t-0 lg:border-l border-[#DCD8CE]">
          
          <div className="space-y-4">
            {/* Header info */}
            <div>
              <div className="flex items-center justify-between text-xs text-[#696B65] mb-1 font-mono">
                <span>Code: {photo.code}</span>
                <span className="text-[#35594B] font-semibold">{photographer?.businessName}</span>
              </div>
              <h2 className="font-serif text-xl font-bold text-[#252723] leading-snug">
                {event?.title || 'Event Photograph'}
              </h2>
            </div>

            {/* Price Box */}
            <div className="bg-[#FAF8F5] border border-[#DCD8CE] p-4 rounded-xl flex items-baseline justify-between">
              <div>
                <p className="text-xs text-[#696B65]">Digital Original (KES)</p>
                <p className="text-2xl font-bold font-mono tabular-nums text-[#252723] mt-0.5">
                  {formatKES(photo.priceKes)}
                </p>
              </div>
              <div className="text-right text-[11px] text-[#35594B] font-medium">
                <span>Instant M-Pesa Unlocking</span>
              </div>
            </div>

            {/* Photo Metadata */}
            <div className="space-y-2 text-xs border-y border-[#DCD8CE] py-3 text-[#696B65]">
              <div className="flex items-center justify-between">
                <span>Session</span>
                <span className="text-[#252723] font-medium">{photo.session || 'Main Ceremony'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Category</span>
                <span className="text-[#252723] font-medium">{photo.category}</span>
              </div>
              <div className="flex items-center justify-between font-mono">
                <span>Resolution</span>
                <span className="text-[#252723]">24MP Original ({photo.width} × {photo.height})</span>
              </div>
              {photo.lensInfo && (
                <div className="flex items-center justify-between text-[11px]">
                  <span>Equipment</span>
                  <span className="text-[#252723] truncate max-w-[180px]">{photo.lensInfo}</span>
                </div>
              )}
            </div>

            {/* Retention and delivery note */}
            <div className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg text-xs space-y-1.5 text-[#696B65]">
              <div className="flex items-center gap-1.5 text-[#35594B] font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>30-Day Download Guarantee</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Purchase removes all watermarks and delivers short-lived authenticated download links for high-resolution printing or archiving.
              </p>
            </div>
          </div>

          {/* Action CTAs */}
          <div className="space-y-2 pt-2">
            <button
              onClick={handleInstantBuy}
              className="w-full py-3 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2"
            >
              <span>Instant Buy with M-Pesa</span>
            </button>

            <button
              onClick={handleToggleCart}
              className={`w-full py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 ${
                inCart
                  ? 'bg-[#B66D4D] text-white'
                  : 'bg-[#FAF8F5] hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE]'
              }`}
            >
              {inCart ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Item In Cart (Remove)</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Cart ({formatKES(photo.priceKes)})</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between pt-2 text-[11px] text-[#696B65]">
              <button
                onClick={() => {
                  onClose();
                  onOpenReportModal?.(photo);
                }}
                className="hover:text-rose-700 transition-colors flex items-center gap-1"
              >
                <Flag className="w-3 h-3" />
                <span>Report Content</span>
              </button>
              <span className="font-mono">Code: {photo.code}</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
