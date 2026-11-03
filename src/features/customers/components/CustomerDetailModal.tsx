'use client';

import { CustomerWithMetrics } from '../hooks/useCustomers';
import { formatPHP, formatManilaTime } from '@/lib/formatters';
import { X, Calendar, Package, AlertCircle } from 'lucide-react';

interface CustomerDetailModalProps {
    customer: CustomerWithMetrics | null;
    onClose: () => void;
}

export function CustomerDetailModal({ customer, onClose }: CustomerDetailModalProps) {
    if (!customer) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-slate-800 flex justify-between items-start bg-slate-950/60">
                    <div>
                        <h3 className="text-lg font-bold text-white">{customer.full_name}</h3>
                        <p className="text-xs font-mono text-slate-400 mt-0.5">
                            {customer.mobile_number || 'No mobile registered'}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Lifetime Summary Cards */}
                <div className="p-5 grid grid-cols-3 gap-3 border-b border-slate-800 bg-slate-900">
                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Volume</span>
                        <span className="text-lg font-mono font-bold text-white mt-1 block">
              {customer.totalWeightKg} <span className="text-xs font-normal text-slate-400">kg</span>
            </span>
                        <span className="text-[10px] text-slate-500">{customer.totalVisits} visits</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Paid Lifetime</span>
                        <span className="text-lg font-mono font-bold text-emerald-400 mt-1 block">
              {formatPHP(customer.totalSpent)}
            </span>
                        <span className="text-[10px] text-slate-500">Completed</span>
                    </div>

                    <div className="bg-slate-950 border border-slate-800 p-3 rounded-2xl">
                        <span className="text-[10px] text-slate-400 uppercase font-bold block">Current Utang</span>
                        <span
                            className={`text-lg font-mono font-bold mt-1 block ${
                                customer.unpaidBalance > 0 ? 'text-rose-400' : 'text-slate-400'
                            }`}
                        >
              {formatPHP(customer.unpaidBalance)}
            </span>
                        <span className="text-[10px] text-slate-500">Uncollected</span>
                    </div>
                </div>

                {/* Order History */}
                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                        <Package className="w-3.5 h-3.5" />
                        Order History ({customer.recentOrders.length})
                    </h4>

                    {customer.recentOrders.length === 0 ? (
                        <p className="text-center py-8 text-xs text-slate-500">No previous orders on record.</p>
                    ) : (
                        customer.recentOrders.map((order) => (
                            <div
                                key={order.id}
                                className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center"
                            >
                                <div>
                                    <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 font-mono font-bold text-xs rounded border border-sky-500/20">
                      {order.basket_tag}
                    </span>
                                        <span className="text-xs font-mono text-slate-300">#{order.order_number}</span>
                                    </div>
                                    <span className="text-[11px] text-slate-500 flex items-center gap-1 mt-1 font-mono">
                    <Calendar className="w-3 h-3" />
                                        {formatManilaTime(order.created_at)}
                  </span>
                                </div>

                                <div className="text-right">
                  <span className="font-mono text-sm font-bold text-white block">
                    {formatPHP(order.net_payable)}
                  </span>
                                    <span
                                        className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                                            order.payment_status === 'paid'
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-rose-500/10 text-rose-400'
                                        }`}
                                    >
                    {order.payment_status}
                  </span>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}