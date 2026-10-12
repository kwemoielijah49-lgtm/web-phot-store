import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Camera, Sparkles, Building, Phone, DollarSign, Palette, CheckCircle2, Loader2, LogOut } from 'lucide-react';
import { formatKES } from '../../utils/mpesa';

export const StudioOnboardingView: React.FC = () => {
  const { firebaseUser, registerStudio, logOut } = useApp();

  const [businessName, setBusinessName] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('+254 7');
  const [mpesaTillOrPaybill, setMpesaTillOrPaybill] = useState('');
  const [defaultPriceKes, setDefaultPriceKes] = useState(250);
  const [brandColor, setBrandColor] = useState('#35594B');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setFormError('Please enter a business or studio name.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      await registerStudio({
        businessName: businessName.trim(),
        bio: bio.trim() || 'Official event & documentary photography on Vault.',
        phone: phone.trim(),
        mpesaTillOrPaybill: mpesaTillOrPaybill.trim() || '500100',
        defaultPriceKes,
        brandColor,
      });
    } catch (err: any) {
      setFormError(err.message || 'Failed to register photography business.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <div className="bg-white border border-[#DCD8CE] rounded-2xl shadow-sm p-6 sm:p-10 space-y-8">
        
        {/* Header with authenticated user pill */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#DCD8CE]">
          <div className="space-y-1">
            <span className="text-[11px] font-mono uppercase tracking-wider text-[#35594B] font-semibold bg-[#35594B]/10 px-2.5 py-0.5 rounded-full inline-block">
              Photographer Onboarding
            </span>
            <h1 className="font-serif text-3xl font-bold text-[#252723]">
              Launch Your Photography Business
            </h1>
            <p className="text-xs text-[#696B65]">
              You are signed in as <span className="font-semibold text-[#252723]">{firebaseUser?.displayName || firebaseUser?.email}</span> ({firebaseUser?.email}). You do not currently have an authorized photography studio.
            </p>
          </div>

          <button
            onClick={() => logOut()}
            className="self-start sm:self-center px-3 py-1.5 rounded-lg border border-[#DCD8CE] hover:bg-rose-50 hover:text-rose-700 text-xs text-[#696B65] transition-colors flex items-center gap-1.5 shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>

        {formError && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 text-xs">
          {/* Business Name */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-[#252723] flex items-center gap-1.5">
              <Building className="w-3.5 h-3.5 text-[#35594B]" />
              <span>Studio or Business Name *</span>
            </label>
            <input
              type="text"
              required
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
              placeholder="e.g. Apex Visuals & Weddings"
              className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-3 text-sm font-medium text-[#252723] focus:outline-none focus:border-[#35594B] focus:bg-white transition-all"
            />
            <p className="text-[11px] text-[#696B65]">
              This name will be displayed on event galleries and M-Pesa checkout receipts.
            </p>
          </div>

          {/* Bio */}
          <div className="space-y-1.5">
            <label className="block font-semibold text-[#252723]">
              Studio Story / Bio
            </label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="e.g. Documentary and commercial photography specialist based in Nairobi..."
              className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-3 text-xs text-[#252723] focus:outline-none focus:border-[#35594B] focus:bg-white transition-all"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Phone */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#252723] flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-[#35594B]" />
                <span>Contact Phone</span>
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+254 712 345 678"
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-2.5 font-mono text-xs text-[#252723] focus:outline-none focus:border-[#35594B] focus:bg-white"
              />
            </div>

            {/* M-Pesa Till or Paybill */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#252723] flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5 text-[#35594B]" />
                <span>M-Pesa Till / Paybill (for B2C settlements)</span>
              </label>
              <input
                type="text"
                value={mpesaTillOrPaybill}
                onChange={(e) => setMpesaTillOrPaybill(e.target.value)}
                placeholder="e.g. 522123"
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-2.5 font-mono text-xs text-[#252723] focus:outline-none focus:border-[#35594B] focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Default Price KES */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#252723]">
                Default Photo Price (KES)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={50}
                  step={50}
                  value={defaultPriceKes}
                  onChange={(e) => setDefaultPriceKes(Number(e.target.value))}
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-2.5 font-mono text-xs text-[#252723] focus:outline-none focus:border-[#35594B] focus:bg-white"
                />
                <span className="font-mono text-xs font-bold text-[#35594B] shrink-0">
                  {formatKES(defaultPriceKes)}
                </span>
              </div>
            </div>

            {/* Brand Accent Color */}
            <div className="space-y-1.5">
              <label className="block font-semibold text-[#252723] flex items-center gap-1.5">
                <Palette className="w-3.5 h-3.5 text-[#35594B]" />
                <span>Brand Accent Color</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={brandColor}
                  onChange={(e) => setBrandColor(e.target.value)}
                  className="w-10 h-10 rounded-lg cursor-pointer border border-[#DCD8CE] bg-white p-0.5"
                />
                <span className="font-mono text-xs text-[#696B65]">{brandColor}</span>
              </div>
            </div>
          </div>

          {/* Submission */}
          <div className="pt-4 border-t border-[#DCD8CE] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-[11px] text-[#696B65]">
              <CheckCircle2 className="w-4 h-4 text-[#35594B]" />
              <span>You will become the primary Owner of this studio with full administrator privileges.</span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-3 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold rounded-xl text-xs transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 shrink-0"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Registering Studio...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Create Photography Studio</span>
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
};
