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
    Layers,
    Plus,
    Minus,
} from 'lucide-react';

interface CheckoutModalProps {
    storeId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderNumber: string) => void;
}

const DRUM_CAPACITY_KG = 8;

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

    // Multi-load split state
    const recommendedBaskets =
        breakdown.totalWeightKg > DRUM_CAPACITY_KG
            ? Math.ceil(breakdown.totalWeightKg / DRUM_CAPACITY_KG)
            : 1;

    const [basketCount, setBasketCount] = useState<number>(1);

    useEffect(() => {
        setCashTendered(breakdown.netPayable);
        setBasketCount(recommendedBaskets);
    }, [breakdown.netPayable, recommendedBaskets]);

    if (!isOpen) return null;

    const paymentCalc = calculatePayment(
        breakdown.netPayable,
        paymentType === 'cash' ? cashTendered : 0,
        paymentType === 'gcash' ? breakdown.netPayable : 0
    );

    // Compute individual basket weights
    const baseTag = basketTag.trim() || `B-${Math.floor(100 + Math.random() * 900)}`;
    const subBaskets = Array.from({ length: basketCount }, (_, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C...
        const weightPerBasket =
            basketCount === 1
                ? breakdown.totalWeightKg
                : Math.round((breakdown.totalWeightKg / basketCount) * 10) / 10;
        return {
            tag: basketCount > 1 ? `${baseTag}-${letter}` : baseTag,
            weightKg: weightPerBasket,
        };
    });

    const handleCompleteCheckout = async () => {
        if (!customerName.trim()) {
            setErrorMsg('Customer name is required for receipt and basket tag identification.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        const supabase = createClient();

        try {
            // 1. Customer resolution
            let customerId: string | null = null;
            if (customerMobile.trim()) {
                const { data: existingCust } = await supabase
                    .from('customers')
                    .select('id')
                    .eq('mobile_number', customerMobile.trim())
                    .maybeSingle();

                if (existingCust) customerId = existingCust.id;
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

            // 2. Generate Order
            const randomTicketNum = Math.floor(1000 + Math.random() * 9000);
            const orderNumber = `RNS-${randomTicketNum}`;
            const isPaid = paymentType !== 'pay_on_claim';

            const { data: orderData, error: orderErr } = await supabase
                .from('orders')
                .insert({
                    store_id: storeId,
                    customer_id: customerId,
                    order_number: orderNumber,
                    basket_tag: baseTag,
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

            // 3. Insert Sub-Baskets into order_baskets
            const basketsPayload = subBaskets.map((b) => ({
                order_id: orderData.id,
                basket_tag: b.tag,
                weight_kg: b.weightKg,
                status: 'received',
            }));

            const { error: basketsErr } = await supabase.from('order_baskets').insert(basketsPayload);
            if (basketsErr) throw basketsErr;

            // 4. Insert Order Items
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

            // 5. Insert Payment Record
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
            console.error('Checkout error:', err);
            let msg = 'Checkout failed';

            if (err instanceof Error) {
                msg = err.message;
            } else if (typeof err === 'object' && err !== null && 'message' in err) {
                msg = String((err as { message: unknown }).message);
            }

            setErrorMsg(msg);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full sm:max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <Receipt className="w-5 h-5 text-sky-400" />
                        <h3 className="font-bold text-white text-base">Receipt & Checkout Details</h3>
                    </div>
                    <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">
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
            {breakdown.totalWeightKg > 0 ? `${breakdown.totalWeightKg} kg total` : `${breakdown.items.length} items`}
          </span>
                </div>

                {/* Customer Information */}
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

                {/* Multi-Load Basket Splitter */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-3">
                    <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-200">
                            <Layers className="w-4 h-4 text-sky-400" />
                            <span>Physical Baskets / Machine Loads</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <button
                                type="button"
                                onClick={() => setBasketCount((c) => Math.max(1, c - 1))}
                                className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center transition"
                            >
                                <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold text-sm text-white w-4 text-center">
                {basketCount}
              </span>
                            <button
                                type="button"
                                onClick={() => setBasketCount((c) => Math.min(6, c + 1))}
                                className="w-7 h-7 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg flex items-center justify-center transition"
                            >
                                <Plus className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    </div>

                    {breakdown.totalWeightKg > DRUM_CAPACITY_KG && (
                        <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded-lg">
                            Weight ({breakdown.totalWeightKg}kg) exceeds 8kg drum limit. Splitting into {basketCount} physical loads recommended.
                        </p>
                    )}

                    {/* Sub-baskets preview tags */}
                    <div className="flex flex-wrap gap-1.5">
                        {subBaskets.map((b) => (
                            <span
                                key={b.tag}
                                className="px-2 py-1 bg-slate-900 border border-slate-800 text-[11px] font-mono rounded-lg text-slate-300"
                            >
                <strong>{b.tag}</strong> ({b.weightKg} kg)
              </span>
                        ))}
                    </div>
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
                        <span>Confirm & Print Receipt ({basketCount} {basketCount === 1 ? 'Basket' : 'Baskets'})</span>
                    )}
                </button>
            </div>
        </div>
    );
}