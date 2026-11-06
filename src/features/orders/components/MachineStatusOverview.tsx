'use client';

import { useState, useEffect } from 'react';
import { OrderBasket } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { Waves, Wind, RotateCcw } from 'lucide-react';

export const WASHERS = ['W-01', 'W-02', 'W-03', 'W-04'] as const;
export const DRYERS = ['D-01', 'D-02', 'D-03', 'D-04'] as const;

const LOCAL_TIMERS_KEY = 'rinset_active_drum_timers';
const DONE_TAGS_KEY = 'rinset_done_tags';

interface MachineStatusOverviewProps {
    baskets: OrderBasket[];
}

export function MachineStatusOverview({ baskets }: MachineStatusOverviewProps) {
    const [, setTick] = useState(0);
    const [localTimers, setLocalTimers] = useState<Record<string, any>>({});
    const [doneTags, setDoneTags] = useState<Record<string, any>>({});

    // Per-second tick to update live countdown timer
    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    // Sync timers and done tags from localStorage & window events
    const syncLocalState = () => {
        if (typeof window === 'undefined') return;
        try {
            const savedTimers = localStorage.getItem(LOCAL_TIMERS_KEY);
            if (savedTimers) setLocalTimers(JSON.parse(savedTimers));

            const savedDone = localStorage.getItem(DONE_TAGS_KEY);
            if (savedDone) setDoneTags(JSON.parse(savedDone));
        } catch {}
    };

    useEffect(() => {
        syncLocalState();
        const handleSync = () => syncLocalState();
        window.addEventListener('rinset:timers-updated', handleSync);
        window.addEventListener('rinset:order-updated', handleSync);
        return () => {
            window.removeEventListener('rinset:timers-updated', handleSync);
            window.removeEventListener('rinset:order-updated', handleSync);
        };
    }, []);

    // Compute status and countdown for each drum
    const getDrumState = (drumName: string, type: 'washer' | 'dryer') => {
        const isWasher = type === 'washer';
        const cleanTarget = drumName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // 1. Check local timers first
        const timerData = localTimers[drumName];
        if (timerData && timerData.ends_at) {
            const diff = new Date(timerData.ends_at).getTime() - Date.now();
            const isDone = diff <= 0;
            const totalSecs = Math.max(0, Math.floor(diff / 1000));
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;

            return {
                drum: drumName,
                status: 'occupied',
                tag: timerData.basket_tag,
                isDone,
                countdown: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
                orderId: timerData.order_id,
            };
        }

        // 2. Check active baskets from props
        const matchingBasket = baskets.find((b) => {
            const status = String(b.status || '').toLowerCase();
            const matchesType = isWasher
                ? status === 'washing' || status === 'wash'
                : status === 'drying' || status === 'dry';

            const drumClean = String(b.assigned_machine || (b.order as any)?.drum || '')
                .replace(/[^a-zA-Z0-9]/g, '')
                .toUpperCase();

            return matchesType && drumClean === cleanTarget;
        });

        if (matchingBasket) {
            const tag = String(matchingBasket.basket_tag || matchingBasket.order?.order_number || '').toUpperCase();
            const defaultDuration = isWasher ? 35 : 45;
            const startTime = new Date(matchingBasket.updated_at || matchingBasket.created_at || Date.now()).getTime();
            const endsAt = startTime + defaultDuration * 60 * 1000;
            const diff = endsAt - Date.now();
            const isDone = diff <= 0;
            const totalSecs = Math.max(0, Math.floor(diff / 1000));
            const mins = Math.floor(totalSecs / 60);
            const secs = totalSecs % 60;

            return {
                drum: drumName,
                status: 'occupied',
                tag,
                isDone,
                countdown: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
                orderId: matchingBasket.order_id,
                basketId: matchingBasket.id,
            };
        }

        return {
            drum: drumName,
            status: 'idle',
            tag: null,
            isDone: false,
            countdown: null,
            orderId: null,
        };
    };

    // Quick Clear Drum action right from the Live Board header
    const handleClearDrum = async (drumName: string, type: 'washer' | 'dryer', tag: string | null) => {
        if (!tag) return;
        const cleanTag = tag.toUpperCase();
        const stage = type === 'washer' ? 'wash_done' : 'dry_done';
        const label = type === 'washer' ? 'WASH DONE' : 'DRY DONE';

        try {
            const updatedDone = {
                ...doneTags,
                [cleanTag]: {
                    stage,
                    label,
                    drum: drumName,
                    timestamp: new Date().toISOString(),
                },
            };
            setDoneTags(updatedDone);
            localStorage.setItem(DONE_TAGS_KEY, JSON.stringify(updatedDone));

            const updatedTimers = { ...localTimers };
            delete updatedTimers[drumName];
            setLocalTimers(updatedTimers);
            localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(updatedTimers));
        } catch {}

        const supabase = createClient();
        try {
            await supabase
                .from('order_baskets')
                .update({ assigned_machine: null })
                .ilike('basket_tag', cleanTag);

            await supabase
                .from('orders')
                .update({ drum: null })
                .or(`basket_tag.ilike.${cleanTag},order_number.ilike.${cleanTag}`);

            await supabase
                .from('machines')
                .update({ status: 'available', current_basket_tag: null, started_at: null, ends_at: null })
                .eq('name', drumName);
        } catch {}

        window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        window.dispatchEvent(new CustomEvent('rinset:order-updated'));
    };

    return (
        <div className="border-b border-slate-800 bg-slate-900/60 p-3 flex flex-col md:flex-row items-center justify-between gap-3 flex-shrink-0 select-none">
            {/* WASHERS STRIP */}
            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-sky-400 pl-1 pr-2 border-r border-slate-800">
                    <Waves className="w-4 h-4 text-sky-400" />
                    <span>Washers</span>
                </div>

                <div className="flex items-center space-x-2">
                    {WASHERS.map((drum) => {
                        const bay = getDrumState(drum, 'washer');
                        const isOccupied = bay.status === 'occupied';

                        return (
                            <div
                                key={drum}
                                className={`relative px-3 py-1.5 rounded-xl border flex flex-col justify-center min-w-[96px] transition group ${
                                    isOccupied
                                        ? bay.isDone
                                            ? 'bg-rose-500/15 border-rose-500/50 shadow-sm'
                                            : 'bg-sky-500/15 border-sky-500/40 shadow-sm'
                                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center space-x-1">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${
                            isOccupied
                                ? bay.isDone
                                    ? 'bg-rose-400 animate-ping'
                                    : 'bg-sky-400 animate-pulse'
                                : 'bg-emerald-400'
                        }`}
                    />
                                        <span className="font-mono font-bold text-xs text-white">{drum}</span>
                                    </div>

                                    {isOccupied && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearDrum(drum, 'washer', bay.tag)}
                                            className="opacity-80 hover:opacity-100 p-0.5 rounded bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white transition"
                                            title="Clear Drum & Mark WASH DONE"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-0.5 flex items-center justify-between">
                                    {isOccupied ? (
                                        <>
                      <span className="font-mono text-[11px] font-black text-sky-300 truncate max-w-[50px]">
                        {bay.tag}
                      </span>
                                            <span
                                                className={`font-mono text-[10px] font-bold ${
                                                    bay.isDone ? 'text-rose-400 animate-pulse' : 'text-sky-400'
                                                }`}
                                            >
                        {bay.isDone ? 'DONE' : bay.countdown}
                      </span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] text-slate-500 font-mono">Idle</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* DRYERS STRIP */}
            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center space-x-1.5 text-xs font-bold uppercase tracking-wider text-amber-400 pl-1 pr-2 border-r border-slate-800">
                    <Wind className="w-4 h-4 text-amber-400" />
                    <span>Dryers</span>
                </div>

                <div className="flex items-center space-x-2">
                    {DRYERS.map((drum) => {
                        const bay = getDrumState(drum, 'dryer');
                        const isOccupied = bay.status === 'occupied';

                        return (
                            <div
                                key={drum}
                                className={`relative px-3 py-1.5 rounded-xl border flex flex-col justify-center min-w-[96px] transition group ${
                                    isOccupied
                                        ? bay.isDone
                                            ? 'bg-rose-500/15 border-rose-500/50 shadow-sm'
                                            : 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                                        : 'bg-slate-900/40 border-slate-800 opacity-60'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center space-x-1">
                    <span
                        className={`w-1.5 h-1.5 rounded-full ${
                            isOccupied
                                ? bay.isDone
                                    ? 'bg-rose-400 animate-ping'
                                    : 'bg-amber-400 animate-pulse'
                                : 'bg-emerald-400'
                        }`}
                    />
                                        <span className="font-mono font-bold text-xs text-white">{drum}</span>
                                    </div>

                                    {isOccupied && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearDrum(drum, 'dryer', bay.tag)}
                                            className="opacity-80 hover:opacity-100 p-0.5 rounded bg-slate-800 hover:bg-rose-500 text-slate-300 hover:text-white transition"
                                            title="Clear Drum & Mark DRY DONE"
                                        >
                                            <RotateCcw className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-0.5 flex items-center justify-between">
                                    {isOccupied ? (
                                        <>
                      <span className="font-mono text-[11px] font-black text-amber-300 truncate max-w-[50px]">
                        {bay.tag}
                      </span>
                                            <span
                                                className={`font-mono text-[10px] font-bold ${
                                                    bay.isDone ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                                                }`}
                                            >
                        {bay.isDone ? 'DONE' : bay.countdown}
                      </span>
                                        </>
                                    ) : (
                                        <span className="text-[10px] text-slate-500 font-mono">Idle</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}