import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { VaultLogo } from '../common/VaultLogo';
import { formatKES } from '../../utils/mpesa';
import {
  ShieldCheck,
  Users,
  Search,
  Flag,
  Settings,
  FileText,
  CheckCircle2,
  Lock,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const {
    firebaseUser,
    role,
    setRole,
    signInWithDemoAccount,
    setCurrentView,
    photographers,
    updatePhotographerStatus,
    orders,
    moderationReports,
    resolveModerationReport,
    auditEvents,
    platformSettings,
    updatePlatformSettings,
  } = useApp();

  // Strict Authorization Guard
  const isAuthorizedAdmin =
    role === 'admin' ||
    firebaseUser?.email?.toLowerCase() === 'kwemoielijah49@gmail.com';

  const [activeTab, setActiveTab] = useState<'photographers' | 'moderation' | 'transactions' | 'settings' | 'audit'>('photographers');
  
  // Transaction search query
  const [txSearch, setTxSearch] = useState('');

  // Settings form state
  const [commissionRate, setCommissionRate] = useState(platformSettings.defaultCommissionRate * 100);
  const [suggestedPrice, setSuggestedPrice] = useState(platformSettings.suggestedPriceKes);
  const [galleryRetention, setGalleryRetention] = useState(platformSettings.eventRetentionDays);
  const [downloadExpiry, setDownloadExpiry] = useState(platformSettings.downloadExpiryDays);
  const [settingsSaved, setSettingsSaved] = useState(false);

  // If unauthorized, display verified Access Gate
  if (!isAuthorizedAdmin) {
    return (
      <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-white border border-[#DCD8CE] shadow-sm flex items-center justify-center mx-auto text-[#35594B]">
          <Lock className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h1 className="font-serif text-3xl font-bold text-[#252723]">Administrator Access Required</h1>
          <p className="text-sm text-[#696B65] max-w-md mx-auto leading-relaxed">
            This protected console is restricted to authorized platform operators. Please authenticate with your verified administrator account to manage operations.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={async () => {
              await signInWithDemoAccount('kwemoielijah49@gmail.com', 'Elijah Kwemoi');
              setRole('admin');
            }}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold text-xs rounded-xl shadow-sm transition-colors"
          >
            Authenticate as kwemoielijah49@gmail.com
          </button>
          <button
            onClick={() => setCurrentView('events')}
            className="w-full sm:w-auto px-5 py-2.5 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] text-xs font-medium rounded-xl transition-colors"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updatePlatformSettings({
      defaultCommissionRate: Number(commissionRate) / 100,
      suggestedPriceKes: Number(suggestedPrice),
      eventRetentionDays: Number(galleryRetention),
      downloadExpiryDays: Number(downloadExpiry),
    });
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 2500);
  };

  const filteredOrders = orders.filter((o) => {
    if (!txSearch.trim()) return true;
    const q = txSearch.trim().toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.customerPhone.includes(q) ||
      (o.mpesaReference && o.mpesaReference.toLowerCase().includes(q))
    );
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-16">
      
      {/* Admin Title */}
      <section className="bg-white border border-[#DCD8CE] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="flex items-center gap-4">
          <VaultLogo variant="mark" size="lg" />
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-[#35594B] uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Platform Operations & Governance Console</span>
            </div>
            <h1 className="font-serif text-3xl font-bold text-[#252723] tracking-tight">
              Vault Administration
            </h1>
            <p className="text-xs text-[#696B65] mt-1 max-w-xl">
              Audit logs, content moderation, verified payment investigations, and commission governance.
            </p>
          </div>
        </div>

        <div className="bg-[#FAF8F5] border border-[#DCD8CE] p-4 rounded-xl text-xs space-y-1.5 sm:min-w-[240px]">
          <div className="flex justify-between text-[#696B65]">
            <span>Total Photographers</span>
            <span className="font-mono text-[#252723] font-bold">{photographers.length}</span>
          </div>
          <div className="flex justify-between text-[#696B65]">
            <span>Open Moderation Reports</span>
            <span className="font-mono text-[#B66D4D] font-bold">
              {moderationReports.filter((r) => r.status === 'pending').length}
            </span>
          </div>
          <div className="flex justify-between text-[#696B65]">
            <span>Platform Commission Rate</span>
            <span className="font-mono text-[#35594B] font-bold">
              {(platformSettings.defaultCommissionRate * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#DCD8CE] text-xs flex-wrap shadow-sm">
        <button
          onClick={() => setActiveTab('photographers')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'photographers' ? 'bg-[#35594B] text-white shadow-sm' : 'text-[#696B65] hover:text-[#252723]'
          }`}
        >
          Photographer Accounts ({photographers.length})
        </button>

        <button
          onClick={() => setActiveTab('moderation')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors relative ${
            activeTab === 'moderation' ? 'bg-[#35594B] text-white shadow-sm' : 'text-[#696B65] hover:text-[#252723]'
          }`}
        >
          Content Moderation Queue ({moderationReports.filter((r) => r.status === 'pending').length})
        </button>

        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'transactions' ? 'bg-[#35594B] text-white shadow-sm' : 'text-[#696B65] hover:text-[#252723]'
          }`}
        >
          Transactions & M-Pesa Investigation ({orders.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'settings' ? 'bg-[#35594B] text-white shadow-sm' : 'text-[#696B65] hover:text-[#252723]'
          }`}
        >
          Platform Policies & Fees
        </button>

        <button
          onClick={() => setActiveTab('audit')}
          className={`px-4 py-2 font-medium rounded-lg transition-colors ${
            activeTab === 'audit' ? 'bg-[#35594B] text-white shadow-sm' : 'text-[#696B65] hover:text-[#252723]'
          }`}
        >
          Immutable Audit Log ({auditEvents.length})
        </button>
      </div>

      {/* TAB 1: Photographers */}
      {activeTab === 'photographers' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[#DCD8CE] flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[#252723]">Registered Photographers</h3>
            <span className="text-xs text-[#696B65] font-mono">KYC & M-Pesa Settlement Verification</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DCD8CE] text-[#696B65] font-mono">
                <tr>
                  <th className="p-3.5">Business Name</th>
                  <th className="p-3.5">Primary Contact</th>
                  <th className="p-3.5">M-Pesa Till / Phone</th>
                  <th className="p-3.5">Total Paid Out</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Moderation Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCD8CE]">
                {photographers.map((p) => (
                  <tr key={p.id} className="hover:bg-[#FAF8F5]">
                    <td className="p-3.5">
                      <div className="font-bold text-[#252723]">{p.businessName}</div>
                      <div className="text-[11px] text-[#696B65]">{p.name}</div>
                    </td>
                    <td className="p-3.5 text-[#252723]">
                      <div>{p.email}</div>
                      <div className="text-[11px] text-[#696B65] font-mono">{p.phone}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[#252723]">
                      Till: {p.mpesaTillOrPaybill} / {p.mpesaPhone}
                    </td>
                    <td className="p-3.5 font-mono text-[#35594B] font-bold tabular-nums">
                      {formatKES(p.totalPayoutsKes)}
                    </td>
                    <td className="p-3.5">
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold uppercase ${
                        p.status === 'active'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : p.status === 'suspended'
                          ? 'bg-rose-50 text-rose-800 border border-rose-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-right space-x-2">
                      {p.status === 'active' ? (
                        <button
                          onClick={() => updatePhotographerStatus(p.id, 'suspended')}
                          className="px-2.5 py-1 bg-white hover:bg-rose-50 text-rose-700 border border-[#DCD8CE] rounded text-[11px] transition-colors"
                        >
                          Suspend Account
                        </button>
                      ) : (
                        <button
                          onClick={() => updatePhotographerStatus(p.id, 'active')}
                          className="px-2.5 py-1 bg-[#35594B] hover:bg-[#29473B] text-white rounded text-[11px] font-semibold transition-colors"
                        >
                          Activate Account
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 2: Moderation Queue */}
      {activeTab === 'moderation' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#252723]">Content Moderation & Privacy Reports</h3>
              <p className="text-xs text-[#696B65]">
                Enforcing Kenya Data Protection Act 2019 consent requirements & copyright standards.
              </p>
            </div>
          </div>

          {moderationReports.length > 0 ? (
            <div className="space-y-4">
              {moderationReports.map((report) => (
                <div
                  key={report.id}
                  className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-5 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#252723] text-xs">Photo Code: {report.photoCode}</span>
                      <span className="text-[#696B65] font-mono text-xs">Reporter: {report.reporterEmail}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                      report.status === 'pending' ? 'bg-[#B66D4D]/10 text-[#B66D4D]' : 'bg-[#DCD8CE] text-[#252723]'
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>

                  <div className="p-3 bg-white border border-[#DCD8CE] rounded-lg text-xs space-y-1 text-[#252723]">
                    <p className="text-[#B66D4D] font-semibold uppercase text-[11px]">
                      Reason: {report.reason.replace('_', ' ')}
                    </p>
                    <p>&ldquo;{report.notes}&rdquo;</p>
                  </div>

                  {report.actionTaken && (
                    <p className="text-xs text-[#35594B] font-mono">
                      Action Logged: {report.actionTaken}
                    </p>
                  )}

                  {report.status === 'pending' && (
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => resolveModerationReport(report.id, 'takedown')}
                        className="px-3 py-1.5 bg-rose-700 hover:bg-rose-800 text-white rounded-lg text-xs font-semibold"
                      >
                        Takedown Image (Remove from Gallery)
                      </button>
                      <button
                        onClick={() => resolveModerationReport(report.id, 'dismiss')}
                        className="px-3 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg text-xs"
                      >
                        Dismiss Report (No Violation)
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#696B65]">
              No active content reports in the queue.
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Transactions Investigation */}
      {activeTab === 'transactions' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl overflow-hidden space-y-4 p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#252723]">Global Payment & Order Ledger</h3>
              <p className="text-xs text-[#696B65]">Search across all platform transactions by M-Pesa ref, order, or phone.</p>
            </div>

            <div className="w-full sm:w-72">
              <input
                type="text"
                value={txSearch}
                onChange={(e) => setTxSearch(e.target.value)}
                placeholder="Search M-Pesa ref / ORD-xxxx..."
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-1.5 text-[#252723] text-xs font-mono focus:outline-none focus:border-[#35594B]"
              />
            </div>
          </div>

          <div className="overflow-x-auto border border-[#DCD8CE] rounded-lg">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DCD8CE] text-[#696B65] font-mono">
                <tr>
                  <th className="p-3">Order Ref</th>
                  <th className="p-3">M-Pesa Receipt</th>
                  <th className="p-3">Customer Phone</th>
                  <th className="p-3">Photographer</th>
                  <th className="p-3">Gross</th>
                  <th className="p-3">Commission (10%)</th>
                  <th className="p-3">Photographer Net</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCD8CE]">
                {filteredOrders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                    <td className="p-3 font-mono font-bold text-[#35594B]">{ord.orderNumber}</td>
                    <td className="p-3 font-mono text-[#252723] font-semibold">{ord.mpesaReference || '—'}</td>
                    <td className="p-3 font-mono text-[#696B65]">{ord.customerPhone}</td>
                    <td className="p-3 text-[#252723] truncate max-w-[140px]">{ord.photographerBusinessName}</td>
                    <td className="p-3 font-mono text-[#252723] tabular-nums">{formatKES(ord.totalKes)}</td>
                    <td className="p-3 font-mono text-[#696B65] tabular-nums">+{formatKES(ord.commissionAmountKes)}</td>
                    <td className="p-3 font-mono text-[#35594B] tabular-nums font-semibold">{formatKES(ord.photographerEarningsKes)}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                        ord.status === 'paid' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-[#FAF8F5] text-[#696B65] border border-[#DCD8CE]'
                      }`}>
                        {ord.status.toUpperCase()}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* TAB 4: Platform Policies & Fees */}
      {activeTab === 'settings' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl p-6 max-w-2xl space-y-6 shadow-sm">
          <div className="pb-3 border-b border-[#DCD8CE]">
            <h3 className="font-serif text-lg font-bold text-[#252723]">Platform Governance & Retention Policies</h3>
            <p className="text-xs text-[#696B65]">Configure marketplace parameters in KES.</p>
          </div>

          {settingsSaved && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Platform configuration updated and broadcast to all storefronts.</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-[#252723] font-medium mb-1">
                Platform Commission Rate (% of eligible sale)
              </label>
              <input
                type="number"
                value={commissionRate}
                onChange={(e) => setCommissionRate(Number(e.target.value))}
                min={0}
                max={50}
                step={1}
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
              />
              <p className="text-[11px] text-[#696B65] mt-1">
                Standard platform rate: 10% commission.
              </p>
            </div>

            <div>
              <label className="block text-[#252723] font-medium mb-1">
                Platform Suggested Baseline Price (KES)
              </label>
              <input
                type="number"
                value={suggestedPrice}
                onChange={(e) => setSuggestedPrice(Number(e.target.value))}
                min={50}
                step={50}
                className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Public Gallery Retention (Days)
                </label>
                <input
                  type="number"
                  value={galleryRetention}
                  onChange={(e) => setGalleryRetention(Number(e.target.value))}
                  min={14}
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
                />
                <p className="text-[11px] text-[#696B65] mt-1">Platform policy: 90 days</p>
              </div>

              <div>
                <label className="block text-[#252723] font-medium mb-1">
                  Customer Download Expiry (Days)
                </label>
                <input
                  type="number"
                  value={downloadExpiry}
                  onChange={(e) => setDownloadExpiry(Number(e.target.value))}
                  min={7}
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2.5 text-[#252723] font-mono focus:outline-none focus:border-[#35594B]"
                />
                <p className="text-[11px] text-[#696B65] mt-1">Platform policy: 30 days</p>
              </div>
            </div>

            <button
              type="submit"
              className="px-5 py-2.5 bg-[#35594B] hover:bg-[#29473B] text-white font-medium rounded-lg transition-colors shadow-sm"
            >
              Update Platform Configuration
            </button>
          </form>
        </section>
      )}

      {/* TAB 5: Audit Log */}
      {activeTab === 'audit' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl overflow-hidden p-6 space-y-4 shadow-sm">
          <div className="pb-3 border-b border-[#DCD8CE] flex items-center justify-between">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#252723]">Immutable Platform Audit Trail</h3>
              <p className="text-xs text-[#696B65]">
                Full chronological ledger of payments, security callbacks, cancellations, and moderation actions.
              </p>
            </div>
            <span className="font-mono text-xs text-[#696B65]">{auditEvents.length} records</span>
          </div>

          <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            {auditEvents.map((aud) => (
              <div
                key={aud.id}
                className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg text-xs space-y-1 font-mono"
              >
                <div className="flex items-center justify-between text-[#696B65]">
                  <span className="text-[#35594B] font-bold">{aud.action}</span>
                  <span className="text-[11px]">
                    {new Date(aud.timestamp).toLocaleString()}
                  </span>
                </div>
                <p className="text-[#252723] font-sans">{aud.details}</p>
                <div className="text-[11px] text-[#696B65] flex gap-3">
                  <span>Actor: {aud.actorId} ({aud.actorRole})</span>
                  {aud.ipOrRef && <span>Ref: {aud.ipOrRef}</span>}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
};
