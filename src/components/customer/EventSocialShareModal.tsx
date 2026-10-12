import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { Event, Photographer } from '../../types';
import {
  X,
  Copy,
  Check,
  Share2,
  QrCode,
  Download,
  ExternalLink,
  Sparkles,
  Smartphone,
  MessageCircle,
  Camera,
  Layers,
  ArrowRight,
} from 'lucide-react';

interface EventSocialShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  event: Event;
  photographer?: Photographer;
}

export const EventSocialShareModal: React.FC<EventSocialShareModalProps> = ({
  isOpen,
  onClose,
  event,
  photographer,
}) => {
  const [activeTab, setActiveTab] = useState<'whatsapp' | 'instagram' | 'qrcode' | 'story_card'>('whatsapp');
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedIgCaption, setCopiedIgCaption] = useState(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [storyCardUrl, setStoryCardUrl] = useState<string>('');
  const [isGeneratingStoryCard, setIsGeneratingStoryCard] = useState<boolean>(false);
  const [selectedPresetIndex, setSelectedPresetIndex] = useState<number>(0);
  const [customWhatsappText, setCustomWhatsappText] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Compute clean share URL for this event
  const shareUrl = typeof window !== 'undefined'
    ? `${window.location.origin}${window.location.pathname}?event=${event.id}`
    : `https://vault-photography.co.ke/?event=${event.id}`;

  const eventDateFormatted = new Date(event.eventDate).toLocaleDateString('en-KE', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const studioName = photographer?.businessName || 'Vault Verified Studio';
  const photographerHandle = studioName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Pre-crafted WhatsApp message templates popular in Kenya
  const whatsappPresets = [
    {
      title: 'Attendee & Guest Invite',
      desc: 'Warm message for family, wedding, graduation, or gala groups',
      text: `📸 *${event.title}* Photos are now live on Vault!\n\nCaptured by *${studioName}* on ${eventDateFormatted}.\n\nBrowse the high-resolution gallery, search your photo code, and download watermarked-free originals with instant M-Pesa delivery.\n\n👉 View gallery here: ${shareUrl}`,
    },
    {
      title: 'Find Your Photo (Code Search)',
      desc: 'Direct prompt for attendees looking for their individual shots',
      text: `✨ Were you at *${event.title}*?\n\nThe official photography catalog is available now! Check your photo codes, preview watermarked masters, and unlock instant downloads.\n\n🔗 ${shareUrl}`,
    },
    {
      title: 'Quick & Direct Link',
      desc: 'Short link message for fast group or status broadcast',
      text: `Official Event Gallery: *${event.title}*\nPhotographer: ${studioName}\n\n👉 Link: ${shareUrl}`,
    },
  ];

  // Update text when preset changes
  useEffect(() => {
    setCustomWhatsappText(whatsappPresets[selectedPresetIndex]?.text || whatsappPresets[0].text);
  }, [selectedPresetIndex, event.id, shareUrl]);

  // Generate QR Code data URL
  useEffect(() => {
    let isSubscribed = true;
    QRCode.toDataURL(shareUrl, {
      width: 320,
      margin: 1,
      color: {
        dark: '#252723',
        light: '#FAF8F5',
      },
    })
      .then((url) => {
        if (isSubscribed) setQrCodeDataUrl(url);
      })
      .catch((err) => {
        console.error('Failed to generate QR code:', err);
      });
    return () => {
      isSubscribed = false;
    };
  }, [shareUrl]);

  // Generate Instagram / WhatsApp Status 9:16 Story Flyer on Canvas
  useEffect(() => {
    if (!isOpen) return;

    let isCancelled = false;
    setIsGeneratingStoryCard(true);

    const generateCard = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Background - Warm Charcoal Editorial gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
      bgGrad.addColorStop(0, '#1c1e1b');
      bgGrad.addColorStop(0.5, '#252723');
      bgGrad.addColorStop(1, '#111310');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, 1080, 1920);

      // Load cover image if available
      try {
        const coverImg = new Image();
        coverImg.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          coverImg.onload = () => resolve();
          coverImg.onerror = () => reject(new Error('Image load failed'));
          coverImg.src = event.coverImageUrl || '/public/favicon.svg';
        });

        // Draw cover photo taking upper 60% of story
        ctx.save();
        const imgH = 1100;
        // Aspect cover
        const imgRatio = coverImg.width / coverImg.height;
        const targetRatio = 1080 / imgH;
        let sWidth = coverImg.width;
        let sHeight = coverImg.height;
        let sx = 0;
        let sy = 0;

        if (imgRatio > targetRatio) {
          sWidth = coverImg.height * targetRatio;
          sx = (coverImg.width - sWidth) / 2;
        } else {
          sHeight = coverImg.width / targetRatio;
          sy = (coverImg.height - sHeight) / 2;
        }

        ctx.drawImage(coverImg, sx, sy, sWidth, sHeight, 0, 0, 1080, imgH);

        // Dark gradient overlay over photo bottom
        const photoOverlay = ctx.createLinearGradient(0, 400, 0, imgH);
        photoOverlay.addColorStop(0, 'rgba(37, 39, 35, 0)');
        photoOverlay.addColorStop(0.7, 'rgba(37, 39, 35, 0.7)');
        photoOverlay.addColorStop(1, 'rgba(37, 39, 35, 1)');
        ctx.fillStyle = photoOverlay;
        ctx.fillRect(0, 400, 1080, imgH - 400 + 4);
        ctx.restore();
      } catch {
        // Fallback elegant graphic pattern
        ctx.fillStyle = '#29473B';
        ctx.fillRect(0, 0, 1080, 900);
      }

      // Vault Brand Header Badge
      ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
      ctx.font = '600 32px "JetBrains Mono", monospace';
      ctx.fillText('VAULT · KENYA EVENT PHOTOGRAPHY', 80, 120);

      // Category / Status unboxed kicker
      ctx.fillStyle = '#B66D4D'; // Clay accent
      ctx.font = '700 28px "Inter", sans-serif';
      ctx.fillText('OFFICIAL PHOTOGRAPHY GALLERY', 80, 1160);

      // Event Title (Editorial Serif)
      ctx.fillStyle = '#FAF8F5';
      ctx.font = 'bold 64px "DM Serif Display", serif, Georgia';
      
      // Multi-line word wrap for event title
      const words = event.title.split(' ');
      let line = '';
      let titleY = 1240;
      const maxWidth = 920;
      const lineHeight = 76;

      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && n > 0) {
          ctx.fillText(line, 80, titleY);
          line = words[n] + ' ';
          titleY += lineHeight;
        } else {
          line = testLine;
        }
      }
      ctx.fillText(line, 80, titleY);

      // Event Details: Photographer, Date, Location
      const metaY = titleY + 60;
      ctx.fillStyle = '#DCD8CE';
      ctx.font = '500 32px "Inter", sans-serif';
      ctx.fillText(`Photographer: ${studioName}`, 80, metaY);
      ctx.fillText(`${eventDateFormatted} · ${event.location}`, 80, metaY + 48);

      // Divider line
      ctx.strokeStyle = 'rgba(220, 216, 206, 0.25)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(80, metaY + 90);
      ctx.lineTo(1000, metaY + 90);
      ctx.stroke();

      // Lower Section: QR code & Link Sticker CTA
      const footerY = metaY + 120;

      // Draw QR Code if ready
      if (qrCodeDataUrl) {
        try {
          const qrImg = new Image();
          await new Promise<void>((resolve, reject) => {
            qrImg.onload = () => resolve();
            qrImg.onerror = () => reject(new Error('QR load failed'));
            qrImg.src = qrCodeDataUrl;
          });
          // White rounded backdrop for QR
          ctx.fillStyle = '#FAF8F5';
          ctx.beginPath();
          ctx.roundRect(80, footerY, 210, 210, 24);
          ctx.fill();

          ctx.drawImage(qrImg, 95, footerY + 15, 180, 180);
        } catch {}
      }

      // Next to QR Code text:
      ctx.fillStyle = '#FAF8F5';
      ctx.font = 'bold 36px "DM Serif Display", serif';
      ctx.fillText('Scan or Tap Link to View', 330, footerY + 60);

      ctx.fillStyle = '#35594B';
      // Green sticker button representation
      ctx.beginPath();
      ctx.roundRect(330, footerY + 90, 480, 68, 16);
      ctx.fillStyle = '#25D366';
      ctx.fill();

      ctx.fillStyle = '#111310';
      ctx.font = 'bold 28px "Inter", sans-serif';
      ctx.fillText('🔗 TAP STORY LINK STICKER', 360, footerY + 134);

      ctx.fillStyle = '#9E9C94';
      ctx.font = '400 24px "Inter", sans-serif';
      ctx.fillText('Instant M-Pesa Unlocking · 24MP Original Masters', 330, footerY + 195);

      if (!isCancelled) {
        setStoryCardUrl(canvas.toDataURL('image/png'));
        setIsGeneratingStoryCard(false);
      }
    };

    generateCard();

    return () => {
      isCancelled = true;
    };
  }, [isOpen, event, photographer, qrCodeDataUrl]);

  if (!isOpen) return null;

  // Handlers
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2400);
    } catch {
      // fallback
    }
  };

  const handleCopyWhatsappMessage = async () => {
    try {
      await navigator.clipboard.writeText(customWhatsappText);
      setCopiedMessage(true);
      setTimeout(() => setCopiedMessage(false), 2400);
    } catch {}
  };

  const handleOpenWhatsapp = () => {
    const encodedText = encodeURIComponent(customWhatsappText);
    const whatsappWebUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    window.open(whatsappWebUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyIgCaption = async () => {
    const igCaption = `Reliving moments from ${event.title} 📸✨ Photos captured by @${photographerHandle} at ${event.location}.\n\n🔗 View full gallery & download your 24MP masters with M-Pesa via the link in our bio / story sticker: ${shareUrl}\n\n#KenyanPhotography #NairobiEvents #VaultKenya #${photographerHandle} #PhotographyKenya`;
    try {
      await navigator.clipboard.writeText(igCaption);
      setCopiedIgCaption(true);
      setTimeout(() => setCopiedIgCaption(false), 2400);
    } catch {}
  };

  const handleOpenInstagram = () => {
    window.open('https://www.instagram.com/', '_blank', 'noopener,noreferrer');
  };

  const handleDownloadQrCode = () => {
    if (!qrCodeDataUrl) return;
    const a = document.createElement('a');
    a.href = qrCodeDataUrl;
    a.download = `QR_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}_Vault.png`;
    a.click();
  };

  const handleDownloadStoryCard = () => {
    if (!storyCardUrl) return;
    const a = document.createElement('a');
    a.href = storyCardUrl;
    a.download = `Story_Flyer_${event.title.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    a.click();
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Official Event Gallery: ${event.title} (${studioName})`,
          url: shareUrl,
        });
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('Error sharing:', err);
        }
      }
    } else {
      handleCopyLink();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-2xl bg-[#FAF8F5] border border-[#DCD8CE] rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        
        {/* Modal Header */}
        <div className="bg-white border-b border-[#DCD8CE] px-6 py-4.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#EBF1EE] text-[#35594B] flex items-center justify-center shrink-0">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-[#696B65]">
                <span>{studioName}</span>
                <span aria-hidden="true">·</span>
                <span>{eventDateFormatted}</span>
              </div>
              <h2 className="font-serif text-xl sm:text-2xl font-bold text-[#252723] leading-tight line-clamp-1">
                Share Event Gallery
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-[#696B65] hover:text-[#252723] hover:bg-[#F4F0E7] rounded-lg transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Quick Link Banner */}
        <div className="bg-[#EFE9DC] border-b border-[#DCD8CE] px-6 py-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[#696B65] overflow-hidden flex-1">
            <span className="font-medium text-[#252723] shrink-0">Gallery Link:</span>
            <span className="font-mono text-[11px] text-[#35594B] truncate select-all">
              {shareUrl}
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleCopyLink}
              className="px-3 py-1.5 bg-white hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
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

            {typeof navigator !== 'undefined' && typeof navigator.share === 'function' && (
              <button
                onClick={handleNativeShare}
                className="px-3 py-1.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg font-medium text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                title="Open native device share sheet"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Device Share</span>
              </button>
            )}
          </div>
        </div>

        {/* Channel Navigation Segmented Controls */}
        <div className="px-6 pt-4 pb-2 bg-[#FAF8F5] border-b border-[#DCD8CE]">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 p-1 bg-[#EAE6DC] rounded-xl">
            {/* WhatsApp Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('whatsapp')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'whatsapp'
                  ? 'bg-white text-[#1E3A2F] shadow-xs'
                  : 'text-[#696B65] hover:text-[#252723]'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-[#25D366]"></span>
              <span>WhatsApp</span>
            </button>

            {/* Instagram Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('instagram')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'instagram'
                  ? 'bg-white text-[#833AB4] shadow-xs'
                  : 'text-[#696B65] hover:text-[#252723]'
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#E1306C]" />
              <span>Instagram</span>
            </button>

            {/* Story Flyer Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('story_card')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'story_card'
                  ? 'bg-white text-[#B66D4D] shadow-xs'
                  : 'text-[#696B65] hover:text-[#252723]'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#B66D4D]" />
              <span>Story Flyer</span>
            </button>

            {/* In-Person QR Code Tab */}
            <button
              type="button"
              onClick={() => setActiveTab('qrcode')}
              className={`py-2 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'qrcode'
                  ? 'bg-white text-[#252723] shadow-xs'
                  : 'text-[#696B65] hover:text-[#252723]'
              }`}
            >
              <QrCode className="w-3.5 h-3.5 text-[#252723]" />
              <span>Venue QR</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          
          {/* TAB 1: WHATSAPP */}
          {activeTab === 'whatsapp' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5 bg-emerald-50/80 border border-emerald-200 rounded-xl p-4">
                <div className="w-9 h-9 rounded-full bg-[#25D366] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <MessageCircle className="w-5 h-5 fill-current" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-emerald-950">
                    Share directly to WhatsApp Chat, Groups, or Status
                  </h3>
                  <p className="text-xs text-emerald-800/90 mt-0.5 leading-relaxed">
                    WhatsApp is Kenya’s most popular channel for wedding guests, graduation families, and corporate event photo delivery. Select a message style below or edit as desired.
                  </p>
                </div>
              </div>

              {/* Message Templates / Presets */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-[#252723] uppercase tracking-wider block">
                  Select Kenyan Message Preset:
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {whatsappPresets.map((preset, idx) => (
                    <button
                      key={preset.title}
                      type="button"
                      onClick={() => setSelectedPresetIndex(idx)}
                      className={`text-left p-3 rounded-xl border transition-all text-xs cursor-pointer ${
                        selectedPresetIndex === idx
                          ? 'bg-[#EBF1EE] border-[#35594B] text-[#1E3A2F] ring-1 ring-[#35594B]'
                          : 'bg-white border-[#DCD8CE] text-[#696B65] hover:border-[#35594B]/50'
                      }`}
                    >
                      <div className="font-medium text-[#252723]">{preset.title}</div>
                      <div className="text-[11px] text-[#696B65] mt-1 line-clamp-2">
                        {preset.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Editable Message Box */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-[#696B65]">
                  <span className="font-medium text-[#252723]">WhatsApp Message Preview:</span>
                  <span>Ready to send</span>
                </div>
                <textarea
                  rows={5}
                  value={customWhatsappText}
                  onChange={(e) => setCustomWhatsappText(e.target.value)}
                  className="w-full bg-white border border-[#DCD8CE] rounded-xl p-3.5 text-xs text-[#252723] leading-relaxed font-sans focus:outline-none focus:border-[#35594B] focus:ring-1 focus:ring-[#35594B]"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleOpenWhatsapp}
                  className="w-full sm:flex-1 py-3 px-4 bg-[#25D366] hover:bg-[#1EBE5D] text-white font-semibold text-xs rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <MessageCircle className="w-4 h-4 fill-white" />
                  <span>Open WhatsApp & Send</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>

                <button
                  type="button"
                  onClick={handleCopyWhatsappMessage}
                  className="w-full sm:w-auto py-3 px-4 bg-white hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] font-semibold text-xs rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span className="text-emerald-700">Copied to Clipboard!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-[#696B65]" />
                      <span>Copy Message</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: INSTAGRAM */}
          {activeTab === 'instagram' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5 bg-gradient-to-r from-purple-50 via-pink-50 to-amber-50 border border-purple-200/80 rounded-xl p-4">
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Camera className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[#252723]">
                    Instagram Story Link Sticker & Profile Sharing
                  </h3>
                  <p className="text-xs text-[#696B65] mt-0.5 leading-relaxed">
                    Share photos from <strong>{event.title}</strong> on your Instagram Story or Feed. Use the Link Sticker so your followers can tap straight into this 24MP gallery!
                  </p>
                </div>
              </div>

              {/* Step-by-step Guide */}
              <div className="bg-white border border-[#DCD8CE] rounded-xl p-4 space-y-3">
                <h4 className="text-xs font-semibold text-[#252723] uppercase tracking-wider flex items-center gap-1.5">
                  <span>How to Share in Instagram Stories:</span>
                </h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DC] rounded-lg space-y-1">
                    <span className="w-5 h-5 rounded-full bg-[#35594B] text-white text-[11px] font-bold flex items-center justify-center">1</span>
                    <p className="font-semibold text-[#252723] pt-1">Copy Gallery Link</p>
                    <p className="text-[#696B65] text-[11px]">Copy the unique Vault event link below to your clipboard.</p>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DC] rounded-lg space-y-1">
                    <span className="w-5 h-5 rounded-full bg-[#35594B] text-white text-[11px] font-bold flex items-center justify-center">2</span>
                    <p className="font-semibold text-[#252723] pt-1">Create Story or Post</p>
                    <p className="text-[#696B65] text-[11px]">Upload an event photo or use our pre-made Story Flyer.</p>
                  </div>

                  <div className="p-3 bg-[#FAF8F5] border border-[#EAE6DC] rounded-lg space-y-1">
                    <span className="w-5 h-5 rounded-full bg-[#35594B] text-white text-[11px] font-bold flex items-center justify-center">3</span>
                    <p className="font-semibold text-[#252723] pt-1">Add Link Sticker</p>
                    <p className="text-[#696B65] text-[11px]">Tap the sticker icon, choose <strong>LINK</strong>, and paste your URL.</p>
                  </div>
                </div>
              </div>

              {/* Action 1: Copy Link for Sticker */}
              <div className="p-4 bg-white border border-[#DCD8CE] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-[#252723]">Story Link Sticker URL</div>
                  <div className="font-mono text-[11px] text-[#35594B] truncate max-w-sm sm:max-w-md">
                    {shareUrl}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Story Link</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenInstagram}
                    className="px-3 py-2 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    <span>Launch Instagram</span>
                    <ExternalLink className="w-3.5 h-3.5 text-[#696B65]" />
                  </button>
                </div>
              </div>

              {/* Action 2: Instagram Caption Generator */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#252723]">Suggested Instagram Post Caption & Tags:</span>
                  <button
                    type="button"
                    onClick={handleCopyIgCaption}
                    className="text-[#35594B] hover:text-[#29473B] font-semibold flex items-center gap-1 text-xs cursor-pointer"
                  >
                    {copiedIgCaption ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Caption Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Caption</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="p-3 bg-white border border-[#DCD8CE] rounded-xl text-xs text-[#696B65] font-mono leading-relaxed select-all">
                  Reliving moments from {event.title} 📸✨ Photos captured by @{photographerHandle} at {event.location}.
                  <br /><br />
                  🔗 View full gallery & download your 24MP masters with M-Pesa via the link in our bio / story sticker: {shareUrl}
                  <br /><br />
                  #KenyanPhotography #NairobiEvents #VaultKenya #{photographerHandle} #PhotographyKenya
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: STORY FLYER GENERATOR (1080x1920) */}
          {activeTab === 'story_card' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5 bg-amber-50/70 border border-amber-200/80 rounded-xl p-4">
                <div className="w-9 h-9 rounded-full bg-[#B66D4D] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[#252723]">
                    Ready-to-Post 9:16 Instagram Story & WhatsApp Status Flyer
                  </h3>
                  <p className="text-xs text-[#696B65] mt-0.5 leading-relaxed">
                    Instantly download an editorial visual flyer featuring your event cover image, date, venue, photographer credit, and scannable QR code!
                  </p>
                </div>
              </div>

              {/* Story Preview & Download */}
              <div className="flex flex-col sm:flex-row items-center gap-6 bg-white border border-[#DCD8CE] rounded-xl p-5">
                <div className="relative w-44 h-78 bg-[#181917] rounded-xl overflow-hidden shadow-md shrink-0 border border-black/10 flex items-center justify-center">
                  {storyCardUrl ? (
                    <img
                      src={storyCardUrl}
                      alt="Story Preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="text-xs text-white/50 text-center p-4">
                      {isGeneratingStoryCard ? 'Rendering Story...' : 'Preview'}
                    </div>
                  )}
                  <div className="absolute top-2 right-2 text-[9px] bg-black/60 text-white font-mono px-1.5 py-0.5 rounded">
                    9:16 HD
                  </div>
                </div>

                <div className="space-y-3 flex-1 text-center sm:text-left">
                  <div>
                    <span className="text-[10px] font-mono uppercase tracking-wider text-[#B66D4D] font-bold block">
                      Social Asset Generator
                    </span>
                    <h4 className="font-serif text-lg font-bold text-[#252723]">
                      {event.title}
                    </h4>
                    <p className="text-xs text-[#696B65] mt-1">
                      Contains the event title, {studioName} watermark, QR code, and sticker prompt.
                    </p>
                  </div>

                  <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handleDownloadStoryCard}
                      disabled={!storyCardUrl}
                      className="w-full sm:w-auto px-5 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>Download Story Flyer (PNG)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyLink}
                      className="w-full sm:w-auto px-4 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-xl text-xs font-medium flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700">Link Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Story Link</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-[11px] text-[#696B65] pt-1">
                    Tip: Post this image to your Instagram Story or WhatsApp Status, then add the <strong>Link Sticker</strong>!
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: VENUE / IN-PERSON QR CODE */}
          {activeTab === 'qrcode' && (
            <div className="space-y-5 animate-in fade-in duration-200">
              <div className="flex items-start gap-3.5 bg-[#EBF1EE] border border-[#DCD8CE] rounded-xl p-4">
                <div className="w-9 h-9 rounded-full bg-[#35594B] text-white flex items-center justify-center shrink-0 shadow-xs">
                  <QrCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-medium text-sm text-[#252723]">
                    In-Person QR Code Display for Venue Guests
                  </h3>
                  <p className="text-xs text-[#696B65] mt-0.5 leading-relaxed">
                    Show this on your phone or tablet screen so guests, brides, and graduates can scan immediately with their phone camera to open the gallery.
                  </p>
                </div>
              </div>

              <div className="bg-white border border-[#DCD8CE] rounded-xl p-6 flex flex-col items-center justify-center text-center space-y-4">
                <div className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-2xl shadow-sm">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt={`QR code for ${event.title}`}
                      className="w-48 h-48 sm:w-56 sm:h-56 object-contain"
                    />
                  ) : (
                    <div className="w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center text-xs text-[#696B65]">
                      Generating QR...
                    </div>
                  )}
                </div>

                <div className="max-w-md space-y-1">
                  <h4 className="font-serif text-lg font-bold text-[#252723]">
                    {event.title}
                  </h4>
                  <p className="text-xs text-[#696B65]">
                    Scan using any smartphone camera to open the gallery & search photos.
                  </p>
                </div>

                <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleDownloadQrCode}
                    className="px-4 py-2 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download QR Code Image</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-[#FAF8F5] hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-all cursor-pointer"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Link Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer */}
        <div className="bg-[#FAF8F5] border-t border-[#DCD8CE] px-6 py-3.5 flex items-center justify-between text-xs text-[#696B65]">
          <span className="font-sans">
            Optimized for Kenyan photography distribution
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-white hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] rounded-lg font-medium text-xs transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
