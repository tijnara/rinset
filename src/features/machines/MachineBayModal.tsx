'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { Bubbles } from '@/components/icons/Bubbles';
import {
    X,
    Play,
    RotateCcw,
    Clock,
    Waves,
    Wind,
    Plus,
    Minus,
    Timer as TimerIcon,
} from 'lucide-react';

export interface Machine {
    id: string;
    name: string;
    type: 'washer' | 'dryer';
    status: 'available' | 'running' | 'maintenance';
    current_basket_tag: string | null;
    customer_name?: string | null;
    order_id?: string | null;
    started_at: string | null;
    duration_minutes: number;
    ends_at: string | null;
}

const DEFAULT_DRUMS = [
    { name: 'W-01', type: 'washer' as const, defaultDuration: 35 },
    { name: 'W-02', type: 'washer' as const, defaultDuration: 35 },
    { name: 'W-03', type: 'washer' as const, defaultDuration: 35 },
    { name: 'W-04', type: 'washer' as const, defaultDuration: 35 },
    { name: 'D-01', type: 'dryer' as const, defaultDuration: 45 },
    { name: 'D-02', type: 'dryer' as const, defaultDuration: 45 },
    { name: 'D-03', type: 'dryer' as const, defaultDuration: 45 },
    { name: 'D-04', type: 'dryer' as const, defaultDuration: 45 },
];

const LOCAL_TIMERS_KEY = 'rinset_active_drum_timers';
const LOCAL_CONFIG_DURATIONS_KEY = 'rinset_bay_durations_config';
const DONE_TAGS_KEY = 'rinset_done_tags';

interface MachineBayModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function MachineBayModal({ isOpen, onClose }: MachineBayModalProps) {
    const router = useRouter();
    const storeId = useAuthStore((state) => state.storeId);
    const user = useAuthStore((state) => state.user);
    const rawRole = useAuthStore((state) => (state as any).role || state.user?.role);
    const isUnlocked = useAuthStore((state) => (state as any).isUnlocked);

    // OWNER VERIFICATION: Restricted to owner or unlocked PIN session
    const isOwner =
        (rawRole as string) === 'owner' ||
        ((user as any)?.role as string) === 'owner' ||
        Boolean(isUnlocked);

    const [activeBaskets, setActiveBaskets] = useState<any[]>([]);
    const [activeBasketInputs, setActiveBasketInputs] = useState<Record<string, string>>({});

    const [bayDurations, setBayDurations] = useState<Record<string, number>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(LOCAL_CONFIG_DURATIONS_KEY);
                if (saved) return JSON.parse(saved);
            } catch {}
        }
        return {
            'W-01': 35, 'W-02': 35, 'W-03': 35, 'W-04': 35,
            'D-01': 45, 'D-02': 45, 'D-03': 45, 'D-04': 45,
        };
    });

    const [localDrumAssignments, setLocalDrumAssignments] = useState<Record<string, any>>(() => {
        if (typeof window !== 'undefined') {
            try {
                const saved = localStorage.getItem(LOCAL_TIMERS_KEY);
                return saved ? JSON.parse(saved) : {};
            } catch {}
        }
        return {};
    });

    const [, setTick] = useState(0);

    useEffect(() => {
        const timer = setInterval(() => setTick((t) => t + 1), 1000);
        return () => clearInterval(timer);
    }, []);

    const handleModifyDuration = (drumName: string, minutes: number) => {
        const validMinutes = Math.max(1, Math.min(180, minutes));
        const updated = { ...bayDurations, [drumName]: validMinutes };
        setBayDurations(updated);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_CONFIG_DURATIONS_KEY, JSON.stringify(updated));
        }
    };

    const handleExtendRunningTimer = (machine: Machine, additionalMinutes: number) => {
        if (!machine.ends_at) return;
        const currentEnd = new Date(machine.ends_at).getTime();
        const baseTime = currentEnd > Date.now() ? currentEnd : Date.now();
        const newEndsAt = new Date(baseTime + additionalMinutes * 60 * 1000).toISOString();
        const newTotalDuration = (machine.duration_minutes || 35) + additionalMinutes;

        const newLocal = { ...localDrumAssignments };
        if (newLocal[machine.name]) {
            newLocal[machine.name].ends_at = newEndsAt;
            newLocal[machine.name].duration_minutes = newTotalDuration;
        }
        setLocalDrumAssignments(newLocal);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(newLocal));
            window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        }
    };

    const syncWithLiveOrders = useCallback(async () => {
        const supabase = createClient();
        try {
            const { data: basketRows, error } = await supabase
                .from('order_baskets')
                .select('*, order:orders(*)');

            if (!error && basketRows) {
                const unified = basketRows
                    .filter((b: any) => {
                        const status = String(b.status || b.order?.status || '').toLowerCase();
                        return status !== 'claimed';
                    })
                    .map((b: any) => ({
                        id: b.id,
                        order_id: b.order_id,
                        basket_tag: String(b.basket_tag || b.order?.order_number || '').toUpperCase(),
                        status: String(b.status || b.order?.status || 'received').toLowerCase(),
                        assigned_machine: String(b.assigned_machine || '').toUpperCase(),
                        customer_name: (b.order as any)?.customer_name || b.order?.customer?.full_name || '',
                        updated_at: b.updated_at || b.created_at || b.order?.updated_at || b.order?.created_at,
                    }));

                setActiveBaskets(unified);
            }
        } catch (err) {
            console.error('[MachineBayModal Sync Error]', err);
        }
    }, []);

    useEffect(() => {
        if (isOpen && isOwner) syncWithLiveOrders();
    }, [isOpen, isOwner, syncWithLiveOrders]);

    const getTimeLeft = (endsAtStr: string | null, totalMinutes: number) => {
        if (!endsAtStr) return { minutes: 0, seconds: 0, isDone: true, percent: 100 };
        const diff = new Date(endsAtStr).getTime() - Date.now();
        if (diff <= 0) return { minutes: 0, seconds: 0, isDone: true, percent: 100 };

        const totalSeconds = Math.floor(diff / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;

        const totalSecsDuration = Math.max(1, (totalMinutes || 35) * 60);
        const elapsed = totalSecsDuration - totalSeconds;
        const percent = Math.min(100, Math.max(0, Math.round((elapsed / totalSecsDuration) * 100)));

        return { minutes, seconds, isDone: false, percent };
    };

    const machines = useMemo<Machine[]>(() => {
        const activeDbTags = new Set(activeBaskets.map((b) => b.basket_tag.toUpperCase()));
        const validLocalTimers = { ...localDrumAssignments };
        let timersNeedPruning = false;

        Object.keys(validLocalTimers).forEach((drumKey) => {
            const storedTag = (validLocalTimers[drumKey]?.basket_tag || '').toUpperCase();
            if (storedTag && activeBaskets.length > 0 && !activeDbTags.has(storedTag)) {
                delete validLocalTimers[drumKey];
                timersNeedPruning = true;
            }
        });

        if (timersNeedPruning && typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(validLocalTimers));
        }

        return DEFAULT_DRUMS.map((drum) => {
            const isWasher = drum.type === 'washer';
            const targetClean = drum.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
            const currentConfiguredDuration = bayDurations[drum.name] || drum.defaultDuration;

            const localAssignment = validLocalTimers[drum.name];
            if (localAssignment && localAssignment.ends_at) {
                const diff = new Date(localAssignment.ends_at).getTime() - Date.now();
                const tagUpper = (localAssignment.basket_tag || '').toUpperCase();

                if (diff > 0 && (activeBaskets.length === 0 || activeDbTags.has(tagUpper))) {
                    const matchingBasket = activeBaskets.find((b) => b.basket_tag === tagUpper);
                    return {
                        id: drum.name,
                        name: drum.name,
                        type: drum.type,
                        status: 'running',
                        current_basket_tag: localAssignment.basket_tag,
                        customer_name: matchingBasket?.customer_name || localAssignment.customer_name || null,
                        order_id: matchingBasket?.order_id || localAssignment.order_id || null,
                        started_at: localAssignment.started_at,
                        duration_minutes: localAssignment.duration_minutes || currentConfiguredDuration,
                        ends_at: localAssignment.ends_at,
                    };
                }
            }

            const assignedBasket = activeBaskets.find((b) => {
                const basketStatus = String(b.status || '').toLowerCase();
                const matchesType = isWasher
                    ? basketStatus === 'washing' || basketStatus === 'wash' || basketStatus === 'in_wash'
                    : basketStatus === 'drying' || basketStatus === 'dry' || basketStatus === 'in_dry';

                const machineClean = String(b.assigned_machine || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                return matchesType && machineClean === targetClean;
            });

            if (assignedBasket) {
                const orderTime = new Date(assignedBasket.updated_at || Date.now()).getTime();
                const endsAtTime = new Date(orderTime + currentConfiguredDuration * 60 * 1000).toISOString();

                return {
                    id: drum.name,
                    name: drum.name,
                    type: drum.type,
                    status: 'running',
                    current_basket_tag: assignedBasket.basket_tag,
                    customer_name: assignedBasket.customer_name,
                    order_id: assignedBasket.order_id || assignedBasket.id,
                    started_at: new Date(orderTime).toISOString(),
                    duration_minutes: currentConfiguredDuration,
                    ends_at: endsAtTime,
                };
            }

            return {
                id: drum.name,
                name: drum.name,
                type: drum.type,
                status: 'available',
                current_basket_tag: null,
                customer_name: null,
                order_id: null,
                started_at: null,
                duration_minutes: currentConfiguredDuration,
                ends_at: null,
            };
        });
    }, [activeBaskets, localDrumAssignments, bayDurations]);

    const activeOccupiedTags = useMemo(() => {
        return new Set(
            machines
                .filter((m) => m.status === 'running' && m.current_basket_tag)
                .map((m) => m.current_basket_tag!.toUpperCase())
        );
    }, [machines]);

    const washerSuggestions = useMemo(() => {
        return activeBaskets
            .filter((b) => {
                const status = String(b.status || '').toLowerCase();
                const isQueue = status === 'received' || status === 'queue' || status === 'pending';
                const tag = String(b.basket_tag).toUpperCase();
                return isQueue && !activeOccupiedTags.has(tag);
            })
            .map((b) => ({
                id: b.id,
                tag: b.basket_tag,
                customer: b.customer_name || 'Customer',
                source: 'Queue',
            }));
    }, [activeBaskets, activeOccupiedTags]);

    const dryerSuggestions = useMemo(() => {
        const list: any[] = [];

        machines
            .filter((m) => {
                if (m.type !== 'washer' || !m.current_basket_tag) return false;
                const timer = getTimeLeft(m.ends_at, m.duration_minutes);
                return timer.isDone;
            })
            .forEach((m) => {
                list.push({
                    id: m.order_id || m.name,
                    tag: m.current_basket_tag!,
                    customer: m.customer_name || 'Customer',
                    source: `done in ${m.name}`,
                });
            });

        activeBaskets.forEach((b) => {
            const status = String(b.status || '').toLowerCase();
            const tag = String(b.basket_tag).toUpperCase();
            const isWashing = status === 'washing' || status === 'wash' || status === 'in_wash';

            let isMarkedDone = false;
            try {
                const doneMap = JSON.parse(localStorage.getItem(DONE_TAGS_KEY) || '{}');
                isMarkedDone = doneMap[tag]?.stage === 'wash_done';
            } catch {}

            if (isWashing && isMarkedDone && !list.some((item) => item.tag === tag)) {
                list.push({
                    id: b.id,
                    tag,
                    customer: b.customer_name || 'Customer',
                    source: b.assigned_machine ? `done in ${b.assigned_machine}` : 'Wash Done',
                });
            }
        });

        return list;
    }, [machines, activeBaskets]);

    if (!isOpen || !isOwner) return null;

    const handleAppointAndStart = async (machine: Machine, appointedTag: string) => {
        const cleanTag = appointedTag.trim().toUpperCase();
        if (!cleanTag) return;

        if (machine.type === 'dryer') {
            const runningWasher = machines.find(
                (m) => m.type === 'washer' && m.current_basket_tag?.toUpperCase() === cleanTag
            );

            if (runningWasher) {
                const timer = getTimeLeft(runningWasher.ends_at, runningWasher.duration_minutes);
                if (!timer.isDone) {
                    alert(
                        `Cannot start drying: Basket ${cleanTag} is still washing in ${runningWasher.name} (${timer.minutes}m ${timer.seconds}s remaining). Wash cycle must complete first.`
                    );
                    return;
                }
            }
        }

        const duration = bayDurations[machine.name] || machine.duration_minutes || (machine.type === 'washer' ? 35 : 45);
        const now = new Date();
        const endsAt = new Date(now.getTime() + duration * 60 * 1000);
        const targetStatus = machine.type === 'washer' ? 'washing' : 'drying';

        const newLocalAssignments = { ...localDrumAssignments };
        Object.keys(newLocalAssignments).forEach((drumKey) => {
            if (newLocalAssignments[drumKey]?.basket_tag?.toUpperCase() === cleanTag) {
                delete newLocalAssignments[drumKey];
            }
        });

        newLocalAssignments[machine.name] = {
            basket_tag: cleanTag,
            started_at: now.toISOString(),
            ends_at: endsAt.toISOString(),
            status: 'running',
            type: machine.type,
            duration_minutes: duration,
        };

        setLocalDrumAssignments(newLocalAssignments);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(newLocalAssignments));
            window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        }

        setActiveBasketInputs((prev) => ({ ...prev, [machine.name]: '' }));

        const supabase = createClient();
        try {
            await supabase
                .from('order_baskets')
                .update({
                    status: targetStatus,
                    assigned_machine: machine.name,
                    updated_at: now.toISOString(),
                })
                .ilike('basket_tag', cleanTag);
        } catch (err) {
            console.warn('[Auto-Appoint DB Sync Warning]', err);
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rinset:order-updated'));
        }
        await syncWithLiveOrders();
        router.refresh();
    };

    const handleClearMachine = async (machine: Machine) => {
        const cleanTag = machine.current_basket_tag ? machine.current_basket_tag.toUpperCase() : null;
        const stage = machine.type === 'washer' ? 'wash_done' : 'dry_done';
        const label = machine.type === 'washer' ? 'WASH DONE' : 'DRY DONE';

        if (cleanTag) {
            try {
                const savedDone = localStorage.getItem(DONE_TAGS_KEY);
                const doneTags = savedDone ? JSON.parse(savedDone) : {};
                doneTags[cleanTag] = {
                    stage,
                    label,
                    drum: machine.name,
                    timestamp: new Date().toISOString(),
                };
                localStorage.setItem(DONE_TAGS_KEY, JSON.stringify(doneTags));
            } catch {}
        }

        const newLocal = { ...localDrumAssignments };
        delete newLocal[machine.name];
        setLocalDrumAssignments(newLocal);
        if (typeof window !== 'undefined') {
            localStorage.setItem(LOCAL_TIMERS_KEY, JSON.stringify(newLocal));
            window.dispatchEvent(new CustomEvent('rinset:timers-updated'));
        }

        setActiveBaskets((prev) =>
            prev.map((b) =>
                b.assigned_machine === machine.name || (cleanTag && b.basket_tag === cleanTag)
                    ? { ...b, assigned_machine: '' }
                    : b
            )
        );

        const supabase = createClient();
        try {
            await supabase
                .from('order_baskets')
                .update({ assigned_machine: null })
                .eq('assigned_machine', machine.name);

            if (cleanTag) {
                await supabase
                    .from('order_baskets')
                    .update({ assigned_machine: null })
                    .ilike('basket_tag', cleanTag);
            }
        } catch (err) {
            console.warn('[Clear Machine DB Sync Warning]', err);
        }

        await syncWithLiveOrders();
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('rinset:order-updated'));
        }
        router.refresh();
    };

    const washers = machines.filter((m) => m.type === 'washer');
    const dryers = machines.filter((m) => m.type === 'dryer');

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 select-none animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
                    <div className="flex items-center space-x-2.5">
                        <div className="p-2 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-400">
                            <TimerIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className="font-bold text-base text-white">Machine Bay & Timer Allocation</h2>
                            <p className="text-xs text-slate-400">
                                Adjust wash/dry cycle durations, view live countdown timers, and appoint tags
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
                    {/* Washers Section */}
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
                                <Waves className="w-4 h-4 text-sky-400 stroke-[2.5]" />
                                Commercial Washers (Customizable Duration)
                            </h3>
                            <span className="text-[11px] text-slate-500">Default: 35 min standard cycle</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {washers.map((m) => {
                                const configuredDuration = bayDurations[m.name] || m.duration_minutes || 35;
                                const timer = getTimeLeft(m.ends_at, m.duration_minutes || configuredDuration);
                                const isRunning = m.status === 'running' && !timer.isDone;
                                const isFinished = m.status === 'running' && timer.isDone;
                                const inputValue = activeBasketInputs[m.name] || '';

                                const filteredSuggestions = washerSuggestions.filter(
                                    (s) => !inputValue || s.tag.includes(inputValue.toUpperCase())
                                );

                                return (
                                    <div
                                        key={m.id}
                                        className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                                            isFinished
                                                ? 'bg-rose-500/10 border-rose-500/40 animate-pulse'
                                                : isRunning
                                                    ? 'bg-sky-500/10 border-sky-500/30'
                                                    : 'bg-slate-950 border-slate-800'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-white font-mono">{m.name}</span>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                        isFinished
                                                            ? 'bg-rose-500 text-white font-black'
                                                            : isRunning
                                                                ? 'bg-sky-500/20 text-sky-300'
                                                                : 'bg-emerald-500/20 text-emerald-300'
                                                    }`}
                                                >
                          {isFinished ? 'UNLOAD' : isRunning ? 'WASHING' : 'AVAILABLE'}
                        </span>
                                            </div>

                                            {isRunning && (
                                                <div className="py-2 space-y-1.5">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-mono font-black text-sky-400 tracking-tight">
                                                            {String(timer.minutes).padStart(2, '0')}:
                                                            {String(timer.seconds).padStart(2, '0')}
                                                        </p>
                                                        <p className="text-xs font-bold text-white mt-0.5">
                                                            Basket: <span className="text-sky-300">{m.current_basket_tag}</span>
                                                        </p>
                                                        {m.customer_name && (
                                                            <p className="text-[10px] text-slate-400 truncate">{m.customer_name}</p>
                                                        )}
                                                    </div>

                                                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-sky-400 h-full transition-all duration-1000"
                                                            style={{ width: `${timer.percent}%` }}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-center gap-2 pt-2">
                                                        <span className="text-xs text-slate-400 font-mono font-bold">Extend:</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExtendRunningTimer(m, 5)}
                                                            className="min-h-[44px] px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 hover:border-sky-500 text-sky-300 text-xs font-mono font-bold rounded-xl transition shadow-sm"
                                                        >
                                                            +5m
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExtendRunningTimer(m, 10)}
                                                            className="min-h-[44px] px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 hover:border-sky-500 text-sky-300 text-xs font-mono font-bold rounded-xl transition shadow-sm"
                                                        >
                                                            +10m
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {isFinished && (
                                                <div className="py-2 text-center text-rose-400 space-y-1">
                                                    <p className="text-xs font-bold animate-bounce">Wash Cycle Complete</p>
                                                    <p className="text-sm font-black text-white">Basket: {m.current_basket_tag}</p>
                                                </div>
                                            )}
                                        </div>

                                        {isRunning || isFinished ? (
                                            <button
                                                type="button"
                                                onClick={() => handleClearMachine(m)}
                                                className="mt-3 w-full min-h-[48px] py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 active:scale-98 text-slate-100 text-xs font-black rounded-xl flex items-center justify-center space-x-2 transition shadow-sm"
                                                title="Unload drum and mark basket as WASH DONE"
                                            >
                                                <RotateCcw className="w-4 h-4 text-sky-400 stroke-[2.5]" />
                                                <span>Clear Drum (Wash Done)</span>
                                            </button>
                                        ) : (
                                            <div className="mt-3 space-y-2.5">
                                                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-sky-400" />
                              Duration:
                            </span>
                                                        <div className="flex items-center gap-1 font-mono font-bold text-sky-300">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleModifyDuration(m.name, configuredDuration - 5)}
                                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 active:scale-95"
                                                            >
                                                                <Minus className="w-3 h-3 stroke-[3]" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min={5}
                                                                max={120}
                                                                value={configuredDuration}
                                                                onChange={(e) => handleModifyDuration(m.name, parseInt(e.target.value) || 35)}
                                                                className="w-10 text-center bg-slate-950 border border-slate-700 rounded-lg py-1 text-xs text-white focus:outline-none focus:border-sky-500 font-mono font-bold"
                                                            />
                                                            <span className="text-xs text-slate-400">m</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleModifyDuration(m.name, configuredDuration + 5)}
                                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 active:scale-95"
                                                            >
                                                                <Plus className="w-3 h-3 stroke-[3]" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-1.5">
                                                        {[25, 35, 45].map((preset) => (
                                                            <button
                                                                key={preset}
                                                                type="button"
                                                                onClick={() => handleModifyDuration(m.name, preset)}
                                                                className={`min-h-[38px] py-1.5 rounded-lg text-xs font-mono font-bold border transition active:scale-95 ${
                                                                    configuredDuration === preset
                                                                        ? 'bg-sky-500/25 border-sky-400 text-sky-300'
                                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                                                }`}
                                                            >
                                                                {preset}m
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                          <span className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                            <Bubbles className="w-3.5 h-3.5 text-sky-400" />
                            Appoint from Queue:
                          </span>
                                                    {filteredSuggestions.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                                            {filteredSuggestions.map((sug) => (
                                                                <button
                                                                    key={sug.id}
                                                                    type="button"
                                                                    onClick={() => handleAppointAndStart(m, sug.tag)}
                                                                    className="px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition flex items-center gap-1 bg-slate-900 border-slate-700 text-sky-300 hover:bg-sky-500 hover:text-slate-950 hover:border-sky-400 active:scale-95 shadow-sm"
                                                                >
                                                                    <span>+{sug.tag}</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-500 italic">No baskets waiting</p>
                                                    )}
                                                </div>

                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleAppointAndStart(m, inputValue);
                                                    }}
                                                    className="flex gap-1.5"
                                                >
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. B-272"
                                                        value={inputValue}
                                                        onChange={(e) =>
                                                            setActiveBasketInputs((prev) => ({
                                                                ...prev,
                                                                [m.name]: e.target.value,
                                                            }))
                                                        }
                                                        className="flex-1 min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono uppercase"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!inputValue.trim()}
                                                        className="min-h-[44px] px-4 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center transition shadow active:scale-95"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-current" />
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Dryers Section */}
                    <div className="space-y-3 pt-4 border-t border-slate-800">
                        <div className="flex items-center justify-between">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                                <Wind className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                                Commercial Dryers (Customizable Duration)
                            </h3>
                            <span className="text-[11px] text-slate-500">Default: 45 min standard cycle</span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {dryers.map((m) => {
                                const configuredDuration = bayDurations[m.name] || m.duration_minutes || 45;
                                const timer = getTimeLeft(m.ends_at, m.duration_minutes || configuredDuration);
                                const isRunning = m.status === 'running' && !timer.isDone;
                                const isFinished = m.status === 'running' && timer.isDone;
                                const inputValue = activeBasketInputs[m.name] || '';

                                const filteredSuggestions = dryerSuggestions.filter(
                                    (s) => !inputValue || s.tag.includes(inputValue.toUpperCase())
                                );

                                return (
                                    <div
                                        key={m.id}
                                        className={`p-4 rounded-2xl border transition flex flex-col justify-between ${
                                            isFinished
                                                ? 'bg-rose-500/10 border-rose-500/40 animate-pulse'
                                                : isRunning
                                                    ? 'bg-amber-500/10 border-amber-500/30'
                                                    : 'bg-slate-950 border-slate-800'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="font-bold text-sm text-white font-mono">{m.name}</span>
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                                        isFinished
                                                            ? 'bg-rose-500 text-white font-black'
                                                            : isRunning
                                                                ? 'bg-amber-500/20 text-amber-300'
                                                                : 'bg-emerald-500/20 text-emerald-300'
                                                    }`}
                                                >
                          {isFinished ? 'UNLOAD' : isRunning ? 'DRYING' : 'AVAILABLE'}
                        </span>
                                            </div>

                                            {isRunning && (
                                                <div className="py-2 space-y-1.5">
                                                    <div className="text-center">
                                                        <p className="text-2xl font-mono font-black text-amber-400 tracking-tight">
                                                            {String(timer.minutes).padStart(2, '0')}:
                                                            {String(timer.seconds).padStart(2, '0')}
                                                        </p>
                                                        <p className="text-xs font-bold text-white mt-0.5">
                                                            Basket: <span className="text-amber-300">{m.current_basket_tag}</span>
                                                        </p>
                                                        {m.customer_name && (
                                                            <p className="text-[10px] text-slate-400 truncate">{m.customer_name}</p>
                                                        )}
                                                    </div>

                                                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden">
                                                        <div
                                                            className="bg-amber-400 h-full transition-all duration-1000"
                                                            style={{ width: `${timer.percent}%` }}
                                                        />
                                                    </div>

                                                    <div className="flex items-center justify-center gap-2 pt-2">
                                                        <span className="text-xs text-slate-400 font-mono font-bold">Extend:</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExtendRunningTimer(m, 5)}
                                                            className="min-h-[44px] px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 hover:border-amber-500 text-amber-300 text-xs font-mono font-bold rounded-xl transition shadow-sm"
                                                        >
                                                            +5m
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleExtendRunningTimer(m, 10)}
                                                            className="min-h-[44px] px-3.5 bg-slate-900 hover:bg-slate-800 active:scale-95 border border-slate-700 hover:border-amber-500 text-amber-300 text-xs font-mono font-bold rounded-xl transition shadow-sm"
                                                        >
                                                            +10m
                                                        </button>
                                                    </div>
                                                </div>
                                            )}

                                            {isFinished && (
                                                <div className="py-2 text-center text-rose-400 space-y-1">
                                                    <p className="text-xs font-bold animate-bounce">Drying Complete - Fold Now</p>
                                                    <p className="text-sm font-black text-white">Basket: {m.current_basket_tag}</p>
                                                </div>
                                            )}
                                        </div>

                                        {isRunning || isFinished ? (
                                            <button
                                                type="button"
                                                onClick={() => handleClearMachine(m)}
                                                className="mt-3 w-full min-h-[48px] py-3 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 active:scale-98 text-slate-100 text-xs font-black rounded-xl flex items-center justify-center space-x-2 transition shadow-sm"
                                                title="Unload drum and mark basket as DRY DONE"
                                            >
                                                <RotateCcw className="w-4 h-4 text-amber-400 stroke-[2.5]" />
                                                <span>Clear Drum (Dry Done)</span>
                                            </button>
                                        ) : (
                                            <div className="mt-3 space-y-2.5">
                                                <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                                                    <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
                              Duration:
                            </span>
                                                        <div className="flex items-center gap-1 font-mono font-bold text-amber-300">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleModifyDuration(m.name, configuredDuration - 5)}
                                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 active:scale-95"
                                                            >
                                                                <Minus className="w-3 h-3 stroke-[3]" />
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min={5}
                                                                max={120}
                                                                value={configuredDuration}
                                                                onChange={(e) => handleModifyDuration(m.name, parseInt(e.target.value) || 45)}
                                                                className="w-10 text-center bg-slate-950 border border-slate-700 rounded-lg py-1 text-xs text-white focus:outline-none focus:border-amber-500 font-mono font-bold"
                                                            />
                                                            <span className="text-xs text-slate-400">m</span>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleModifyDuration(m.name, configuredDuration + 5)}
                                                                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-200 active:scale-95"
                                                            >
                                                                <Plus className="w-3 h-3 stroke-[3]" />
                                                            </button>
                                                        </div>
                                                    </div>

                                                    <div className="grid grid-cols-3 gap-1.5">
                                                        {[30, 45, 60].map((preset) => (
                                                            <button
                                                                key={preset}
                                                                type="button"
                                                                onClick={() => handleModifyDuration(m.name, preset)}
                                                                className={`min-h-[38px] py-1.5 rounded-lg text-xs font-mono font-bold border transition active:scale-95 ${
                                                                    configuredDuration === preset
                                                                        ? 'bg-amber-500/25 border-amber-400 text-amber-300'
                                                                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                                                                }`}
                                                            >
                                                                {preset}m
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>

                                                <div className="space-y-1">
                          <span className="text-[10px] text-amber-400 font-semibold uppercase flex items-center gap-1">
                            <Bubbles className="w-3.5 h-3.5 text-amber-400" />
                            Appoint from Wash:
                          </span>
                                                    {filteredSuggestions.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1 max-h-16 overflow-y-auto">
                                                            {filteredSuggestions.map((sug) => (
                                                                <button
                                                                    key={sug.id}
                                                                    type="button"
                                                                    onClick={() => handleAppointAndStart(m, sug.tag)}
                                                                    className="px-2.5 py-1 rounded-lg border text-xs font-mono font-bold transition flex items-center gap-1 bg-slate-900 border-slate-700 text-amber-300 hover:bg-amber-500 hover:text-slate-950 hover:border-amber-400 active:scale-95 shadow-sm"
                                                                >
                                                                    <span>+{sug.tag}</span>
                                                                    <span className="text-[10px] opacity-75 font-normal">({sug.source})</span>
                                                                </button>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-500 italic">No completed washes ready for dryer</p>
                                                    )}
                                                </div>

                                                <form
                                                    onSubmit={(e) => {
                                                        e.preventDefault();
                                                        handleAppointAndStart(m, inputValue);
                                                    }}
                                                    className="flex gap-1.5"
                                                >
                                                    <input
                                                        type="text"
                                                        placeholder="e.g. B-514"
                                                        value={inputValue}
                                                        onChange={(e) =>
                                                            setActiveBasketInputs((prev) => ({
                                                                ...prev,
                                                                [m.name]: e.target.value,
                                                            }))
                                                        }
                                                        className="flex-1 min-h-[44px] bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 font-mono uppercase"
                                                    />
                                                    <button
                                                        type="submit"
                                                        disabled={!inputValue.trim()}
                                                        className="min-h-[44px] px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 disabled:opacity-40 text-slate-950 font-bold text-xs rounded-xl flex items-center justify-center transition shadow active:scale-95"
                                                    >
                                                        <Play className="w-3.5 h-3.5 fill-current" />
                                                    </button>
                                                </form>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}