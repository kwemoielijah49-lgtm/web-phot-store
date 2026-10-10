import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatKES, validateAndFormatMpesaPhone } from '../../utils/mpesa';
import {
  X,
  Smartphone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Lock,
  ArrowRight,
  RotateCcw,
} from 'lucide-react';

export const MpesaCheckoutModal: React.FC = () => {
  const {
    activePaymentModal,
    setActivePaymentModal,
    cart,
    getCartTotals,
    initiateMpesaCheckout,
    completeMpesaPayment,
    failMpesaPayment,
    setCurrentView,
  } = useApp();

  const [customerPhone, setCustomerPhone] = useState('0712345678');
  const [customerName, setCustomerName] = useState('Jane Mwangi');
  const [customerEmail, setCustomerEmail] = useState('jane.mwangi@gmail.com');
  
  // Step: 'input' | 'waiting_stk' | 'success' | 'failed'
  const [step, setStep] = useState<'input' | 'waiting_stk' | 'success' | 'failed'>('input');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeAttemptId, setActiveAttemptId] = useState<string | null>(null);
  const [completedReceipt, setCompletedReceipt] = useState<string | null>(null);
  const [duplicateNotice, setDuplicateNotice] = useState<string | null>(null);

  if (!activePaymentModal) return null;

  const totals = getCartTotals();

  const handleInitiateSTK = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const validation = validateAndFormatMpesaPhone(customerPhone);
    if (!validation.isValid) {
      setErrorMsg(validation.error || 'Please enter a valid Kenyan phone number');
      return;
    }

    if (!customerEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address for purchase receipts');
      return;
    }

    try {
      setLoading(true);
      const res = await initiateMpesaCheckout({
        customerPhone: validation.formattedPhone,
        customerEmail,
        customerName: customerName || 'Customer',
      });
      setActiveAttemptId(res.attempt.id);
      setStep('waiting_stk');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to initiate M-Pesa checkout');
    } finally {
      setLoading(false);
    }
  };

  const handleSimulatePinSuccess = () => {
    if (!activeAttemptId) return;
    setLoading(true);
    setTimeout(() => {
      const res = completeMpesaPayment({ attemptId: activeAttemptId });
      setLoading(false);
      if (res.success && res.order) {
        setCompletedReceipt(res.order.mpesaReference || 'QDF7781N89');
        setStep('success');
      } else {
        setErrorMsg(res.message);
        setStep('failed');
      }
    }, 700);
  };

  const handleSimulateCancel = () => {
    if (!activeAttemptId) return;
    failMpesaPayment(activeAttemptId, 'Transaction cancelled by user on mobile handset');
    setStep('failed');
  };

  const handleSimulateDuplicateCallback = () => {
    if (!activeAttemptId) return;
    const res = completeMpesaPayment({
      attemptId: activeAttemptId,
      isDuplicateTest: true,
    });
    setDuplicateNotice(res.message);
    setTimeout(() => setDuplicateNotice(null), 5000);
  };

  const handleClose = () => {
    setActivePaymentModal(false);
    setStep('input');
    setErrorMsg(null);
  };

  const handleViewPurchases = () => {
    handleClose();
    setCurrentView('my_orders');
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-lg bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-2xl flex flex-col">
        
        {/* Top Header */}
        <div className="p-6 border-b border-[#DCD8CE] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#35594B]/10 border border-[#35594B]/20 flex items-center justify-center text-[#35594B]">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-serif text-base font-bold text-[#252723]">Lipa Na M-Pesa Online</h3>
              <p className="text-[11px] text-[#696B65]">Instant digital media settlement · KES</p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-[#696B65] hover:text-[#252723] hover:bg-[#F4F0E7] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* STEP 1: Phone input & order review */}
          {step === 'input' && (
            <form onSubmit={handleInitiateSTK} className="space-y-4">
              {/* Order total snapshot */}
              <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-[#696B65]">Order Subtotal ({cart.length} photos)</p>
                  <p className="text-xl font-bold font-mono text-[#252723] tabular-nums mt-0.5">
                    {formatKES(totals.totalKes)}
                  </p>
                </div>
                {totals.discountKes > 0 && (
                  <span className="text-xs text-[#35594B] font-mono font-medium">
                    Bundle saved {formatKES(totals.discountKes)}
                  </span>
                )}
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-xs text-rose-800">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-[#252723] font-medium mb-1">
                    M-Pesa Registered Phone Number *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="0712 345 678 or 2547..."
                      required
                      className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3.5 py-2.5 text-[#252723] font-mono text-sm focus:outline-none focus:border-[#35594B]"
                    />
                  </div>
                  <p className="text-[11px] text-[#696B65] mt-1">
                    Supports Safaricom 07XX or 01XX format. An STK push prompt will pop up on this phone.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#252723] font-medium mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="e.g. Jane Mwangi"
                      className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-2 text-[#252723] text-xs focus:outline-none focus:border-[#35594B]"
                    />
                  </div>

                  <div>
                    <label className="block text-[#252723] font-medium mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={customerEmail}
                      onChange={(e) => setCustomerEmail(e.target.value)}
                      placeholder="for delivery receipt"
                      required
                      className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-2 text-[#252723] text-xs focus:outline-none focus:border-[#35594B]"
                    />
                  </div>
                </div>
              </div>

              {/* M-Pesa Security banner */}
              <div className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg flex items-start gap-2.5 text-[11px] text-[#696B65]">
                <Lock className="w-4 h-4 text-[#35594B] shrink-0 mt-0.5" />
                <p>
                  PIN Privacy Notice: You will enter your M-Pesa PIN only on your private handset. Vault never receives or stores PINs.
                </p>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Initiating STK Push...</span>
                  </>
                ) : (
                  <>
                    <span>Send M-Pesa Payment Prompt</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Waiting for M-Pesa STK push response */}
          {step === 'waiting_stk' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-[#35594B]/10 border border-[#35594B]/20 flex items-center justify-center mx-auto text-[#35594B] animate-pulse">
                <Smartphone className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-serif text-lg font-bold text-[#252723]">
                  M-Pesa Prompt Sent to {customerPhone}
                </h4>
                <p className="text-xs text-[#696B65] max-w-sm mx-auto">
                  Please unlock your phone and enter your 4-digit M-Pesa PIN to authorize{' '}
                  <strong className="text-[#252723] font-mono">{formatKES(totals.totalKes)}</strong>.
                </p>
              </div>

              {/* Interactive payment simulation controls */}
              <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 text-left space-y-3">
                <p className="text-[11px] uppercase tracking-wider font-mono text-[#696B65]">
                  Payment Gateway Verification Control
                </p>
                <div className="space-y-2">
                  <button
                    onClick={handleSimulatePinSuccess}
                    disabled={loading}
                    className="w-full py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Simulate: Customer Entered PIN & Confirmed</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleSimulateCancel}
                      className="py-2 bg-white hover:bg-[#F4F0E7] text-[#252723] border border-[#DCD8CE] rounded-lg text-xs font-medium transition-colors"
                    >
                      Simulate: Cancelled / Timeout
                    </button>
                    <button
                      onClick={handleSimulateDuplicateCallback}
                      className="py-2 bg-white hover:bg-[#F4F0E7] text-[#B66D4D] border border-[#DCD8CE] rounded-lg text-xs font-medium transition-colors"
                    >
                      Test Duplicate Callback
                    </button>
                  </div>
                  {duplicateNotice && (
                    <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-mono">
                      {duplicateNotice}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Payment Success & Delivery Release */}
          {step === 'success' && (
            <div className="space-y-6 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-700">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-serif text-xl font-bold text-[#252723]">Payment Verified!</h4>
                <p className="text-xs text-[#696B65]">
                  M-Pesa Receipt Code:{' '}
                  <span className="font-mono text-[#35594B] font-bold">{completedReceipt}</span>
                </p>
              </div>

              <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 text-left text-xs space-y-2 text-[#252723]">
                <div className="flex items-center gap-2 text-[#35594B] font-semibold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Unwatermarked Master Files Unlocked</span>
                </div>
                <p className="text-[#696B65] leading-relaxed text-[11px]">
                  Your high-resolution original files are ready for immediate download. We also dispatched your secure link to{' '}
                  <strong className="text-[#252723]">{customerEmail}</strong>.
                </p>
                <p className="font-mono text-[11px] text-[#696B65]">
                  Download window active for 30 days under platform media policy.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleViewPurchases}
                  className="flex-1 py-3 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold rounded-xl text-xs transition-colors shadow-sm"
                >
                  Download Master Files Now
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-3 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-xl text-xs font-medium transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}

          {/* STEP 4: Payment Failed */}
          {step === 'failed' && (
            <div className="space-y-5 text-center py-4">
              <div className="w-16 h-16 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-700">
                <AlertCircle className="w-8 h-8" />
              </div>

              <div className="space-y-1">
                <h4 className="font-serif text-lg font-bold text-[#252723]">M-Pesa Payment Incomplete</h4>
                <p className="text-xs text-[#696B65]">
                  The transaction was cancelled, timed out, or rejected by M-Pesa.
                </p>
              </div>

              <div className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg text-xs text-[#696B65] text-left">
                <p>No media files were unlocked. You can retry with the same or an alternative M-Pesa number.</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('input')}
                  className="flex-1 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry Payment</span>
                </button>
                <button
                  onClick={handleClose}
                  className="px-4 py-2.5 bg-white border border-[#DCD8CE] text-[#696B65] hover:text-[#252723] rounded-xl text-xs"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
