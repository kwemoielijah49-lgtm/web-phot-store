import React from 'react';
import { useApp } from '../context/AppContext';
import { VaultLogo } from './common/VaultLogo';
import { Clock, Download, Smartphone, ShieldCheck } from 'lucide-react';

export const Footer: React.FC = () => {
  const { setCurrentView, platformSettings } = useApp();

  return (
    <footer className="border-t border-[#DCD8CE] bg-[#FAF8F5] text-[#696B65] text-sm mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          
          <div className="space-y-3">
            <VaultLogo size="md" variant="full" />
            <p className="text-xs text-[#696B65] leading-relaxed pt-1">
              Kenya&apos;s dedicated event photography commerce engine. Empowering independent photographers with automated watermarking, KES pricing, and instant M-Pesa digital delivery.
            </p>
            <div className="text-xs text-[#696B65] space-y-1">
              <p>Nairobi, Kenya</p>
              <p>Support: {platformSettings.emergencySupportPhone}</p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#252723] uppercase tracking-wider">Commerce & Payments</h4>
            <div className="text-xs space-y-2 text-[#696B65]">
              <div className="flex items-center gap-2 text-[#35594B] font-medium">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Safaricom M-Pesa Verified</span>
              </div>
              <p>
                Direct STK push & Paybill integration. Instant receipt generation and unlocked original master files upon payment verification.
              </p>
              <p className="font-mono tabular-nums text-[#252723] text-[11px]" style={{ fontFamily: 'Georgia' }}>
                Platform Commission: {(platformSettings.defaultCommissionRate * 100).toFixed(0)}% eligible subtotal
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#252723] uppercase tracking-wider">Storage & Retention Rules</h4>
            <div className="text-xs space-y-2 text-[#696B65]">
              <div className="flex items-center gap-2 text-[#B66D4D] font-medium">
                <Clock className="w-3.5 h-3.5" />
                <span>{platformSettings.eventRetentionDays}-Day Gallery Retention</span>
              </div>
              <p>
                Public galleries remain online for {platformSettings.eventRetentionDays} days post-event before automatic secure archival.
              </p>
              <div className="flex items-center gap-2 text-[#252723]">
                <Download className="w-3.5 h-3.5 text-[#35594B]" />
                <span>{platformSettings.downloadExpiryDays}-Day Purchase Download Window</span>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="text-xs font-semibold text-[#252723] uppercase tracking-wider">Customer Assurance</h4>
            <ul className="text-xs space-y-2 text-[#696B65]">
              <li>
                <button
                  onClick={() => setCurrentView('my_orders')}
                  className="hover:text-[#35594B] transition-colors"
                >
                  Retrieve Existing Purchase
                </button>
              </li>
              <li>
                <button
                  onClick={() => setCurrentView('my_orders')}
                  className="hover:text-[#35594B] transition-colors"
                >
                  Submit Refund Request
                </button>
              </li>
              <li className="text-[#696B65]">
                Kenya Data Protection Act 2019 Compliant
              </li>
            </ul>
          </div>

        </div>

        <div className="border-t border-[#DCD8CE] pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#696B65]">
          <p>© {new Date().getFullYear()} Vault Ltd. All rights reserved.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <span>Watermark Protection Active</span>
            <span aria-hidden="true">·</span>
            <span>KES Currency Standard</span>
            <span aria-hidden="true">·</span>
            <span>M-Pesa Express Instant Settlement</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
