'use client';

import { useState } from 'react';
import { useAudit } from './hooks/useAudit';
import { CashOutModal } from './components/CashOutModal';
import { Navbar } from '@/components/layout/Navbar';
import { formatPHP } from '@/lib/formatters';
import {
    FileSpreadsheet,
    MinusCircle,
    PlusCircle,
    AlertCircle,
    CheckCircle2,
    Printer,
    Calendar,
    Coins,
    ChevronDown,
    ChevronUp,
} from 'lucide-react';

export function AuditView() {
    const { metrics, storeId, storeName, logExpense } = useAudit();

    const [isCashOutOpen, setIsCashOutOpen] = useState(false);
    const [showDenominations, setShowDenominations] = useState(false);
    const [actualCashCounted, setActualCashCounted] = useState<number>(0);

    const expectedCash = metrics.expectedCashInDrawer ?? 0;
    const cashDiscrepancy = actualCashCounted > 0 ? actualCashCounted - expectedCash : 0;
    const grossSales = metrics.totalGrossSales ?? metrics.totalSales ?? 0;
    const expenseList = metrics.expenses ?? [];

    const [denominations, setDenominations] = useState<Record<number, number>>({
        1000: 0,
        500: 0,
        200: 0,
        100: 0,
        50: 0,
        20: 0,
        10: 0,
        5: 0,
        1: 0,
    });

    const handleDenominationChange = (value: number, countStr: string) => {
        const count = parseInt(countStr) || 0;
        const updated = { ...denominations, [value]: count };
        setDenominations(updated);

        const total = Object.entries(updated).reduce((acc, [denom, qty]) => {
            return acc + Number(denom) * qty;
        }, 0);

        setActualCashCounted(total);
    };

    const handlePrintZReading = () => {
        window.print();
    };

    const manilaDateStr = new Date().toLocaleDateString('en-US', {
        timeZone: 'Asia/Manila',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            <main className="flex-1 p-3 sm:p-4 md:p-6 max-w-5xl w-full mx-auto space-y-4">
                {/* Header & Cash-Out Trigger */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div>
                        <div className="flex items-center space-x-2">
                            <FileSpreadsheet className="w-5 h-5 text-sky-400" />
                            <h2 className="text-base sm:text-lg font-bold text-white">
                                Daily Z-Reading Reconciliation
                            </h2>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>
                Manila Shift: {manilaDateStr} • {metrics.totalOrdersCount} Total Tickets
              </span>
                        </p>
                    </div>

                    <div className="flex items-center space-x-2 w-full sm:w-auto">
                        <button
                            type="button"
                            onClick={() => setIsCashOutOpen(true)}
                            className="flex-1 sm:flex-initial h-10 px-4 bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-600 active:text-white border border-rose-500/30 text-rose-300 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition"
                        >
                            <MinusCircle className="w-4 h-4" />
                            <span>Log Cash Out / Expense</span>
                        </button>

                        <button
                            type="button"
                            onClick={handlePrintZReading}
                            className="h-10 px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center space-x-1.5 transition shadow"
                        >
                            <Printer className="w-4 h-4" />
                            <span>Print Z-Reading</span>
                        </button>
                    </div>
                </div>

                {/* 4 Financial Metric Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Gross Revenue</span>
                        <span className="text-lg sm:text-xl font-mono font-bold text-white mt-1 block">
              {formatPHP(grossSales)}
            </span>
                        <span className="text-[10px] text-slate-500 font-mono">Cash + GCash</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Cash Intake</span>
                        <span className="text-lg sm:text-xl font-mono font-bold text-emerald-400 mt-1 block">
              {formatPHP(metrics.cashSales)}
            </span>
                        <span className="text-[10px] text-slate-500 font-mono">Paid at Counter</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">GCash Paid</span>
                        <span className="text-lg sm:text-xl font-mono font-bold text-sky-400 mt-1 block">
              {formatPHP(metrics.gcashSales)}
            </span>
                        <span className="text-[10px] text-slate-500 font-mono">Bank Remittance</span>
                    </div>

                    <div className="bg-slate-900/80 border border-slate-800 p-3.5 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Cash-Outs / Expenses</span>
                        <span className="text-lg sm:text-xl font-mono font-bold text-rose-400 mt-1 block">
              {metrics.totalExpenses > 0 ? `-${formatPHP(metrics.totalExpenses)}` : formatPHP(0)}
            </span>
                        <span className="text-[10px] text-slate-500 font-mono">
              {expenseList.length} Vouchers
            </span>
                    </div>
                </div>

                {/* Cash Drawer Reconciliation Equation */}
                <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-4 sm:p-5 space-y-4">
                    <div className="flex justify-between items-center">
                        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                            End-of-Day Cash Drawer Equation
                        </h3>
                        <button
                            type="button"
                            onClick={() => setShowDenominations(!showDenominations)}
                            className="text-xs text-sky-400 hover:text-sky-300 font-semibold flex items-center space-x-1 transition"
                        >
                            <Coins className="w-3.5 h-3.5" />
                            <span>{showDenominations ? 'Hide Denominations' : 'Count Bills & Coins'}</span>
                            {showDenominations ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-center">
                        {/* Cash Collected */}
                        <div className="bg-slate-950 border border-slate-800/80 p-3.5 rounded-2xl">
                            <span className="text-[11px] text-slate-400 block">Total Cash Collected</span>
                            <span className="text-lg font-mono font-bold text-white mt-0.5 block">
                {formatPHP(metrics.cashSales)}
              </span>
                        </div>

                        {/* Total Petty Cash Out */}
                        <div className="bg-slate-950 border border-rose-900/30 p-3.5 rounded-2xl">
                            <span className="text-[11px] text-rose-300 block">Less: Store Expenses</span>
                            <span className="text-lg font-mono font-bold text-rose-400 mt-0.5 block">
                {metrics.totalExpenses > 0 ? `-${formatPHP(metrics.totalExpenses)}` : formatPHP(0)}
              </span>
                        </div>

                        {/* Expected Cash */}
                        <div className="bg-slate-950 border border-emerald-500/30 p-3.5 rounded-2xl bg-emerald-950/10">
                            <span className="text-[11px] text-emerald-300 font-semibold block">Expected Cash in Drawer</span>
                            <span className="text-xl font-mono font-black text-emerald-400 mt-0.5 block">
                {formatPHP(expectedCash)}
              </span>
                        </div>
                    </div>

                    {/* Collapsible Philippine Denomination Calculator */}
                    {showDenominations && (
                        <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 animate-in fade-in duration-150">
              <span className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
                Cash Denomination Tally (₱)
              </span>
                            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2">
                                {[1000, 500, 200, 100, 50, 20, 10, 5, 1].map((val) => (
                                    <div key={val} className="space-y-1">
                                        <label className="text-[10px] text-slate-400 font-mono block text-center">
                                            ₱{val}
                                        </label>
                                        <input
                                            type="number"
                                            min={0}
                                            placeholder="0"
                                            value={denominations[val] || ''}
                                            onChange={(e) => handleDenominationChange(val, e.target.value)}
                                            className="w-full bg-slate-900 border border-slate-800 rounded-xl py-1 px-1.5 text-center text-xs font-mono text-white focus:outline-none focus:border-sky-500"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actual Cash Counted Verification Input */}
                    <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <span className="text-xs font-bold text-slate-200 block">Physical Cash Count in Drawer:</span>
                            <span className="text-[11px] text-slate-400">
                Attendant counts actual paper bills & coins in the drawer
              </span>
                        </div>

                        <div className="flex items-center space-x-2 w-full sm:w-auto">
                            <input
                                type="number"
                                placeholder="0.00"
                                value={actualCashCounted || ''}
                                onChange={(e) => setActualCashCounted(parseFloat(e.target.value) || 0)}
                                className="flex-1 sm:w-44 bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-right font-mono text-lg font-bold text-white focus:border-sky-500 focus:outline-none"
                            />

                            {actualCashCounted > 0 && (
                                <div
                                    className={`px-3 py-2 rounded-xl border flex items-center space-x-1.5 font-mono text-xs font-bold ${
                                        Math.abs(cashDiscrepancy) < 0.01
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                            : cashDiscrepancy > 0
                                                ? 'bg-sky-500/10 border-sky-500/30 text-sky-400'
                                                : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                    }`}
                                >
                                    {Math.abs(cashDiscrepancy) < 0.01 ? (
                                        <>
                                            <CheckCircle2 className="w-4 h-4" />
                                            <span>Balanced</span>
                                        </>
                                    ) : cashDiscrepancy > 0 ? (
                                        <>
                                            <PlusCircle className="w-4 h-4" />
                                            <span>Over: +{formatPHP(cashDiscrepancy)}</span>
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-4 h-4" />
                                            <span>Short: -{formatPHP(Math.abs(cashDiscrepancy))}</span>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Itemized Cash-Out Vouchers Table */}
                <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                    <div className="flex justify-between items-center">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                            <MinusCircle className="w-4 h-4 text-rose-400" />
                            Today&apos;s Itemized Store Expenses ({expenseList.length})
                        </h4>
                        <span className="text-xs font-mono font-bold text-rose-400">
              Total:{' '}
                            {metrics.totalExpenses > 0 ? `-${formatPHP(metrics.totalExpenses)}` : formatPHP(0)}
            </span>
                    </div>

                    {expenseList.length === 0 ? (
                        <p className="text-center py-6 text-xs text-slate-500 font-sans">
                            No cash-outs recorded today. All cash collections remain in the drawer.
                        </p>
                    ) : (
                        <div className="divide-y divide-slate-800/60 overflow-hidden">
                            {expenseList.map((exp) => (
                                <div key={exp.id} className="py-2.5 flex justify-between items-center text-xs">
                                    <div>
                                        <div className="flex items-center space-x-2">
                      <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] uppercase font-bold text-slate-300">
                        {exp.category.replace(/_/g, ' ')}
                      </span>
                                            <span className="text-slate-200 font-medium">{exp.description}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-500 font-mono mt-0.5 block">
                      {new Date(exp.created_at).toLocaleTimeString('en-US', {
                          timeZone: 'Asia/Manila',
                          hour: '2-digit',
                          minute: '2-digit',
                      })}{' '}
                                            • Recorded by {exp.recorded_by}
                    </span>
                                    </div>

                                    <span className="font-mono font-bold text-rose-400 text-sm">
                    -{formatPHP(exp.amount)}
                  </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </main>

            {/* App Footer */}
            <footer className="py-6 pb-24 lg:pb-8 text-center border-t border-slate-800/80 mt-auto select-none bg-slate-950">
                <p className="text-xs text-slate-400 font-mono tracking-wider">
                    Rinset 2026 by tijnara
                </p>
            </footer>

            {/* 58mm Thermal Printable Z-Reading Slip */}
            <div className="hidden print:block w-[58mm] bg-white text-black p-3 font-mono text-[10px] leading-tight mx-auto">
                <div className="text-center pb-2 border-b border-dashed border-black">
                    <h2 className="text-xs font-black uppercase">{storeName}</h2>
                    <p className="text-[9px]">OFFICIAL Z-READING AUDIT SLIP</p>
                    <p className="text-[8px] text-gray-700">{manilaDateStr}</p>
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1">
                    <div className="flex justify-between">
                        <span>Total Tickets:</span>
                        <span>{metrics.totalOrdersCount}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>Gross Revenue:</span>
                        <span>{formatPHP(grossSales)}</span>
                    </div>
                    <div className="flex justify-between text-gray-700">
                        <span>GCash (Bank):</span>
                        <span>{formatPHP(metrics.gcashSales)}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                        <span>Total Cash In:</span>
                        <span>{formatPHP(metrics.cashSales)}</span>
                    </div>
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1">
                    <p className="font-bold">LESS: CASH-OUT / EXPENSES</p>
                    {expenseList.map((e, idx) => (
                        <div key={idx} className="flex justify-between text-[9px]">
                            <span className="truncate max-w-[100px]">{e.description}</span>
                            <span>-{formatPHP(e.amount)}</span>
                        </div>
                    ))}
                    <div className="flex justify-between font-black pt-1 border-t border-black">
                        <span>TOTAL EXPENSES:</span>
                        <span>
              {metrics.totalExpenses > 0 ? `-${formatPHP(metrics.totalExpenses)}` : formatPHP(0)}
            </span>
                    </div>
                </div>

                <div className="py-2 border-b border-dashed border-black space-y-1">
                    <div className="flex justify-between font-black text-xs">
                        <span>EXPECTED CASH:</span>
                        <span>{formatPHP(expectedCash)}</span>
                    </div>
                    {actualCashCounted > 0 && (
                        <>
                            <div className="flex justify-between">
                                <span>ACTUAL COUNTED:</span>
                                <span>{formatPHP(actualCashCounted)}</span>
                            </div>
                            <div className="flex justify-between font-black">
                                <span>DISCREPANCY:</span>
                                <span>
                  {Math.abs(cashDiscrepancy) < 0.01
                      ? 'EXACT (0.00)'
                      : cashDiscrepancy > 0
                          ? `OVER +${formatPHP(cashDiscrepancy)}`
                          : `SHORT -${formatPHP(Math.abs(cashDiscrepancy))}`}
                </span>
                            </div>
                        </>
                    )}
                </div>

                <div className="pt-3 text-[8px] space-y-3">
                    <p>Cashier On Duty: ___________________</p>
                    <p>Store Owner Signature: _____________</p>
                    <p className="text-center text-gray-500">Rinset 2026 by tijnara</p>
                </div>
            </div>

            <CashOutModal
                storeId={storeId}
                storeName={storeName}
                isOpen={isCashOutOpen}
                onClose={() => setIsCashOutOpen(false)}
                onSaveExpense={logExpense}
            />
        </div>
    );
}