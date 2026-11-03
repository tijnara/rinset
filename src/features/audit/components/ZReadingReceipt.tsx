'use client';

import { formatPHP } from '@/lib/formatters';
import { AuditMetrics } from '../hooks/useDailyAudit';
import { Printer, X } from 'lucide-react';

interface ZReadingReceiptProps {
    metrics: AuditMetrics;
    storeName: string;
    physicalCashCounted: number;
    cashDifference: number;
    onClose: () => void;
}

export function ZReadingReceipt({
                                    metrics,
                                    storeName,
                                    physicalCashCounted,
                                    cashDifference,
                                    onClose,
                                }: ZReadingReceiptProps) {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm flex flex-col shadow-2xl overflow-hidden max-h-[92vh]">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center print:hidden">
                    <span className="font-bold text-white text-sm">Daily Z-Reading Audit</span>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
                        <X className="w-4 h-4" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 flex justify-center bg-slate-950">
                    <div className="w-[58mm] bg-white text-black p-3 font-mono text-[11px] leading-tight rounded-sm shadow-md print:w-[58mm] print:shadow-none print:m-0">
                        {/* Header */}
                        <div className="text-center pb-2 border-b border-dashed border-black">
                            <h2 className="text-sm font-black uppercase">{storeName}</h2>
                            <p className="text-[10px]">END-OF-DAY Z-READING</p>
                            <p className="text-[10px] font-bold mt-1">Date: {metrics.dateString}</p>
                            <p className="text-[9px] text-gray-700">
                                Printed: {new Date().toLocaleTimeString('en-PH', { timeZone: 'Asia/Manila' })}
                            </p>
                        </div>

                        {/* Sales Summary */}
                        <div className="py-2 border-b border-dashed border-black space-y-1">
                            <div className="flex justify-between">
                                <span>Total Tickets:</span>
                                <span className="font-bold">{metrics.totalOrders}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Total Volume:</span>
                                <span className="font-bold">{metrics.totalWeightKg} kg</span>
                            </div>
                            <div className="flex justify-between text-xs font-black pt-1 border-t border-black">
                                <span>GROSS SALES:</span>
                                <span>{formatPHP(metrics.grossSales)}</span>
                            </div>
                        </div>

                        {/* Collections Breakdown */}
                        <div className="py-2 border-b border-dashed border-black space-y-1">
                            <span className="text-[9px] uppercase font-bold block text-gray-700">Payment Breakdown</span>
                            <div className="flex justify-between">
                                <span>Cash Payments:</span>
                                <span className="font-bold">{formatPHP(metrics.cashCollected)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>GCash Received:</span>
                                <span className="font-bold">{formatPHP(metrics.gcashCollected)}</span>
                            </div>
                            <div className="flex justify-between text-rose-700 font-bold">
                                <span>Uncollected (Utang):</span>
                                <span>{formatPHP(metrics.uncollectedReceivables)}</span>
                            </div>
                        </div>

                        {/* Cash Drawer Reconciliation */}
                        <div className="py-2 border-b border-dashed border-black space-y-1 bg-gray-100 p-1.5 rounded my-1">
                            <span className="text-[9px] uppercase font-bold block">Cash Drawer Audit</span>
                            <div className="flex justify-between">
                                <span>Expected Cash:</span>
                                <span>{formatPHP(metrics.cashCollected)}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Actual Counted:</span>
                                <span className="font-bold">{formatPHP(physicalCashCounted)}</span>
                            </div>
                            <div className="flex justify-between font-bold border-t border-gray-400 pt-1">
                                <span>Variance:</span>
                                <span className={cashDifference < 0 ? 'text-red-600' : 'text-emerald-700'}>
                  {cashDifference > 0 ? `+${formatPHP(cashDifference)} (Over)` : cashDifference < 0 ? `${formatPHP(cashDifference)} (Short)` : 'BALANCED (₱0.00)'}
                </span>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-4 text-[9px] space-y-4">
                            <div className="border-t border-black pt-1 text-center">Cashier on Duty</div>
                            <div className="border-t border-black pt-1 text-center">Store Owner / Manager</div>
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t border-slate-800 bg-slate-900 print:hidden flex space-x-2">
                    <button
                        onClick={handlePrint}
                        className="flex-1 h-12 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                    >
                        <Printer className="w-4 h-4" />
                        <span>Print Z-Reading (58mm)</span>
                    </button>
                    <button
                        onClick={onClose}
                        className="px-4 h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs transition"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}