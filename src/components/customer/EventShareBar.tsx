import React, { useState } from 'react';
import { Event, Photographer } from '../../types';
import {
  Share2,
  Copy,
  Check,
  MessageCircle,
  Camera,
  QrCode,
  Sparkles,
  ExternalLink,
  Smartphone,
} from 'lucide-react';

interface EventShareBarProps {
  event: Event;
  photographer?: Photographer;
  onOpenFullModal: () => void;
}

export const EventShareBar: React.FC<EventShareBarProps> = ({
  event,
  photographer,
  onOpenFullModal,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [showQuickFeedback, setShowQuickFeedback] = useState<string | null>(null);

  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?event=${event.id}`
    : `https://vault-photography.co.ke/?event=${event.id}`;

  const studioName = photographer?.businessName || 'Vault Verified Studio';
  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-KE', {
    month: 'short',
    day: 'numeric',
  });

  const defaultWhatsappMessage = `📸 *${event.title}* Photos are now live on Vault!\n\nCaptured by *${studioName}* (${eventDateFormatted}).\n\nBrowse the gallery, search your photo code, and unlock 24MP instant downloads via M-Pesa:\n👉 ${shareUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setShowQuickFeedback('Link copied to clipboard!');
      setTimeout(() => {
        setCopiedLink(false);
        setShowQuickFeedback(null);
      }, 2500);
    } catch {
      // fallback
    }
  };

  const handleDirectWhatsapp = (e: React.MouseEvent) => {
    e.stopPropagation();
    const encoded = encodeURIComponent(defaultWhatsappMessage);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank', 'noopener,noreferrer');
  };

  const handleDirectInstagram = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShowQuickFeedback('Story Link copied! Open Instagram and add Link Sticker 🔗');
      setTimeout(() => setShowQuickFeedback(null), 3500);
    } catch {}
    // Also trigger modal so they can download the story flyer or launch IG
    onOpenFullModal();
  };

  const handleNativeShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Check out the photos from ${event.title} on Vault (${studioName}):`,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyLink();
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-3.5 sm:p-4 shadow-2xs">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        
        {/* Left: Heading & Context */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#EBF1EE] text-[#35594B] flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 text-xs">
              <span className="font-semibold text-[#252723]">Share Event Gallery</span>
              <span className="text-[#696B65] hidden sm:inline">·</span>
              <span className="text-[#696B65] text-[11px] hidden sm:inline">
                Invite guests, wedding parties, graduates & friends
              </span>
            </div>
            <div className="text-[11px] text-[#696B65] mt-0.5 truncate max-w-xs sm:max-w-md font-mono">
              {shareUrl}
            </div>
          </div>
        </div>

        {/* Right: Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          
          {/* WhatsApp One-Click Action */}
          <button
            type="button"
            onClick={handleDirectWhatsapp}
            className="px-3 py-1.5 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Share directly to WhatsApp"
          >
            <MessageCircle className="w-3.5 h-3.5 fill-white" />
            <span>WhatsApp</span>
          </button>

          {/* Instagram Story Action */}
          <button
            type="button"
            onClick={handleDirectInstagram}
            className="px-3 py-1.5 bg-gradient-to-r from-[#833AB4] via-[#FD1D1D] to-[#F77737] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs hover:opacity-95 transition-all cursor-pointer"
            title="Share to Instagram Story Link Sticker"
          >
            <Camera className="w-3.5 h-3.5 text-white" />
            <span>Instagram Story</span>
          </button>

          {/* Copy Direct Link */}
          <button
            type="button"
            onClick={handleCopyLink}
            className="px-3 py-1.5 bg-white hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
            title="Copy share link to clipboard"
          >
            {copiedLink ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-[#696B65]" />
                <span>Copy Link</span>
              </>
            )}
          </button>

          {/* Native Device Share (Mobile) */}
          {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
            <button
              type="button"
              onClick={handleNativeShare}
              className="px-2.5 py-1.5 bg-white hover:bg-[#F4F0E7] text-[#35594B] border border-[#DCD8CE] rounded-lg text-xs font-medium flex items-center gap-1 transition-all cursor-pointer"
              title="Share via device options"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Share</span>
            </button>
          )}

          {/* More Options / Story Flyer / QR Code */}
          <button
            type="button"
            onClick={onOpenFullModal}
            className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#EAE6DC] text-[#35594B] border border-[#35594B]/30 hover:border-[#35594B] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#B66D4D]" />
            <span>Story Flyer & QR</span>
          </button>

        </div>

      </div>

      {/* Floating feedback toast if triggered */}
      {showQuickFeedback && (
        <div className="mt-2.5 pt-2 border-t border-[#EAE6DC] text-[11px] text-[#35594B] font-medium flex items-center gap-1.5 animate-in fade-in duration-150">
          <Check className="w-3.5 h-3.5 text-emerald-600" />
          <span>{showQuickFeedback}</span>
        </div>
      )}
    </div>
  );
};
