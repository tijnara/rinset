'use client';

import { useState, useEffect, useCallback } from 'react';
import { OrderBasket, Order, OrderStatus } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { Bubbles } from '@/components/icons/Bubbles';
import {
    ArrowRight,
    DollarSign,
    Wind,
    MapPin,
    AlertTriangle,
    Clock,
    CheckCircle2,
} from 'lucide-react';

interface OrderCardProps {
    basket: OrderBasket;
    onAdvance: (basketId: string, orderId: string, nextStatus: OrderStatus, meta?: any) => void;
    onRequestAssign: (basket: OrderBasket, targetStatus: OrderStatus) => void;
    onRequestStorage?: (basket: OrderBasket) => void;
    onSettle: (order: Order) => void;
}

const LOCAL_TIMERS_KEY = 'rinset_active_drum_timers';
const DONE_TAGS_KEY = 'rinset_done_tags';

export function OrderCard({
                              basket,
                              onAdvance,
                              onRequestAssign,
                              onRequestStorage,
                              onSettle,
                          }: OrderCardProps) {
    const parentOrder = basket.order;
    const isReady = basket.status === 'ready_for_pickup';
    const isClaimed = basket.status === 'claimed';
    const isUnpaid = Boolean(parentOrder && parentOrder.payment_status !== 'paid');

    const [, setTick] = useState(0);

    // Per-second tick to update countdown timer on active cards
    useEffect(() => {
        if (basket.status === 'washing' || basket.status === 'drying') {
            const timer = setInterval(() => setTick((t) => t + 1), 1000);
            return () => clearInterval(timer);
        }
    }, [basket.status]);

    // Overdue Logic
    const msInDay = 1000 * 60 * 60 * 24;
    const daysOld = parentOrder
        ? Math.floor((Date.now() - new Date(parentOrder.created_at).getTime()) / msInDay)
        : 0;
    const isOverdue14 = isReady && daysOld >= 14;
    const isOverdue30 = isReady && daysOld >= 30;
    const storageFee = isOverdue14 ? (daysOld - 14) * 10 : 0;

    // Retrieve timer & completion state
    const getTimerInfo = useCallback(() => {
        if (typeof window === 'undefined') return null;
        const cleanTag = String(basket.basket_tag || parentOrder?.order_number || '').toUpperCase();

        // 1. Check if marked done (via Clear Drum)
        let doneRecord = null;
        try {
            const doneMap = JSON.parse(localStorage.getItem(DONE_TAGS_KEY) || '{}');
            doneRecord = doneMap[cleanTag] || null;
        } catch {}

        const isWashing = basket.status === 'washing';
        const isDrying = basket.status === 'drying';

        if (isWashing && doneRecord?.stage === 'wash_done') {
            return { isDone: true, label: doneRecord.label || 'WASH DONE', drum: doneRecord.drum || basket.assigned_machine };
        }
        if (isDrying && doneRecord?.stage === 'dry_done') {
            return { isDone: true, label: doneRecord.label || 'DRY DONE', drum: doneRecord.drum || basket.assigned_machine };
        }

        // 2. Check active drum timers
        let activeTimer = null;
        try {
            const timersMap = JSON.parse(localStorage.getItem(LOCAL_TIMERS_KEY) || '{}');
            if (basket.assigned_machine && timersMap[basket.assigned_machine.toUpperCase()]) {
                activeTimer = timersMap[basket.assigned_machine.toUpperCase()];
            } else {
                activeTimer = Object.values(timersMap).find(
                    (t: any) => t?.basket_tag?.toUpperCase() === cleanTag
                );
            }
        } catch {}

        let endsAtMs = 0;
        if (activeTimer?.ends_at) {
            endsAtMs = new Date(activeTimer.ends_at).getTime();
        } else if (basket.assigned_machine) {
            const defaultMins = isWashing ? 35 : 45;
            const startTime = new Date(basket.updated_at || basket.created_at || Date.now()).getTime();
            endsAtMs = startTime + defaultMins * 60 * 1000;
        }

        if (endsAtMs > 0) {
            const diff = endsAtMs - Date.now();
            if (diff <= 0) {
                return {
                    isCycleComplete: true,
                    label: isWashing ? 'WASH COMPLETE' : 'DRY COMPLETE',
                    drum: basket.assigned_machine,
                };
            }
            const totalSecs = Math.floor(diff / 1000);
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;
            return {
                countdown: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
                drum: basket.assigned_machine,
            };
        }

        return null;
    }, [basket, parentOrder]);

    const getNextTransition = (current: OrderStatus): { next: OrderStatus; label: string } | null => {
        switch (current) {
            case 'received':
                return { next: 'washing', label: 'Start Wash' };
            case 'washing':
                return { next: 'drying', label: 'Move to Dryer' };
            case 'drying':
                return { next: 'ready_for_pickup', label: 'Fold & Store' };
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

        // Clean up stage completion tag when moving forward
        const cleanTag = String(basket.basket_tag || parentOrder?.order_number || '').toUpperCase();
        try {
            const doneMap = JSON.parse(localStorage.getItem(DONE_TAGS_KEY) || '{}');
            if (doneMap[cleanTag]) {
                delete doneMap[cleanTag];
                localStorage.setItem(DONE_TAGS_KEY, JSON.stringify(doneMap));
                window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
            }
        } catch {}

        if (transition.next === 'washing' || transition.next === 'drying') {
            onRequestAssign(basket, transition.next);
            return;
        }
        if (transition.next === 'ready_for_pickup') {
            if (typeof onRequestStorage === 'function') {
                onRequestStorage(basket);
            } else {
                onAdvance(basket.id, basket.order_id, transition.next);
            }
            return;
        }
        onAdvance(basket.id, basket.order_id, transition.next);
    };

    const timerInfo = getTimerInfo();
    const drumDisplay = basket.assigned_machine || timerInfo?.drum;

    return (
        <div
            className={`border rounded-xl p-3.5 shadow-sm space-y-2.5 transition ${
                isOverdue30
                    ? 'bg-rose-950/20 border-rose-900/50'
                    : isOverdue14
                        ? 'bg-amber-950/20 border-amber-900/50'
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
                            : 'bg-rose-500/10 text-rose-400'
                    }`}
                >
          {parentOrder?.payment_status || 'unpaid'}
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

            {isOverdue14 && (
                <div className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 text-[10px] font-bold flex items-center space-x-1.5 border border-rose-500/30">
                    <AlertTriangle className="w-3 h-3 flex-shrink-0" />
                    <span>
            {isOverdue30 ? `ABANDONED (${daysOld} days)` : `OVERDUE (${daysOld} days)`} + {formatPHP(storageFee)} fee
          </span>
                </div>
            )}

            {/* Drum & Live Countdown / Done Status Badge */}
            {(basket.status === 'washing' || basket.status === 'drying') && (
                <>
                    {timerInfo?.isDone ? (
                        <div className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-between border bg-emerald-500/15 border-emerald-500/40 text-emerald-300">
              <span className="flex items-center gap-1.5 text-[11px]">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{timerInfo.label}</span>
              </span>
                            {drumDisplay && (
                                <span className="text-[11px] text-emerald-400/80 font-normal">
                  ({drumDisplay})
                </span>
                            )}
                        </div>
                    ) : timerInfo?.isCycleComplete ? (
                        <div className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-between border bg-rose-500/15 border-rose-500/40 text-rose-300 animate-pulse">
              <span className="flex items-center gap-1.5 text-[11px]">
                <Clock className="w-3.5 h-3.5 text-rose-400" />
                <span>{timerInfo.label}</span>
              </span>
                            {drumDisplay && <span className="text-white text-xs">{drumDisplay}</span>}
                        </div>
                    ) : drumDisplay ? (
                        <div className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center justify-between border bg-slate-900 border-slate-700">
              <span className="flex items-center gap-1.5 text-[11px] text-slate-300">
                {basket.status === 'washing' ? (
                    <Bubbles className="w-3.5 h-3.5 text-sky-400" />
                ) : (
                    <Wind className="w-3.5 h-3.5 text-amber-400" />
                )}
                  <span>Drum:</span>
                <strong className="text-white">{drumDisplay}</strong>
              </span>

                            {timerInfo?.countdown ? (
                                <span
                                    className={`font-mono text-xs font-bold flex items-center gap-1 ${
                                        basket.status === 'washing' ? 'text-sky-400' : 'text-amber-400'
                                    }`}
                                >
                  <Clock className="w-3 h-3" />
                  <span>{timerInfo.countdown} left</span>
                </span>
                            ) : (
                                <span className="text-[10px] text-slate-500 font-normal">In Progress</span>
                            )}
                        </div>
                    ) : null}
                </>
            )}

            {parentOrder?.storage_location && isReady && (
                <div className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center justify-between border bg-emerald-500/10 border-emerald-500/30 text-emerald-400">
          <span className="flex items-center gap-1.5 text-[11px]">
            <MapPin className="w-3.5 h-3.5" /> Loc:
          </span>
                    <span>{parentOrder.storage_location}</span>
                </div>
            )}

            {transition && (
                <button
                    onClick={handleActionClick}
                    className={`w-full py-2 rounded-lg text-xs font-bold border flex items-center justify-center space-x-1.5 transition ${
                        isReady && isUnpaid
                            ? 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border-rose-500/30'
                            : timerInfo?.isDone
                                ? 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/40'
                                : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-800'
                    }`}
                >
                    {isReady && isUnpaid && parentOrder ? (
                        <>
                            <DollarSign className="w-3.5 h-3.5" />
                            <span>Collect {formatPHP(parentOrder.net_payable + storageFee)}</span>
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