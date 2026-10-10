import React, { useState } from 'react';
import { Photographer } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Building, CheckCircle2 } from 'lucide-react';

interface PhotographerProfileModalProps {
  photographer: Photographer;
  onClose: () => void;
}

export const PhotographerProfileModal: React.FC<PhotographerProfileModalProps> = ({
  photographer,
  onClose,
}) => {
  const { updatePhotographerProfile } = useApp();

  const [businessName, setBusinessName] = useState(photographer.businessName);
  const [bio, setBio] = useState(photographer.bio);
  const [phone, setPhone] = useState(photographer.phone);
  const [mpesaTillOrPaybill, setMpesaTillOrPaybill] = useState(photographer.mpesaTillOrPaybill);
  const [mpesaPhone, setMpesaPhone] = useState(photographer.mpesaPhone);
  const [brandColor, setBrandColor] = useState(photographer.brandColor || '#35594B');
  const [defaultPriceKes, setDefaultPriceKes] = useState(photographer.defaultPriceKes || 250);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePhotographerProfile(photographer.id, {
      businessName,
      bio,
      phone,
      mpesaTillOrPaybill,
      mpesaPhone,
      brandColor,
      defaultPriceKes,
    });
    setSaved(true);
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
          <h3 className="font-serif text-lg font-bold text-[#252723] flex items-center gap-2">
            <Building className="w-4 h-4 text-[#35594B]" />
            <span>Storefront & M-Pesa Payout Settings</span>
          </h3>
          <button onClick={onClose} className="text-[#696B65] hover:text-[#252723]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {saved ? (
          <div className="py-8 text-center space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="font-serif text-lg font-bold text-[#252723]">Profile Updated</h4>
            <p className="text-xs text-[#696B65]">Your storefront settings have been saved.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#252723] font-medium mb-1">
                Studio / Business Name *
              </label>
              <input
                type="text"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                required
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div>
              <label className="block text-[#252723] font-medium mb-1">
                Public Studio Bio / Tagline
              </label>
              <textarea
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={2}
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  M-Pesa Till / Paybill *
                </label>
                <input
                  type="text"
                  value={mpesaTillOrPaybill}
                  onChange={(e) => setMpesaTillOrPaybill(e.target.value)}
                  placeholder="e.g. 522123 or Till 88219"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
                />
              </div>

              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Disbursement Phone *
                </label>
                <input
                  type="text"
                  value={mpesaPhone}
                  onChange={(e) => setMpesaPhone(e.target.value)}
                  placeholder="07XX XXX XXX"
                  required
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Default Photo Price (KES)
                </label>
                <input
                  type="number"
                  value={defaultPriceKes}
                  onChange={(e) => setDefaultPriceKes(Number(e.target.value))}
                  min={50}
                  step={25}
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
                />
              </div>

              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Brand Color Accent
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-8 h-8 rounded border border-[#DCD8CE] cursor-pointer"
                  />
                  <span className="font-mono text-[#696B65] text-xs">{brandColor}</span>
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-[#35594B] hover:bg-[#29473B] text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                Save Storefront Profile
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
