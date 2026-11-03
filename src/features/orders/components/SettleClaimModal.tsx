'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Order, PaymentMethod } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { calculatePayment } from '@/lib/calculations';
import { X, Check, Banknote, Smartphone, Loader2 } from 'lucide-react';

interface SettleClaimModalProps {
    order: Order | null;
    onClose: () => void;
    onSuccess: () => void;
}

export function SettleClaimModal({ order, onClose, onSuccess }: SettleClaimModalProps) {
    const [paymentType, setPaymentType] = useState<'cash' | 'gcash'>('cash');
    const [cashTendered, setCashTendered] = useState<number>(order?.net_payable || 0);
    const [gcashRef, setGcashRef] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!order) return null;

    const paymentCalc = calculatePayment(
        order.net_payable,
        paymentType === 'cash' ? cashTendered : 0,
        paymentType === 'gcash' ? order.net_payable : 0
    );

    const handleSettleAndClaim = async () => {
        setIsSubmitting(true);
        setErrorMsg(null);
        const supabase = createClient();

        try {
            const pMethod: PaymentMethod = paymentType === 'cash' ? 'cash' : 'gcash';

            // 1. Insert payment record
            const { error: paymentErr } = await supabase.from('payments').insert({
                order_id: order.id,
                payment_method: pMethod,
                amount: order.net_payable,
                tendered_amount: paymentType === 'cash' ? cashTendered : order.net_payable,
                change_amount: paymentType === 'cash' ? paymentCalc.changeDue : 0,
                reference_number: paymentType === 'gcash' ? gcashRef : null,
            });

            if (paymentErr) throw paymentErr;

            // 2. Update order to claimed and paid
            const { error: orderErr } = await supabase
                .from('orders')
                .update({
                    status: 'claimed',
                    payment_status: 'paid',
                    total_paid: order.net_payable,
                    claimed_at: new Date().toISOString(),
                })
                .eq('id', order.id);

            if (orderErr) throw orderErr;

            onSuccess();
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Failed to settle order';
            setErrorMsg(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4">
                {/* Header */}
                <div className="flex justify-between items-start border-b border-slate-800 pb-3">
                    <div>
                        <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-sky-500/10 text-sky-400 font-mono font-black text-sm rounded border border-sky-500/20">
                {order.basket_tag}
              </span>
                            <span className="text-xs text-slate-400 font-mono">#{order.order_number}</span>
                        </div>
                        <h3 className="text-base font-bold text-white mt-1">
                            {order.customer?.full_name || 'Walk-in Customer'}
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Amount Due Banner */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
            <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
              Balance Due
            </span>
                        <span className="text-2xl font-mono font-bold text-amber-400">
              {formatPHP(order.net_payable)}
            </span>
                    </div>
                    <div className="text-right text-xs text-slate-400 font-mono">
                        {order.total_weight_kg > 0 ? `${order.total_weight_kg} kg` : 'Piece/Retail'}
                    </div>
                </div>

                {/* Payment Method Selector */}
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => setPaymentType('cash')}
                        className={`p-3 rounded-xl border flex items-center justify-center space-x-2 transition ${
                            paymentType === 'cash'
                                ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                        <Banknote className="w-4 h-4" />
                        <span className="text-xs">Cash</span>
                    </button>

                    <button
                        onClick={() => setPaymentType('gcash')}
                        className={`p-3 rounded-xl border flex items-center justify-center space-x-2 transition ${
                            paymentType === 'gcash'
                                ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                                : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                        }`}
                    >
                        <Smartphone className="w-4 h-4" />
                        <span className="text-xs">GCash</span>
                    </button>
                </div>

                {/* Cash Tender Input & Change */}
                {paymentType === 'cash' && (
                    <div className="space-y-3 bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-slate-400">Cash Received:</label>
                            <input
                                type="number"
                                value={cashTendered || ''}
                                onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                                className="w-36 bg-slate-900 border border-slate-700 rounded-lg p-2 text-right font-mono text-white text-base focus:border-sky-500 focus:outline-none"
                            />
                        </div>

                        {/* Quick Bill Selectors */}
                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {[order.net_payable, 100, 200, 500, 1000]
                                .filter((v, i, arr) => arr.indexOf(v) === i && v >= order.net_payable)
                                .slice(0, 4)
                                .map((bill) => (
                                    <button
                                        key={bill}
                                        onClick={() => setCashTendered(bill)}
                                        className="py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono rounded-lg text-slate-200 transition"
                                    >
                                        ₱{bill}
                                    </button>
                                ))}
                        </div>

                        <div className="pt-2 border-t border-slate-800/80 flex justify-between items-center font-mono text-sm">
                            <span className="text-slate-400 text-xs">Change Due:</span>
                            <span
                                className={`font-bold text-base ${
                                    paymentCalc.changeDue >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                            >
                {formatPHP(paymentCalc.changeDue)}
              </span>
                        </div>
                    </div>
                )}

                {/* GCash Reference */}
                {paymentType === 'gcash' && (
                    <div className="space-y-1 bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                        <label className="text-xs text-slate-400">GCash Reference No. (optional):</label>
                        <input
                            type="text"
                            placeholder="e.g. 1029 4829 1049"
                            value={gcashRef}
                            onChange={(e) => setGcashRef(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs font-mono text-white focus:border-sky-500 focus:outline-none"
                        />
                    </div>
                )}

                {errorMsg && (
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg">
                        {errorMsg}
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleSettleAndClaim}
                    disabled={isSubmitting || (paymentType === 'cash' && cashTendered < order.net_payable)}
                    className="w-full h-13 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 active:bg-sky-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5 stroke-[2.5]" />
                            <span>Settle Payment & Release Laundry</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}