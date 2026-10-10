import React, { useState } from 'react';
import { Photo } from '../../types';
import { useApp } from '../../context/AppContext';
import { X, Flag, CheckCircle2 } from 'lucide-react';

interface ReportPhotoModalProps {
  photo: Photo | null;
  onClose: () => void;
}

export const ReportPhotoModal: React.FC<ReportPhotoModalProps> = ({ photo, onClose }) => {
  const { submitModerationReport } = useApp();
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [reason, setReason] = useState<'privacy_violation' | 'unauthorized_appearance' | 'inappropriate' | 'copyright'>('privacy_violation');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!photo) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !notes.trim()) return;

    submitModerationReport({
      photoId: photo.id,
      reporterEmail: email,
      reporterPhone: phone || undefined,
      reason,
      notes,
    });

    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
          <div className="flex items-center gap-2 text-rose-700 font-bold text-sm">
            <Flag className="w-4 h-4" />
            <span>Report Photograph [{photo.code}]</span>
          </div>
          <button onClick={onClose} className="text-[#696B65] hover:text-[#252723]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-[#252723] font-bold text-sm">Moderation Report Submitted</h4>
            <p className="text-xs text-[#696B65]">
              Our trust & safety team and the photographer have been notified. A takedown review is underway under Kenya data privacy compliance.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#252723] font-medium mb-1">Reason for Report *</label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value as any)}
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
              >
                <option value="privacy_violation">Privacy Violation / Request Takedown</option>
                <option value="unauthorized_appearance">Unauthorized Appearance (I do not consent)</option>
                <option value="copyright">Copyright / Intellectual Property Infringement</option>
                <option value="inappropriate">Inappropriate / Harmful Content</option>
              </select>
            </div>

            <div>
              <label className="block text-[#252723] font-medium mb-1">Your Email Address *</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@domain.com"
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-2 text-[#252723] focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div>
              <label className="block text-[#252723] font-medium mb-1">Phone Number (Optional)</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="07XX XXX XXX"
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-2 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div>
              <label className="block text-[#252723] font-medium mb-1">Detailed Explanation *</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                required
                rows={3}
                placeholder="Please describe why this image should be reviewed or removed..."
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-rose-700 hover:bg-rose-800 text-white font-medium rounded-xl transition-colors"
              >
                Submit Report
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 bg-[#FAF8F5] hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] rounded-xl"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
