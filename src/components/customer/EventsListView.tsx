import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { EventCard } from './EventCard';
import {
  Search,
  ArrowRight,
  ShieldCheck,
  Smartphone,
  Download,
  Calendar,
} from 'lucide-react';

interface EventsListViewProps {
  onSelectEvent: (eventId: string) => void;
  onNavigateToLookup: () => void;
}

export const EventsListView: React.FC<EventsListViewProps> = ({
  onSelectEvent,
  onNavigateToLookup,
}) => {
  const { events, photographers, photos } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Published events only for customer view
  const publishedEvents = useMemo(() => {
    return events.filter((e) => e.status === 'published');
  }, [events]);

  const categories = ['all', 'Graduation', 'Wedding', 'Athletics & Sports', 'Corporate'];

  const filteredEvents = useMemo(() => {
    return publishedEvents.filter((ev) => {
      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const p = photographers.find((ph) => ph.id === ev.photographerId);
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchLocation = ev.location.toLowerCase().includes(q);
        const matchPhotographer = p?.businessName.toLowerCase().includes(q) || false;
        if (!matchTitle && !matchLocation && !matchPhotographer) return false;
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const titleLower = ev.title.toLowerCase();
        const descLower = ev.description.toLowerCase();
        const catsJoined = ev.categories.join(' ').toLowerCase();

        if (selectedCategory === 'Graduation') {
          if (!titleLower.includes('grad') && !descLower.includes('grad') && !catsJoined.includes('grad')) {
            return false;
          }
        } else if (selectedCategory === 'Wedding') {
          if (!titleLower.includes('wed') && !descLower.includes('wed') && !catsJoined.includes('wed')) {
            return false;
          }
        } else if (selectedCategory === 'Athletics & Sports') {
          if (!titleLower.includes('marathon') && !descLower.includes('run') && !catsJoined.includes('running')) {
            return false;
          }
        } else if (selectedCategory === 'Corporate') {
          if (!titleLower.includes('summit') && !descLower.includes('tech') && !descLower.includes('corp')) {
            return false;
          }
        }
      }

      return true;
    });
  }, [publishedEvents, searchQuery, selectedCategory, photographers]);

  return (
    <div className="space-y-12 pb-16">
      
      {/* Editorial Hero (Concise, balanced density) */}
      <section className="bg-[#FAF8F5] border-b border-[#DCD8CE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="max-w-3xl space-y-5">
            
            <p className="text-xs font-semibold tracking-wider text-[#35594B] uppercase font-mono">
              Event Photography Marketplace · Kenya
            </p>

            <h1 className="font-serif text-4xl sm:text-5xl lg:text-5xl text-[#252723] tracking-tight leading-[1.15]">
              Your moments. Your memories.
            </h1>

            <p className="text-base sm:text-lg text-[#696B65] leading-relaxed max-w-2xl">
              Find your event photos, choose your favourites, and download your original images with verified M-Pesa checkout.
            </p>

            {/* Prominent Search & Quick Discovery Field */}
            <div className="pt-2">
              <div className="relative max-w-xl">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#696B65]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by event name, university, venue, or photographer..."
                  className="w-full bg-white border border-[#DCD8CE] text-[#252723] text-sm pl-10 pr-10 py-3 rounded-xl focus:outline-none focus:border-[#35594B] shadow-sm transition-colors"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#696B65] hover:text-[#252723] text-xs"
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                onClick={() => {
                  const el = document.getElementById('galleries-grid');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="px-5 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white font-medium rounded-lg text-sm transition-colors flex items-center gap-2 shadow-sm"
              >
                <span>Explore Events</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={onNavigateToLookup}
                className="px-4 py-2.5 bg-white hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] rounded-lg text-sm font-medium transition-colors"
              >
                Find My Order
              </button>
            </div>

            {/* Trust and Policy markers */}
            <div className="pt-4 border-t border-[#DCD8CE] flex flex-wrap items-center gap-6 text-xs text-[#696B65]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-3.5 h-3.5 text-[#35594B]" />
                <span>M-Pesa STK Push Verified</span>
              </div>
              <div className="flex items-center gap-2">
                <Download className="w-3.5 h-3.5 text-[#35594B]" />
                <span>24MP Master Downloads</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-[#35594B]" />
                <span>90-Day Archive Retention</span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Published Events Section */}
      <section id="galleries-grid" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Section Header with Category Tabs */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-4 border-b border-[#DCD8CE]">
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#252723] tracking-tight">
              Recently Published Events
            </h2>
            <p className="text-xs text-[#696B65] mt-1">
              Active galleries cataloged by verified event photographers across Kenya
            </p>
          </div>

          {/* Category Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-md font-medium transition-colors whitespace-nowrap shrink-0 ${
                  selectedCategory === cat
                    ? 'bg-[#35594B] text-white shadow-sm'
                    : 'bg-white text-[#696B65] hover:text-[#252723] border border-[#DCD8CE] hover:bg-[#F4F0E7]'
                }`}
              >
                {cat === 'all' ? 'All Events' : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Meta Info */}
        <div className="flex items-center justify-between text-xs text-[#696B65] font-mono">
          <span style={{ fontFamily: 'system-ui' }}>
            Showing <strong className="text-[#252723] font-sans font-semibold">{filteredEvents.length}</strong> published galleries
          </span>
          <span style={{ fontFamily: 'Arial' }}>Currency: KES (Kenyan Shillings)</span>
        </div>

        {/* Real Events Grid */}
        {filteredEvents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((ev) => {
              const p = photographers.find((ph) => ph.id === ev.photographerId);
              const eventPhotoList = photos.filter((ph) => ph.eventId === ev.id && ph.status === 'published');
              const pCount = eventPhotoList.length;
              const fallbackCover = eventPhotoList[0]?.previewWatermarkedUrl || eventPhotoList[0]?.originalUrl;

              return (
                <EventCard
                  key={ev.id}
                  event={ev}
                  photographer={p}
                  photoCount={pCount}
                  coverImageFallback={fallbackCover}
                  onSelect={onSelectEvent}
                />
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#DCD8CE] rounded-xl p-12 text-center space-y-3">
            <p className="text-[#252723] font-medium">No published events found</p>
            <p className="text-xs text-[#696B65]">
              {searchQuery ? `No matching events for "${searchQuery}". Try different keywords.` : 'No published events currently available.'}
            </p>
            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
                className="mt-2 text-xs font-semibold text-[#35594B] hover:underline"
              >
                Clear all filters
              </button>
            )}
          </div>
        )}

      </section>

    </div>
  );
};
