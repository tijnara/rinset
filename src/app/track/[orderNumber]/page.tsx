// C:\Users\UserT\WebstormProjects\rinset\src\app\track\[orderNumber]\page.tsx
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatPHP } from '@/lib/formatters';
import { Order, OrderStatus, OrderBasket } from '@/types/database';
import { RinsetLogo } from '@/components/icons/RinsetLogo';
import {
    MapPin,
    Bike,
    AlertTriangle,
    Loader2,
    FileQuestion,
    Share2,
    Shirt,
    Flame,
    Check,
    XCircle,
} from 'lucide-react';

interface ExtendedOrder extends Order {
    store?: { name?: string; contact_number?: string };
    baskets?: OrderBasket[];
}

// Stage configuration with proper Tagalog terminology
const STAGES: {
    key: OrderStatus;
    title: string;
    shortLabel: string;
    tagline: string;
    subtext: string;
    emoji: string;
    color: string;
    accentBg: string;
}[] = [
    {
        key: 'received',
        title: 'Nasa Pila',
        shortLabel: 'Pila',
        tagline: 'Nakatala na at inihahanda para labhan',
        subtext: 'Ligtas na nakalagay sa basket at inihahanda na ang angkop na sabon at panlambot.',
        emoji: '🧺',
        color: 'text-amber-400',
        accentBg: 'bg-amber-500/10 border-amber-500/30',
    },
    {
        key: 'washing',
        title: 'Kasalukuyang Nilalabhan',
        shortLabel: 'Nilalabhan',
        tagline: 'Isinasailalim sa masusing paghuhugas',
        subtext: 'Matiyagang pinaiikot at nililinis gamit ang de-kalidad na sabon at tubig.',
        emoji: '🫧',
        color: 'text-sky-400',
        accentBg: 'bg-sky-500/10 border-sky-500/30',
    },
    {
        key: 'drying',
        title: 'Pinatutuyo',
        shortLabel: 'Pinatutuyo',
        tagline: 'Pinaiikot sa mainit na dryer',
        subtext: 'Sumasailalim sa tamang init upang masigurong tuyong-tuyo at walang amoy-kulob.',
        emoji: '🔥',
        color: 'text-orange-400',
        accentBg: 'bg-orange-500/10 border-orange-500/30',
    },
    {
        key: 'ready_for_pickup',
        title: 'Handa Nang Kunin',
        shortLabel: 'Handa Na',
        tagline: 'Malinis, mabango, at nakatupi na',
        subtext: 'Maayos nang naitiklop at nakalagay na sa nakalaang storage slot para sa inyo.',
        emoji: '✨',
        color: 'text-emerald-400',
        accentBg: 'bg-emerald-500/10 border-emerald-500/30',
    },
    {
        key: 'claimed',
        title: 'Nakuha Na',
        shortLabel: 'Nakuha',
        tagline: 'Matagumpay nang na-claim ang labada',
        subtext: 'Maraming salamat po sa inyong pagtitiwala! Hanggang sa muling paglalaba.',
        emoji: '💖',
        color: 'text-slate-400',
        accentBg: 'bg-slate-800/40 border-slate-700',
    },
];

const STAGE_ORDER: Record<OrderStatus, number> = {
    received: 1,
    washing: 2,
    drying: 3,
    folding: 4,
    ready_for_pickup: 4,
    claimed: 5,
    cancelled: 0,
};

function TrackingView() {
    const params = useParams();
    const orderNumber = (params?.orderNumber as string) || '';

    const [order, setOrder] = useState<ExtendedOrder | null>(null);
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);
    const [copied, setCopied] = useState(false);

    const fetchOrder = async (isBackground = false) => {
        if (!orderNumber) return;
        try {
            const supabase = createClient();
            const { data, error } = await supabase
                .from('orders')
                .select('*, store:stores(name), items:order_items(*), baskets:order_baskets(*)')
                .eq('order_number', orderNumber.trim())
                .maybeSingle();

            if (error || !data) {
                if (!isBackground) setNotFound(true);
            } else {
                setOrder(data as ExtendedOrder);
                setNotFound(false);
                if (data.store && (data.store as { name?: string }).name) {
                    setStoreName((data.store as { name: string }).name);
                }
            }
        } catch (err) {
            console.error('Error fetching tracking status:', err);
            if (!isBackground) setNotFound(true);
        } finally {
            if (!isBackground) setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrder();

        const supabase = createClient();
        const channel = supabase
            .channel(`track-${orderNumber}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'orders' },
                () => fetchOrder(true)
            )
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'order_baskets' },
                () => fetchOrder(true)
            )
            .subscribe();

        const interval = setInterval(() => {
            fetchOrder(true);
        }, 4000);

        return () => {
            supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [orderNumber]);

    const currentStage: OrderStatus = useMemo(() => {
        if (!order) return 'received';

        const orderStatusStr = String(order.status);
        if (orderStatusStr === 'cancelled') return 'cancelled';
        if (orderStatusStr === 'claimed') return 'claimed';
        if (orderStatusStr === 'ready_for_pickup' || orderStatusStr === 'folding') {
            return 'ready_for_pickup';
        }

        if (order.baskets && order.baskets.length > 0) {
            let highestRank = 1;
            let highestStatus: OrderStatus = 'received';

            for (const b of order.baskets) {
                const bStatusStr = String(b.status);
                if (bStatusStr === 'cancelled') continue;

                const normalizedStatus: OrderStatus =
                    bStatusStr === 'folding' ? 'ready_for_pickup' : (b.status as OrderStatus);
                const rank = STAGE_ORDER[normalizedStatus] ?? 1;

                if (rank > highestRank) {
                    highestRank = rank;
                    highestStatus = normalizedStatus;
                }
            }
            return highestStatus;
        }

        return order.status || 'received';
    }, [order]);

    const activeMachine = useMemo(() => {
        if (!order?.baskets) return null;
        const basketWithMachine = order.baskets.find(
            (b) => b.assigned_machine && (b.status === 'washing' || b.status === 'drying')
        );
        return basketWithMachine?.assigned_machine || null;
    }, [order]);

    const stageMeta = STAGES.find((s) => s.key === currentStage) || STAGES[0];
    const stageIndex = STAGES.findIndex((s) => s.key === currentStage);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <div className="relative w-16 h-16 mb-4">
                    <div className="absolute inset-0 rounded-full border-4 border-sky-500/20 border-t-sky-400 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-indigo-500/20 border-b-indigo-400 animate-spin [animation-direction:reverse]" />
                    <div className="absolute inset-0 flex items-center justify-center text-xl">🧺</div>
                </div>
                <p className="text-slate-300 font-bold text-sm">Hinahanap ang inyong talaan...</p>
                <p className="text-slate-500 text-xs font-mono mt-1">Kumokonekta sa Rinset Live Board</p>
            </div>
        );
    }

    if (notFound || !order) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl">
                        <FileQuestion className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Hindi Nahanap ang Tiket</h1>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                            Walang tala para sa Tiket <strong className="text-sky-400 font-mono">#{orderNumber}</strong>. Pakisuring muli ang QR code o link sa inyong resibo.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (order.status === 'cancelled') {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full space-y-4 shadow-2xl">
                    <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto text-2xl">
                        <XCircle className="w-7 h-7" />
                    </div>
                    <div>
                        <h1 className="text-lg font-bold text-white">Kinansela ang Tiket</h1>
                        <p className="text-slate-400 text-xs mt-1 leading-relaxed">
                            Ang Tiket <strong className="text-rose-400 font-mono">#{order.order_number}</strong> ay kinansela na. Mangyaring makipag-ugnayan sa shop para sa karagdagang impormasyon.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const isPaid = order.payment_status === 'paid';
    const isReady = currentStage === 'ready_for_pickup' || currentStage === 'claimed';
    const isClaimed = currentStage === 'claimed';

    const msInDay = 1000 * 60 * 60 * 24;
    const daysOld = Math.floor((Date.now() - new Date(order.created_at).getTime()) / msInDay);
    const storageFee = isReady && !isClaimed && daysOld >= 14 ? (daysOld - 14) * 10 : 0;
    const totalDue = isPaid ? storageFee : order.net_payable + storageFee;

    const handleShare = () => {
        if (navigator.share) {
            navigator
                .share({
                    title: `${storeName} - Tiket #${order.order_number}`,
                    text: `Subaybayan ang aking labada sa ${storeName}! Katayuan: ${stageMeta.title}`,
                    url: window.location.href,
                })
                .catch(() => {});
        } else {
            navigator.clipboard.writeText(window.location.href);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-3 sm:p-6 font-sans relative overflow-x-hidden selection:bg-sky-500 selection:text-slate-950">
            {/* Floating Animated Soap Bubbles */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 opacity-40">
                <div className="bubble bubble-1" />
                <div className="bubble bubble-2" />
                <div className="bubble bubble-3" />
                <div className="bubble bubble-4" />
                <div className="bubble bubble-5" />
            </div>

            <main className="max-w-md mx-auto space-y-4 relative z-10">
                {/* Top Header Card */}
                <header className="flex items-center justify-between bg-slate-900/80 backdrop-blur-md border border-slate-800 p-3.5 rounded-2xl shadow-xl">
                    <div className="flex items-center space-x-2.5">
                        <RinsetLogo className="w-9 h-9 flex-shrink-0" />
                        <div>
                            <h1 className="text-sm font-bold text-white leading-none">{storeName}</h1>
                            <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Tiket <span className="text-sky-400 font-bold">#{order.order_number}</span>
                            </p>
                        </div>
                    </div>

                    <button
                        onClick={handleShare}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-300 text-xs font-semibold flex items-center space-x-1.5 transition border border-slate-700"
                        title="Ibahagi ang tracking link"
                    >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                        <span className="text-[11px]">{copied ? 'Nakopya!' : 'Ibahagi'}</span>
                    </button>
                </header>

                {/* 3D Animated Hero Screen */}
                <section
                    className={`p-5 rounded-3xl border shadow-2xl relative overflow-hidden transition-all duration-500 ${stageMeta.accentBg}`}
                >
                    <div className="absolute -top-16 -right-16 w-44 h-44 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />
                    <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

                    {/* Animated 3D Washing Machine Character */}
                    <div className="flex justify-center py-2">
                        <div className="relative group cursor-pointer">
                            <div className="w-36 h-44 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-3xl border-2 border-slate-700/80 shadow-[0_15px_35px_rgba(0,0,0,0.6)] flex flex-col items-center p-2.5 relative transform transition-transform duration-300 hover:rotate-1">
                                <div className="w-full flex justify-between items-center px-1 mb-2">
                                    <div className="w-6 h-2 rounded bg-slate-700 border border-slate-600" />
                                    <div className="flex space-x-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                        <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                                    </div>
                                    <div className="w-3.5 h-3.5 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center">
                                        <div className="w-0.5 h-1.5 bg-sky-400 rounded-full" />
                                    </div>
                                </div>

                                <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-800 border-4 border-slate-700 shadow-inner flex items-center justify-center relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent rounded-full pointer-events-none" />

                                    {currentStage === 'received' && (
                                        <div className="text-3xl animate-bounce [animation-duration:1.5s]">🧺</div>
                                    )}

                                    {currentStage === 'washing' && (
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-sky-400/60 animate-spin [animation-duration:2s] flex items-center justify-center">
                                                <Shirt className="w-6 h-6 text-sky-300 transform rotate-12" />
                                            </div>
                                            <div className="absolute bottom-0 left-0 right-0 h-7 bg-sky-500/30 backdrop-blur-xs flex items-center justify-around animate-pulse">
                                                <span className="text-[10px]">🫧</span>
                                                <span className="text-[12px]">🫧</span>
                                            </div>
                                        </div>
                                    )}

                                    {currentStage === 'drying' && (
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            <div className="w-16 h-16 rounded-full border-2 border-dashed border-orange-500/60 animate-spin [animation-duration:3s] flex items-center justify-center">
                                                <Shirt className="w-6 h-6 text-orange-400 transform -rotate-45" />
                                            </div>
                                            <div className="absolute inset-0 bg-orange-500/10 flex items-center justify-center animate-pulse">
                                                <Flame className="w-6 h-6 text-orange-400 opacity-60" />
                                            </div>
                                        </div>
                                    )}

                                    {currentStage === 'ready_for_pickup' && (
                                        <div className="flex flex-col items-center justify-center space-y-0.5 animate-bounce [animation-duration:2s]">
                                            <span className="text-2xl">✨</span>
                                            <span className="text-[10px] font-mono font-black text-emerald-400 uppercase tracking-tighter">
                        HANDA NA
                      </span>
                                        </div>
                                    )}

                                    {currentStage === 'claimed' && (
                                        <div className="text-3xl animate-pulse">💖</div>
                                    )}
                                </div>

                                <div className="w-full flex justify-between px-3 mt-auto">
                                    <div className="w-3 h-1.5 bg-slate-700 rounded-b" />
                                    <div className="w-3 h-1.5 bg-slate-700 rounded-b" />
                                </div>
                            </div>

                            {activeMachine && (
                                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-sky-500 text-slate-950 font-mono font-black text-[10px] uppercase shadow-lg border border-sky-300">
                                    Drum: {activeMachine}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="text-center mt-3 space-y-1">
            <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${stageMeta.color} bg-slate-950/70 border border-slate-800`}
            >
              {stageMeta.emoji} {stageMeta.title}
            </span>
                        <h2 className="text-lg font-black text-white">{stageMeta.tagline}</h2>
                        <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                            {stageMeta.subtext}
                        </p>
                    </div>
                </section>

                {/* Yugto ng Paglalaba Progress Section */}
                <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-3xl space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-400 px-1">
                        <span>Yugto ng Paglalaba</span>
                        <span className="text-sky-400 font-mono">
              {stageIndex >= 0 ? `Hakbang ${stageIndex + 1} sa 5` : 'Ipinoproseso'}
            </span>
                    </div>

                    <div className="relative flex justify-between items-center px-2 pt-2 pb-1">
                        <div className="absolute left-6 right-6 top-5 h-1 bg-slate-800 -z-0" />
                        <div
                            className="absolute left-6 top-5 h-1 bg-gradient-to-r from-sky-500 via-indigo-500 to-emerald-400 transition-all duration-700 -z-0"
                            style={{
                                width: `${Math.max(0, (stageIndex / (STAGES.length - 1)) * 85)}%`,
                            }}
                        />

                        {STAGES.map((s, idx) => {
                            const isPast = stageIndex >= 0 && idx < stageIndex;
                            const isCurrent = idx === stageIndex;

                            return (
                                <div key={s.key} className="flex flex-col items-center space-y-1.5 z-10">
                                    <div
                                        className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 border ${
                                            isPast
                                                ? 'bg-emerald-500 border-emerald-400 text-slate-950'
                                                : isCurrent
                                                    ? 'bg-sky-500 border-sky-300 text-slate-950 scale-125 shadow-lg shadow-sky-500/40 ring-4 ring-sky-500/20'
                                                    : 'bg-slate-900 border-slate-700 text-slate-500'
                                        }`}
                                    >
                                        {isPast ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : idx + 1}
                                    </div>
                                    <span
                                        className={`text-[9px] font-semibold truncate max-w-[58px] text-center ${
                                            isCurrent
                                                ? 'text-sky-400 font-bold'
                                                : isPast
                                                    ? 'text-slate-300'
                                                    : 'text-slate-600'
                                        }`}
                                    >
                    {s.shortLabel}
                  </span>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Physical Cubby Slot */}
                {order.storage_location && !isClaimed && (
                    <section className="bg-gradient-to-r from-emerald-950/40 to-slate-900 border border-emerald-500/30 p-4 rounded-3xl flex items-center justify-between shadow-lg">
                        <div className="flex items-center space-x-3">
                            <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
                                <MapPin className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                    Lalagyan / Cubby Slot
                                </p>
                                <p className="text-base font-black text-emerald-300 font-mono">
                                    {order.storage_location}
                                </p>
                                <p className="text-[10px] text-slate-400">Sabihin po lamang ang slot na ito sa counter pagdating.</p>
                            </div>
                        </div>
                        <div className="text-right">
              <span className="px-2 py-1 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-lg border border-emerald-500/30">
                Handa Nang Kunin
              </span>
                        </div>
                    </section>
                )}

                {/* Delivery Details */}
                {order.delivery_mode === 'delivery' && (
                    <section className="bg-slate-900/80 border border-indigo-500/30 p-4 rounded-3xl flex items-start space-x-3 shadow-lg">
                        <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <Bike className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                                Paghahatid ng Rider (Delivery)
                            </p>
                            <p className="text-xs font-semibold text-white mt-0.5 leading-snug">
                                {order.delivery_address}
                            </p>
                            <p className="text-[10px] text-indigo-300 mt-1">
                                Ihahatid sa inyong tirahan matapos tiklupin. Pakihanda po ang bayad para sa rider.
                            </p>
                        </div>
                    </section>
                )}

                {/* Pre-existing Condition Waivers */}
                {order.special_notes && order.special_notes.length > 0 && (
                    <section className="bg-slate-900/60 border border-amber-900/40 p-4 rounded-3xl space-y-2">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                            <span>Mga Naitalang Kondisyon Bago Labhan:</span>
                        </div>
                        <ul className="text-xs text-slate-300 space-y-1 pl-2">
                            {order.special_notes.map((note, idx) => (
                                <li key={idx} className="flex items-center space-x-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                                    <span>{note}</span>
                                </li>
                            ))}
                        </ul>
                    </section>
                )}

                {/* Receipt & Payment Summary */}
                <section className="bg-slate-900/80 backdrop-blur-md border border-slate-800 p-4 rounded-3xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-2.5">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Katayuan ng Bayad
            </span>
                        <span
                            className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-xl border ${
                                isPaid
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                            }`}
                        >
              {isPaid ? 'BAYAD NA' : 'HINDI PA BAYAD / BAYARAN SA PICKUP'}
            </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                        {order.items &&
                            order.items.map((item, idx) => (
                                <div key={idx} className="flex justify-between text-slate-300 font-mono">
                  <span className="font-sans">
                    {item.item_name} ({item.quantity}{' '}
                      {item.pricing_type === 'per_kilo' ? 'kg' : 'pc'})
                  </span>
                                    <span>{formatPHP(item.item_total)}</span>
                                </div>
                            ))}

                        {order.delivery_fee && order.delivery_fee > 0 ? (
                            <div className="flex justify-between text-indigo-300 font-mono text-xs pt-1">
                                <span className="font-sans">Bayad sa Rider (Delivery Fee)</span>
                                <span>{formatPHP(order.delivery_fee)}</span>
                            </div>
                        ) : null}
                    </div>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-baseline font-mono">
            <span className="text-xs font-bold text-slate-300 font-sans">
              {isPaid ? 'Kabuuang Naibayad:' : 'Kabuuang Babayaran:'}
            </span>
                        <span
                            className={`text-2xl font-black ${
                                totalDue > 0 ? 'text-rose-400' : 'text-emerald-400'
                            }`}
                        >
              {formatPHP(totalDue)}
            </span>
                    </div>

                    {storageFee > 0 && (
                        <p className="text-[10px] text-amber-400 text-right font-mono">
                            May karagdagang {formatPHP(storageFee)} storage fee dahil lumampas na ng {daysOld} araw sa shop.
                        </p>
                    )}
                </section>

                {/* English Live Connection Footer */}
                <footer className="text-center space-y-2 pt-2 pb-8">
                    <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-[10px] text-slate-400">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                        <span>Live updates enabled • Screen updates automatically</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono">
                        Powered by Rinset POS • Laundry Operating System
                    </p>
                </footer>
            </main>

            {/* Floating Animated CSS Styles for Bubbles */}
            <style
                dangerouslySetInnerHTML={{
                    __html: `
            .bubble {
              position: absolute;
              background: radial-gradient(circle at 30% 30%, rgba(56, 189, 248, 0.4), rgba(99, 102, 241, 0.1));
              border-radius: 50%;
              border: 1px solid rgba(255, 255, 255, 0.2);
              animation: floatUp 14s infinite linear;
            }
            .bubble-1 { width: 40px; height: 40px; left: 10%; animation-duration: 12s; animation-delay: 0s; }
            .bubble-2 { width: 65px; height: 65px; left: 35%; animation-duration: 16s; animation-delay: 2s; }
            .bubble-3 { width: 30px; height: 30px; left: 60%; animation-duration: 10s; animation-delay: 4s; }
            .bubble-4 { width: 50px; height: 50px; left: 80%; animation-duration: 15s; animation-delay: 1s; }
            .bubble-5 { width: 25px; height: 25px; left: 92%; animation-duration: 11s; animation-delay: 3s; }

            @keyframes floatUp {
              0% {
                bottom: -80px;
                transform: translateX(0) scale(0.8);
                opacity: 0;
              }
              20% {
                opacity: 0.7;
              }
              50% {
                transform: translateX(20px) scale(1);
              }
              80% {
                opacity: 0.7;
              }
              100% {
                bottom: 105vh;
                transform: translateX(-20px) scale(1.1);
                opacity: 0;
              }
            }
          `,
                }}
            />
        </div>
    );
}

export default function PublicTrackingPage() {
    return (
        <Suspense
            fallback={
                <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
                    <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
                    <p className="text-slate-400 text-xs font-mono">Loading ticket...</p>
                </div>
            }
        >
            <TrackingView />
        </Suspense>
    );
}