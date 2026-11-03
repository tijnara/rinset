'use client';

import { Order, OrderStatus } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { ArrowRight, DollarSign, AlertCircle } from 'lucide-react';

interface OrderCardProps {
    order: Order;
    onAdvance: (orderId: string, nextStatus: OrderStatus) => void;
    onSettle: (order: Order) => void;
}

export function OrderCard({ order, onAdvance, onSettle }: OrderCardProps) {
    const isReady = order.status === 'ready_for_pickup';
    const isClaimed = order.status === 'claimed';
    const isUnpaid = order.payment_status !== 'paid';

    const getNextTransition = (current: OrderStatus): { next: OrderStatus; label: string } | null => {
        switch (current) {
            case 'received':
                return { next: 'washing', label: 'Start Wash' };
            case 'washing':
                return { next: 'drying', label: 'Move to Dryer' };
            case 'drying':
                return { next: 'ready_for_pickup', label: 'Mark as Ready' };
            case 'ready_for_pickup':
                return { next: 'claimed', label: 'Release & Claim' };
            default:
                return null;
        }
    };

    const transition = getNextTransition(order.status);

    return (
        <div
            className={`border rounded-xl p-3.5 shadow-sm space-y-2.5 transition ${
                isClaimed && isUnpaid
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
        >
            {/* Basket Tag & Payment Badge */}
            <div className="flex justify-between items-start">
                <div>
          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 font-mono font-black text-sm rounded border border-sky-500/20">
            {order.basket_tag}
          </span>
                    <span className="text-[11px] text-slate-400 font-mono ml-2">
            #{order.order_number}
          </span>
                </div>
                <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        order.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                    }`}
                >
          {order.payment_status}
        </span>
            </div>

            {/* Customer Info & Total */}
            <div className="text-xs text-slate-300">
                <p className="font-medium truncate">{order.customer?.full_name || 'Walk-in'}</p>
                <div className="text-[11px] text-slate-400 flex justify-between items-center mt-1">
                    <span>{order.total_weight_kg > 0 ? `${order.total_weight_kg} kg` : 'Bulky/Retail'}</span>
                    <span className="font-mono text-white font-semibold">
            {formatPHP(order.net_payable)}
          </span>
                </div>
            </div>

            {/* 1. Case: Unpaid order already inside CLAIMED (e.g. B-811) */}
            {isClaimed && isUnpaid && (
                <button
                    onClick={() => onSettle(order)}
                    className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-600 text-rose-300 rounded-lg text-xs font-bold border border-rose-500/30 flex items-center justify-center space-x-1.5 transition"
                >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Collect Debt ({formatPHP(order.net_payable)})</span>
                </button>
            )}

            {/* 2. Case: Normal transitions in Received, Washing, Drying, Ready */}
            {transition && (
                <button
                    onClick={() => {
                        // Guard: If Ready for Claim and Unpaid, force payment settlement first
                        if (isReady && isUnpaid) {
                            onSettle(order);
                        } else {
                            onAdvance(order.id, transition.next);
                        }
                    }}
                    className={`w-full py-2 rounded-lg text-xs font-bold border flex items-center justify-center space-x-1.5 transition ${
                        isReady && isUnpaid
                            ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border-amber-500/30'
                            : 'bg-slate-900 hover:bg-slate-800 active:bg-sky-600 active:text-slate-950 text-slate-300 border-slate-800'
                    }`}
                >
                    {isReady && isUnpaid ? (
                        <>
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Settle & Claim</span>
                        </>
                    ) : (
                        <>
                            <span>{transition.label}</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                        </>
                    )}
                </button>
            )}
        </div>
    );
}