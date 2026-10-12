import React from 'react';
import { useApp } from '../../context/AppContext';
import { Camera, ShieldCheck, ArrowLeft, Loader2, Sparkles, AlertCircle, Lock } from 'lucide-react';
import { VaultLogo } from '../common/VaultLogo';

export const PhotographerSignInView: React.FC = () => {
  const {
    signInWithGoogle,
    signInWithApple,
    signInWithDemoAccount,
    isAuthLoading,
    authError,
    clearAuthError,
    setCurrentView,
  } = useApp();

  return (
    <div className="max-w-2xl mx-auto px-4 py-12 sm:py-16">
      <button
        onClick={() => setCurrentView('events')}
        className="inline-flex items-center gap-2 text-xs font-medium text-[#696B65] hover:text-[#252723] mb-8 transition-colors"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Return to Explore Events</span>
      </button>

      <div className="bg-white border border-[#DCD8CE] rounded-2xl shadow-sm p-6 sm:p-10 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#35594B]/10 text-[#35594B] mb-2">
            <Camera className="w-6 h-6" />
          </div>
          <div className="flex justify-center">
            <VaultLogo size="sm" variant="mark" />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#252723] tracking-tight">
            Photographer Studio Sign-In
          </h1>
          <p className="text-xs sm:text-sm text-[#696B65] max-w-md mx-auto leading-relaxed">
            Sign in to access your authorized photography storefronts, automated M-Pesa sales ledger, itemized customer orders, and 24MP unwatermarked original files.
          </p>
        </div>

        {/* Security Notice */}
        <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 flex items-start gap-3 text-xs text-[#696B65]">
          <Lock className="w-4 h-4 text-[#35594B] shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-[#252723]">Server-Enforced Account Isolation</p>
            <p>
              Vault enforces explicit business membership authorization. Each photographer can access only the businesses they own or have been authorized to manage.
            </p>
          </div>
        </div>

        {/* Error message if any */}
        {authError && (
          <div className="bg-[#B66D4D]/10 border border-[#B66D4D]/30 rounded-xl p-3.5 flex items-center justify-between gap-3 text-xs text-[#252723]">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-[#B66D4D] shrink-0" />
              <span>{authError}</span>
            </div>
            <button
              onClick={clearAuthError}
              className="text-[#696B65] hover:text-[#252723] text-xs font-bold px-2 py-0.5"
            >
              ✕
            </button>
          </div>
        )}

        {/* Primary OAuth Actions: Google & Apple */}
        <div className="space-y-3">
          {/* Continue with Google */}
          <button
            onClick={() => signInWithGoogle()}
            disabled={isAuthLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-white hover:bg-[#FAF8F5] border-2 border-[#DCD8CE] hover:border-[#252723] rounded-xl text-sm font-semibold text-[#252723] transition-all shadow-sm disabled:opacity-50"
          >
            {isAuthLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-[#35594B]" />
            ) : (
              <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
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
            )}
            <span>Continue with Google</span>
          </button>

          {/* Continue with Apple */}
          <button
            onClick={() => signInWithApple()}
            disabled={isAuthLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-[#252723] hover:bg-black text-white rounded-xl text-sm font-semibold transition-all shadow-sm disabled:opacity-50"
          >
            {isAuthLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-white" />
            ) : (
              <svg className="w-5 h-5 fill-current shrink-0" viewBox="0 0 170 170">
                <path d="M150.37 130.25c-2.45 5.66-5.35 10.87-8.71 15.66-4.58 6.53-8.33 11.05-11.22 13.56-4.48 4.12-9.28 6.23-14.42 6.35-3.69 0-8.14-1.05-13.32-3.18-5.19-2.12-9.97-3.17-14.34-3.17-4.58 0-9.49 1.05-14.75 3.17-5.26 2.13-9.5 3.24-12.74 3.35-4.35.13-9.16-1.9-14.42-6.08-3.69-3.04-7.69-7.85-12.01-14.42-6.19-9.35-11.09-20.08-14.7-32.18-3.61-12.1-5.42-23.77-5.42-35.01 0-14.97 3.8-27.46 11.41-37.47 7.6-10.02 17.5-15.17 29.68-15.47 4.9 0 10.42 1.34 16.55 4.02 6.13 2.68 9.94 4.07 11.43 4.17 1.28-.1 5.37-1.58 12.28-4.43 6.9-2.85 12.63-4.13 17.18-3.84 13.56.88 24.36 5.86 32.39 14.93-11.83 7.16-17.63 17.13-17.39 29.9.23 9.99 4.13 18.27 11.71 24.84 7.57 6.57 16.63 10.23 27.17 10.99-2.22 6.64-4.85 13.06-7.89 19.26zM119.22 33.15c0-7.39 2.66-14.41 7.99-21.05 5.32-6.64 12.02-11.05 20.09-13.23.47 2.05.7 4.12.7 6.22 0 7.39-2.8 14.52-8.4 21.39-5.61 6.87-12.55 11.23-20.82 13.07-.36-2.1-.56-4.23-.56-6.4z" />
              </svg>
            )}
            <span>Continue with Apple</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#DCD8CE]"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-3 text-[#696B65] font-mono font-medium">
              Verified Testing & Onboarding Identities
            </span>
          </div>
        </div>

        {/* Direct Account Switchers for Sandbox Testing of Isolation */}
        <div className="space-y-2.5">
          <p className="text-[11px] text-[#696B65] text-center">
            Click below to instantly authenticate as specific test accounts to verify strict data isolation and multiple-business permissions:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            {/* Elijah: Mwangi Media & Luxe Flora */}
            <button
              onClick={() => signInWithDemoAccount('kwemoielijah49@gmail.com', 'Elijah Kwemoi')}
              className="p-3 text-left rounded-xl border border-[#35594B]/30 bg-[#35594B]/5 hover:bg-[#35594B]/10 transition-colors group"
            >
              <div className="flex items-center gap-1.5 font-bold text-[#35594B]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Elijah Kwemoi</span>
              </div>
              <p className="text-[10px] text-[#696B65] font-mono mt-0.5 truncate">kwemoielijah49@gmail.com</p>
              <p className="text-[10px] text-[#35594B] font-medium mt-1">
                Authorized: 2 Studios (Mwangi & Luxe)
              </p>
            </button>

            {/* Josphat: Rift Valley only */}
            <button
              onClick={() => signInWithDemoAccount('josphat@riftvalleysports.co.ke', 'Josphat Kiprono')}
              className="p-3 text-left rounded-xl border border-[#DCD8CE] hover:border-[#252723] bg-[#FAF8F5] hover:bg-white transition-colors"
            >
              <div className="flex items-center gap-1.5 font-bold text-[#252723]">
                <Camera className="w-3.5 h-3.5 text-[#696B65]" />
                <span>Josphat Kiprono</span>
              </div>
              <p className="text-[10px] text-[#696B65] font-mono mt-0.5 truncate">josphat@riftvalleysports.co.ke</p>
              <p className="text-[10px] text-[#696B65] font-medium mt-1">
                Authorized: 1 Studio (Rift Valley)
              </p>
            </button>

            {/* New user without studio: Onboarding */}
            <button
              onClick={() => signInWithDemoAccount('creator_new@vault.co.ke', 'Ken Ochieng')}
              className="p-3 text-left rounded-xl border border-dashed border-[#DCD8CE] hover:border-[#35594B] bg-white hover:bg-[#F4F0E7] transition-colors"
            >
              <div className="flex items-center gap-1.5 font-bold text-[#252723]">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                <span>New Creator</span>
              </div>
              <p className="text-[10px] text-[#696B65] font-mono mt-0.5 truncate">creator_new@vault.co.ke</p>
              <p className="text-[10px] text-amber-700 font-medium mt-1">
                0 Studios · Triggers Onboarding
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
