import React, { useState } from 'react';
import { Order } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { X, RotateCcw, CheckCircle2 } from 'lucide-react';

interface RefundModalProps {
  order: Order | null;
  onClose: () => void;
}

export const RefundModal: React.FC<RefundModalProps> = ({ order, onClose }) => {
  const { submitRefundRequest } = useApp();
  const [reason, setReason] = useState('');
  const [submitted, setSubmitted] = useState(false);

  if (!order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return;

    submitRefundRequest(order.id, reason);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
    }, 2200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
          <div className="flex items-center gap-2 text-[#252723] font-bold text-sm">
            <RotateCcw className="w-4 h-4 text-[#B66D4D]" />
            <span>Request Refund for {order.orderNumber}</span>
          </div>
          <button onClick={onClose} className="text-[#696B65] hover:text-[#252723]">
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-3">
            <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
            <h4 className="text-[#252723] font-bold text-sm">Refund Request Logged</h4>
            <p className="text-xs text-[#696B65]">
              Your request for {formatKES(order.totalKes)} has been sent to {order.photographerBusinessName}. Photographers review requests within five business days.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl flex items-center justify-between">
              <div>
                <p className="text-[#696B65]">Purchase Total</p>
                <p className="font-mono font-bold text-base text-[#252723]">{formatKES(order.totalKes)}</p>
              </div>
              <div className="text-right">
                <p className="text-[#696B65]">Photographer</p>
                <p className="font-medium text-[#252723]">{order.photographerBusinessName}</p>
              </div>
            </div>

            <div>
              <label className="block text-[#252723] font-medium mb-1">
                Reason for Refund Request *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows={3}
                placeholder="e.g. Accidental duplicate payment, incorrect photo selected, quality issue..."
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div className="pt-2 flex gap-3">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white font-medium rounded-xl transition-colors"
              >
                Submit Refund Request
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
