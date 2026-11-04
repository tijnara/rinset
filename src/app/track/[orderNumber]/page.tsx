'use client';

import { Suspense, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { formatPHP, formatManilaTime } from '@/lib/formatters';
import { Order } from '@/types/database';
import { Bubbles } from '@/components/icons/Bubbles';
import {
    CheckCircle2,
    MapPin,
    Bike,
    Clock,
    AlertTriangle,
    Loader2,
    FileQuestion,
} from 'lucide-react';

function TrackingView() {
    const params = useParams();
    const orderNumber = (params?.orderNumber as string) || '';

    const [order, setOrder] = useState<Order | null>(null);
    const [storeName, setStoreName] = useState<string>('Rinset Laundry');
    const [loading, setLoading] = useState(true);
    const [notFound, setNotFound] = useState(false);

    useEffect(() => {
        if (!orderNumber) {
            setLoading(false);
            setNotFound(true);
            return;
        }

        const fetchOrder = async () => {
            try {
                const supabase = createClient();
                const { data, error } = await supabase
                    .from('orders')
                    .select('*, store:stores(name), items:order_items(*)')
                    .eq('order_number', orderNumber.trim())
                    .maybeSingle();

                if (error || !data) {
                    setNotFound(true);
                } else {
                    setOrder(data as Order);
                    if (data.store && (data.store as { name?: string }).name) {
                        setStoreName((data.store as { name: string }).name);
                    }
                }
            } catch (err) {
                console.error('Error loading order tracking:', err);
                setNotFound(true);
            } finally {
                setLoading(false);
            }
        };

        fetchOrder();
    }, [orderNumber]);

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 text-center">
                <Loader2 className="w-10 h-10 text-sky-400 animate-spin mb-3" />
                <p className="text-slate-400 text-xs font-mono">Locating laundry ticket...</p>
            </div>
        );
    }

    if (notFound || !order) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl max-w-sm w-full space-y-3 shadow-2xl">
                    <div className="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
                        <FileQuestion className="w-6 h-6" />
                    </div>
                    <h1 className="text-lg font-bold text-white">Ticket Not Found</h1>
                    <p className="text-slate-400 text-xs leading-relaxed">
                        We couldn't locate ticket <strong className="text-sky-400 font-mono">#{orderNumber}</strong>. Please verify the QR code on your printed receipt.
                    </p>
                </div>
            </div>
        );
    }

    const isPaid = order.payment_status === 'paid';
    const isReady = ['ready_for_pickup', 'claimed'].includes(order.status);
    const isClaimed = order.status === 'claimed';

    // Overdue penalties (14+ days)
    const daysOld = Math.floor(
        (Date.now() - new Date(order.created_at).getTime()) / (1000 * 60 * 60 * 24)
    );
    const storageFee = isReady && !isClaimed && daysOld >= 14 ? (daysOld - 14) * 10 : 0;
    const totalDue = isPaid ? storageFee : order.net_payable + storageFee;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 font-sans">
            <div className="max-w-md mx-auto space-y-4">
                {/* Store Header */}
                <div className="text-center space-y-1">
                    <div className="w-12 h-12 bg-sky-500 rounded-2xl mx-auto flex items-center justify-center text-slate-950 font-black text-2xl shadow-lg mb-2">
                        R
                    </div>
                    <h1 className="text-lg font-bold text-white tracking-tight">{storeName}</h1>
                    <p className="text-xs text-slate-400 font-mono">Ticket #{order.order_number}</p>
                </div>

                {/* Live Status Banner */}
                <div
                    className={`p-5 rounded-2xl border text-center transition ${
                        isClaimed
                            ? 'bg-slate-900 border-slate-800'
                            : isReady
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-sky-500/10 border-sky-500/30'
                    }`}
                >
                    {isClaimed ? (
                        <CheckCircle2 className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                    ) : isReady ? (
                        <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                    ) : (
                        <Bubbles className="w-10 h-10 text-sky-400 mx-auto mb-2 animate-pulse" />
                    )}
                    <h2 className="text-xl font-black text-white capitalize">
                        {order.status.replace(/_/g, ' ')}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">
                        {isClaimed
                            ? `Claimed on ${formatManilaTime(order.updated_at)}`
                            : isReady
                                ? 'Your laundry is folded and ready to be picked up.'
                                : 'Your laundry is currently in process.'}
                    </p>
                </div>

                {/* Cubby Storage Location */}
                {order.storage_location && !isClaimed && (
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                        <div className="p-2.5 bg-emerald-500/10 rounded-xl text-emerald-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Pickup Location / Cubby</p>
                            <p className="text-sm font-mono font-bold text-white">{order.storage_location}</p>
                        </div>
                    </div>
                )}

                {/* Delivery Details */}
                {order.delivery_mode === 'delivery' && (
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                        <div className="p-2.5 bg-indigo-500/10 rounded-xl text-indigo-400">
                            <Bike className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Delivery Dispatch</p>
                            <p className="text-xs font-semibold text-white mt-0.5">{order.delivery_address}</p>
                        </div>
                    </div>
                )}

                {/* Intake Condition Waivers */}
                {order.special_notes && order.special_notes.length > 0 && (
                    <div className="bg-slate-900 border border-amber-900/40 p-4 rounded-xl space-y-1.5">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                            <AlertTriangle className="w-4 h-4" />
                            <span>Noted Conditions upon Drop-off:</span>
                        </div>
                        <ul className="text-xs text-slate-300 list-disc pl-4 space-y-0.5">
                            {order.special_notes.map((note, idx) => (
                                <li key={idx}>{note}</li>
                            ))}
                        </ul>
                    </div>
                )}

                {/* Balance & Payment Card */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl space-y-3">
                    <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                        <span className="text-xs font-bold text-slate-400">Payment Status</span>
                        <span
                            className={`text-[10px] uppercase font-black px-2 py-1 rounded ${
                                isPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                            }`}
                        >
              {order.payment_status}
            </span>
                    </div>

                    <div className="flex justify-between items-baseline font-mono">
                        <span className="text-xs font-bold text-slate-300">Balance Due:</span>
                        <span className={`text-2xl font-black ${totalDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatPHP(totalDue)}
            </span>
                    </div>

                    {storageFee > 0 && (
                        <p className="text-[10px] text-amber-400 text-right">
                            Includes {formatPHP(storageFee)} storage penalty (&gt;{daysOld} days)
                        </p>
                    )}
                </div>

                <p className="text-center text-[10px] text-slate-500 pt-4 pb-8 font-mono">
                    Powered by Rinset POS • {new Date().getFullYear()}
                </p>
            </div>
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