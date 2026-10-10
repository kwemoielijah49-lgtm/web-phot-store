import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { X, Trash2, ShoppingBag, ArrowRight, Sparkles, ShieldCheck } from 'lucide-react';

export const CartDrawer: React.FC = () => {
  const {
    isCartOpen,
    setIsCartOpen,
    cart,
    removeFromCart,
    clearCart,
    getCartTotals,
    setActivePaymentModal,
  } = useApp();

  if (!isCartOpen) return null;

  const totals = getCartTotals();

  const handleCheckoutClick = () => {
    setIsCartOpen(false);
    setActivePaymentModal(true);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={() => setIsCartOpen(false)}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white border-l border-[#DCD8CE] flex flex-col shadow-2xl">
          
          {/* Header */}
          <div className="p-6 border-b border-[#DCD8CE] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-[#35594B]" />
              <h2 className="font-serif text-lg font-bold text-[#252723]">Your Photo Cart</h2>
              <span className="font-mono text-xs text-[#696B65]">({cart.length})</span>
            </div>
            <button
              onClick={() => setIsCartOpen(false)}
              className="p-1.5 rounded-lg text-[#696B65] hover:text-[#252723] hover:bg-[#FAF8F5] transition-colors"
              aria-label="Close cart"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {cart.length > 0 ? (
              <>
                <div className="flex items-center justify-between pb-2 text-xs text-[#696B65] border-b border-[#DCD8CE]">
                  <span>Selected Photos</span>
                  <button
                    onClick={clearCart}
                    className="text-rose-700 hover:underline flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear Cart</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.photoId}
                      className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={item.thumbnailUrl}
                          alt={item.photoCode}
                          className="w-12 h-9 object-cover rounded bg-neutral-200 shrink-0"
                        />
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-[#252723] truncate">
                            {item.photoCode}
                          </p>
                          <p className="text-[11px] text-[#696B65] truncate">
                            {item.eventTitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="font-mono text-xs font-semibold text-[#252723] tabular-nums">
                          {formatKES(item.priceKes)}
                        </span>
                        <button
                          onClick={() => removeFromCart(item.photoId)}
                          className="p-1 text-[#696B65] hover:text-rose-700 rounded transition-colors"
                          aria-label={`Remove photo ${item.photoCode}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bundle Savings Indicator */}
                {totals.discountKes > 0 && (
                  <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-3 text-xs space-y-1">
                    <div className="flex items-center gap-1.5 text-[#35594B] font-semibold">
                      <Sparkles className="w-3.5 h-3.5 text-[#B66D4D]" />
                      <span>{totals.appliedBundleTitle || 'Bundle Savings Applied'}</span>
                    </div>
                    <p className="text-[#696B65]">
                      You saved <strong className="text-[#35594B] font-mono">{formatKES(totals.discountKes)}</strong> on this order.
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center space-y-3 py-12">
                <div className="w-12 h-12 rounded-full bg-[#FAF8F5] text-[#696B65] flex items-center justify-center border border-[#DCD8CE]">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[#252723]">Your cart is empty</p>
                  <p className="text-xs text-[#696B65] mt-1 max-w-xs">
                    Browse published event galleries, view protected previews, and add photos to your cart.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Checkout Footer */}
          {cart.length > 0 && (
            <div className="p-6 bg-[#FAF8F5] border-t border-[#DCD8CE] space-y-4">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between text-[#696B65]">
                  <span>Subtotal ({totals.itemCount} items)</span>
                  <span className="font-mono text-[#252723]">{formatKES(totals.subtotalKes)}</span>
                </div>

                {totals.discountKes > 0 && (
                  <div className="flex items-center justify-between text-[#35594B] font-medium">
                    <span>Bundle Discount</span>
                    <span className="font-mono">-{formatKES(totals.discountKes)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between text-sm font-bold text-[#252723] pt-2 border-t border-[#DCD8CE]">
                  <span>Total Due</span>
                  <span className="font-mono text-base text-[#35594B] tabular-nums">
                    {formatKES(totals.totalKes)}
                  </span>
                </div>
              </div>

              <button
                onClick={handleCheckoutClick}
                className="w-full py-3 px-4 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <span>Proceed to M-Pesa Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="flex items-center justify-center gap-2 text-[11px] text-[#696B65]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#35594B]" />
                <span>Instant STK Push · 24MP Unwatermarked Download</span>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
