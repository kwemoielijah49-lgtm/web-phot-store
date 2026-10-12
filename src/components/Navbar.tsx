import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { VaultLogo } from './common/VaultLogo';
import { ShoppingBag, Camera, LogIn, LogOut, User, Loader2, Sparkles, AlertCircle, X, Shield, SlidersHorizontal } from 'lucide-react';
import { formatKES } from '../utils/mpesa';

export const Navbar: React.FC = () => {
  const {
    currentView,
    setCurrentView,
    setSelectedEventId,
    setRole,
    cart,
    setIsCartOpen,
    getCartTotals,
    firebaseUser,
    signInWithGoogle,
    signInWithDemoAccount,
    logOut,
    isAuthLoading,
    authError,
    clearAuthError,
    setIsCustomizerOpen,
  } = useApp();

  const [showAuthMenu, setShowAuthMenu] = useState(false);
  const [showAccountMenu, setShowAccountMenu] = useState(false);

  const totals = getCartTotals();

  const navigateTo = (view: 'events' | 'my_orders' | 'studio' | 'admin', roleTarget?: 'customer' | 'photographer' | 'admin') => {
    if (roleTarget) {
      setRole(roleTarget);
    }
    setSelectedEventId(null);
    setCurrentView(view);
  };

  const isUserAdmin = firebaseUser?.email === 'kwemoielijah49@gmail.com';

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 backdrop-blur-md border-b border-[#DCD8CE]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        
        {/* Left: Brand Identity Wordmark */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => navigateTo('events', 'customer')}
            className="group flex items-center text-left transition-opacity hover:opacity-90 py-1"
            aria-label="Vault Home"
          >
            <VaultLogo size="md" variant="full" />
          </button>

          {/* Desktop Customer Navigation (Public) */}
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
            <button
              onClick={() => navigateTo('events', 'customer')}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 text-[14px] ${
                currentView === 'events' || currentView === 'event_gallery'
                  ? 'text-[#252723] border-[#35594B] font-semibold'
                  : 'border-transparent text-[#696B65] hover:text-[#252723]'
              }`}
            >
              Explore Events
            </button>

            <button
              onClick={() => navigateTo('my_orders', 'customer')}
              className={`transition-colors whitespace-nowrap py-1 border-b-2 text-[14px] ${
                currentView === 'my_orders'
                  ? 'text-[#252723] border-[#35594B] font-semibold'
                  : 'border-transparent text-[#696B65] hover:text-[#252723]'
              }`}
            >
              My Photos
            </button>

            {/* Discreet Photographer entry point */}
            <button
              onClick={() => navigateTo('studio', 'photographer')}
              className={`transition-colors whitespace-nowrap py-1 text-xs text-[#696B65] hover:text-[#35594B] flex items-center gap-1.5 pl-3 border-l border-[#DCD8CE] ${
                currentView === 'studio' ? 'text-[#35594B] font-semibold' : ''
              }`}
            >
              <Camera className="w-3.5 h-3.5 text-[#35594B]" />
              <span>For Photographers</span>
            </button>
          </nav>
        </div>

        {/* Right: Actions, Auth & Cart */}
        <div className="flex items-center gap-3 shrink-0">
          
          {/* Subtle Customizer Tool Button */}
          <button
            onClick={() => setIsCustomizerOpen(true)}
            className="p-2 rounded-lg bg-white hover:bg-[#F4F0E7] text-[#696B65] hover:text-[#35594B] border border-[#DCD8CE] transition-colors"
            title="Design & Font System"
            aria-label="Customize UI and Fonts"
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>

          {/* User Authentication / Profile Menu */}
          {firebaseUser ? (
            <div className="relative">
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-[#DCD8CE] hover:border-[#35594B] transition-colors text-xs text-[#252723]"
              >
                {firebaseUser.photoURL && firebaseUser.photoURL.trim() !== '' ? (
                  <img src={firebaseUser.photoURL.trim()} alt="Avatar" className="w-5 h-5 rounded-full" />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-[#35594B]/10 text-[#35594B] flex items-center justify-center font-bold text-[10px]">
                    {firebaseUser.displayName?.charAt(0) || 'U'}
                  </div>
                )}
                <span className="font-medium hidden sm:inline max-w-[120px] truncate">
                  {firebaseUser.displayName?.split(' ')[0] || 'Account'}
                </span>
              </button>

              {/* Account Dropdown */}
              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-[#DCD8CE] rounded-xl p-3 shadow-xl z-50 space-y-2 text-xs">
                  <div className="pb-2 border-b border-[#DCD8CE]">
                    <p className="font-semibold text-[#252723]">{firebaseUser.displayName || 'Authorized User'}</p>
                    <p className="text-[11px] text-[#696B65] font-mono truncate">{firebaseUser.email}</p>
                  </div>

                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        navigateTo('my_orders', 'customer');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#F4F0E7] text-[#252723] transition-colors"
                    >
                      My Purchased Photos & Orders
                    </button>
                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        navigateTo('studio', 'photographer');
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-[#F4F0E7] text-[#252723] transition-colors flex items-center gap-2"
                    >
                      <Camera className="w-3.5 h-3.5 text-[#35594B]" />
                      <span>Photographer Studio</span>
                    </button>

                    {/* Authorized Admin entry inside account menu for verified owner */}
                    {isUserAdmin && (
                      <button
                        onClick={() => {
                          setShowAccountMenu(false);
                          navigateTo('admin', 'admin');
                        }}
                        className="w-full text-left px-2.5 py-1.5 rounded-md bg-[#35594B]/5 hover:bg-[#35594B]/10 text-[#35594B] font-semibold transition-colors flex items-center gap-2 border border-[#35594B]/20"
                      >
                        <Shield className="w-3.5 h-3.5" />
                        <span>Administrator Console</span>
                      </button>
                    )}
                  </div>

                  <div className="pt-2 border-t border-[#DCD8CE]">
                    <button
                      onClick={() => {
                        setShowAccountMenu(false);
                        logOut();
                      }}
                      className="w-full text-left px-2.5 py-1.5 rounded-md hover:bg-rose-50 text-rose-700 font-medium transition-colors flex items-center gap-2"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="relative">
              <button
                onClick={() => setShowAuthMenu(!showAuthMenu)}
                disabled={isAuthLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-[#F4F0E7] text-[#252723] text-xs font-medium border border-[#DCD8CE] transition-colors disabled:opacity-50"
              >
                {isAuthLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#35594B]" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn className="w-3.5 h-3.5 text-[#35594B]" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              {/* Sign In Options Modal / Dropdown */}
              {showAuthMenu && !firebaseUser && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-[#DCD8CE] rounded-xl p-3 shadow-xl z-50 space-y-2 text-xs">
                  <div className="flex items-center justify-between pb-2 border-b border-[#DCD8CE]">
                    <span className="font-semibold text-[#252723]">Sign In to Vault</span>
                    <button
                      onClick={() => setShowAuthMenu(false)}
                      className="text-[#696B65] hover:text-[#252723]"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      signInWithGoogle();
                    }}
                    className="w-full py-2.5 px-3 bg-[#F4F0E7] hover:bg-[#EAE6DC] border border-[#DCD8CE] rounded-lg text-[#252723] font-medium flex items-center gap-2.5 transition-colors text-left"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <div>
                      <span className="block text-xs font-semibold">Continue with Google</span>
                      <span className="text-[10px] text-[#696B65]">kwemoielijah49@gmail.com</span>
                    </div>
                  </button>

                  <button
                    onClick={() => {
                      setShowAuthMenu(false);
                      signInWithDemoAccount('kwemoielijah49@gmail.com', 'Elijah Kwemoi');
                    }}
                    className="w-full py-2 px-3 bg-[#35594B]/5 hover:bg-[#35594B]/10 border border-[#35594B]/30 rounded-lg text-[#35594B] font-medium flex items-center gap-2 transition-colors text-left"
                  >
                    <Sparkles className="w-4 h-4 text-[#35594B] shrink-0" />
                    <div>
                      <span className="block font-semibold">1-Click Fast Sign-In</span>
                      <span className="text-[10px] text-[#696B65]">Direct verified session (Admin & User)</span>
                    </div>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Cart Trigger Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative flex items-center gap-2 px-3.5 py-1.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg text-xs font-medium transition-colors shadow-sm"
            aria-label="Open Shopping Cart"
          >
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
            <span className="hidden sm:inline">Cart</span>
            {cart.length > 0 ? (
              <span
                style={{ fontFamily: 'Inter' }}
                className="font-mono tabular-nums text-[11px] bg-white text-[#35594B] font-bold px-1.5 py-0.5 rounded"
              >
                {cart.length} · {formatKES(totals.totalKes)}
              </span>
            ) : (
              <span
                style={{ fontFamily: 'Inter' }}
                className="text-[11px] text-white/80 font-mono"
              >
                0
              </span>
            )}
          </button>
        </div>

      </div>

      {/* Mobile Customer Navigation Strip (No public Admin link) */}
      <div className="md:hidden flex items-center justify-around border-t border-[#DCD8CE] bg-[#FAF8F5] px-2 py-2 text-xs font-medium">
        <button
          onClick={() => navigateTo('events', 'customer')}
          className={`px-3 py-1 rounded transition-colors ${
            currentView === 'events' ? 'text-[#35594B] font-bold' : 'text-[#696B65]'
          }`}
        >
          Explore Events
        </button>
        <button
          onClick={() => navigateTo('my_orders', 'customer')}
          className={`px-3 py-1 rounded transition-colors ${
            currentView === 'my_orders' ? 'text-[#35594B] font-bold' : 'text-[#696B65]'
          }`}
        >
          My Photos
        </button>
        <button
          onClick={() => navigateTo('studio', 'photographer')}
          className={`px-3 py-1 rounded transition-colors flex items-center gap-1 ${
            currentView === 'studio' ? 'text-[#35594B] font-bold' : 'text-[#696B65]'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>Studio</span>
        </button>
      </div>

      {/* Dismissible Auth Notification Banner */}
      {authError && (
        <div className="bg-[#B66D4D]/10 border-t border-[#B66D4D]/30 px-4 py-2.5 text-xs text-[#252723] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 max-w-3xl">
            <AlertCircle className="w-4 h-4 text-[#B66D4D] shrink-0" />
            <span>{authError}</span>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => {
                clearAuthError();
                signInWithDemoAccount('kwemoielijah49@gmail.com', 'Elijah Kwemoi');
              }}
              className="px-2.5 py-1 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold rounded text-[11px] transition-colors"
            >
              1-Click Sign-In
            </button>
            <button
              onClick={clearAuthError}
              className="p-1 hover:text-[#252723] text-[#696B65]"
              aria-label="Dismiss message"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
