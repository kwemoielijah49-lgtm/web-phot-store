import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { Event } from '../../types';
import { BatchUploader } from './BatchUploader';
import { EventEditorModal } from './EventEditorModal';
import { PhotographerProfileModal } from './PhotographerProfileModal';
import { MpesaTransactionDashboard } from './MpesaTransactionDashboard';
import {
  Camera,
  Plus,
  UploadCloud,
  Eye,
  DollarSign,
  TrendingUp,
  Clock,
  Settings,
  CheckCircle2,
  Edit,
  Trash2,
  Download,
  Sparkles,
  Smartphone,
  Percent,
  ArrowUpRight,
  Users,
  UserPlus,
  ShieldCheck,
  LogOut,
  AlertTriangle,
} from 'lucide-react';

export const PhotographerDashboard: React.FC = () => {
  const {
    activePhotographerId,
    setActivePhotographerId,
    photographers,
    authorizedPhotographers,
    memberships,
    currentMembership,
    inviteTeamMember,
    revokeTeamMember,
    firebaseUser,
    logOut,
    events,
    photos,
    orders,
    refundRequests,
    reviewRefundRequest,
    toggleEventPublish,
    updateEvent,
    deletePhoto,
    setSelectedEventId,
    setCurrentView,
  } = useApp();

  // ISOLATION: Strict fallback only to authorized businesses
  const photographer =
    authorizedPhotographers.find((p) => p.id === activePhotographerId) ||
    authorizedPhotographers[0] ||
    photographers[0];

  // Active tab in studio
  const [activeTab, setActiveTab] = useState<'events' | 'mpesa_analytics' | 'orders' | 'refunds' | 'originals' | 'team'>('mpesa_analytics');

  // Team invite state
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'staff' | 'editor'>('manager');
  const [inviteStatusMessage, setInviteStatusMessage] = useState<string | null>(null);

  // Modals
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [isBatchUploaderOpen, setIsBatchUploaderOpen] = useState(false);
  const [activeUploadEvent, setActiveUploadEvent] = useState<Event | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  // Refund reasoning modal
  const [reviewingRefundId, setReviewingRefundId] = useState<string | null>(null);
  const [refundDecision, setRefundDecision] = useState<'approved' | 'rejected'>('approved');
  const [refundReasonText, setRefundReasonText] = useState('');

  // ISOLATION: Filter strictly by active photographer
  const myEvents = useMemo(() => {
    return events.filter((e) => e.photographerId === photographer.id);
  }, [events, photographer.id]);

  const myPhotos = useMemo(() => {
    return photos.filter((p) => p.photographerId === photographer.id);
  }, [photos, photographer.id]);

  const myOrders = useMemo(() => {
    return orders.filter((o) => o.photographerId === photographer.id);
  }, [orders, photographer.id]);

  const myRefunds = useMemo(() => {
    const orderIds = new Set(myOrders.map((o) => o.id));
    return refundRequests.filter((r) => orderIds.has(r.orderId));
  }, [refundRequests, myOrders]);

  const myTeam = useMemo(() => {
    return memberships.filter((m) => m.photographerId === photographer.id);
  }, [memberships, photographer.id]);

  // Financial summary
  const grossSalesKes = myOrders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.totalKes, 0);

  const totalCommissionsKes = myOrders
    .filter((o) => o.status === 'paid')
    .reduce((sum, o) => sum + o.commissionAmountKes, 0);

  const netEarningsKes = grossSalesKes - totalCommissionsKes;

  const pendingPayoutsKes = myOrders
    .filter((o) => o.status === 'paid' && (!o.payoutStatus || o.payoutStatus === 'pending'))
    .reduce((sum, o) => sum + o.photographerEarningsKes, 0);

  const settledPayoutsKes = myOrders
    .filter((o) => o.status === 'paid' && o.payoutStatus === 'settled')
    .reduce((sum, o) => sum + o.photographerEarningsKes, 0);

  const handleOpenUploader = (ev: Event) => {
    setActiveUploadEvent(ev);
    setIsBatchUploaderOpen(true);
  };

  const handleOpenEditEvent = (ev: Event) => {
    setEditingEvent(ev);
    setIsEventModalOpen(true);
  };

  const handleCreateNewEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handlePreviewAsCustomer = (eventId: string) => {
    setSelectedEventId(eventId);
    setCurrentView('event_gallery');
  };

  const handleExecuteRefundReview = () => {
    if (!reviewingRefundId || !refundReasonText.trim()) return;
    reviewRefundRequest(reviewingRefundId, refundDecision, refundReasonText);
    setReviewingRefundId(null);
    setRefundReasonText('');
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 pb-16">
      
      {/* Studio Header & Account Selector */}
      <section className="bg-white border border-[#DCD8CE] rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <h1 className="font-serif text-3xl font-bold text-[#252723] tracking-tight">
              {photographer.businessName}
            </h1>
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-1.5 rounded-lg bg-[#FAF8F5] hover:bg-[#F4F0E7] text-[#696B65] hover:text-[#252723] border border-[#DCD8CE] transition-colors"
              title="Storefront & Payout Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-[#696B65] max-w-xl leading-relaxed">
            {photographer.bio}
          </p>
          <div
            style={{ fontFamily: 'Inter' }}
            className="flex flex-wrap items-center gap-2 text-xs text-[#696B65] pt-1 font-mono"
          >
            <span>Till / Paybill: {photographer.mpesaTillOrPaybill}</span>
            <span aria-hidden="true">·</span>
            <span>Default: {formatKES(photographer.defaultPriceKes)}</span>
            <span aria-hidden="true">·</span>
            <span className="text-[#35594B] font-semibold">Status: Verified Creator</span>
          </div>
        </div>

        {/* Authenticated Identity & Authorized Account Switcher */}
        <div className="bg-[#FAF8F5] border border-[#DCD8CE] p-4 rounded-xl space-y-3 shrink-0 sm:min-w-[320px]">
          {/* Authenticated User Identity */}
          <div className="flex items-center justify-between gap-3 pb-2.5 border-b border-[#DCD8CE]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-[#35594B]/15 text-[#35594B] flex items-center justify-center font-bold text-xs shrink-0">
                {firebaseUser?.displayName?.charAt(0) || firebaseUser?.email?.charAt(0) || 'U'}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-semibold text-xs text-[#252723] truncate">
                    {firebaseUser?.displayName || 'Authorized Photographer'}
                  </p>
                  <span className={`text-[10px] font-mono font-bold uppercase px-1.5 py-0.2 rounded ${
                    currentMembership?.role === 'owner'
                      ? 'bg-[#35594B]/10 text-[#35594B]'
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {currentMembership?.role || 'Member'}
                  </span>
                </div>
                <p className="text-[10px] text-[#696B65] font-mono truncate">
                  {firebaseUser?.email}
                </p>
              </div>
            </div>

            <button
              onClick={() => logOut()}
              className="px-2 py-1 hover:bg-rose-50 text-rose-700 rounded text-[11px] font-medium transition-colors shrink-0 flex items-center gap-1"
              title="Sign Out of Studio"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>

          {/* Account Selector (Strictly for Authorized Businesses) */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <label className="font-mono text-[#696B65] uppercase tracking-wider">
                Authorized Studio
              </label>
              <span className="text-[10px] font-mono text-[#35594B] font-semibold">
                {authorizedPhotographers.length} Authorized
              </span>
            </div>

            {authorizedPhotographers.length > 1 ? (
              <select
                value={photographer.id}
                onChange={(e) => setActivePhotographerId(e.target.value)}
                className="w-full bg-white border border-[#DCD8CE] hover:border-[#35594B] rounded-lg p-2 text-[#252723] text-xs font-semibold focus:outline-none focus:border-[#35594B] shadow-sm transition-colors"
              >
                {authorizedPhotographers.map((p) => {
                  const mem = memberships.find(
                    (m) =>
                      m.photographerId === p.id &&
                      m.status === 'active' &&
                      (m.userId === firebaseUser?.uid ||
                        m.userEmail.toLowerCase() === firebaseUser?.email?.toLowerCase())
                  );
                  return (
                    <option key={p.id} value={p.id}>
                      {p.businessName} ({mem?.role === 'owner' ? 'Owner' : 'Manager'})
                    </option>
                  );
                })}
              </select>
            ) : (
              <div className="flex items-center justify-between bg-white border border-[#DCD8CE] rounded-lg p-2 text-xs">
                <span className="font-semibold text-[#252723] truncate">
                  {photographer.businessName}
                </span>
                <span className="text-[10px] font-mono text-[#35594B] bg-[#35594B]/10 px-1.5 py-0.5 rounded font-bold shrink-0 ml-2">
                  Isolated Account
                </span>
              </div>
            )}

            <p className="text-[10px] text-[#696B65] leading-tight">
              {authorizedPhotographers.length > 1
                ? 'Strictly isolated to businesses associated with your verified account.'
                : 'Access restricted to your verified photography business.'}
            </p>
          </div>
        </div>
      </section>

      {/* Financial Snapshot Metrics */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Gross Sales */}
        <div
          onClick={() => setActiveTab('mpesa_analytics')}
          style={{ fontFamily: 'Inter' }}
          className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm cursor-pointer hover:border-[#35594B] transition-all group"
          title="Click to view M-Pesa daily revenue chart"
        >
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="group-hover:text-[#35594B] transition-colors font-medium">Gross M-Pesa Sales</span>
            <DollarSign className="w-4 h-4 text-[#35594B]" />
          </div>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-2xl font-bold font-mono tabular-nums text-[#252723]"
          >
            {formatKES(grossSalesKes)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#696B65]">
            <span>{myOrders.filter((o) => o.status === 'paid').length} verified orders</span>
            <span className="text-[#35594B] font-mono text-[10px] group-hover:underline flex items-center gap-0.5">
              Analytics <ArrowUpRight className="w-3 h-3 inline" />
            </span>
          </div>
        </div>

        {/* 10% Commission */}
        <div
          onClick={() => setActiveTab('mpesa_analytics')}
          className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm cursor-pointer hover:border-[#B66D4D] transition-all group"
          title="Click to view 10% commission deductions breakdown"
        >
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="text-[#B66D4D] font-bold group-hover:underline">10% Platform Fee</span>
            <TrendingUp className="w-4 h-4 text-[#B66D4D]" />
          </div>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-2xl font-bold font-mono tabular-nums text-[#B66D4D]"
          >
            -{formatKES(totalCommissionsKes)}
          </p>
          <p className="text-[11px] text-[#696B65]">
            Deducted automatically on sales
          </p>
        </div>

        {/* Net Take-Home */}
        <div
          onClick={() => setActiveTab('mpesa_analytics')}
          className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm cursor-pointer hover:border-[#35594B] transition-all group"
          title="Click to view take-home earnings ledger"
        >
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="group-hover:text-[#35594B] transition-colors font-medium">Net Take-Home (90%)</span>
            <CheckCircle2 className="w-4 h-4 text-[#35594B]" />
          </div>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-2xl font-bold font-mono tabular-nums text-[#35594B]"
          >
            {formatKES(netEarningsKes)}
          </p>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-[11px] text-[#696B65] font-mono"
          >
            Direct Till settlement eligible
          </p>
        </div>

        {/* Pending Payouts */}
        <div
          onClick={() => setActiveTab('mpesa_analytics')}
          className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm cursor-pointer hover:border-[#D97706] transition-all group"
          title="Click to trigger Till disbursement"
        >
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="text-[#D97706] font-bold group-hover:underline">Pending Payout</span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-2xl font-bold font-mono tabular-nums text-[#D97706]"
          >
            {formatKES(pendingPayoutsKes)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#696B65]">
            <span>Till {photographer.mpesaTillOrPaybill}</span>
            <span className="text-[#D97706] font-mono font-semibold">Disburse</span>
          </div>
        </div>

        {/* Catalog Retention */}
        <div className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span>Media Retention</span>
            <Clock className="w-4 h-4 text-[#696B65]" />
          </div>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-2xl font-bold font-mono tabular-nums text-[#252723]"
          >
            {myPhotos.length}{' '}
            <span
              style={{ fontFamily: 'Inter' }}
              className="text-xs font-normal text-[#696B65]"
            >
              photos
            </span>
          </p>
          <p
            style={{ fontFamily: 'Inter' }}
            className="text-[11px] text-[#696B65] font-mono"
          >
            {myEvents.length} events (90-day archive policy)
          </p>
        </div>

      </section>

      {/* Segmented Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#DCD8CE] pb-3">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-[#DCD8CE] text-xs flex-wrap shadow-sm">
          {/* M-Pesa Revenue & Payouts Tab */}
          <button
            onClick={() => setActiveTab('mpesa_analytics')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'mpesa_analytics'
                ? 'bg-[#35594B] text-white shadow-sm'
                : 'text-[#696B65] hover:text-[#252723]'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>M-Pesa Revenue & Payouts</span>
            {pendingPayoutsKes > 0 && (
              <span
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                  activeTab === 'mpesa_analytics'
                    ? 'bg-white/20 text-white'
                    : 'bg-[#D97706]/15 text-[#D97706] border border-[#D97706]/30'
                }`}
              >
                {formatKES(pendingPayoutsKes)}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('events')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'events'
                ? 'bg-[#35594B] text-white shadow-sm'
                : 'text-[#696B65] hover:text-[#252723]'
            }`}
          >
            Events & Galleries ({myEvents.length})
          </button>

          <button
            onClick={() => setActiveTab('orders')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'orders'
                ? 'bg-[#35594B] text-white shadow-sm'
                : 'text-[#696B65] hover:text-[#252723]'
            }`}
          >
            Itemized Orders ({myOrders.length})
          </button>

          <button
            onClick={() => setActiveTab('refunds')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors relative ${
              activeTab === 'refunds'
                ? 'bg-[#35594B] text-white shadow-sm'
                : 'text-[#696B65] hover:text-[#252723]'
            }`}
          >
            Refund Requests ({myRefunds.length})
            {myRefunds.some((r) => r.status === 'pending_review') && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-[#B66D4D] text-white text-[10px] font-bold rounded">
                !
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('originals')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors ${
              activeTab === 'originals'
                ? 'bg-[#35594B] text-white shadow-sm'
                : 'text-[#696B65] hover:text-[#252723]'
            }`}
          >
            Original Masters ({myPhotos.length})
          </button>

          <button
            onClick={() => setActiveTab('team')}
            className={`px-4 py-2 font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'team'
                ? 'bg-[#35594B] text-white shadow-sm'
                : 'text-[#696B65] hover:text-[#252723]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Team & Access ({myTeam.length})</span>
          </button>
        </div>

        {activeTab === 'events' && (
          <button
            onClick={handleCreateNewEvent}
            className="px-4 py-2 bg-[#35594B] hover:bg-[#29473B] text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Create New Event</span>
          </button>
        )}

        {activeTab === 'team' && (
          <button
            onClick={() => {
              setInviteEmail('');
              setInviteName('');
              setInviteRole('manager');
              setInviteStatusMessage(null);
              setIsInviteModalOpen(true);
            }}
            className="px-4 py-2 bg-[#35594B] hover:bg-[#29473B] text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition-colors shadow-sm self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Invite Team Member</span>
          </button>
        )}
      </div>

      {/* TAB 0: M-Pesa Analytics & Payouts Dashboard */}
      {activeTab === 'mpesa_analytics' && (
        <MpesaTransactionDashboard
          photographer={photographer}
          orders={myOrders}
        />
      )}

      {/* TAB 1: Events Manager */}
      {activeTab === 'events' && (
        <section className="space-y-4">
          {myEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {myEvents.map((ev) => {
                const photosInEvent = myPhotos.filter((p) => p.eventId === ev.id);
                const retentionDate = new Date(ev.retentionDeadline).getTime();
                const daysRemaining = Math.max(0, Math.ceil((retentionDate - Date.now()) / (1000 * 3600 * 24)));

                return (
                  <div
                    key={ev.id}
                    className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-4 flex flex-col justify-between shadow-sm"
                  >
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-mono text-[#696B65]">{ev.eventDate}</span>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => toggleEventPublish(ev.id)}
                            style={{ fontFamily: 'Inter' }}
                            className={`px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                              ev.status === 'published'
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : 'bg-[#FAF8F5] text-[#696B65] border border-[#DCD8CE]'
                            }`}
                          >
                            {ev.status === 'published' ? 'Published' : 'Draft'}
                          </button>
                        </div>
                      </div>

                      <h3 className="font-serif text-lg font-bold text-[#252723] line-clamp-1">{ev.title}</h3>
                      <p className="text-xs text-[#696B65] line-clamp-2">{ev.description}</p>

                      <div
                        style={{ fontFamily: 'Inter' }}
                        className="bg-[#FAF8F5] p-3 rounded-lg text-xs space-y-1.5 border border-[#DCD8CE]"
                      >
                        <div
                          style={{ fontFamily: 'Inter' }}
                          className="flex justify-between text-[#696B65] font-mono"
                        >
                          <span>Photos</span>
                          <span className="text-[#252723] font-bold">{photosInEvent.length} uploaded</span>
                        </div>
                        <div
                          style={{ fontFamily: 'Inter' }}
                          className="flex justify-between text-[#696B65] font-mono"
                        >
                          <span>Standard Price</span>
                          <span className="text-[#252723]">{formatKES(ev.overridePriceKes || ev.suggestedPriceKes)}</span>
                        </div>
                        <div className="flex justify-between text-[#696B65] text-[11px]">
                          <span>Retention Archive</span>
                          <span
                            style={{ fontFamily: 'Inter' }}
                            className="text-[#B66D4D] font-mono"
                          >
                            {daysRemaining} days left
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="pt-3 border-t border-[#DCD8CE] flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenUploader(ev)}
                        className="px-3 py-1.5 bg-[#FAF8F5] hover:bg-[#F4F0E7] text-[#35594B] border border-[#DCD8CE] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <UploadCloud className="w-3.5 h-3.5" />
                        <span>Upload Photos</span>
                      </button>

                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handlePreviewAsCustomer(ev.id)}
                          className="p-1.5 bg-white hover:bg-[#FAF8F5] text-[#696B65] hover:text-[#252723] rounded-lg transition-colors border border-[#DCD8CE]"
                          title="Preview public gallery"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleOpenEditEvent(ev)}
                          className="p-1.5 bg-white hover:bg-[#FAF8F5] text-[#696B65] hover:text-[#252723] rounded-lg transition-colors border border-[#DCD8CE]"
                          title="Edit event settings"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-[#DCD8CE] rounded-xl p-12 text-center space-y-4 shadow-sm">
              <Camera className="w-10 h-10 text-[#696B65] mx-auto" />
              <div>
                <p className="text-[#252723] font-semibold">No event galleries created yet</p>
                <p className="text-xs text-[#696B65] mt-1">
                  Create your first event gallery, batch upload watermark-protected photos, and share with attendees.
                </p>
              </div>
              <button
                onClick={handleCreateNewEvent}
                className="px-4 py-2 bg-[#35594B] text-white font-medium rounded-lg text-xs"
              >
                Create Event Now
              </button>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: Orders & Accounting */}
      {activeTab === 'orders' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl overflow-hidden shadow-sm">
          <div className="p-5 border-b border-[#DCD8CE] flex items-center justify-between">
            <h3 className="font-serif text-lg font-bold text-[#252723]">Itemized Sales Ledger</h3>
            <span className="text-xs text-[#696B65] font-mono">10% Platform Commission Accounting</span>
          </div>

          {myOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF8F5] border-b border-[#DCD8CE] text-[#696B65] font-mono">
                  <tr>
                    <th className="p-3.5">Order Ref</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Event</th>
                    <th className="p-3.5">Photos</th>
                    <th className="p-3.5">Gross (KES)</th>
                    <th className="p-3.5">Commission</th>
                    <th className="p-3.5">Net Payout</th>
                    <th className="p-3.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCD8CE]">
                  {myOrders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF8F5]">
                      <td className="p-3.5 font-mono font-bold text-[#35594B]">{ord.orderNumber}</td>
                      <td className="p-3.5 text-[#696B65] font-mono">
                        {new Date(ord.createdAt).toLocaleDateString()}
                      </td>
                      <td className="p-3.5 text-[#252723]">
                        <div>{ord.customerName || 'Attendee'}</div>
                        <div className="text-[11px] text-[#696B65] font-mono">{ord.customerPhone}</div>
                      </td>
                      <td className="p-3.5 text-[#252723] max-w-[160px] truncate">{ord.eventTitle}</td>
                      <td className="p-3.5 font-mono text-[#696B65]">{ord.items.length} items</td>
                      <td className="p-3.5 font-mono tabular-nums text-[#252723] font-semibold">
                        {formatKES(ord.totalKes)}
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-[#696B65]">
                        -{formatKES(ord.commissionAmountKes)}
                      </td>
                      <td className="p-3.5 font-mono tabular-nums text-[#35594B] font-bold">
                        {formatKES(ord.photographerEarningsKes)}
                      </td>
                      <td className="p-3.5">
                        <span className={`px-2 py-0.5 rounded text-[11px] font-mono ${
                          ord.status === 'paid' ? 'text-emerald-800 bg-emerald-50 border border-emerald-200' : 'text-[#696B65] bg-[#FAF8F5]'
                        }`}>
                          {ord.status.toUpperCase()}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-xs text-[#696B65]">
              No orders registered for this photographer yet.
            </div>
          )}
        </section>
      )}

      {/* TAB 3: Refund Requests Review */}
      {activeTab === 'refunds' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#252723]">Customer Refund Disputes</h3>
              <p className="text-xs text-[#696B65] mt-0.5">
                Target SLA: Review within 5 business days. Approving reverses the commission and restores customer balance.
              </p>
            </div>
          </div>

          {myRefunds.length > 0 ? (
            <div className="space-y-4">
              {myRefunds.map((refReq) => (
                <div
                  key={refReq.id}
                  className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-5 space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#252723] text-xs">{refReq.orderNumber}</span>
                      <span className="text-[#696B65] font-mono text-xs">Customer: {refReq.customerPhone}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono font-bold text-[#252723] text-sm">
                        {formatKES(refReq.requestedAmountKes)}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-mono uppercase ${
                        refReq.status === 'pending_review'
                          ? 'bg-[#B66D4D]/10 text-[#B66D4D] border border-[#B66D4D]/30'
                          : refReq.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-800'
                          : 'bg-rose-50 text-rose-800'
                      }`}>
                        {refReq.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <div className="p-3 bg-white border border-[#DCD8CE] rounded-lg text-xs text-[#252723]">
                    <span className="text-[#696B65] font-medium block mb-1">Customer Claim:</span>
                    &ldquo;{refReq.reason}&rdquo;
                  </div>

                  {refReq.photographerDecisionReason && (
                    <div className="text-xs text-[#696B65] font-mono">
                      Decided: {refReq.status.toUpperCase()} — Reasoning: {refReq.photographerDecisionReason}
                    </div>
                  )}

                  {refReq.status === 'pending_review' && (
                    <div className="flex items-center gap-3 pt-2">
                      <button
                        onClick={() => {
                          setReviewingRefundId(refReq.id);
                          setRefundDecision('approved');
                          setRefundReasonText('Verified duplicate or quality defect. Approved for M-Pesa refund.');
                        }}
                        className="px-3.5 py-1.5 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg text-xs font-semibold"
                      >
                        Approve Refund
                      </button>
                      <button
                        onClick={() => {
                          setReviewingRefundId(refReq.id);
                          setRefundDecision('rejected');
                          setRefundReasonText('Image delivery was verified successfully; no defect detected.');
                        }}
                        className="px-3.5 py-1.5 bg-white hover:bg-rose-50 text-rose-700 border border-[#DCD8CE] rounded-lg text-xs"
                      >
                        Reject Claim
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-xs text-[#696B65]">
              No refund requests submitted against your storefront orders.
            </div>
          )}
        </section>
      )}

      {/* TAB 4: Originals Library */}
      {activeTab === 'originals' && (
        <section className="bg-white border border-[#DCD8CE] rounded-xl p-6 space-y-6 shadow-sm">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#252723]">High-Resolution Master Originals</h3>
              <p className="text-xs text-[#696B65]">
                You retain complete access to all unwatermarked original files you uploaded.
              </p>
            </div>
            <span className="font-mono text-xs text-[#696B65]">{myPhotos.length} masters cataloged</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {myPhotos.map((photo) => (
              <div
                key={photo.id}
                className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2 space-y-2 group"
              >
                <div className="aspect-square bg-white rounded overflow-hidden relative border border-[#DCD8CE] flex items-center justify-center">
                  {photo.thumbnailUrl && photo.thumbnailUrl.trim() !== '' ? (
                    <img src={photo.thumbnailUrl.trim()} alt={photo.code} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-[#FAF8F5] text-[#696B65]">
                      <Camera className="w-5 h-5 text-[#35594B] mb-1" />
                      <span className="text-[10px] font-mono">{photo.code}</span>
                    </div>
                  )}
                  {events.find((e) => e.id === photo.eventId)?.coverImageUrl === (photo.previewWatermarkedUrl || photo.originalUrl) && (
                    <div className="absolute top-1 left-1 bg-[#35594B] text-white text-[9px] font-mono px-1.5 py-0.5 rounded shadow">
                      Cover
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                    <button
                      onClick={() => updateEvent(photo.eventId, { coverImageUrl: photo.previewWatermarkedUrl || photo.originalUrl })}
                      className="p-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded"
                      title="Set as High-Clarity Event Cover"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                    </button>
                    <a
                      href={photo.originalUrl}
                      download={`${photo.code}_MASTER.jpg`}
                      className="p-1.5 bg-[#35594B] text-white rounded hover:bg-[#29473B]"
                      title="Download unwatermarked master"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </a>
                    <button
                      onClick={() => deletePhoto(photo.id)}
                      className="p-1.5 bg-rose-700 text-white rounded hover:bg-rose-800"
                      title="Delete photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-[11px] truncate">
                  <span className="font-mono font-bold text-[#252723] block">{photo.code}</span>
                  <span className="text-[#696B65]">{photo.category}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* TAB 5: Team & Access Manager */}
      {activeTab === 'team' && (
        <section className="space-y-6">
          <div className="bg-white border border-[#DCD8CE] rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#252723]">
                  Authorized Studio Team & Access Permissions
                </h3>
                <p className="text-xs text-[#696B65]">
                  Manage which authenticated accounts have permission to view financials, edit galleries, and upload photos for {photographer.businessName}.
                </p>
              </div>

              {currentMembership?.role === 'owner' && (
                <button
                  onClick={() => {
                    setInviteEmail('');
                    setInviteName('');
                    setInviteRole('manager');
                    setInviteStatusMessage(null);
                    setIsInviteModalOpen(true);
                  }}
                  className="px-4 py-2 bg-[#35594B] hover:bg-[#29473B] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  <span>Add Team Member</span>
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-[#DCD8CE] text-[#696B65] font-mono uppercase text-[11px]">
                    <th className="py-3 px-3">Team Member</th>
                    <th className="py-3 px-3">Email Address</th>
                    <th className="py-3 px-3">Assigned Role</th>
                    <th className="py-3 px-3">Access Status</th>
                    <th className="py-3 px-3">Added Date</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCD8CE]">
                  {myTeam.map((mem) => {
                    const isSelf = mem.userEmail.toLowerCase() === firebaseUser?.email?.toLowerCase();
                    const isPrimaryOwner = mem.role === 'owner';

                    return (
                      <tr key={mem.id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#35594B]/10 text-[#35594B] font-bold flex items-center justify-center text-xs">
                              {mem.userName?.charAt(0) || mem.userEmail.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-semibold text-[#252723]">
                              {mem.userName || mem.userEmail.split('@')[0]}
                              {isSelf && ' (You)'}
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-3 font-mono text-[#696B65]">
                          {mem.userEmail}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                              mem.role === 'owner'
                                ? 'bg-[#35594B]/15 text-[#35594B]'
                                : mem.role === 'manager'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-gray-100 text-gray-700'
                            }`}
                          >
                            {mem.role}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                              mem.status === 'active'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-rose-100 text-rose-800'
                            }`}
                          >
                            {mem.status === 'active' ? '● Active' : '✕ Revoked'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-[#696B65] font-mono">
                          {mem.createdAt ? new Date(mem.createdAt).toLocaleDateString() : 'Initial'}
                        </td>
                        <td className="py-3 px-3 text-right">
                          {currentMembership?.role === 'owner' && !isPrimaryOwner && mem.status === 'active' && (
                            <button
                              onClick={async () => {
                                if (confirm(`Revoke access for ${mem.userEmail}?`)) {
                                  await revokeTeamMember(photographer.id, mem.id);
                                }
                              }}
                              className="px-2 py-1 text-rose-700 hover:bg-rose-50 border border-rose-200 rounded font-medium text-[11px] transition-colors"
                            >
                              Revoke Access
                            </button>
                          )}
                          {isPrimaryOwner && (
                            <span className="text-[11px] text-[#696B65] font-mono">
                              Primary Owner
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-3.5 text-[11px] text-[#696B65] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#35594B] shrink-0" />
              <span>
                All account membership changes take effect immediately on both client and backend servers. Revoked accounts lose access to all financial data, orders, and event assets.
              </span>
            </div>
          </div>
        </section>
      )}

      {/* Invite Team Member Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCD8CE] rounded-2xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#35594B]" />
                <h3 className="font-serif text-lg font-bold text-[#252723]">
                  Invite Team Member
                </h3>
              </div>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-[#696B65] hover:text-[#252723]"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-[#696B65]">
              Grant an authenticated user manager or staff permissions to collaborate on <strong>{photographer.businessName}</strong>.
            </p>

            {inviteStatusMessage && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-xs">
                {inviteStatusMessage}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
                  setInviteStatusMessage('Please provide a valid email address.');
                  return;
                }

                try {
                  await inviteTeamMember(photographer.id, inviteEmail.trim(), inviteName.trim(), inviteRole);
                  setIsInviteModalOpen(false);
                } catch (err: any) {
                  setInviteStatusMessage(err.message || 'Invitation failed');
                }
              }}
              className="space-y-4 text-xs"
            >
              <div className="space-y-1">
                <label className="font-semibold text-[#252723] block">
                  Member Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="e.g. associate@photostudio.co.ke"
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-2.5 text-xs text-[#252723] focus:outline-none focus:border-[#35594B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#252723] block">
                  Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  placeholder="e.g. Faith Muthoni"
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-2.5 text-xs text-[#252723] focus:outline-none focus:border-[#35594B]"
                />
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-[#252723] block">
                  Membership Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-2.5 text-xs text-[#252723] focus:outline-none focus:border-[#35594B]"
                >
                  <option value="manager">Authorized Manager (Full gallery, orders & analytics)</option>
                  <option value="staff">Studio Staff (Upload & view photos only)</option>
                  <option value="editor">Gallery Editor (Manage photo codes & metadata)</option>
                </select>
              </div>

              <div className="pt-3 border-t border-[#DCD8CE] flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-3 py-2 bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-xl font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#35594B] hover:bg-[#29473B] text-white font-semibold rounded-xl transition-colors shadow-sm"
                >
                  Confirm & Grant Access
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Refund Review Prompt Modal */}
      {reviewingRefundId && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCD8CE] rounded-xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <h4 className="font-serif text-base font-bold text-[#252723]">
              Confirm Refund Decision: {refundDecision.toUpperCase()}
            </h4>
            <p className="text-xs text-[#696B65]">
              Please document the business reason for this decision (logged in the auditable dispute ledger):
            </p>
            <textarea
              value={refundReasonText}
              onChange={(e) => setRefundReasonText(e.target.value)}
              rows={3}
              className="w-full bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-2 text-[#252723] text-xs focus:outline-none focus:border-[#35594B]"
              placeholder="State reason clearly..."
            />
            <div className="flex justify-end gap-2 text-xs">
              <button
                onClick={() => setReviewingRefundId(null)}
                className="px-3 py-1.5 bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteRefundReview}
                className={`px-4 py-1.5 text-white font-semibold rounded-lg ${
                  refundDecision === 'approved' ? 'bg-[#35594B]' : 'bg-rose-700'
                }`}
              >
                Confirm {refundDecision.toUpperCase()}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Uploader Modal */}
      {isBatchUploaderOpen && activeUploadEvent && (
        <BatchUploader
          event={activeUploadEvent}
          onClose={() => setIsBatchUploaderOpen(false)}
        />
      )}

      {/* Event Editor Modal */}
      {isEventModalOpen && (
        <EventEditorModal
          initialEvent={editingEvent}
          onClose={() => setIsEventModalOpen(false)}
        />
      )}

      {/* Photographer Profile Modal */}
      {isProfileModalOpen && (
        <PhotographerProfileModal
          photographer={photographer}
          onClose={() => setIsProfileModalOpen(false)}
        />
      )}

    </div>
  );
};
