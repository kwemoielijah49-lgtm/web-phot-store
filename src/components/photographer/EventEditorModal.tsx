import React, { useState, useRef } from 'react';
import { Event, BundleOffer } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { generateCrispCoverImage } from '../../utils/imageProcessor';
import { HIGH_RES_PRESET_COVERS } from '../../utils/sampleData';
import { X, Calendar, MapPin, Tag, Layers, Sparkles, Clock, Image as ImageIcon, UploadCloud } from 'lucide-react';

interface EventEditorModalProps {
  initialEvent?: Event | null;
  onClose: () => void;
}

export const EventEditorModal: React.FC<EventEditorModalProps> = ({ initialEvent, onClose }) => {
  const { activePhotographerId, createEvent, updateEvent, platformSettings } = useApp();

  const isEditing = !!initialEvent;

  const [title, setTitle] = useState(initialEvent?.title || '');
  const [description, setDescription] = useState(initialEvent?.description || '');
  const [location, setLocation] = useState(initialEvent?.location || 'Nairobi, Kenya');
  const [eventDate, setEventDate] = useState(
    initialEvent?.eventDate || new Date().toISOString().split('T')[0]
  );
  const [priceKes, setPriceKes] = useState(
    initialEvent?.overridePriceKes || initialEvent?.suggestedPriceKes || platformSettings.suggestedPriceKes
  );
  const [coverImageUrl, setCoverImageUrl] = useState(initialEvent?.coverImageUrl || '');
  const [isProcessingCover, setIsProcessingCover] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sessions
  const [sessionsInput, setSessionsInput] = useState(
    initialEvent?.sessions.join(', ') || 'Morning Procession, Stage Crossing, Garden Portraits, Reception'
  );

  // Categories
  const [categoriesInput, setCategoriesInput] = useState(
    initialEvent?.categories.join(', ') || 'Stage Walk, Gown Portrait, Family Celebrate, VIPs'
  );

  // Bundle offer
  const [hasBundle, setHasBundle] = useState(
    initialEvent?.bundleOffers && initialEvent.bundleOffers.length > 0 ? true : true
  );
  const [bundleMinPhotos, setBundleMinPhotos] = useState(5);
  const [bundleDiscount, setBundleDiscount] = useState(20);

  const handleCoverFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingCover(true);
    try {
      const reader = new FileReader();
      reader.onload = () => {
        const img = new Image();
        img.onload = async () => {
          try {
            const crispDataUrl = await generateCrispCoverImage(img, 1600);
            setCoverImageUrl(crispDataUrl);
          } finally {
            setIsProcessingCover(false);
          }
        };
        img.onerror = () => setIsProcessingCover(false);
        img.src = reader.result as string;
      };
      reader.onerror = () => setIsProcessingCover(false);
      reader.readAsDataURL(file);
    } catch {
      setIsProcessingCover(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !location.trim()) return;

    const parsedSessions = sessionsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const parsedCategories = categoriesInput
      .split(',')
      .map((c) => c.trim())
      .filter(Boolean);

    // Compute 90-day retention deadline
    const evtTime = new Date(eventDate).getTime();
    const retentionDeadline = new Date(evtTime + 90 * 24 * 3600 * 1000).toISOString();

    const bundles: BundleOffer[] = hasBundle
      ? [
          {
            id: `b_${Date.now()}`,
            title: `Buy ${bundleMinPhotos}+ photos & save ${bundleDiscount}%`,
            minPhotos: Number(bundleMinPhotos),
            discountPercent: Number(bundleDiscount),
          },
        ]
      : [];

    if (isEditing && initialEvent) {
      updateEvent(initialEvent.id, {
        title,
        description,
        location,
        eventDate,
        coverImageUrl: coverImageUrl.trim(),
        overridePriceKes: Number(priceKes),
        sessions: parsedSessions,
        categories: parsedCategories,
        bundleOffers: bundles,
      });
    } else {
      createEvent({
        photographerId: activePhotographerId,
        title,
        slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        description,
        location,
        eventDate,
        status: 'published',
        coverImageUrl: coverImageUrl.trim(),
        sessions: parsedSessions,
        categories: parsedCategories,
        suggestedPriceKes: platformSettings.suggestedPriceKes,
        overridePriceKes: Number(priceKes),
        bundleOffers: bundles,
        retentionDeadline,
      });
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-6 border-b border-[#DCD8CE] flex items-center justify-between bg-[#FAF8F5]">
          <div>
            <h3 className="font-serif text-lg font-bold text-[#252723]">
              {isEditing ? 'Edit Event Details' : 'Create New Event Gallery'}
            </h3>
            <p className="text-xs text-[#696B65] mt-0.5">
              Event metadata, KES pricing overrides, and attendee discovery tags.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#696B65] hover:text-[#252723] hover:bg-[#F4F0E7]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto flex-1 space-y-5 text-xs">
          
          <div className="space-y-3">
            <div>
              <label className="block text-[#252723] font-medium mb-1">
                Event Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. University of Nairobi 72nd Graduation Ceremony"
                required
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] text-sm focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div>
              <label className="block text-[#252723] font-medium mb-1">
                Event Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Briefly describe the ceremony, sessions, and photography coverage..."
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Location / Venue *
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-[#696B65] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    required
                    placeholder="e.g. Main Campus Great Court, Nairobi"
                    className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg pl-8 p-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Event Date *
                </label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-[#696B65] absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="date"
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    required
                    className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg pl-8 p-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
                  />
                </div>
              </div>
            </div>

            {/* Event Cover Photo (Landing Page Clarity Feature) */}
            <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[#252723] flex items-center gap-1.5">
                    <ImageIcon className="w-4 h-4 text-[#35594B]" />
                    <span>Event Cover Photo (Landing Page Preview)</span>
                  </h4>
                  <p className="text-[11px] text-[#696B65]">
                    High-clarity image displayed on the landing page event grid.
                  </p>
                </div>
                <span className="text-[10px] font-mono text-[#35594B] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  HD 1600px
                </span>
              </div>

              <div className="flex gap-2">
                <input
                  type="url"
                  value={coverImageUrl}
                  onChange={(e) => setCoverImageUrl(e.target.value)}
                  placeholder="Paste direct high-resolution image URL (https://...)"
                  className="flex-1 bg-white border border-[#DCD8CE] rounded-lg p-2 text-[#252723] text-xs focus:outline-none focus:border-[#35594B]"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingCover}
                  className="px-3 py-2 bg-white hover:bg-[#F4F0E7] text-[#35594B] border border-[#DCD8CE] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0 disabled:opacity-50"
                >
                  <UploadCloud className="w-3.5 h-3.5" />
                  <span>{isProcessingCover ? 'Enhancing...' : 'Upload File'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleCoverFileUpload}
                  className="hidden"
                />
              </div>

              {/* Quick High-Res Presets */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-[#696B65] font-medium">Or choose a curated high-clarity sample:</p>
                <div className="flex flex-wrap gap-1.5">
                  {HIGH_RES_PRESET_COVERS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => setCoverImageUrl(preset.url)}
                      className={`px-2.5 py-1 rounded text-[10px] font-medium transition-colors border ${
                        coverImageUrl === preset.url
                          ? 'bg-[#35594B] text-white border-[#35594B]'
                          : 'bg-white text-[#696B65] border-[#DCD8CE] hover:text-[#252723] hover:bg-[#F4F0E7]'
                      }`}
                    >
                      {preset.theme}
                    </button>
                  ))}
                  {coverImageUrl && (
                    <button
                      type="button"
                      onClick={() => setCoverImageUrl('')}
                      className="px-2 py-1 rounded text-[10px] text-rose-600 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Live Preview Window */}
              {coverImageUrl && (
                <div className="relative aspect-[16/8] rounded-lg overflow-hidden border border-[#DCD8CE] bg-neutral-100 shadow-inner">
                  <img
                    src={coverImageUrl}
                    alt="Cover preview"
                    className="w-full h-full object-cover"
                    style={{ imageRendering: '-webkit-optimize-contrast' }}
                  />
                  <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded border border-white/20">
                    High Clarity Preview Active
                  </div>
                </div>
              )}
            </div>

            {/* Pricing Section */}
            <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-[#252723]">Pricing & Financials (KES)</h4>
                  <p className="text-[11px] text-[#696B65]">Photographer price per individual photo</p>
                </div>
                <div className="text-right font-mono text-[11px] text-[#696B65]">
                  <span>Platform suggested: {formatKES(platformSettings.suggestedPriceKes)}</span>
                </div>
              </div>

              <div>
                <label className="block text-[#696B65] font-medium mb-1">
                  Photo Sale Price (KES)
                </label>
                <input
                  type="number"
                  value={priceKes}
                  onChange={(e) => setPriceKes(Number(e.target.value))}
                  min={50}
                  step={25}
                  required
                  className="w-full bg-white border border-[#DCD8CE] rounded-lg p-2 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
                />
              </div>
            </div>

            {/* Organization Tagging */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Event Sessions (comma separated)
                </label>
                <input
                  type="text"
                  value={sessionsInput}
                  onChange={(e) => setSessionsInput(e.target.value)}
                  placeholder="Morning Session, Stage, Portraits"
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
                />
                <p className="text-[10px] text-[#696B65] mt-1">Helps attendees filter by schedule block.</p>
              </div>

              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Photo Categories (comma separated)
                </label>
                <input
                  type="text"
                  value={categoriesInput}
                  onChange={(e) => setCategoriesInput(e.target.value)}
                  placeholder="Stage Walk, Portraits, Crowd, VIPs"
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
                />
                <p className="text-[10px] text-[#696B65] mt-1">Enables fast sub-gallery navigation.</p>
              </div>
            </div>

            {/* Bundle Offer Configuration */}
            <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#B66D4D]" />
                  <span className="font-semibold text-[#252723]">Volume Bundle Discount</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasBundle}
                  onChange={(e) => setHasBundle(e.target.checked)}
                  className="rounded text-[#35594B]"
                />
              </div>

              {hasBundle && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#DCD8CE]">
                  <div>
                    <label className="block text-[#696B65] mb-1">Min Photos for Bundle</label>
                    <input
                      type="number"
                      value={bundleMinPhotos}
                      onChange={(e) => setBundleMinPhotos(Number(e.target.value))}
                      min={2}
                      max={50}
                      className="w-full bg-white border border-[#DCD8CE] rounded-lg p-2 text-[#252723] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[#696B65] mb-1">Discount Percentage (%)</label>
                    <input
                      type="number"
                      value={bundleDiscount}
                      onChange={(e) => setBundleDiscount(Number(e.target.value))}
                      min={5}
                      max={80}
                      className="w-full bg-white border border-[#DCD8CE] rounded-lg p-2 text-[#252723] font-mono"
                    />
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-[#DCD8CE] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg font-semibold transition-colors shadow-sm"
            >
              {isEditing ? 'Save Changes' : 'Create & Publish Event'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
