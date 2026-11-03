'use client';

import { useState } from 'react';
import { useDailyAudit } from './hooks/useDailyAudit';
import { ZReadingReceipt } from './components/ZReadingReceipt';
import { Navbar } from '@/components/layout/Navbar';
import { formatPHP } from '@/lib/formatters';
import {
    Banknote,
    Smartphone,
    AlertTriangle,
    ReceiptText,
    Calendar,
    Layers,
    CheckCircle,
    FileSpreadsheet,
} from 'lucide-react';

export function AuditView() {
    const { selectedDate, setSelectedDate, metrics, storeName, isLoading } = useDailyAudit();
    const [physicalCashInput, setPhysicalCashInput] = useState<string>('');
    const [isReceiptOpen, setIsReceiptOpen] = useState<boolean>(false);

    const physicalCashCounted = parseFloat(physicalCashInput) || 0;
    const cashDifference = physicalCashCounted - metrics.cashCollected;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            <main className="flex-1 p-4 md:p-6 max-w-6xl w-full mx-auto space-y-6">
                {/* Date Selector Header */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl backdrop-blur">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <FileSpreadsheet className="w-5 h-5 text-sky-400" />
                            Daily Shift Audit & Z-Reading
                        </h2>
                        <p className="text-xs text-slate-400">Asia/Manila (UTC+8) Financial Reconciliation</p>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Calendar className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                            <input
                                type="date"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                            />
                        </div>
                        <button
                            onClick={() => setIsReceiptOpen(true)}
                            className="h-10 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
                        >
                            <ReceiptText className="w-4 h-4" />
                            <span>Print Z-Reading</span>
                        </button>
                    </div>
                </div>

                {/* 4 Financial Key Metric Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="flex justify-between items-start text-emerald-400">
                            <span className="text-xs uppercase font-bold text-slate-400">Cash in Drawer</span>
                            <Banknote className="w-5 h-5" />
                        </div>
                        <span className="text-2xl font-mono font-bold text-emerald-400 mt-3">
              {formatPHP(metrics.cashCollected)}
            </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="flex justify-between items-start text-sky-400">
                            <span className="text-xs uppercase font-bold text-slate-400">GCash Received</span>
                            <Smartphone className="w-5 h-5" />
                        </div>
                        <span className="text-2xl font-mono font-bold text-sky-400 mt-3">
              {formatPHP(metrics.gcashCollected)}
            </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="flex justify-between items-start text-amber-400">
                            <span className="text-xs uppercase font-bold text-slate-400">Uncollected (Utang)</span>
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <span className="text-2xl font-mono font-bold text-amber-400 mt-3">
              {formatPHP(metrics.uncollectedReceivables)}
            </span>
                    </div>

                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl flex flex-col justify-between">
                        <div className="flex justify-between items-start text-indigo-400">
                            <span className="text-xs uppercase font-bold text-slate-400">Total Volume</span>
                            <Layers className="w-5 h-5" />
                        </div>
                        <div className="mt-3">
                            <span className="text-2xl font-mono font-bold text-white">{metrics.totalWeightKg}</span>
                            <span className="text-xs text-slate-400 ml-1">kg ({metrics.totalOrders} tickets)</span>
                        </div>
                    </div>
                </div>

                {/* Cash Drawer Reconciliation Tool */}
                <div className="bg-slate-900/70 border border-slate-800 p-5 rounded-2xl space-y-4">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                        <div>
                            <h3 className="text-sm font-bold text-white">Physical Cash Count & Audit</h3>
                            <p className="text-xs text-slate-400">
                                Count the physical bills and coins inside the cash register at shift closing.
                            </p>
                        </div>
                        {physicalCashCounted > 0 && (
                            <span
                                className={`px-3 py-1 text-xs font-bold font-mono rounded-full border ${
                                    cashDifference === 0
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                        : cashDifference > 0
                                            ? 'bg-sky-500/10 text-sky-400 border-sky-500/30'
                                            : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                                }`}
                            >
                {cashDifference === 0
                    ? 'Drawer Balanced'
                    : cashDifference > 0
                        ? `+${formatPHP(cashDifference)} (Overage)`
                        : `${formatPHP(cashDifference)} (Shortage)`}
              </span>
                        )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                        <div className="space-y-1">
                            <label className="text-xs text-slate-400 font-medium">Physical Cash Counted (₱):</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={physicalCashInput}
                                onChange={(e) => setPhysicalCashInput(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-lg text-white focus:border-sky-500 focus:outline-none"
                            />
                        </div>

                        <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs space-y-1">
                            <div className="flex justify-between text-slate-400">
                                <span>Expected Drawer Cash:</span>
                                <span className="text-white">{formatPHP(metrics.cashCollected)}</span>
                            </div>
                            <div className="flex justify-between text-slate-400">
                                <span>Physical Cash Counted:</span>
                                <span className="text-white">{formatPHP(physicalCashCounted)}</span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                                <span>Variance:</span>
                                <span
                                    className={
                                        cashDifference > 0
                                            ? 'text-sky-400'
                                            : cashDifference < 0
                                                ? 'text-rose-400'
                                                : 'text-emerald-400'
                                    }
                                >
                  {cashDifference > 0 ? `+${formatPHP(cashDifference)}` : formatPHP(cashDifference)}
                </span>
                            </div>
                        </div>

                        <div className="flex flex-col justify-center text-xs text-slate-400 space-y-1">
                            <p>• If <strong>Shortage</strong>, cashier must explain missing receipts.</p>
                            <p>• If <strong>Balanced</strong>, cash is ready for owner hand-over.</p>
                        </div>
                    </div>
                </div>
            </main>

            {/* 58mm Thermal Z-Reading Modal */}
            {isReceiptOpen && (
                <ZReadingReceipt
                    metrics={metrics}
                    storeName={storeName}
                    physicalCashCounted={physicalCashCounted}
                    cashDifference={cashDifference}
                    onClose={() => setIsReceiptOpen(false)}
                />
            )}
        </div>
    );
}