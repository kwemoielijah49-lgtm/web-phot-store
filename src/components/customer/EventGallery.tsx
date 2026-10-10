import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { PhotoCard } from './PhotoCard';
import { Photo } from '../../types';
import { formatKES } from '../../utils/mpesa';
import {
  ArrowLeft,
  Search,
  Calendar,
  MapPin,
  Clock,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Download,
  CheckCircle2,
  ShieldCheck,
} from 'lucide-react';

interface EventGalleryProps {
  eventId: string;
  onBack: () => void;
  onOpenReportModal: (photo: Photo) => void;
}

export const EventGallery: React.FC<EventGalleryProps> = ({
  eventId,
  onBack,
  onOpenReportModal,
}) => {
  const {
    events,
    photos,
    photographers,
    cart,
    setIsCartOpen,
    getCartTotals,
    getPurchasedPhotosForEvent,
    openDownloadAllModal,
  } = useApp();

  const event = events.find((e) => e.id === eventId);
  const photographer = photographers.find((p) => p.id === event?.photographerId);

  // Filters state
  const [searchCode, setSearchCode] = useState<string>('');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'code_asc' | 'code_desc' | 'time'>('code_asc');
  const [filterPurchasedOnly, setFilterPurchasedOnly] = useState<boolean>(false);

  // Purchased photos by this customer for this event
  const purchasedItems = useMemo(() => {
    return getPurchasedPhotosForEvent(eventId);
  }, [getPurchasedPhotosForEvent, eventId]);

  const purchasedPhotoIds = useMemo(() => {
    return new Set(purchasedItems.map((p) => p.item.photoId));
  }, [purchasedItems]);

  const eventPhotos = useMemo(() => {
    return photos.filter((p) => p.eventId === eventId && p.status === 'published');
  }, [photos, eventId]);

  // Unique sessions and categories in this event
  const sessions = useMemo(() => {
    if (!event) return [];
    return event.sessions || [];
  }, [event]);

  const categories = useMemo(() => {
    if (!event) return [];
    return event.categories || [];
  }, [event]);

  // Filtered photos
  const filteredPhotos = useMemo(() => {
    return eventPhotos
      .filter((photo) => {
        // Search by code or filename
        if (searchCode.trim()) {
          const q = searchCode.trim().toLowerCase();
          const matchCode = photo.code.toLowerCase().includes(q);
          const matchFilename = photo.filename.toLowerCase().includes(q);
          if (!matchCode && !matchFilename) return false;
        }

        // Session filter
        if (selectedSession !== 'all' && photo.session !== selectedSession) {
          return false;
        }

        // Category filter
        if (selectedCategory !== 'all' && photo.category !== selectedCategory) {
          return false;
        }

        // Purchased only filter
        if (filterPurchasedOnly && !purchasedPhotoIds.has(photo.id)) {
          return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'code_asc') return a.code.localeCompare(b.code, undefined, { numeric: true });
        if (sortBy === 'code_desc') return b.code.localeCompare(a.code, undefined, { numeric: true });
        return new Date(b.captureTimestamp).getTime() - new Date(a.captureTimestamp).getTime();
      });
  }, [eventPhotos, searchCode, selectedSession, selectedCategory, sortBy, filterPurchasedOnly, purchasedPhotoIds]);

  const totals = getCartTotals();

  if (!event) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center space-y-4">
        <p className="text-[#252723] font-semibold text-lg">Event gallery not found</p>
        <button
          onClick={onBack}
          className="px-4 py-2 bg-[#35594B] text-white rounded-lg text-sm font-medium"
        >
          Return to Events
        </button>
      </div>
    );
  }

  const eventDateStr = new Date(event.eventDate).toLocaleDateString('en-KE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const daysRemaining = Math.max(
    0,
    Math.ceil((new Date(event.retentionDeadline).getTime() - Date.now()) / (1000 * 3600 * 24))
  );

  const resetFilters = () => {
    setSearchCode('');
    setSelectedSession('all');
    setSelectedCategory('all');
    setFilterPurchasedOnly(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-20">
      
      {/* Back button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-[#696B65] hover:text-[#252723] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to All Events</span>
        </button>

        {purchasedItems.length > 0 && (
          <button
            onClick={() =>
              openDownloadAllModal({
                customItems: purchasedItems,
                eventTitle: event.title,
              })
            }
            className="sm:hidden px-3.5 py-1.5 bg-[#35594B] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download All ({purchasedItems.length})</span>
          </button>
        )}
      </div>

      {/* Customer Delivery Banner for Purchased Event Photos */}
      {purchasedItems.length > 0 && (
        <section className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-5 animate-in fade-in duration-300">
          <div className="flex items-start gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-100 border border-emerald-300/80 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="font-serif text-lg sm:text-xl font-bold text-emerald-950">
                  You Have {purchasedItems.length} Purchased {purchasedItems.length === 1 ? 'Photo' : 'Photos'} in This Event
                </h2>
                <span className="text-[10px] bg-emerald-200/90 text-emerald-900 font-mono font-bold px-2 py-0.5 rounded">
                  AUTHENTICATED MASTERS
                </span>
              </div>
              <p className="text-xs text-emerald-800/90 leading-relaxed max-w-2xl">
                Your watermark-free, 24MP full-resolution master files are unlocked and ready for instant delivery and download.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() =>
                openDownloadAllModal({
                  customItems: purchasedItems,
                  eventTitle: event.title,
                })
              }
              className="px-5 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-sm transition-all hover:shadow"
            >
              <Download className="w-4 h-4" />
              <span>Download All ({purchasedItems.length} Photos · ZIP)</span>
            </button>

            <button
              onClick={() => setFilterPurchasedOnly(!filterPurchasedOnly)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold border transition-all ${
                filterPurchasedOnly
                  ? 'bg-emerald-800 text-white border-emerald-800'
                  : 'bg-white hover:bg-emerald-100 text-emerald-900 border-emerald-300'
              }`}
            >
              {filterPurchasedOnly ? 'Show Full Gallery' : 'View Purchased Only'}
            </button>
          </div>
        </section>
      )}

      {/* Event Header Banner */}
      <section className="bg-white border border-[#DCD8CE] rounded-xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="space-y-3 flex-1">
            {/* Metadata: unboxed text */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#696B65] font-medium">
              <span className="text-[#35594B] font-semibold">{photographer?.businessName || 'Verified Studio'}</span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#35594B]" />
                {eventDateStr}
              </span>
              <span aria-hidden="true">·</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#35594B]" />
                {event.location}
              </span>
            </div>

            <h1 className="font-serif text-3xl sm:text-4xl text-[#252723] tracking-tight leading-tight">
              {event.title}
            </h1>

            <p className="text-sm text-[#696B65] leading-relaxed max-w-3xl">
              {event.description}
            </p>
          </div>

          {/* Pricing & Retention Snapshot Box */}
          <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 sm:min-w-[260px] space-y-3">
            <div className="flex items-center justify-between text-xs text-[#696B65]">
              <span>Individual Photo</span>
              <span className="font-mono tabular-nums text-sm font-semibold text-[#252723]">
                {formatKES(event.overridePriceKes || event.suggestedPriceKes)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs text-[#696B65] border-t border-[#DCD8CE] pt-2 font-mono">
              <span>Cataloged</span>
              <span className="text-[#252723] font-sans font-medium">{eventPhotos.length} high-res photos</span>
            </div>

            <div className="border-t border-[#DCD8CE] pt-2 flex items-center gap-1.5 text-[11px] text-[#696B65]">
              <Clock className="w-3.5 h-3.5 text-[#35594B]" />
              <span>Retention policy: {daysRemaining} days active</span>
            </div>
          </div>
        </div>

        {/* Bundle Deals Notice if configured */}
        {event.bundleOffers && event.bundleOffers.length > 0 && (
          <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 text-[#35594B]">
              <Sparkles className="w-4 h-4 text-[#B66D4D] shrink-0" />
              <span>
                <strong className="text-[#252723]">Volume Bundle Savings:</strong>{' '}
                {event.bundleOffers.map((b) => b.title).join(' · ')}
              </span>
            </div>
            <span className="text-[#696B65] text-[11px]">
              Automatically calculated in shopping cart
            </span>
          </div>
        )}
      </section>

      {/* Filter & Search Bar */}
      <section className="bg-white border border-[#DCD8CE] rounded-xl p-4 sm:p-5 space-y-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          
          {/* Search by photo code */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#696B65]" />
            <input
              type="text"
              value={searchCode}
              onChange={(e) => setSearchCode(e.target.value)}
              placeholder="Search photo code (e.g. UON-002, WED)..."
              className="w-full bg-[#FAF8F5] border border-[#DCD8CE] text-[#252723] text-xs pl-9 pr-4 py-2 rounded-lg focus:outline-none focus:border-[#35594B] font-mono"
            />
            {searchCode && (
              <button
                onClick={() => setSearchCode('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#696B65] hover:text-[#252723] text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Sort By Dropdown & Purchased Filter */}
          <div className="flex items-center gap-3">
            {purchasedItems.length > 0 && (
              <button
                type="button"
                onClick={() => setFilterPurchasedOnly(!filterPurchasedOnly)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                  filterPurchasedOnly
                    ? 'bg-emerald-800 text-white shadow-xs'
                    : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Purchased ({purchasedItems.length})</span>
              </button>
            )}

            <div className="flex items-center gap-2 text-xs text-[#696B65]">
              <span>Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-[#FAF8F5] border border-[#DCD8CE] text-[#252723] rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-[#35594B]"
              >
                <option value="code_asc">Photo Code (Ascending)</option>
                <option value="code_desc">Photo Code (Descending)</option>
                <option value="time">Capture Time (Latest)</option>
              </select>
            </div>
          </div>

        </div>

        {/* Sessions Filter Pills */}
        {sessions.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs pt-1 border-t border-[#DCD8CE]">
            <span className="text-[#696B65] shrink-0 font-medium text-[11px] uppercase tracking-wider">Session:</span>
            <button
              onClick={() => setSelectedSession('all')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                selectedSession === 'all'
                  ? 'bg-[#35594B] text-white font-medium'
                  : 'bg-[#FAF8F5] text-[#696B65] hover:text-[#252723] border border-[#DCD8CE]'
              }`}
            >
              All Sessions ({eventPhotos.length})
            </button>
            {sessions.map((sess) => {
              const count = eventPhotos.filter((p) => p.session === sess).length;
              return (
                <button
                  key={sess}
                  onClick={() => setSelectedSession(sess)}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                    selectedSession === sess
                      ? 'bg-[#35594B] text-white font-medium'
                      : 'bg-[#FAF8F5] text-[#696B65] hover:text-[#252723] border border-[#DCD8CE]'
                  }`}
                >
                  {sess} ({count})
                </button>
              );
            })}
          </div>
        )}

        {/* Categories Filter Pills */}
        {categories.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs pt-1 border-t border-[#DCD8CE]">
            <span className="text-[#696B65] shrink-0 font-medium text-[11px] uppercase tracking-wider">Category:</span>
            <button
              onClick={() => setSelectedCategory('all')}
              className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                selectedCategory === 'all'
                  ? 'bg-[#35594B] text-white font-medium'
                  : 'bg-[#FAF8F5] text-[#696B65] hover:text-[#252723] border border-[#DCD8CE]'
              }`}
            >
              All Categories
            </button>
            {categories.map((cat) => {
              const count = eventPhotos.filter((p) => p.category === cat).length;
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 rounded-md transition-colors whitespace-nowrap text-xs ${
                    selectedCategory === cat
                      ? 'bg-[#35594B] text-white font-medium'
                      : 'bg-[#FAF8F5] text-[#696B65] hover:text-[#252723] border border-[#DCD8CE]'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>
        )}

      </section>

      {/* Photos Grid */}
      <section className="space-y-4">
        <div className="flex items-center justify-between text-xs text-[#696B65]">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong className="text-[#252723]">{filteredPhotos.length}</strong> of {eventPhotos.length} photos
              {filterPurchasedOnly && <span className="ml-1 text-emerald-800 font-medium">(Purchased Only)</span>}
            </span>
            {filterPurchasedOnly && purchasedItems.length > 0 && (
              <button
                onClick={() =>
                  openDownloadAllModal({
                    customItems: purchasedItems,
                    eventTitle: event.title,
                  })
                }
                className="text-[#35594B] hover:underline font-semibold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download All ({purchasedItems.length})</span>
              </button>
            )}
          </div>
          {(searchCode || selectedSession !== 'all' || selectedCategory !== 'all' || filterPurchasedOnly) && (
            <button
              onClick={resetFilters}
              className="text-[#35594B] hover:underline flex items-center gap-1 font-medium cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset active filters</span>
            </button>
          )}
        </div>

        {filteredPhotos.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredPhotos.map((photo) => (
              <PhotoCard
                key={photo.id}
                photo={photo}
                event={event}
                onOpenReportModal={onOpenReportModal}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-[#DCD8CE] rounded-xl p-12 text-center space-y-3">
            <p className="text-[#252723] font-medium">No photos match your filter</p>
            <p className="text-xs text-[#696B65]">
              Try searching with a partial code or reset session and category selections.
            </p>
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-[#35594B] text-white text-xs font-semibold rounded-lg"
            >
              Reset Filters
            </button>
          </div>
        )}
      </section>

      {/* Floating Bottom Cart Bar (if items in cart) */}
      {cart.length > 0 && (
        <aside className="fixed bottom-4 left-1/2 -translate-x-1/2 z-30 bg-[#252723] text-white px-5 py-3 rounded-full shadow-2xl border border-white/20 flex items-center gap-4 text-xs">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-emerald-400" />
            <span>
              <strong>{totals.itemCount}</strong> {totals.itemCount === 1 ? 'photo' : 'photos'} in cart
            </span>
            <span aria-hidden="true" className="text-white/40">·</span>
            <span className="font-mono font-bold text-white tabular-nums">
              {formatKES(totals.totalKes)}
            </span>
          </div>

          <button
            onClick={() => setIsCartOpen(true)}
            className="px-4 py-1.5 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold rounded-full transition-colors"
          >
            Review Cart & Checkout
          </button>
        </aside>
      )}

    </div>
  );
};
