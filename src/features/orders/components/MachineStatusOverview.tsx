'use client';

import { useState, useEffect, useRef } from 'react';
import { OrderBasket } from '@/types/database';
import { createClient } from '@/lib/supabase/client';
import { sound } from '@/lib/sound';
import { Waves, Wind, RotateCcw } from 'lucide-react';

export const WASHERS = ['W-01', 'W-02', 'W-03', 'W-04'] as const;
export const DRYERS = ['D-01', 'D-02', 'D-03', 'D-04'] as const;

const LOCAL_TIMERS_KEY = 'rinset_active_drum_timers';
const DONE_TAGS_KEY = 'rinset_done_tags';

interface MachineStatusOverviewProps {
    baskets: OrderBasket[];
    isGlareMode?: boolean;
}

export function MachineStatusOverview({ baskets, isGlareMode = false }: MachineStatusOverviewProps) {
    const [, setTick] = useState(0);
    const [localTimers, setLocalTimers] = useState<Record<string, any>>({});
    const [doneTags, setDoneTags] = useState<Record<string, any>>({});
    const chimedDrumsRef = useRef<Set<string>>(new Set());

    // 1-second interval to update live countdown timer
    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const syncLocalState = () => {
        if (typeof window === 'undefined') return;
        try {
            const savedTimers = localStorage.getItem(LOCAL_TIMERS_KEY);
            const savedDone = localStorage.getItem(DONE_TAGS_KEY);

            const parsedTimers = savedTimers ? JSON.parse(savedTimers) : {};
            const parsedDone = savedDone ? JSON.parse(savedDone) : {};

            // Stage-specific active tag sets:
            // Washers can only hold baskets in 'washing'
            const activeWashingTags = new Set(
                baskets
                    .filter((b) => String(b.status).toLowerCase() === 'washing')
                    .map((b) => String(b.basket_tag || b.order?.order_number || '').toUpperCase())
            );

            // Dryers can only hold baskets in 'drying'
            const activeDryingTags = new Set(
                baskets
                    .filter((b) => String(b.status).toLowerCase() === 'drying')
                    .map((b) => String(b.basket_tag || b.order?.order_number || '').toUpperCase())
            );

            let timersPruned = false;
            Object.keys(parsedTimers).forEach((drumKey) => {
                const isWasher = drumKey.toUpperCase().startsWith('W');
                const isDryer = drumKey.toUpperCase().startsWith('D');
                const tag = String(parsedTimers[drumKey]?.basket_tag || '').toUpperCase();

                if (!tag) {
                    delete parsedTimers[drumKey];
                    timersPruned = true;
                    return;
                }

                // If basket moved past washing, vacate washer drum
                if (isWasher && !activeWashingTags.has(tag)) {
                    delete parsedTimers[drumKey];
                    timersPruned = true;
                }
                // If basket moved past drying (e.g. to ready_for_pickup), vacate dryer drum
                else if (isDryer && !activeDryingTags.has(tag)) {
                    delete parsedTimers[drumKey];
                    timersPruned = true;
                }
            });

            if (timersPruned) {
                localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(parsedTimers));
            }

            setLocalTimers(parsedTimers);
            setDoneTags(parsedDone);
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
    }, [baskets]);

    const getDrumState = (drumName: string, type: 'washer' | 'dryer') => {
        const isWasher = type === 'washer';
        const cleanTarget = drumName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();

        // Stage validation sets:
        const activeWashingTags = new Set(
            baskets
                .filter((b) => String(b.status).toLowerCase() === 'washing')
                .map((b) => String(b.basket_tag || b.order?.order_number || '').toUpperCase())
        );

        const activeDryingTags = new Set(
            baskets
                .filter((b) => String(b.status).toLowerCase() === 'drying')
                .map((b) => String(b.basket_tag || b.order?.order_number || '').toUpperCase())
        );

        // 1. Check local timers (only if the tag is still actively in this stage)
        const timerData = localTimers[drumName];
        if (timerData && timerData.ends_at) {
            const tagUpper = String(timerData.basket_tag || '').toUpperCase();
            const isValidForStage = isWasher ? activeWashingTags.has(tagUpper) : activeDryingTags.has(tagUpper);

            if (isValidForStage) {
                const diff = new Date(timerData.ends_at).getTime() - Date.now();
                const isDone = diff <= 0;
                const totalSecs = Math.max(0, Math.floor(diff / 1000));
                const mins = Math.floor(totalSecs / 60);
                const secs = totalSecs % 60;

                if (isDone && !chimedDrumsRef.current.has(drumName)) {
                    chimedDrumsRef.current.add(drumName);
                    sound.playCycleCompleteChime();
                }

                return {
                    drum: drumName,
                    status: 'occupied',
                    tag: timerData.basket_tag,
                    isDone,
                    countdown: `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`,
                    orderId: timerData.order_id,
                };
            }
        }

        // 2. Check active baskets from database
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

            if (isDone && !chimedDrumsRef.current.has(drumName)) {
                chimedDrumsRef.current.add(drumName);
                sound.playCycleCompleteChime();
            }

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

        chimedDrumsRef.current.delete(drumName);

        return {
            drum: drumName,
            status: 'idle',
            tag: null,
            isDone: false,
            countdown: null,
            orderId: null,
        };
    };

    const handleClearDrum = async (drumName: string, type: 'washer' | 'dryer', tag: string | null) => {
        if (!tag) return;
        const cleanTag = tag.toUpperCase();
        const stage = type === 'washer' ? 'wash_done' : 'dry_done';
        const label = type === 'washer' ? 'WASH DONE' : 'DRY DONE';

        chimedDrumsRef.current.delete(drumName);

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
                .eq('assigned_machine', drumName);

            await supabase
                .from('order_baskets')
                .update({ assigned_machine: null })
                .ilike('basket_tag', cleanTag);
        } catch {}

        window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        window.dispatchEvent(new CustomEvent('rinset:order-updated'));
    };

    return (
        <div
            className={`border-b p-3 flex flex-col md:flex-row items-center justify-between gap-3 flex-shrink-0 select-none transition-colors ${
                isGlareMode
                    ? 'bg-black border-slate-700'
                    : 'bg-slate-900/80 border-slate-800'
            }`}
        >
            {/* WASHERS STRIP */}
            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-sky-400 pl-1 pr-2.5 border-r border-slate-800">
                    <Waves className="w-4 h-4 text-sky-400 stroke-[2.5]" />
                    <span>Washers</span>
                </div>

                <div className="flex items-center space-x-2">
                    {WASHERS.map((drum) => {
                        const bay = getDrumState(drum, 'washer');
                        const isOccupied = bay.status === 'occupied';

                        return (
                            <div
                                key={drum}
                                className={`relative px-3 py-2 rounded-xl border flex flex-col justify-center min-w-[104px] min-h-[52px] transition ${
                                    isOccupied
                                        ? bay.isDone
                                            ? isGlareMode
                                                ? 'bg-rose-950 border-rose-500 shadow-md animate-pulse'
                                                : 'bg-rose-500/20 border-rose-500 shadow-md animate-pulse'
                                            : isGlareMode
                                                ? 'bg-slate-900 border-sky-400 shadow-md'
                                                : 'bg-sky-500/15 border-sky-500/40 shadow-sm'
                                        : isGlareMode
                                            ? 'bg-black border-slate-800'
                                            : 'bg-slate-900/40 border-slate-800 opacity-60'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center space-x-1.5">
                    <span
                        className={`w-2 h-2 rounded-full ${
                            isOccupied
                                ? bay.isDone
                                    ? 'bg-rose-400 animate-ping'
                                    : 'bg-sky-400 animate-pulse'
                                : 'bg-emerald-400'
                        }`}
                    />
                                        <span className="font-mono font-black text-xs text-white">{drum}</span>
                                    </div>

                                    {isOccupied && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearDrum(drum, 'washer', bay.tag)}
                                            className="min-h-[34px] min-w-[34px] p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 active:scale-95 text-slate-300 hover:text-white transition flex items-center justify-center"
                                            title="Clear Drum & Mark WASH DONE"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-1 flex items-center justify-between">
                                    {isOccupied ? (
                                        <>
                      <span className="font-mono text-xs font-black text-sky-300 truncate max-w-[55px]">
                        {bay.tag}
                      </span>
                                            <span
                                                className={`font-mono text-[11px] font-black ${
                                                    bay.isDone ? 'text-rose-400 animate-pulse' : 'text-sky-400'
                                                }`}
                                            >
                        {bay.isDone ? 'DONE' : bay.countdown}
                      </span>
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-slate-500 font-mono font-semibold">Idle</span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* DRYERS STRIP */}
            <div className="flex items-center space-x-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                <div className="flex items-center space-x-1.5 text-xs font-black uppercase tracking-wider text-amber-400 pl-1 pr-2.5 border-r border-slate-800">
                    <Wind className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                    <span>Dryers</span>
                </div>

                <div className="flex items-center space-x-2">
                    {DRYERS.map((drum) => {
                        const bay = getDrumState(drum, 'dryer');
                        const isOccupied = bay.status === 'occupied';

                        return (
                            <div
                                key={drum}
                                className={`relative px-3 py-2 rounded-xl border flex flex-col justify-center min-w-[104px] min-h-[52px] transition ${
                                    isOccupied
                                        ? bay.isDone
                                            ? isGlareMode
                                                ? 'bg-rose-950 border-rose-500 shadow-md animate-pulse'
                                                : 'bg-rose-500/20 border-rose-500 shadow-md animate-pulse'
                                            : isGlareMode
                                                ? 'bg-slate-900 border-amber-400 shadow-md'
                                                : 'bg-amber-500/15 border-amber-500/40 shadow-sm'
                                        : isGlareMode
                                            ? 'bg-black border-slate-800'
                                            : 'bg-slate-900/40 border-slate-800 opacity-60'
                                }`}
                            >
                                <div className="flex items-center justify-between gap-1">
                                    <div className="flex items-center space-x-1.5">
                    <span
                        className={`w-2 h-2 rounded-full ${
                            isOccupied
                                ? bay.isDone
                                    ? 'bg-rose-400 animate-ping'
                                    : 'bg-amber-400 animate-pulse'
                                : 'bg-emerald-400'
                        }`}
                    />
                                        <span className="font-mono font-black text-xs text-white">{drum}</span>
                                    </div>

                                    {isOccupied && (
                                        <button
                                            type="button"
                                            onClick={() => handleClearDrum(drum, 'dryer', bay.tag)}
                                            className="min-h-[34px] min-w-[34px] p-1.5 rounded-lg bg-slate-800 hover:bg-rose-600 active:scale-95 text-slate-300 hover:text-white transition flex items-center justify-center"
                                            title="Clear Drum & Mark DRY DONE"
                                        >
                                            <RotateCcw className="w-3.5 h-3.5 stroke-[2.5]" />
                                        </button>
                                    )}
                                </div>

                                <div className="mt-1 flex items-center justify-between">
                                    {isOccupied ? (
                                        <>
                      <span className="font-mono text-xs font-black text-amber-300 truncate max-w-[55px]">
                        {bay.tag}
                      </span>
                                            <span
                                                className={`font-mono text-[11px] font-black ${
                                                    bay.isDone ? 'text-rose-400 animate-pulse' : 'text-amber-400'
                                                }`}
                                            >
                        {bay.isDone ? 'DONE' : bay.countdown}
                      </span>
                                        </>
                                    ) : (
                                        <span className="text-[11px] text-slate-500 font-mono font-semibold">Idle</span>
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