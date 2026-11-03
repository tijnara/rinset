'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/features/pos/store/useCartStore';
import { calculatePayment } from '@/lib/calculations';
import { formatPHP } from '@/lib/formatters';
import { CustomerAutocomplete } from './CustomerAutocomplete';
import {
    X,
    User,
    Banknote,
    Smartphone,
    Clock,
    Loader2,
    AlertCircle,
    Receipt,
} from 'lucide-react';

interface CheckoutModalProps {
    storeId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderNumber: string) => void;
}

export function CheckoutModal({
                                  storeId,
                                  isOpen,
                                  onClose,
                                  onSuccess,
                              }: CheckoutModalProps) {
    const {
        customerName,
        customerMobile,
        basketTag,
        setCustomer,
        getBreakdown,
        clearCart,
    } = useCartStore();

    const breakdown = getBreakdown();

    const [paymentType, setPaymentType] = useState<'cash' | 'gcash' | 'pay_on_claim'>('cash');
    const [cashTendered, setCashTendered] = useState<number>(breakdown.netPayable);
    const [gcashRef, setGcashRef] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Sync cash tendered when net payable updates
    useEffect(() => {
        setCashTendered(breakdown.netPayable);
    }, [breakdown.netPayable]);

    if (!isOpen) return null;

    const paymentCalc = calculatePayment(
        breakdown.netPayable,
        paymentType === 'cash' ? cashTendered : 0,
        paymentType === 'gcash' ? breakdown.netPayable : 0
    );

    const handleCompleteCheckout = async () => {
        // Validation: Require customer name before receipt generation
        if (!customerName.trim()) {
            setErrorMsg('Customer name is required for receipt and basket tag identification.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        const supabase = createClient();

        try {
            // 1. Find or create Customer record
            let customerId: string | null = null;

            if (customerMobile.trim()) {
                const { data: existingCust } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('mobile_number', customerMobile.trim())
                    .maybeSingle();

                if (existingCust) {
                    customerId = existingCust.id;
                }
            }

            if (!customerId) {
                const { data: newCust, error: custErr } = await supabase
                    .from('customers')
                    .insert({
                        store_id: storeId,
                        full_name: customerName.trim(),
                        mobile_number: customerMobile.trim() || null,
                    })
                    .select('id')
                    .single();

                if (custErr) throw custErr;
                customerId = newCust.id;
            }

            // 2. Generate random ticket number
            const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
            const orderNumber = `RNS-${randomTicketNum}`;
            const isPaid = paymentType !== 'pay_on_claim';

            // 3. Insert Order
            const { data: orderData, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    customer_id: customerId,
                    order_number: orderNumber,
                    basket_tag: basketTag.trim() || `B-${Math.floor(100 + Math.random() * 900)}`,
                    status: 'received',
                    payment_status: isPaid ? 'paid' : 'unpaid',
                    total_weight_kg: breakdown.totalWeightKg,
                    subtotal: breakdown.subtotal,
                    discount_amount: 0,
                    net_payable: breakdown.netPayable,
                    total_paid: isPaid ? breakdown.netPayable : 0,
                })
                .select('id')
                .single();

            if (orderErr) throw orderErr;

            // 4. Insert Order Items with item_total
            const orderItems = breakdown.items.map((i) => ({
                order_id: orderData.id,
                catalog_item_id: i.id,
                item_name: i.name,
                pricing_type: i.pricingType,
                unit_price: i.unitPrice,
                quantity: i.quantity,
                billable_quantity: i.billableQuantity,
                item_total: i.itemTotal,
            }));

            const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
            if (itemsErr) throw itemsErr;

            // 5. Insert Payment Record if paid now
            if (isPaid) {
                const { error: payErr } = await supabase.from('payments').insert({
                    order_id: orderData.id,
                    payment_method: paymentType === 'cash' ? 'cash' : 'gcash',
                    amount: breakdown.netPayable,
                    tendered_amount: paymentType === 'cash' ? cashTendered : breakdown.netPayable,
                    change_amount: paymentType === 'cash' ? paymentCalc.changeDue : 0,
                    reference_number: paymentType === 'gcash' ? gcashRef : null,
                });
                if (payErr) throw payErr;
            }

            clearCart();
            onSuccess(orderNumber);
            onClose();
        } catch (err: unknown) {
            const msg = err instanceof Error ? err.message : 'Checkout failed';
            setErrorMsg(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <Receipt className="w-5 h-5 text-sky-400" />
                        <h3 className="font-bold text-white text-base">Receipt & Checkout Details</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Amount Banner */}
                <div className="bg-slate-950 border border-slate-800 p-4 rounded-xl flex justify-between items-center">
                    <div>
            <span className="text-[10px] text-slate-400 block uppercase font-bold tracking-wider">
              Total Amount Due
            </span>
                        <span className="text-2xl font-mono font-bold text-white">
              {formatPHP(breakdown.netPayable)}
            </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
            {breakdown.totalWeightKg > 0 ? `${breakdown.totalWeightKg} kg` : `${breakdown.items.length} items`}
          </span>
                </div>

                {/* Customer Information (Required for Receipt) */}
                <div className="space-y-2 bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl">
                    <div className="flex justify-between items-center mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" />
              Customer Details (For Receipt)
            </span>
                        <span className="text-[10px] text-rose-400 font-semibold">* Required</span>
                    </div>

                    <CustomerAutocomplete
                        customerName={customerName}
                        customerMobile={customerMobile}
                        onSelect={(name, mobile) => setCustomer(name, mobile)}
                        onNameChange={(name) => setCustomer(name, customerMobile)}
                        onMobileChange={(mobile) => setCustomer(customerName, mobile)}
                    />
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Payment Option:</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentType('cash')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'cash'
                                    ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold'
                                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                            <Banknote className="w-4 h-4" />
                            <span className="text-xs">Cash</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPaymentType('gcash')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'gcash'
                                    ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold'
                                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            <span className="text-xs">GCash</span>
                        </button>

                        <button
                            type="button"
                            onClick={() => setPaymentType('pay_on_claim')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'pay_on_claim'
                                    ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold'
                                    : 'bg-slate-800/40 border-slate-800 text-slate-400 hover:border-slate-700'
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Pay on Claim</span>
                        </button>
                    </div>
                </div>

                {/* Cash Tender & Change */}
                {paymentType === 'cash' && (
                    <div className="space-y-3 bg-slate-950 border border-slate-800 p-3.5 rounded-xl">
                        <div className="flex justify-between items-center">
                            <label className="text-xs text-slate-400 font-medium">Cash Tendered:</label>
                            <input
                                type="number"
                                value={cashTendered || ''}
                                onChange={(e) => setCashTendered(parseFloat(e.target.value) || 0)}
                                className="w-36 bg-slate-900 border border-slate-700 rounded-lg p-2 text-right font-mono text-white text-base focus:border-sky-500 focus:outline-none"
                            />
                        </div>

                        <div className="grid grid-cols-4 gap-1.5 pt-1">
                            {[breakdown.netPayable, 100, 200, 500, 1000]
                                .filter((v, i, arr) => arr.indexOf(v) === i && v >= breakdown.netPayable)
                                .slice(0, 4)
                                .map((bill) => (
                                    <button
                                        key={bill}
                                        type="button"
                                        onClick={() => setCashTendered(bill)}
                                        className="py-1 bg-slate-800 hover:bg-slate-700 text-xs font-mono rounded-lg text-slate-200 transition"
                                    >
                                        ₱{bill}
                                    </button>
                                ))}
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-mono text-sm">
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
                    <div className="space-y-1 bg-slate-950 border border-slate-800 p-3 rounded-xl">
                        <label className="text-xs text-slate-400">GCash Ref No. (optional):</label>
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
                    <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />
                        <span>{errorMsg}</span>
                    </div>
                )}

                {/* Submit */}
                <button
                    onClick={handleCompleteCheckout}
                    disabled={
                        isSubmitting ||
                        !customerName.trim() ||
                        (paymentType === 'cash' && cashTendered < breakdown.netPayable)
                    }
                    className="w-full h-13 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 active:bg-sky-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                >
                    {isSubmitting ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                        <span>Confirm & Print Receipt</span>
                    )}
                </button>
            </div>
        </div>
    );
}