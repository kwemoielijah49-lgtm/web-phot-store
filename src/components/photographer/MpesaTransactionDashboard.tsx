import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
} from 'recharts';
import { useApp } from '../../context/AppContext';
import { formatKES } from '../../utils/mpesa';
import { Photographer, Order } from '../../types';
import {
  DollarSign,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  Download,
  Filter,
  Search,
  Smartphone,
  ShieldCheck,
  Calculator,
  RefreshCw,
  Sparkles,
  ChevronRight,
  ExternalLink,
  Layers,
  Percent,
  Check,
  Copy,
} from 'lucide-react';

interface MpesaTransactionDashboardProps {
  photographer: Photographer;
  orders: Order[];
}

type TimeframeOption = '7d' | '14d' | '30d' | 'all';
type PayoutFilterOption = 'all' | 'pending' | 'settled';

interface DailyAggregatedData {
  dateKey: string;
  dateLabel: string;
  grossSalesKes: number;
  commissionKes: number;
  netEarningsKes: number;
  ordersCount: number;
  pendingPayoutKes: number;
  settledPayoutKes: number;
}

export const MpesaTransactionDashboard: React.FC<MpesaTransactionDashboardProps> = ({
  photographer,
  orders,
}) => {
  const { disbursePhotographerPayout } = useApp();

  // Filters & Controls
  const [timeframe, setTimeframe] = useState<TimeframeOption>('14d');
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  const [payoutFilter, setPayoutFilter] = useState<PayoutFilterOption>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Interactive Simulator State
  const [simulatedGross, setSimulatedGross] = useState<number>(5000);

  // Settlement Modal State
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState<boolean>(false);
  const [isDisbursing, setIsDisbursing] = useState<boolean>(false);
  const [disburseResult, setDisburseResult] = useState<{
    success: boolean;
    message: string;
    payoutRef?: string;
  } | null>(null);

  // Copy feedback state
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = (code: string) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  // Only consider paid orders for this photographer
  const paidOrders = useMemo(() => {
    return orders.filter(
      (o) => o.photographerId === photographer.id && o.status === 'paid'
    );
  }, [orders, photographer.id]);

  // List of unique events for event filter
  const eventOptions = useMemo(() => {
    const map = new Map<string, string>();
    paidOrders.forEach((o) => {
      map.set(o.eventId, o.eventTitle);
    });
    return Array.from(map.entries()).map(([id, title]) => ({ id, title }));
  }, [paidOrders]);

  // Timeframe date cutoff calculation
  const cutoffDate = useMemo(() => {
    const now = new Date();
    if (timeframe === '7d') {
      return new Date(now.getTime() - 7 * 24 * 3600 * 1000);
    }
    if (timeframe === '14d') {
      return new Date(now.getTime() - 14 * 24 * 3600 * 1000);
    }
    if (timeframe === '30d') {
      return new Date(now.getTime() - 30 * 24 * 3600 * 1000);
    }
    return new Date(0); // All time
  }, [timeframe]);

  // Orders filtered by timeframe and event
  const filteredOrders = useMemo(() => {
    return paidOrders.filter((o) => {
      const orderDate = new Date(o.createdAt);
      const matchesTime = orderDate >= cutoffDate;
      const matchesEvent = selectedEventId === 'all' || o.eventId === selectedEventId;
      return matchesTime && matchesEvent;
    });
  }, [paidOrders, cutoffDate, selectedEventId]);

  // Financial aggregates across filtered orders
  const grossSalesTotal = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.totalKes, 0);
  }, [filteredOrders]);

  const commissionTotal = useMemo(() => {
    return filteredOrders.reduce((sum, o) => sum + o.commissionAmountKes, 0);
  }, [filteredOrders]);

  const netEarningsTotal = useMemo(() => {
    return grossSalesTotal - commissionTotal;
  }, [grossSalesTotal, commissionTotal]);

  const pendingPayoutTotal = useMemo(() => {
    return filteredOrders
      .filter((o) => !o.payoutStatus || o.payoutStatus === 'pending')
      .reduce((sum, o) => sum + o.photographerEarningsKes, 0);
  }, [filteredOrders]);

  const settledPayoutTotal = useMemo(() => {
    return filteredOrders
      .filter((o) => o.payoutStatus === 'settled')
      .reduce((sum, o) => sum + o.photographerEarningsKes, 0);
  }, [filteredOrders]);

  // Overall pending payout across ALL time for this photographer (ready to withdraw)
  const allTimePendingPayout = useMemo(() => {
    return paidOrders
      .filter((o) => !o.payoutStatus || o.payoutStatus === 'pending')
      .reduce((sum, o) => sum + o.photographerEarningsKes, 0);
  }, [paidOrders]);

  const allTimePendingOrderCount = useMemo(() => {
    return paidOrders.filter((o) => !o.payoutStatus || o.payoutStatus === 'pending').length;
  }, [paidOrders]);

  // Aggregated Daily Data for Recharts
  const dailyChartData: DailyAggregatedData[] = useMemo(() => {
    const daysMap = new Map<string, DailyAggregatedData>();

    // Generate date sequence based on timeframe
    const daysCount = timeframe === '7d' ? 7 : timeframe === '14d' ? 14 : timeframe === '30d' ? 30 : 14;
    const today = new Date();

    for (let i = daysCount - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      const dateLabel = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
      daysMap.set(dateKey, {
        dateKey,
        dateLabel,
        grossSalesKes: 0,
        commissionKes: 0,
        netEarningsKes: 0,
        ordersCount: 0,
        pendingPayoutKes: 0,
        settledPayoutKes: 0,
      });
    }

    // Populate with filtered orders
    filteredOrders.forEach((o) => {
      const dateKey = o.createdAt.split('T')[0];
      const entry = daysMap.get(dateKey);
      if (entry) {
        entry.grossSalesKes += o.totalKes;
        entry.commissionKes += o.commissionAmountKes;
        entry.netEarningsKes += o.photographerEarningsKes;
        entry.ordersCount += 1;
        if (o.payoutStatus === 'settled') {
          entry.settledPayoutKes += o.photographerEarningsKes;
        } else {
          entry.pendingPayoutKes += o.photographerEarningsKes;
        }
      } else if (timeframe === 'all') {
        const d = new Date(o.createdAt);
        const dateLabel = d.toLocaleDateString('en-KE', { month: 'short', day: 'numeric' });
        daysMap.set(dateKey, {
          dateKey,
          dateLabel,
          grossSalesKes: o.totalKes,
          commissionKes: o.commissionAmountKes,
          netEarningsKes: o.photographerEarningsKes,
          ordersCount: 1,
          pendingPayoutKes: o.payoutStatus === 'settled' ? 0 : o.photographerEarningsKes,
          settledPayoutKes: o.payoutStatus === 'settled' ? o.photographerEarningsKes : 0,
        });
      }
    });

    return Array.from(daysMap.values()).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
  }, [filteredOrders, timeframe]);

  // Donut / Pie distribution data: Net Settled vs Net Pending vs 10% Commission
  const cashflowDistributionData = useMemo(() => {
    return [
      {
        name: 'Settled to M-Pesa Till',
        value: settledPayoutTotal,
        color: '#35594B', // Forest green
      },
      {
        name: 'Pending Payout (90%)',
        value: pendingPayoutTotal,
        color: '#D97706', // Warm Amber
      },
      {
        name: 'Platform Commission (10%)',
        value: commissionTotal,
        color: '#B66D4D', // Terracotta Clay
      },
    ].filter((item) => item.value > 0);
  }, [settledPayoutTotal, pendingPayoutTotal, commissionTotal]);

  // Event revenue comparison data
  const eventRevenueData = useMemo(() => {
    const map = new Map<string, { name: string; gross: number; commission: number; net: number }>();
    filteredOrders.forEach((o) => {
      const existing = map.get(o.eventId) || {
        name: o.eventTitle.length > 22 ? o.eventTitle.slice(0, 20) + '...' : o.eventTitle,
        gross: 0,
        commission: 0,
        net: 0,
      };
      existing.gross += o.totalKes;
      existing.commission += o.commissionAmountKes;
      existing.net += o.photographerEarningsKes;
      map.set(o.eventId, existing);
    });
    return Array.from(map.values());
  }, [filteredOrders]);

  // Table items filtered by status and search
  const tableOrders = useMemo(() => {
    return filteredOrders.filter((ord) => {
      const matchesStatus =
        payoutFilter === 'all'
          ? true
          : payoutFilter === 'pending'
          ? !ord.payoutStatus || ord.payoutStatus === 'pending'
          : ord.payoutStatus === 'settled';

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ord.orderNumber.toLowerCase().includes(q) ||
        (ord.mpesaReference && ord.mpesaReference.toLowerCase().includes(q)) ||
        ord.customerPhone.includes(q) ||
        (ord.customerName && ord.customerName.toLowerCase().includes(q)) ||
        ord.eventTitle.toLowerCase().includes(q);

      return matchesStatus && matchesSearch;
    });
  }, [filteredOrders, payoutFilter, searchQuery]);

  // Execute instant payout settlement
  const handleExecuteDisbursement = async () => {
    setIsDisbursing(true);
    try {
      // Simulate Safaricom Daraja B2C API latency
      await new Promise((r) => setTimeout(r, 1200));
      const res = await disbursePhotographerPayout(photographer.id);
      setDisburseResult({
        success: res.success,
        message: res.message,
        payoutRef: res.payoutReference,
      });
    } catch (err: any) {
      setDisburseResult({
        success: false,
        message: err?.message || 'Failed to disburse payout via M-Pesa.',
      });
    } finally {
      setIsDisbursing(false);
    }
  };

  // Export CSV statement
  const handleExportCSV = () => {
    const headers = [
      'Order Number',
      'Date',
      'M-Pesa Receipt',
      'Customer Phone',
      'Event',
      'Gross Sales (KES)',
      '10% Commission (KES)',
      'Net Earnings (KES)',
      'Payout Status',
      'Payout Reference',
    ];

    const rows = tableOrders.map((o) => [
      o.orderNumber,
      new Date(o.createdAt).toISOString().replace('T', ' ').slice(0, 19),
      o.mpesaReference || 'N/A',
      o.customerPhone,
      `"${o.eventTitle.replace(/"/g, '""')}"`,
      o.totalKes,
      o.commissionAmountKes,
      o.photographerEarningsKes,
      o.payoutStatus === 'settled' ? 'SETTLED' : 'PENDING',
      o.payoutReference || 'UNSETTLED',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Vault_MPESA_Statement_${photographer.businessName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Ledger Header & Status Banner */}
      <section className="bg-white border border-[#DCD8CE] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-[#DCD8CE]">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xs font-mono uppercase tracking-widest text-[#696B65]">
                Safaricom Daraja STK Push & B2C Ledger
              </span>
            </div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#252723] tracking-tight">
              M-Pesa Revenue & Payout Dashboard
            </h2>
            <p className="text-xs text-[#696B65] max-w-2xl leading-relaxed">
              Real-time settlement telemetry with automated{' '}
              <strong className="text-[#252723] font-semibold">10% platform commission deduction</strong>.
              All attendee digital downloads are protected until Safaricom callback verification completes.
            </p>
          </div>

          {/* Account Settlement Destination & Instant Disbursement Trigger */}
          <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 lg:min-w-[380px]">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-[#696B65] uppercase tracking-wider block">
                Settlement M-Pesa Till
              </span>
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-[#35594B]" />
                <span className="font-mono text-base font-bold text-[#252723]">
                  {photographer.mpesaTillOrPaybill}
                </span>
                <span className="text-xs text-[#696B65] font-mono">
                  ({photographer.mpesaPhone})
                </span>
              </div>
              <p className="text-[11px] text-[#696B65]">
                Pending Balance:{' '}
                <strong className="text-[#35594B] font-mono">
                  {formatKES(allTimePendingPayout)}
                </strong>
              </p>
            </div>

            <button
              onClick={() => {
                setDisburseResult(null);
                setIsDisburseModalOpen(true);
              }}
              disabled={allTimePendingPayout <= 0}
              className={`px-4 py-2.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all shadow-sm shrink-0 ${
                allTimePendingPayout > 0
                  ? 'bg-[#35594B] hover:bg-[#29473B] text-white cursor-pointer active:scale-95'
                  : 'bg-[#E5E1D8] text-[#8C8F87] cursor-not-allowed'
              }`}
            >
              <ArrowUpRight className="w-4 h-4" />
              <span>Disburse to Till</span>
            </button>
          </div>
        </div>

        {/* Filters Toolbar: Timeframe & Event */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl text-xs flex-wrap">
            <span className="px-2 text-[11px] font-mono text-[#696B65]">Range:</span>
            {(
              [
                { id: '7d', label: 'Last 7 Days' },
                { id: '14d', label: 'Last 14 Days' },
                { id: '30d', label: 'Last 30 Days' },
                { id: 'all', label: 'All History' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                onClick={() => setTimeframe(opt.id)}
                className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                  timeframe === opt.id
                    ? 'bg-[#35594B] text-white shadow-sm'
                    : 'text-[#696B65] hover:text-[#252723]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="font-mono text-[#696B65] text-xs">Event:</span>
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-1.5 text-xs text-[#252723] font-medium focus:outline-none focus:border-[#35594B]"
              >
                <option value="all">All Events ({eventOptions.length})</option>
                {eventOptions.map((ev) => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-1.5 bg-white hover:bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors shadow-sm"
              title="Export CSV Statement for Bookkeeping & KRA filing"
            >
              <Download className="w-3.5 h-3.5 text-[#35594B]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>
      </section>

      {/* Primary KPI Metric Cards (Tracking 10% Commission Specifically) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="font-mono uppercase tracking-wider text-[11px]">Gross M-Pesa Sales</span>
            <DollarSign className="w-4 h-4 text-[#35594B]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#252723]">
            {formatKES(grossSalesTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#696B65] pt-1 border-t border-[#F0ECE1]">
            <span>{filteredOrders.length} verified transactions</span>
            <span className="font-mono">100% Daraja verified</span>
          </div>
        </div>

        {/* 10% Commission Deduction Card */}
        <div className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="font-mono uppercase tracking-wider text-[11px] text-[#B66D4D] font-bold">
              10% Platform Commission
            </span>
            <div className="p-1 bg-[#B66D4D]/10 rounded text-[#B66D4D]">
              <Percent className="w-3.5 h-3.5" />
            </div>
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#B66D4D]">
            -{formatKES(commissionTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#696B65] pt-1 border-t border-[#F0ECE1]">
            <span>Flat 10.0% Vault fee</span>
            <span className="text-[#B66D4D] font-mono font-medium">Automatic deduction</span>
          </div>
        </div>

        {/* Net Take-Home (90%) */}
        <div className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="font-mono uppercase tracking-wider text-[11px]">Net Photographer Earnings</span>
            <CheckCircle2 className="w-4 h-4 text-[#35594B]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#35594B]">
            {formatKES(netEarningsTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#696B65] pt-1 border-t border-[#F0ECE1]">
            <span>90% of Gross volume</span>
            <span className="font-mono text-[#35594B]">Your Take-Home</span>
          </div>
        </div>

        {/* Pending Payout vs Settled */}
        <div className="bg-white border border-[#DCD8CE] rounded-xl p-5 space-y-2 shadow-sm">
          <div className="flex items-center justify-between text-xs text-[#696B65]">
            <span className="font-mono uppercase tracking-wider text-[11px]">Pending Till Disbursement</span>
            <Clock className="w-4 h-4 text-[#D97706]" />
          </div>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#D97706]">
            {formatKES(pendingPayoutTotal)}
          </p>
          <div className="flex items-center justify-between text-[11px] text-[#696B65] pt-1 border-t border-[#F0ECE1]">
            <span>Settled: {formatKES(settledPayoutTotal)}</span>
            <span className="text-emerald-700 font-mono text-[10px] font-semibold">Ready for B2C</span>
          </div>
        </div>
      </section>

      {/* Visual Analytics Grid: Daily Revenue Trend + Cashflow Allocation Donut */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART 1: Daily Gross, Net Take-Home & 10% Commission Trend */}
        <div className="lg:col-span-2 bg-white border border-[#DCD8CE] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[#DCD8CE]">
            <div>
              <h3 className="font-serif text-lg font-bold text-[#252723]">
                Daily Revenue & Commission Trend
              </h3>
              <p className="text-xs text-[#696B65]">
                Visualizing Gross Customer Spend vs Net Payout (90%) and Commission (10%) by day
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-[#252723]">
                <span className="w-3 h-3 bg-[#252723] rounded-sm" /> Gross
              </span>
              <span className="flex items-center gap-1.5 text-[#35594B]">
                <span className="w-3 h-3 bg-[#35594B] rounded-sm" /> Net (90%)
              </span>
              <span className="flex items-center gap-1.5 text-[#B66D4D]">
                <span className="w-3 h-3 bg-[#B66D4D] rounded-sm" /> 10% Fee
              </span>
            </div>
          </div>

          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={dailyChartData}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="netGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#35594B" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#35594B" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="commGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#B66D4D" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#B66D4D" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EFECE5" vertical={false} />
                <XAxis
                  dataKey="dateLabel"
                  stroke="#8C8F87"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#DCD8CE' }}
                />
                <YAxis
                  stroke="#8C8F87"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#DCD8CE' }}
                  tickFormatter={(val) => `K${val}`}
                />
                <Tooltip content={<CustomChartTooltip />} />
                <Bar
                  dataKey="commissionKes"
                  name="10% Commission"
                  fill="#B66D4D"
                  radius={[3, 3, 0, 0]}
                  barSize={12}
                />
                <Area
                  type="monotone"
                  dataKey="netEarningsKes"
                  name="Net Take-Home"
                  stroke="#35594B"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#netGradient)"
                />
                <Line
                  type="monotone"
                  dataKey="grossSalesKes"
                  name="Gross Sales"
                  stroke="#252723"
                  strokeWidth={2}
                  dot={{ r: 3, fill: '#252723' }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-xs text-[#696B65] pt-2 border-t border-[#F0ECE1] font-mono">
            <span>Period Average Gross: {formatKES(Math.round(grossSalesTotal / Math.max(1, dailyChartData.length)))} / day</span>
            <span>Period Commission: {formatKES(commissionTotal)}</span>
          </div>
        </div>

        {/* CHART 2: Cashflow & Payout Allocation Donut */}
        <div className="bg-white border border-[#DCD8CE] rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="pb-3 border-b border-[#DCD8CE]">
            <h3 className="font-serif text-lg font-bold text-[#252723]">
              Proceeds & Payout Split
            </h3>
            <p className="text-xs text-[#696B65]">
              Breakdown of total gross volume across settlement channels
            </p>
          </div>

          <div className="h-52 w-full flex items-center justify-center relative">
            {cashflowDistributionData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={cashflowDistributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {cashflowDistributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: any) => [formatKES(Number(value)), 'Amount']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderRadius: '8px',
                      border: '1px solid #DCD8CE',
                      fontSize: '11px',
                      fontFamily: 'Inter',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="text-xs text-[#696B65] text-center">No order volume in period</div>
            )}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] uppercase font-mono text-[#696B65]">Total Gross</span>
              <span className="font-mono text-sm font-bold text-[#252723]">
                {formatKES(grossSalesTotal)}
              </span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#F0ECE1] text-xs font-mono">
            <div className="flex items-center justify-between text-[#35594B]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#35594B]" />
                Settled to Till
              </span>
              <span className="font-bold">{formatKES(settledPayoutTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[#D97706]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" />
                Pending Payout (90%)
              </span>
              <span className="font-bold">{formatKES(pendingPayoutTotal)}</span>
            </div>
            <div className="flex items-center justify-between text-[#B66D4D]">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#B66D4D]" />
                Vault Commission (10%)
              </span>
              <span className="font-bold">-{formatKES(commissionTotal)}</span>
            </div>
          </div>
        </div>

      </section>

      {/* 10% Commission Transparency Card & Interactive Payout Estimator */}
      <section className="bg-white border border-[#DCD8CE] rounded-2xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-[#DCD8CE]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#35594B]" />
              <h3 className="font-serif text-xl font-bold text-[#252723]">
                10% Commission Transparency & Settlement Calculator
              </h3>
            </div>
            <p className="text-xs text-[#696B65] max-w-xl">
              Vault operates on a strict flat 10% model. No setup fees, no monthly software subscriptions, and no listing charges.
            </p>
          </div>
          <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg px-3 py-1.5 text-xs font-mono text-[#35594B] shrink-0 self-start md:self-auto">
            Formula: Net = Gross - (Gross × 0.10)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Interactive Calculator Slider */}
          <div className="space-y-4 bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono font-medium text-[#252723]">
                Simulate Event Sales Volume (KES)
              </label>
              <span className="font-mono text-base font-bold text-[#35594B]">
                {formatKES(simulatedGross)}
              </span>
            </div>

            <input
              type="range"
              min={500}
              max={50000}
              step={500}
              value={simulatedGross}
              onChange={(e) => setSimulatedGross(Number(e.target.value))}
              className="w-full accent-[#35594B] cursor-pointer"
            />

            <div className="flex justify-between text-[10px] font-mono text-[#696B65]">
              <span>KES 500</span>
              <span>KES 25,000</span>
              <span>KES 50,000</span>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#DCD8CE] text-xs font-mono">
              <div className="flex justify-between text-[#252723]">
                <span>Customer STK Volume:</span>
                <span>{formatKES(simulatedGross)}</span>
              </div>
              <div className="flex justify-between text-[#B66D4D]">
                <span>Vault Platform Fee (10%):</span>
                <span>-{formatKES(simulatedGross * 0.1)}</span>
              </div>
              <div className="flex justify-between text-[#35594B] font-bold text-sm pt-1 border-t border-[#DCD8CE]">
                <span>Net Credited to M-Pesa Till:</span>
                <span>{formatKES(simulatedGross * 0.9)}</span>
              </div>
            </div>
          </div>

          {/* Breakdown Explanations */}
          <div className="space-y-3 text-xs text-[#696B65] leading-relaxed">
            <div className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg flex items-start gap-3">
              <ShieldCheck className="w-5 h-5 text-[#35594B] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#252723] block font-medium">What Does the 10% Cover?</strong>
                High-speed Cloud CDN storage, instant watermark rendering, Daraja API gateway fees, automated SMS notifications to attendees, and 90-day archive retention.
              </div>
            </div>

            <div className="p-3 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg flex items-start gap-3">
              <Clock className="w-5 h-5 text-[#D97706] shrink-0 mt-0.5" />
              <div>
                <strong className="text-[#252723] block font-medium">Payout Cadence & SLA</strong>
                Automated weekly disbursements every Monday at 08:00 EAT directly to Till {photographer.mpesaTillOrPaybill}. On-demand instant disbursements can also be triggered at any time above KES 100.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Itemized M-Pesa Transactions & Settlement Ledger Table */}
      <section className="bg-white border border-[#DCD8CE] rounded-2xl overflow-hidden shadow-sm space-y-0">
        <div className="p-6 border-b border-[#DCD8CE] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="font-serif text-xl font-bold text-[#252723]">
              Itemized M-Pesa Transaction Ledger
            </h3>
            <p className="text-xs text-[#696B65]">
              Audit trail showing customer phone numbers, receipts, 10% commission, and payout states
            </p>
          </div>

          {/* Table Controls: Search & Status Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#696B65] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search receipt, phone, order..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg text-xs text-[#252723] placeholder-[#8C8F87] focus:outline-none focus:border-[#35594B] w-56"
              />
            </div>

            <div className="flex items-center gap-1 bg-[#FAF8F5] border border-[#DCD8CE] rounded-lg p-1 text-xs">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'pending', label: 'Pending Payout' },
                  { id: 'settled', label: 'Settled to Till' },
                ] as const
              ).map((f) => (
                <button
                  key={f.id}
                  onClick={() => setPayoutFilter(f.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
                    payoutFilter === f.id
                      ? 'bg-[#35594B] text-white shadow-sm'
                      : 'text-[#696B65] hover:text-[#252723]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {tableOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF8F5] border-b border-[#DCD8CE] text-[#696B65] font-mono">
                <tr>
                  <th className="p-3.5">M-Pesa Receipt</th>
                  <th className="p-3.5">Order Ref</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Customer</th>
                  <th className="p-3.5">Event Gallery</th>
                  <th className="p-3.5 text-right">Gross (KES)</th>
                  <th className="p-3.5 text-right">10% Fee</th>
                  <th className="p-3.5 text-right">Net Payout</th>
                  <th className="p-3.5">Settlement Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCD8CE]">
                {tableOrders.map((ord) => {
                  const isSettled = ord.payoutStatus === 'settled';
                  return (
                    <tr key={ord.id} className="hover:bg-[#FAF8F5]/80 transition-colors">
                      {/* M-Pesa Receipt */}
                      <td className="p-3.5 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-[#252723]">
                            {ord.mpesaReference || 'VERIFIED'}
                          </span>
                          {ord.mpesaReference && (
                            <button
                              onClick={() => handleCopyCode(ord.mpesaReference!)}
                              className="p-1 hover:bg-[#EFECE5] rounded text-[#696B65] transition-colors"
                              title="Copy M-Pesa code"
                            >
                              {copiedCode === ord.mpesaReference ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Order Ref */}
                      <td className="p-3.5 font-mono text-[#35594B] font-semibold">
                        {ord.orderNumber}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 text-[#696B65] font-mono text-[11px] whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleDateString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Customer Phone (Masked for privacy) */}
                      <td className="p-3.5 text-[#252723]">
                        <div className="font-medium text-xs">{ord.customerName || 'Attendee'}</div>
                        <div className="text-[11px] text-[#696B65] font-mono">
                          {ord.customerPhone.slice(0, 6)}***{ord.customerPhone.slice(-3)}
                        </div>
                      </td>

                      {/* Event */}
                      <td className="p-3.5 text-[#252723] max-w-[160px] truncate" title={ord.eventTitle}>
                        {ord.eventTitle}
                      </td>

                      {/* Gross */}
                      <td className="p-3.5 font-mono tabular-nums text-right text-[#252723] font-semibold">
                        {formatKES(ord.totalKes)}
                      </td>

                      {/* 10% Commission */}
                      <td className="p-3.5 font-mono tabular-nums text-right text-[#B66D4D]">
                        -{formatKES(ord.commissionAmountKes)}
                      </td>

                      {/* Net Take-Home */}
                      <td className="p-3.5 font-mono tabular-nums text-right text-[#35594B] font-bold">
                        {formatKES(ord.photographerEarningsKes)}
                      </td>

                      {/* Payout Status */}
                      <td className="p-3.5">
                        {isSettled ? (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-700" />
                            <span>Settled ({ord.payoutReference || 'B2C'})</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-amber-50 text-amber-900 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-700" />
                            <span>Pending Disbursement</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center text-xs text-[#696B65] space-y-2">
            <Filter className="w-8 h-8 mx-auto text-[#DCD8CE]" />
            <p className="font-medium text-[#252723]">No transactions match the selected filter</p>
            <p>Try resetting the timeframe, event selector, or search term.</p>
          </div>
        )}

        <div className="p-4 bg-[#FAF8F5] border-t border-[#DCD8CE] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#696B65] font-mono">
          <span>Showing {tableOrders.length} of {filteredOrders.length} filtered transactions</span>
          <div className="flex items-center gap-4">
            <span>Net Sum: {formatKES(tableOrders.reduce((sum, o) => sum + o.photographerEarningsKes, 0))}</span>
            <span>Fee Sum: {formatKES(tableOrders.reduce((sum, o) => sum + o.commissionAmountKes, 0))}</span>
          </div>
        </div>
      </section>

      {/* MODAL: Instant Till Disbursement Flow */}
      {isDisburseModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white border border-[#DCD8CE] rounded-2xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl animate-scaleUp">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCD8CE]">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-[#35594B]" />
                <h4 className="font-serif text-lg font-bold text-[#252723]">
                  M-Pesa B2C Till Disbursement
                </h4>
              </div>
              <button
                onClick={() => setIsDisburseModalOpen(false)}
                className="p-1 hover:bg-[#FAF8F5] rounded text-[#696B65] transition-colors"
              >
                ✕
              </button>
            </div>

            {disburseResult ? (
              <div className="space-y-4 py-2">
                <div
                  className={`p-4 rounded-xl border text-xs space-y-2 ${
                    disburseResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-rose-50 border-rose-200 text-rose-900'
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {disburseResult.success ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-700" />
                        <span>Disbursement Confirmed!</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-rose-700" />
                        <span>Disbursement Failed</span>
                      </>
                    )}
                  </div>
                  <p>{disburseResult.message}</p>
                  {disburseResult.payoutRef && (
                    <p className="font-mono pt-1 text-[11px]">
                      Safaricom B2C Ref: <strong>{disburseResult.payoutRef}</strong>
                    </p>
                  )}
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    onClick={() => setIsDisburseModalOpen(false)}
                    className="px-5 py-2 bg-[#35594B] text-white rounded-lg text-xs font-semibold"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                <p className="text-xs text-[#696B65] leading-relaxed">
                  You are about to transfer all pending net earnings to your registered Safaricom M-Pesa Till / Paybill.
                </p>

                <div className="bg-[#FAF8F5] border border-[#DCD8CE] rounded-xl p-4 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-[#696B65]">
                    <span>Eligible Orders:</span>
                    <span className="text-[#252723] font-bold">{allTimePendingOrderCount} orders</span>
                  </div>
                  <div className="flex justify-between text-[#696B65]">
                    <span>Destination Till / Paybill:</span>
                    <span className="text-[#252723] font-bold">{photographer.mpesaTillOrPaybill}</span>
                  </div>
                  <div className="flex justify-between text-[#696B65]">
                    <span>Phone:</span>
                    <span className="text-[#252723]">{photographer.mpesaPhone}</span>
                  </div>
                  <div className="flex justify-between text-[#696B65]">
                    <span>10% Platform Commission:</span>
                    <span className="text-[#B66D4D]">Already Deducted</span>
                  </div>
                  <div className="flex justify-between text-[#35594B] font-bold text-sm pt-2 border-t border-[#DCD8CE]">
                    <span>Net Transfer Amount:</span>
                    <span>{formatKES(allTimePendingPayout)}</span>
                  </div>
                </div>

                <div className="flex justify-end gap-3 text-xs">
                  <button
                    type="button"
                    onClick={() => setIsDisburseModalOpen(false)}
                    disabled={isDisbursing}
                    className="px-4 py-2 bg-[#FAF8F5] text-[#252723] border border-[#DCD8CE] rounded-lg hover:bg-[#F4F0E7] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleExecuteDisbursement}
                    disabled={isDisbursing || allTimePendingPayout <= 0}
                    className="px-5 py-2 bg-[#35594B] hover:bg-[#29473B] text-white rounded-lg font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {isDisbursing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Sending to Safaricom B2C...</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Confirm Instant Payout</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// Custom Tooltip component for editorial styling
const CustomChartTooltip: React.FC<any> = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as DailyAggregatedData;
    return (
      <div className="bg-white border border-[#DCD8CE] rounded-xl p-3.5 shadow-xl text-xs space-y-2 min-w-[200px]">
        <div className="flex items-center justify-between border-b border-[#F0ECE1] pb-1.5">
          <span className="font-serif font-bold text-[#252723]">{data.dateLabel}</span>
          <span className="font-mono text-[11px] text-[#696B65]">
            {data.ordersCount} {data.ordersCount === 1 ? 'order' : 'orders'}
          </span>
        </div>

        <div className="space-y-1 font-mono text-[11px]">
          <div className="flex justify-between text-[#252723]">
            <span>Gross Sales:</span>
            <span className="font-bold">{formatKES(data.grossSalesKes)}</span>
          </div>
          <div className="flex justify-between text-[#B66D4D]">
            <span>10% Commission:</span>
            <span>-{formatKES(data.commissionKes)}</span>
          </div>
          <div className="flex justify-between text-[#35594B] font-bold pt-1 border-t border-[#F0ECE1]">
            <span>Net Take-Home:</span>
            <span>{formatKES(data.netEarningsKes)}</span>
          </div>
          {data.pendingPayoutKes > 0 && (
            <div className="flex justify-between text-[#D97706] text-[10px]">
              <span>Pending Payout:</span>
              <span>{formatKES(data.pendingPayoutKes)}</span>
            </div>
          )}
        </div>
      </div>
    );
  }
  return null;
};
