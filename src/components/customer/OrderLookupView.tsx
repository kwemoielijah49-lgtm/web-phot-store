import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { Order, OrderItem } from '../../types';
import {
  Search,
  Download,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileText,
  RotateCcw,
  ShieldCheck,
  HelpCircle,
  Smartphone,
} from 'lucide-react';

interface OrderLookupViewProps {
  onOpenRefundModal: (order: Order) => void;
}

export const OrderLookupView: React.FC<OrderLookupViewProps> = ({ onOpenRefundModal }) => {
  const {
    orders,
    lookupOrdersByPhoneOrCode,
    verifyAndDownloadOriginal,
    latestPaidOrder,
    firebaseUser,
    platformSettings,
  } = useApp();

  const [searchQuery, setSearchQuery] = useState('');
  const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  // Authorized customer-specific orders:
  // 1. If user searched by phone/code/email, show exact matches
  // 2. Otherwise, if signed in, show user's authenticated orders
  // 3. Or if latestPaidOrder exists in this session, show it
  // 4. Do NOT dump public database transactions
  const displayedOrders = useMemo(() => {
    if (searchQuery.trim()) {
      return lookupOrdersByPhoneOrCode(searchQuery.trim());
    }

    if (firebaseUser?.email) {
      const userOrders = orders.filter(
        (o) => o.customerEmail?.toLowerCase() === firebaseUser.email?.toLowerCase()
      );
      if (userOrders.length > 0) return userOrders;
    }

    if (latestPaidOrder) {
      return [latestPaidOrder];
    }

    return [];
  }, [searchQuery, lookupOrdersByPhoneOrCode, firebaseUser, orders, latestPaidOrder]);

  const handleDownload = (order: Order, item: OrderItem) => {
    setDownloadError(null);
    setDownloadSuccessMessage(null);

    const verification = verifyAndDownloadOriginal(order.id, item.photoId);
    if (!verification.allowed || !verification.originalUrl) {
      setDownloadError(verification.error || 'Failed to download original media file');
      return;
    }

    // Trigger browser download of unwatermarked original file
    const link = document.createElement('a');
    link.href = verification.originalUrl;
    link.download = `${item.photoCode}_ORIGINAL_24MP.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccessMessage(`Master unwatermarked file for ${item.photoCode} downloaded successfully.`);
    setTimeout(() => setDownloadSuccessMessage(null), 4000);
  };

  const handleDownloadAll = (order: Order) => {
    order.items.forEach((item, index) => {
      setTimeout(() => {
        handleDownload(order, item);
      }, index * 400);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setHasSubmittedSearch(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Header & Search Bar */}
      <section className="bg-white border border-[#DCD8CE] rounded-2xl p-6 sm:p-8 space-y-6 shadow-sm">
        <div className="max-w-2xl space-y-2">
          <p
            style={{ fontFamily: 'Georgia' }}
            className="text-xs font-semibold tracking-wider text-[#35594B] uppercase font-mono"
          >
            Customer Photo Retrieval
          </p>
          <h1 className="font-serif text-3xl sm:text-4xl text-[#252723] tracking-tight">
            My Purchased Photos & Orders
          </h1>
          <p className="text-sm text-[#696B65] leading-relaxed">
            Enter your M-Pesa phone number, receipt code, or Order ID to retrieve your unwatermarked original master files.
          </p>
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#696B65]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. 0712345678, ORD-2026-001, QKD72..."
              style={{ fontFamily: 'Courier New' }}
              className="w-full bg-[#FAF8F5] border border-[#DCD8CE] text-[#252723] text-sm pl-10 pr-10 py-2.5 rounded-xl focus:outline-none focus:border-[#35594B] font-mono transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setHasSubmittedSearch(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#696B65] hover:text-[#252723] text-xs"
              >
                ✕
              </button>
            )}
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            Lookup Order
          </button>
        </form>

        {/* 30-Day Download Notice */}
        <div className="pt-4 border-t border-[#DCD8CE] flex flex-wrap items-center gap-6 text-xs text-[#696B65]">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#35594B]" />
            <span>{platformSettings.downloadExpiryDays}-Day Unwatermarked Master Download Window</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-[#35594B]" />
            <span>Verified Secure Access</span>
          </div>
        </div>
      </section>

      {/* Notifications */}
      {downloadSuccessMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-3 text-xs text-emerald-800">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span>{downloadSuccessMessage}</span>
        </div>
      )}

      {downloadError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-3 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Orders List */}
      <section className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
          <h2 className="font-serif text-xl sm:text-2xl text-[#252723]">
            {searchQuery.trim() ? `Search Results (${displayedOrders.length})` : 'Your Purchases'}
          </h2>
          <span
            style={{ fontFamily: 'Inter' }}
            className="text-xs text-[#696B65] font-mono"
          >
            {displayedOrders.length} {displayedOrders.length === 1 ? 'order' : 'orders'} found
          </span>
        </div>

        {displayedOrders.length > 0 ? (
          <div className="space-y-5">
            {displayedOrders.map((order) => {
              const expiryDate = new Date(order.downloadExpiresAt);
              const isExpired = Date.now() > expiryDate.getTime();
              const daysLeft = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (1000 * 3600 * 24)));

              return (
                <div
                  key={order.id}
                  className="bg-white border border-[#DCD8CE] rounded-xl p-5 sm:p-6 space-y-5 shadow-sm"
                >
                  {/* Top Bar of Order Card */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#DCD8CE]">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-mono font-bold text-[#35594B]">{order.orderNumber}</span>
                        <span aria-hidden="true" className="text-[#DCD8CE]">·</span>
                        <span className="text-[#252723] font-medium">{order.eventTitle}</span>
                        <span aria-hidden="true" className="text-[#DCD8CE]">·</span>
                        <span className="text-[#696B65]">{order.photographerBusinessName}</span>
                      </div>
                      <p className="text-xs text-[#696B65]">
                        Placed on {new Date(order.createdAt).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric' })}
                        {order.mpesaReference && (
                          <span className="ml-2 font-mono text-[#35594B]">
                            (M-Pesa: {order.mpesaReference})
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`px-2.5 py-0.5 rounded text-[11px] font-semibold uppercase font-mono ${
                        order.status === 'paid'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : order.status === 'refunded'
                          ? 'bg-[#B66D4D]/10 text-[#B66D4D] border border-[#B66D4D]/30'
                          : 'bg-[#FAF8F5] text-[#696B65] border border-[#DCD8CE]'
                      }`}>
                        {order.status}
                      </span>
                      <span className="text-base font-bold font-mono text-[#252723]">
                        {formatKES(order.totalKes)}
                      </span>
                    </div>
                  </div>

                  {/* Purchased Photos Gallery Grid */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-[#696B65]">
                      <span>{order.items.length} High-Resolution Master {order.items.length === 1 ? 'Photo' : 'Photos'}</span>
                      {order.status === 'paid' && !isExpired && (
                        <button
                          onClick={() => handleDownloadAll(order)}
                          className="text-[#35594B] hover:underline font-semibold flex items-center gap-1.5"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download All Masters</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                      {order.items.map((item) => (
                        <div
                          key={item.photoId}
                          className="group relative bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg overflow-hidden flex flex-col justify-between"
                        >
                          <div className="aspect-[4/3] bg-[#FAF8F5] relative overflow-hidden flex items-center justify-center">
                            <img
                              src={item.thumbnailUrl}
                              alt={item.photoCode}
                              className="w-full h-full object-cover"
                            />
                            {/* Watermark notice */}
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                              <span className="text-[10px] text-white font-mono bg-[#252723]/90 px-2 py-0.5 rounded">
                                Unwatermarked Master
                              </span>
                            </div>
                          </div>

                          <div className="p-2 bg-white flex items-center justify-between gap-1 text-[11px]">
                            <span className="font-mono font-medium text-[#252723] truncate">{item.photoCode}</span>
                            {order.status === 'paid' && !isExpired ? (
                              <button
                                onClick={() => handleDownload(order, item)}
                                className="p-1 hover:bg-[#F4F0E7] text-[#35594B] rounded transition-colors"
                                title={`Download ${item.photoCode}`}
                                aria-label={`Download master photo ${item.photoCode}`}
                              >
                                <Download className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <span className="text-[10px] text-[#696B65]">Expired</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Expiry Banner & Refund Trigger */}
                  <div className="pt-3 border-t border-[#DCD8CE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#696B65]">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3.5 h-3.5 text-[#35594B]" />
                      <span>
                        {isExpired ? (
                          <strong className="text-rose-700">Download link expired ({expiryDate.toLocaleDateString()})</strong>
                        ) : (
                          <span>Download access active for <strong className="text-[#252723]">{daysLeft} more days</strong> ({expiryDate.toLocaleDateString()})</span>
                        )}
                      </span>
                    </div>

                    {order.status === 'paid' && (
                      <button
                        onClick={() => onOpenRefundModal(order)}
                        className="text-xs text-[#696B65] hover:text-[#B66D4D] transition-colors flex items-center gap-1 self-start sm:self-auto"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Request Refund</span>
                      </button>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-white border border-[#DCD8CE] rounded-2xl p-10 text-center space-y-4 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#FAF8F5] text-[#35594B] flex items-center justify-center mx-auto border border-[#DCD8CE]">
              <FileText className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-serif text-lg font-normal text-[#252723]">
                {hasSubmittedSearch ? 'No Order Found' : 'Lookup Your Photos'}
              </h3>
              <p className="text-xs text-[#696B65] max-w-md mx-auto leading-relaxed">
                {hasSubmittedSearch
                  ? `No purchase matches "${searchQuery}". Please verify your phone number or Order ID (e.g. 0712..., ORD-2026-...).`
                  : 'Enter the phone number used at M-Pesa checkout or your Order ID above to retrieve your high-resolution photographs.'}
              </p>
            </div>
          </div>
        )}

      </section>

    </div>
  );
};
