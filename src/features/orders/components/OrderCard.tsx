'use client';

import { OrderBasket, Order, OrderStatus } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { ArrowRight, DollarSign, Sparkles, Wind } from 'lucide-react';

interface OrderCardProps {
    basket: OrderBasket;
    onAdvance: (basketId: string, orderId: string, nextStatus: OrderStatus, machineSlot?: string | null) => void;
    onRequestAssign: (basket: OrderBasket, targetStatus: OrderStatus) => void;
    onSettle: (order: Order) => void;
}

export function OrderCard({
                              basket,
                              onAdvance,
                              onRequestAssign,
                              onSettle,
                          }: OrderCardProps) {
    const parentOrder = basket.order;
    const isReady = basket.status === 'ready_for_pickup';
    const isClaimed = basket.status === 'claimed';
    const isUnpaid = parentOrder?.payment_status !== 'paid';

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

    const transition = getNextTransition(basket.status);

    const handleActionClick = () => {
        if (!transition || !parentOrder) return;

        if (isReady && isUnpaid) {
            onSettle(parentOrder);
            return;
        }

        if (transition.next === 'washing' || transition.next === 'drying') {
            onRequestAssign(basket, transition.next);
            return;
        }

        onAdvance(basket.id, basket.order_id, transition.next, null);
    };

    return (
        <div
            className={`border rounded-xl p-3.5 shadow-sm space-y-2.5 transition ${
                isClaimed && isUnpaid
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
          <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 font-mono font-black text-sm rounded border border-sky-500/20">
            {basket.basket_tag}
          </span>
                    <span className="text-[11px] text-slate-400 font-mono">
            #{parentOrder?.order_number || 'N/A'}
          </span>
                </div>

                <span
                    className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded ${
                        parentOrder?.payment_status === 'paid'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-amber-500/10 text-amber-400'
                    }`}
                >
          {parentOrder?.payment_status}
        </span>
            </div>

            <div className="text-xs text-slate-300">
                <p className="font-medium truncate">{parentOrder?.customer?.full_name || 'Walk-in'}</p>
                <div className="text-[11px] text-slate-400 flex justify-between items-center mt-1">
                    <span>{basket.weight_kg > 0 ? `${basket.weight_kg} kg drum` : 'Retail/Load'}</span>
                    <span className="font-mono text-white font-semibold">
            {parentOrder ? formatPHP(parentOrder.net_payable) : ''}
          </span>
                </div>
            </div>

            {basket.assigned_machine && (basket.status === 'washing' || basket.status === 'drying') && (
                <div
                    className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center justify-between border ${
                        basket.status === 'washing'
                            ? 'bg-sky-500/10 border-sky-500/30 text-sky-300'
                            : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-300'
                    }`}
                >
          <span className="flex items-center gap-1.5 text-[11px]">
            {basket.status === 'washing' ? (
                <Sparkles className="w-3 h-3 text-sky-400" />
            ) : (
                <Wind className="w-3 h-3 text-indigo-400" />
            )}
              <span>{basket.status === 'washing' ? 'Drum:' : 'Dryer:'}</span>
          </span>
                    <span className="text-white text-xs">{basket.assigned_machine}</span>
                </div>
            )}

            {isClaimed && isUnpaid && parentOrder && (
                <button
                    onClick={() => onSettle(parentOrder)}
                    className="w-full py-2 bg-rose-500/15 hover:bg-rose-500/25 active:bg-rose-600 text-rose-300 rounded-lg text-xs font-bold border border-rose-500/30 flex items-center justify-center space-x-1.5 transition"
                >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>Collect Debt ({formatPHP(parentOrder.net_payable)})</span>
                </button>
            )}

            {transition && (
                <button
                    onClick={handleActionClick}
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