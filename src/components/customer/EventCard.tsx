import React from 'react';
import { Event, Photographer } from '../../types';
import { formatKES } from '../../utils/mpesa';
import { Camera, Clock } from 'lucide-react';

interface EventCardProps {
  event: Event;
  photographer?: Photographer;
  photoCount: number;
  coverImageFallback?: string;
  onSelect: (eventId: string) => void;
}

export const EventCard: React.FC<EventCardProps> = ({
  event,
  photographer,
  photoCount,
  coverImageFallback,
  onSelect,
}) => {
  // Format event date
  const formattedDate = new Date(event.eventDate).toLocaleDateString('en-KE', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  // Calculate days remaining on 90-day retention
  const retentionDate = new Date(event.retentionDeadline).getTime();
  const daysLeft = Math.max(0, Math.ceil((retentionDate - Date.now()) / (1000 * 3600 * 24)));

  const basePrice = event.overridePriceKes || event.suggestedPriceKes;
  const coverUrl = event.coverImageUrl || coverImageFallback;

  return (
    <article
      onClick={() => onSelect(event.id)}
      className="group cursor-pointer bg-white border border-[#DCD8CE] rounded-xl overflow-hidden hover:border-[#35594B] hover:shadow-md transition-all flex flex-col"
    >
      {/* Event Media Window */}
      <div className="relative aspect-[16/10] bg-[#FAF8F5] overflow-hidden flex items-center justify-center">
        {coverUrl ? (
          <>
            <img
              src={coverUrl}
              alt={event.title}
              referrerPolicy="no-referrer"
              loading="eager"
              decoding="async"
              style={{ imageRendering: '-webkit-optimize-contrast' }}
              className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500 ease-out"
            />
            {/* Subtle bottom vignette to ensure price badge and metadata contrast */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent pointer-events-none" />
          </>
        ) : (
          <div className="w-full h-full p-6 flex flex-col justify-between bg-gradient-to-br from-[#FAF8F5] to-[#EFE9DC] border-b border-[#DCD8CE]">
            <div className="flex items-center justify-between text-[#696B65] text-xs">
              <span className="font-mono" style={{ fontFamily: 'Arial' }}>{event.location.split(',')[0]}</span>
              <Camera className="w-4 h-4 text-[#35594B]" />
            </div>
            <div style={{ fontFamily: 'system-ui' }}>
              <p className="text-[#252723] font-semibold text-base line-clamp-2">{event.title}</p>
              <p className="text-xs text-[#696B65] mt-1">{photographer?.businessName || 'Verified Studio'}</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#35594B] font-mono">
              <span style={{ fontFamily: 'Arial' }}>{photoCount} high-res photos cataloged</span>
            </div>
          </div>
        )}

        {/* Price tag in corner */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm px-2.5 py-1 rounded text-xs font-mono tabular-nums text-[#252723] border border-[#DCD8CE] shadow-sm">
          {formatKES(basePrice)} <span className="text-[#696B65] text-[10px]">/ photo</span>
        </div>
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
        <div>
          {/* Metadata: Typographic separators */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-[#696B65] mb-1.5 font-medium">
            <span>{photographer?.businessName || 'Independent Studio'}</span>
            <span aria-hidden="true">·</span>
            <span>{formattedDate}</span>
            <span aria-hidden="true">·</span>
            <span>{event.location.split(',')[0]}</span>
          </div>

          <h3 className="text-[17px] font-semibold text-[#252723] group-hover:text-[#35594B] transition-colors line-clamp-1 leading-snug">
            {event.title}
          </h3>

          <p className="text-xs text-[#696B65] line-clamp-2 mt-1.5 leading-relaxed">
            {event.description}
          </p>
        </div>

        {/* Footer info: Retention & Bundle */}
        <div className="pt-3 border-t border-[#DCD8CE] flex items-center justify-between text-xs text-[#696B65]">
          <div className="flex items-center gap-1.5 font-mono text-[11px] text-[#696B65]">
            <Clock className="w-3.5 h-3.5 text-[#35594B]" />
            <span style={{ fontFamily: 'Arial' }}>{daysLeft} days active</span>
          </div>

          {event.bundleOffers && event.bundleOffers.length > 0 ? (
            <span className="text-[#B66D4D] font-medium text-[11px]">
              {event.bundleOffers[0].title}
            </span>
          ) : (
            <span className="text-[#35594B] font-medium text-[11px]">
              {photoCount} photos available
            </span>
          )}
        </div>
      </div>
    </article>
  );
};
