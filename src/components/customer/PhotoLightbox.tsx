import React, { useEffect, useState } from 'react';
import { Photo, Event } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { X, Plus, Check, ShieldCheck, Flag, Download, CheckCircle2, Loader2, Camera, Share2 } from 'lucide-react';
import { triggerSingleDownload } from '../../utils/downloadHelper';

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
  const {
    events,
    photographers,
    addToCart,
    removeFromCart,
    isInCart,
    setIsCartOpen,
    setActivePaymentModal,
    isPhotoPurchased,
    verifyAndDownloadOriginal,
    openDownloadAllModal,
    getPurchasedPhotosForEvent,
  } = useApp();

  const event = events.find((e) => e.id === photo.eventId);
  const photographer = photographers.find((p) => p.id === photo.photographerId);
  const inCart = isInCart(photo.id);
  const { isPurchased, order } = isPhotoPurchased(photo.id);
  const [isDownloading, setIsDownloading] = useState(false);
  const [copiedLightboxLink, setCopiedLightboxLink] = useState(false);

  const handleLightboxShareWhatsapp = () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?event=${photo.eventId}`
      : `https://vault-photography.co.ke/?event=${photo.eventId}`;
    const text = `📸 Check out photo [${photo.code}] from *${event?.title || 'the event'}* on Vault!\n\n👉 View gallery: ${shareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank', 'noopener,noreferrer');
  };

  const handleLightboxCopyLink = async () => {
    const shareUrl = typeof window !== 'undefined'
      ? `${window.location.origin}${window.location.pathname}?event=${photo.eventId}`
      : `https://vault-photography.co.ke/?event=${photo.eventId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLightboxLink(true);
      setTimeout(() => setCopiedLightboxLink(false), 2200);
    } catch {}
  };

  const eventPurchasedItems = event ? getPurchasedPhotosForEvent(event.id) : [];

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleDownloadMaster = async () => {
    if (!order) {
      alert('Payment required: You must purchase this photo before downloading.');
      return;
    }
    setIsDownloading(true);
    try {
      const verification = verifyAndDownloadOriginal(order.id, photo.id);
      if (!verification.allowed || !verification.originalUrl) {
        alert(verification.error || 'Download not authorized. Please complete verified payment.');
        return;
      }
      await triggerSingleDownload(verification.originalUrl, `${photo.code}_ORIGINAL_24MP.jpg`);
    } catch (err: any) {
      console.error('Download error:', err);
      alert(err.message || 'Download failed');
    } finally {
      setTimeout(() => setIsDownloading(false), 800);
    }
  };

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
          {(() => {
            const photoLightboxSrc = (photo.previewWatermarkedUrl && photo.previewWatermarkedUrl.trim() !== '')
              ? photo.previewWatermarkedUrl.trim()
              : ((photo.thumbnailUrl && photo.thumbnailUrl.trim() !== '')
                ? photo.thumbnailUrl.trim()
                : ((photo.originalUrl && photo.originalUrl.trim() !== '') ? photo.originalUrl.trim() : null));

            if (!photoLightboxSrc) {
              return (
                <div className="flex flex-col items-center justify-center text-white/60 p-8 text-center">
                  <Camera className="w-12 h-12 mb-2 text-white/40" />
                  <span className="font-mono text-xs">{photo.code}</span>
                </div>
              );
            }

            return (
              <img
                src={photoLightboxSrc}
                alt={`Photo ${photo.code}`}
                referrerPolicy="no-referrer"
                className="max-h-[70vh] w-auto max-w-full object-contain mx-auto"
              />
            );
          })()}

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

            {/* Price Box or Purchased State */}
            {isPurchased ? (
              <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-800 font-bold block">
                    Verified Purchase
                  </span>
                  <p className="text-sm font-bold text-emerald-950 mt-0.5">
                    Unwatermarked Master Unlocked
                  </p>
                </div>
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
            ) : (
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
            )}

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
            {isPurchased ? (
              <>
                <button
                  onClick={handleDownloadMaster}
                  disabled={isDownloading}
                  className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm rounded-xl transition-colors shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Downloading Master File...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download Master Photo (24MP JPG)</span>
                    </>
                  )}
                </button>

                {eventPurchasedItems.length > 1 && (
                  <button
                    onClick={() => {
                      onClose();
                      openDownloadAllModal({
                        customItems: eventPurchasedItems,
                        eventTitle: event?.title,
                      });
                    }}
                    className="w-full py-2.5 bg-[#FAF8F5] hover:bg-[#F4F0E7] text-[#35594B] border border-[#35594B] font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download All ({eventPurchasedItems.length} Event Photos · ZIP)</span>
                  </button>
                )}
              </>
            ) : (
              <>
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
              </>
            )}

            <div className="flex items-center justify-between pt-2.5 text-[11px] text-[#696B65] border-t border-[#DCD8CE]">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleLightboxShareWhatsapp}
                  className="hover:text-[#25D366] transition-colors flex items-center gap-1 cursor-pointer font-medium"
                  title="Share to WhatsApp"
                >
                  <Share2 className="w-3 h-3 text-[#25D366]" />
                  <span>WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={handleLightboxCopyLink}
                  className="hover:text-[#35594B] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Copy gallery link"
                >
                  {copiedLightboxLink ? (
                    <span className="text-emerald-700 font-semibold">Link Copied!</span>
                  ) : (
                    <span>Copy Link</span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    onClose();
                    onOpenReportModal?.(photo);
                  }}
                  className="hover:text-rose-700 transition-colors flex items-center gap-1"
                >
                  <Flag className="w-3 h-3" />
                  <span>Report</span>
                </button>
                <span className="font-mono">Code: {photo.code}</span>
              </div>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};
