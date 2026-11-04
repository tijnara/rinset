import { createClient } from '@supabase/supabase-js';
import { formatPHP, formatManilaTime } from '@/lib/formatters';
import { CheckCircle2, MapPin, Bike } from 'lucide-react';
import { Bubbles } from '@/components/icons/Bubbles';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default async function PublicTrackingPage({
                                                     params,
                                                 }: {
    params: { orderNumber: string };
}) {
    const { data: order, error } = await supabase
        .from('orders')
        .select('*, store:stores(name)')
        .eq('order_number', params.orderNumber)
        .single();

    if (error || !order) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 text-center">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl max-w-sm w-full">
                    <h1 className="text-xl font-bold text-white mb-2">Ticket Not Found</h1>
                    <p className="text-slate-400 text-sm">Please check the link on your receipt and try again.</p>
                </div>
            </div>
        );
    }

    const isPaid = order.payment_status === 'paid';
    const isReady = ['ready_for_pickup', 'claimed'].includes(order.status);
    const isClaimed = order.status === 'claimed';

    // Calculate Overdue Penalties
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
                    <h1 className="text-lg font-bold text-white tracking-tight">
                        {order.store?.name || 'Rinset Laundry'}
                    </h1>
                    <p className="text-xs text-slate-400 font-mono">Ticket #{order.order_number}</p>
                </div>

                {/* Live Status Banner */}
                <div
                    className={`p-5 rounded-2xl border text-center ${
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
                                : 'We are currently processing your laundry.'}
                    </p>
                </div>

                {/* Storage Location & Dispatch Details */}
                {order.storage_location && !isClaimed && (
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400">
                            <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Pickup Location / Cubby</p>
                            <p className="text-sm font-mono font-bold text-white">{order.storage_location}</p>
                        </div>
                    </div>
                )}

                {order.delivery_mode === 'delivery' && (
                    <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex items-center space-x-3">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                            <Bike className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] uppercase font-bold text-slate-400">Delivery Dispatch</p>
                            <p className="text-xs font-semibold text-white mt-0.5">{order.delivery_address}</p>
                        </div>
                    </div>
                )}

                {/* Balance & Payment */}
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
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

                    <div className="pt-3 flex justify-between items-baseline font-mono">
                        <span className="text-sm font-bold text-slate-300">Balance Due:</span>
                        <span className={`text-2xl font-black ${totalDue > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
              {formatPHP(totalDue)}
            </span>
                    </div>
                    {storageFee > 0 && (
                        <p className="text-[10px] text-amber-400 mt-1 text-right">
                            Includes {formatPHP(storageFee)} storage fee penalty (&gt;{daysOld} days)
                        </p>
                    )}
                </div>

                <p className="text-center text-[10px] text-slate-500 pt-4 pb-8">
                    Powered by Rinset POS • {new Date().getFullYear()}
                </p>
            </div>
        </div>
    );
}