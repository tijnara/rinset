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
    AlertTriangle,
    Bike,
} from 'lucide-react';

interface CheckoutModalProps {
    storeId: string;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderNumber: string) => void;
}

const DRUM_CAPACITY_KG = 8;
const WAIVER_TAGS = [
    'Existing Tear / Punit',
    'Heavy Stains / Mancha',
    'Color Bleed Risk / Hawa',
    'Waived Sorting (Mix)',
];

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

    // New Operational States
    const [specialNotes, setSpecialNotes] = useState<string[]>([]);
    const [deliveryMode, setDeliveryMode] = useState<'walk_in' | 'delivery'>('walk_in');
    const [deliveryAddress, setDeliveryAddress] = useState<string>('');
    const [deliveryFee, setDeliveryFee] = useState<number>(0);

    const finalPayable = breakdown.netPayable + (deliveryMode === 'delivery' ? deliveryFee : 0);

    const recommendedBaskets =
        breakdown.totalWeightKg > DRUM_CAPACITY_KG
            ? Math.ceil(breakdown.totalWeightKg / DRUM_CAPACITY_KG)
            : 1;

    const [basketCount, setBasketCount] = useState<number>(1);

    useEffect(() => {
        setCashTendered(finalPayable);
        setBasketCount(recommendedBaskets);
    }, [finalPayable, recommendedBaskets]);

    if (!isOpen) return null;

    const paymentCalc = calculatePayment(
        finalPayable,
        paymentType === 'cash' ? cashTendered : 0,
        paymentType === 'gcash' ? finalPayable : 0
    );

    const baseTag = basketTag.trim() || `B-${Math.floor(100 + Math.random() * 900)}`;
    const subBaskets = Array.from({ length: basketCount }, (_, index) => {
        const letter = String.fromCharCode(65 + index);
        const weightPerBasket =
            basketCount === 1
                ? breakdown.totalWeightKg
                : Math.round((breakdown.totalWeightKg / basketCount) * 10) / 10;
        return {
            tag: basketCount > 1 ? `${baseTag}-${letter}` : baseTag,
            weightKg: weightPerBasket,
        };
    });

    const toggleNote = (note: string) => {
        setSpecialNotes((prev) =>
            prev.includes(note) ? prev.filter((n) => n !== note) : [...prev, note]
        );
    };

    const handleCompleteCheckout = async () => {
        if (!customerName.trim()) {
            setErrorMsg('Customer name is required.');
            return;
        }
        if (deliveryMode === 'delivery' && !deliveryAddress.trim()) {
            setErrorMsg('Delivery address is required for dispatch.');
            return;
        }

        setIsSubmitting(true);
        setErrorMsg(null);
        const supabase = createClient();

        try {
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

            const orderNumber = `RNS-${Math.floor(1000 + Math.random() * 9000)}`;
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
                    net_payable: finalPayable,
                    total_paid: isPaid ? finalPayable : 0,
                    special_notes: specialNotes,
                    delivery_mode: deliveryMode,
                    delivery_address: deliveryMode === 'delivery' ? deliveryAddress : null,
                    delivery_fee: deliveryMode === 'delivery' ? deliveryFee : 0,
                })
                .select('id')
                .single();

            if (orderErr) throw orderErr;

            const basketsPayload = subBaskets.map((b) => ({
                order_id: orderData.id,
                basket_tag: b.tag,
                weight_kg: b.weightKg,
                status: 'received',
            }));
            const { error: basketsErr } = await supabase.from('order_baskets').insert(basketsPayload);
            if (basketsErr) throw basketsErr;

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

            if (isPaid) {
                const { error: payErr } = await supabase.from('payments').insert({
                    order_id: orderData.id,
                    payment_method: paymentType === 'cash' ? 'cash' : 'gcash',
                    amount: finalPayable,
                    tendered_amount: paymentType === 'cash' ? cashTendered : finalPayable,
                    change_amount: paymentType === 'cash' ? paymentCalc.changeDue : 0,
                    reference_number: paymentType === 'gcash' ? gcashRef : null,
                });
                if (payErr) throw payErr;
            }

            clearCart();
            setSpecialNotes([]);
            setDeliveryMode('walk_in');
            setDeliveryFee(0);
            onSuccess(orderNumber);
            onClose();
        } catch (err: unknown) {
            console.error('Checkout error:', err);
            setErrorMsg(err instanceof Error ? err.message : 'Checkout failed');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150">
            <div className="w-full sm:max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl flex flex-col space-y-4 max-h-[92vh] overflow-y-auto">
                <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                        <Receipt className="w-5 h-5 text-sky-400" />
                        <h3 className="font-bold text-white text-base">Checkout & Dispatch</h3>
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
              {formatPHP(finalPayable)}
            </span>
                    </div>
                    <span className="text-xs font-mono text-slate-400">
            {breakdown.totalWeightKg > 0 ? `${breakdown.totalWeightKg.toFixed(2)} kg total` : `${breakdown.items.length} items`}
          </span>
                </div>

                {/* Customer & Delivery Toggle */}
                <div className="space-y-3 bg-slate-950/70 border border-slate-800/80 p-3.5 rounded-2xl">
                    <div className="flex justify-between items-center">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-sky-400" /> Customer & Dispatch
            </span>
                        <div className="flex bg-slate-900 border border-slate-700 rounded-lg p-0.5">
                            <button
                                type="button"
                                onClick={() => setDeliveryMode('walk_in')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${
                                    deliveryMode === 'walk_in' ? 'bg-sky-500 text-slate-950' : 'text-slate-400'
                                }`}
                            >
                                Walk-in
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryMode('delivery')}
                                className={`px-3 py-1 text-[10px] font-bold rounded-md transition flex items-center gap-1 ${
                                    deliveryMode === 'delivery' ? 'bg-indigo-500 text-white' : 'text-slate-400'
                                }`}
                            >
                                <Bike className="w-3 h-3" /> Delivery
                            </button>
                        </div>
                    </div>

                    <CustomerAutocomplete
                        customerName={customerName}
                        customerMobile={customerMobile}
                        onSelect={(name, mobile) => setCustomer(name, mobile)}
                        onNameChange={(name) => setCustomer(name, customerMobile)}
                        onMobileChange={(mobile) => setCustomer(customerName, mobile)}
                    />

                    {deliveryMode === 'delivery' && (
                        <div className="pt-2 border-t border-slate-800 grid grid-cols-3 gap-2">
                            <div className="col-span-2">
                                <label className="text-[10px] font-bold text-slate-400">Delivery Address</label>
                                <input
                                    type="text"
                                    placeholder="Street name, Brgy, Landmarks..."
                                    value={deliveryAddress}
                                    onChange={(e) => setDeliveryAddress(e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-bold text-slate-400">Delivery Fee (₱)</label>
                                <input
                                    type="number"
                                    value={deliveryFee || ''}
                                    onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-xs text-white font-mono focus:border-indigo-500 focus:outline-none text-right"
                                />
                            </div>
                        </div>
                    )}
                </div>

                {/* Intake Conditions & Liability Waivers */}
                <div className="bg-slate-950 border border-slate-800 p-3.5 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400">
                        <AlertTriangle className="w-4 h-4" />
                        <span>Intake Condition & Liability Waivers</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {WAIVER_TAGS.map((tag) => {
                            const isActive = specialNotes.includes(tag);
                            return (
                                <button
                                    key={tag}
                                    type="button"
                                    onClick={() => toggleNote(tag)}
                                    className={`p-2 rounded-xl text-[10px] font-semibold text-left border transition ${
                                        isActive
                                            ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                                            : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-600'
                                    }`}
                                >
                                    {tag}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Payment Selectors */}
                <div className="space-y-1.5">
                    <label className="text-xs text-slate-400 block font-semibold">Payment Option:</label>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            type="button"
                            onClick={() => setPaymentType('cash')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'cash' ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold' : 'bg-slate-800/40 border-slate-800 text-slate-400'
                            }`}
                        >
                            <Banknote className="w-4 h-4" />
                            <span className="text-xs">Cash</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentType('gcash')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'gcash' ? 'bg-sky-500/10 border-sky-500 text-sky-400 font-bold' : 'bg-slate-800/40 border-slate-800 text-slate-400'
                            }`}
                        >
                            <Smartphone className="w-4 h-4" />
                            <span className="text-xs">GCash</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setPaymentType('pay_on_claim')}
                            className={`p-2.5 rounded-xl border flex flex-col items-center justify-center space-y-1 transition ${
                                paymentType === 'pay_on_claim' ? 'bg-amber-500/10 border-amber-500 text-amber-400 font-bold' : 'bg-slate-800/40 border-slate-800 text-slate-400'
                            }`}
                        >
                            <Clock className="w-4 h-4" />
                            <span className="text-xs">Pay on Claim</span>
                        </button>
                    </div>
                </div>

                {/* Cash Tender */}
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
                            {[finalPayable, 100, 200, 500, 1000].filter((v, i, arr) => arr.indexOf(v) === i && v >= finalPayable).slice(0, 4).map((bill) => (
                                <button
                                    key={bill}
                                    type="button"
                                    onClick={() => setCashTendered(bill)}
                                    className="py-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 text-xs font-mono rounded-lg text-slate-200 transition"
                                >
                                    ₱{bill}
                                </button>
                            ))}
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex justify-between items-center font-mono text-sm">
                            <span className="text-slate-400 text-xs">Change Due:</span>
                            <span className={`font-bold text-base ${paymentCalc.changeDue >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {formatPHP(paymentCalc.changeDue)}
              </span>
                        </div>
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
                    disabled={isSubmitting || !customerName.trim() || (paymentType === 'cash' && cashTendered < finalPayable)}
                    className="w-full h-13 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 active:bg-sky-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 shadow-lg transition"
                >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <span>Confirm & Print Receipt</span>}
                </button>
            </div>
        </div>
    );
}