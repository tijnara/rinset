'use client';

import { useState, useEffect, useCallback } from 'react';
import { OrderBasket, Order, OrderStatus } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { createClient } from '@/lib/supabase/client';
import { Bubbles } from '@/components/icons/Bubbles';
import {
    ArrowRight,
    DollarSign,
    Wind,
    MapPin,
    AlertTriangle,
    Clock,
    CheckCircle2,
    Lock,
    Trash2,
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

        // 1. Check if marked done
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

    const timerInfo = getTimerInfo();
    const drumDisplay = basket.assigned_machine || timerInfo?.drum;

    // Cycle lock checks
    const isWashing = basket.status === 'washing';
    const isDrying = basket.status === 'drying';
    const hasDrum = Boolean(drumDisplay);

    const isWashDone = Boolean(timerInfo?.isDone || timerInfo?.isCycleComplete);
    const isDryDone = Boolean(timerInfo?.isDone || timerInfo?.isCycleComplete);

    // If a drum is assigned and the cycle is actively counting down, lock advancement
    const isCycleInProgress = hasDrum && ((isWashing && !isWashDone) || (isDrying && !isDryDone));

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

    // Void / Cancel order handler
    const handleVoidOrder = async () => {
        const cleanTag = basket.basket_tag || parentOrder?.order_number || 'Order';
        if (!confirm(`Are you sure you want to void / delete basket ${cleanTag}?`)) return;

        const supabase = createClient();
        try {
            await supabase.from('order_baskets').delete().eq('id', basket.id);
            if (parentOrder?.id) {
                await supabase.from('orders').delete().eq('id', parentOrder.id);
            }
            window.dispatchEvent(new CustomEvent('rinset:order-updated'));
        } catch (err) {
            console.error('[Void Order Error]', err);
        }
    };

    const handleActionClick = () => {
        if (!transition || !parentOrder) return;

        // If in washing/drying but no drum was assigned, prompt machine assignment first
        if (!hasDrum && (isWashing || isDrying)) {
            onRequestAssign(basket, basket.status);
            return;
        }

        if (isCycleInProgress) return;

        if (isReady && isUnpaid) {
            onSettle(parentOrder);
            return;
        }

        // Clean up stage completion tag
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

    return (
        <div
            className={`border rounded-2xl p-4 shadow-sm space-y-3 transition group ${
                isOverdue30
                    ? 'bg-rose-950/25 border-rose-800'
                    : isOverdue14
                        ? 'bg-amber-950/25 border-amber-800'
                        : 'bg-slate-950 border-slate-800 hover:border-slate-700'
            }`}
        >
            <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
          <span className="px-2.5 py-1 bg-sky-500/10 text-sky-400 font-mono font-black text-sm rounded-lg border border-sky-500/30">
            {basket.basket_tag}
          </span>
                    <span className="text-xs text-slate-400 font-mono font-bold">
            #{parentOrder?.order_number || 'N/A'}
          </span>
                </div>

                <div className="flex items-center space-x-1.5">
          <span
              className={`text-[11px] uppercase font-black px-2 py-0.5 rounded-md ${
                  parentOrder?.payment_status === 'paid'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
              }`}
          >
            {parentOrder?.payment_status || 'unpaid'}
          </span>

                    {/* Quick Void button */}
                    <button
                        type="button"
                        onClick={handleVoidOrder}
                        className="p-1 rounded-md text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                        title="Void / Delete Order"
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="text-xs text-slate-300">
                <p className="font-bold text-sm text-white truncate">{parentOrder?.customer?.full_name || 'Walk-in'}</p>
                <div className="text-xs text-slate-400 flex justify-between items-center mt-1">
                    <span>{basket.weight_kg > 0 ? `${basket.weight_kg} kg drum` : 'Retail / Load'}</span>
                    <span className="font-mono text-emerald-400 font-black text-sm">
            {parentOrder ? formatPHP(parentOrder.net_payable) : ''}
          </span>
                </div>
            </div>

            {isOverdue14 && (
                <div className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 text-rose-300 text-xs font-bold flex items-center space-x-1.5 border border-rose-500/40">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 text-rose-400" />
                    <span>
            {isOverdue30 ? `ABANDONED (${daysOld}d)` : `OVERDUE (${daysOld}d)`} + {formatPHP(storageFee)}
          </span>
                </div>
            )}

            {/* Drum & Live Countdown / Done Status Badge */}
            {(basket.status === 'washing' || basket.status === 'drying') && (
                <>
                    {timerInfo?.isDone ? (
                        <div className="px-3 py-2 rounded-xl text-xs font-mono font-black flex items-center justify-between border bg-emerald-500/20 border-emerald-500/50 text-emerald-300">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{timerInfo.label}</span>
              </span>
                            {drumDisplay && <span className="text-white text-xs">({drumDisplay})</span>}
                        </div>
                    ) : timerInfo?.isCycleComplete ? (
                        <div className="px-3 py-2 rounded-xl text-xs font-mono font-black flex items-center justify-between border bg-rose-500/20 border-rose-500/60 text-rose-300 animate-pulse">
              <span className="flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-rose-400" />
                <span>{timerInfo.label}</span>
              </span>
                            {drumDisplay && <span className="text-white text-xs font-bold">{drumDisplay}</span>}
                        </div>
                    ) : drumDisplay ? (
                        <div className="px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-between border bg-slate-900 border-slate-700">
              <span className="flex items-center gap-1.5 text-xs text-slate-300">
                {basket.status === 'washing' ? (
                    <Bubbles className="w-4 h-4 text-sky-400" />
                ) : (
                    <Wind className="w-4 h-4 text-amber-400" />
                )}
                  <span>Drum:</span>
                <strong className="text-white font-black">{drumDisplay}</strong>
              </span>

                            {timerInfo?.countdown ? (
                                <span
                                    className={`font-mono text-xs font-black flex items-center gap-1 ${
                                        basket.status === 'washing' ? 'text-sky-400' : 'text-amber-400'
                                    }`}
                                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>{timerInfo.countdown} left</span>
                </span>
                            ) : (
                                <span className="text-[11px] text-slate-500 font-normal">Running</span>
                            )}
                        </div>
                    ) : (
                        <div className="px-3 py-1.5 rounded-xl text-xs font-mono font-bold flex items-center justify-between border bg-amber-500/10 border-amber-500/30 text-amber-300">
              <span className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                <span>No drum assigned</span>
              </span>
                        </div>
                    )}
                </>
            )}

            {parentOrder?.storage_location && isReady && (
                <div className="px-3 py-2 rounded-xl text-xs font-mono font-bold flex items-center justify-between border bg-emerald-500/15 border-emerald-500/40 text-emerald-300">
          <span className="flex items-center gap-1.5 text-xs">
            <MapPin className="w-4 h-4 text-emerald-400" /> Location:
          </span>
                    <span className="font-black text-white">{parentOrder.storage_location}</span>
                </div>
            )}

            {/* Cycle Action Button */}
            {transition && (
                <>
                    {!hasDrum && (isWashing || isDrying) ? (
                        <button
                            type="button"
                            onClick={handleActionClick}
                            className="w-full min-h-[50px] h-12 py-2 px-3 rounded-xl text-xs font-black border flex items-center justify-center space-x-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 border-amber-400 shadow-sm transition"
                        >
                            <span>Assign {isWashing ? 'Washer' : 'Dryer'} Drum</span>
                            <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                        </button>
                    ) : isCycleInProgress ? (
                        <button
                            type="button"
                            disabled
                            className="w-full min-h-[50px] h-12 py-2 px-3 rounded-xl text-xs font-bold border flex items-center justify-center space-x-2 bg-slate-900/60 text-slate-500 border-slate-800/90 cursor-not-allowed select-none opacity-80"
                            title={`${isWashing ? 'Wash' : 'Dry'} cycle is in progress. Wait for countdown or clear drum.`}
                        >
                            <Lock className="w-4 h-4 text-slate-500 flex-shrink-0" />
                            <span>
                {isWashing
                    ? `Washing: ${timerInfo?.countdown ? `${timerInfo.countdown} left` : 'In Progress'}`
                    : `Drying: ${timerInfo?.countdown ? `${timerInfo.countdown} left` : 'In Progress'}`}
              </span>
                        </button>
                    ) : (
                        <button
                            type="button"
                            onClick={handleActionClick}
                            className={`w-full min-h-[50px] h-12 py-2 px-3 rounded-xl text-xs font-black border flex items-center justify-center space-x-2 transition active:scale-95 shadow-sm ${
                                isReady && isUnpaid
                                    ? 'bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border-rose-500/50'
                                    : isWashDone && isWashing
                                        ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-sky-400'
                                        : isDryDone && isDrying
                                            ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 border-emerald-400'
                                            : 'bg-slate-900 hover:bg-slate-800 text-slate-100 border-slate-700'
                            }`}
                        >
                            {isReady && isUnpaid && parentOrder ? (
                                <>
                                    <DollarSign className="w-4 h-4 text-rose-400" />
                                    <span>Collect {formatPHP(parentOrder.net_payable + storageFee)}</span>
                                </>
                            ) : (
                                <>
                                    <span className="tracking-wide uppercase">{transition.label}</span>
                                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                                </>
                            )}
                        </button>
                    )}
                </>
            )}
        </div>
    );
}