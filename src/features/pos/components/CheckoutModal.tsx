'use client';

import { useState } from 'react';
import { useCartStore } from '@/features/pos/store/useCartStore';
import { createClient } from '@/lib/supabase/client';
import { calculatePayment, formatPHP } from '@/lib/calculations';
import { PaymentMethod, PaymentStatus } from '@/types/database';
import { X, Check, Banknote, Smartphone, Clock, Loader2 } from 'lucide-react';

interface CheckoutModalProps {
    storeId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderNumber: string) => void;
}

export function CheckoutModal({ storeId, isOpen, onClose, onSuccess }: CheckoutModalProps) {
    const { customerName, customerMobile, basketTag, items, notes, getBreakdown, clearCart } =
        useCartStore();
    const breakdown = getBreakdown();

    const [paymentType, setPaymentType] = useState<'unpaid' | 'cash' | 'gcash'>('unpaid');
    const [cashTendered, setCashTendered] = useState<number>(breakdown.netPayable);
    const [gcashRef, setGcashRef] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    if (!isOpen) return null;

    const paymentCalc = calculatePayment(
        breakdown.netPayable,
        paymentType === 'cash' ? cashTendered : 0,
        paymentType === 'gcash' ? breakdown.netPayable : 0
    );

    const handleCheckout = async () => {
        if (!basketTag.trim()) {
            setErrorMsg('Please specify a basket tag or number.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        const supabase = createClient();

        try {
            // 1. Find or create customer if provided
            let customerId: string | null = null;
            if (customerName.trim() || customerMobile.trim()) {
                const { data: customer } = await supabase
                    .from('customers')
                    .insert({
                        store_id: storeId,
                        full_name: customerName.trim() || 'Walk-in Customer',
                        mobile_number: customerMobile.trim() || 'N/A',
                    })
                    .select('id')
                    .single();

                if (customer) customerId = customer.id;
            }

            // 2. Generate Order Number
            const orderNumber = `RNS-${Math.floor(1000 + Math.random() * 9000)}`;

            // 3. Determine Payment Status
            let paymentStatus: PaymentStatus = 'unpaid';
            let totalPaid = 0;
            if (paymentType === 'cash' || paymentType === 'gcash') {
                paymentStatus = 'paid';
                totalPaid = breakdown.netPayable;
            }

            // 4. Insert Order
            const { data: order, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    order_number: orderNumber,
                    customer_id: customerId,
                    basket_tag: basketTag,
                    status: 'received',
                    total_weight_kg: breakdown.totalWeightKg,
                    subtotal: breakdown.subtotal,
                    rush_fee: breakdown.rushFee,
                    delivery_fee: breakdown.deliveryFee,
                    discount_amount: breakdown.discountAmount,
                    net_payable: breakdown.netPayable,
                    payment_status: paymentStatus,
                    total_paid: totalPaid,
                    notes: notes || null,
                })
                .select('id')
                .single();

            if (orderErr) throw orderErr;

            // 5. Insert Order Items Snapshot
            const orderItemsData = breakdown.items.map((item) => ({
                order_id: order.id,
                catalog_item_id: item.id,
                item_name: item.name,
                pricing_type: item.pricingType,
                unit_price: item.unitPrice,
                quantity: item.quantity,
                minimum_quantity: item.minimumQuantity || 0,
                billable_quantity: item.billableQuantity,
                item_total: item.itemTotal,
            }));

            const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsData);
            if (itemsErr) throw itemsErr;

            // 6. Record Payment if paid now
            if (paymentType !== 'unpaid') {
                const pMethod: PaymentMethod = paymentType === 'cash' ? 'cash' : 'gcash';
                await supabase.from('payments').insert({
                    order_id: order.id,
                    payment_method: pMethod,
                    amount: breakdown.netPayable,
                    tendered_amount: paymentType === 'cash' ? cashTendered : breakdown.netPayable,
                    change_amount: paymentType === 'cash' ? paymentCalc.changeDue : 0,
                    reference_number: paymentType === 'gcash' ? gcashRef : null,
                });
            }

            clearCart();
            onSuccess(orderNumber);
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to save order';
            setErrorMsg(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div>
                        <h3 className="text-xl font-bold text-white">Checkout Order</h3>
                        <p className="text-xs text-slate-400">Basket: {basketTag}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-slate-400 hover:text-white rounded-lg bg-slate-800/60"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Total Banner */}
                <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl flex justify-between items-center">
                    <div>
                        <span className="text-xs text-slate-400 block uppercase">Total Amount</span>
                        <span className="text-2xl font-mono font-bold text-emerald-400">
              {formatPHP(breakdown.netPayable)}
            </span>
                    </div>
                    <div className="text-right text-xs text-slate-400">
                        <span>{breakdown.items.length} items</span>
                        {breakdown.totalWeightKg > 0 && <span> • {breakdown.totalWeightKg} kg</span>}
                    </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                        Payment Term
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => setPaymentType('unpaid')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'unpaid'
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                                    : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                            <Clock className="w-5 h-5" />
                            <span className="text-xs">Pay on Claim</span>
                        </button>

                        <button
                            onClick={() => setPaymentType('cash')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'cash'
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                    : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                            <Banknote className="w-5 h-5" />
                            <span className="text-xs">Cash</span>
                        </button>

                        <button
                            onClick={() => setPaymentType('gcash')}
                            className={`p-3 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'gcash'
                                    ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                                    : 'bg-slate-800/50 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                            <Smartphone className="w-5 h-5" />
                            <span className="text-xs">GCash</span>
                        </button>
                    </div>
                </div>

                {/* Cash Tender & Change calculation */}
                {paymentType === 'cash' && (
                    <div className="space-y-3 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <label className="text-xs font-semibold text-slate-400 block">Cash Tendered (₱):</label>
                        <input
                            type="number"
                            value={cashTendered || ''}
                            onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-lg font-mono text-white text-right"
                            placeholder="0.00"
                        />

                        {/* Quick Bill Buttons */}
                        <div className="grid grid-cols-4 gap-1.5">
                            {[
                                breakdown.netPayable,
                                100,
                                200,
                                500,
                                1000,
                            ]
                                .filter((v, idx, arr) => arr.indexOf(v) === idx && v >= breakdown.netPayable)
                                .slice(0, 4)
                                .map((bill) => (
                                    <button
                                        key={bill}
                                        onClick={() => setCashTendered(bill)}
                                        className="py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-mono font-medium rounded-md text-slate-300"
                                    >
                                        ₱{bill}
                                    </button>
                                ))}
                        </div>

                        <div className="flex justify-between items-center pt-2 border-t border-slate-800 font-mono text-sm">
                            <span className="text-slate-400">Change Due:</span>
                            <span
                                className={`font-bold text-lg ${
                                    paymentCalc.changeDue >= 0 ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                            >
                {formatPHP(paymentCalc.changeDue)}
              </span>
                        </div>
                    </div>
                )}

                {/* GCash Reference */}
                {paymentType === 'gcash' && (
                    <div className="space-y-1.5 bg-slate-950 border border-slate-800 p-4 rounded-xl">
                        <label className="text-xs font-semibold text-slate-400 block">GCash Reference No. (optional):</label>
                        <input
                            type="text"
                            value={gcashRef}
                            onChange={(e) => setGcashRef(e.target.value)}
                            placeholder="e.g. 1002 9384 1928"
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-white font-mono"
                        />
                    </div>
                )}

                {errorMsg && (
                    <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-xl">
                        {errorMsg}
                    </div>
                )}

                {/* Complete Order Button */}
                <button
                    onClick={handleCheckout}
                    disabled={isSubmitting || (paymentType === 'cash' && cashTendered < breakdown.netPayable)}
                    className="w-full h-14 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 active:bg-sky-600 text-slate-950 font-bold text-base rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <>
                            <Check className="w-5 h-5 stroke-[2.5]" />
                            <span>Confirm & Print Order</span>
                        </>
                    )}
                </button>
            </div>
        </div>
    );
}