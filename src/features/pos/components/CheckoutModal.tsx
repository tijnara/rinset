'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/features/pos/store/useCartStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { formatPHP } from '@/lib/formatters';
import {
    X,
    CreditCard,
    Banknote,
    Truck,
    PackageCheck,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Receipt,
    User,
    Phone,
} from 'lucide-react';

interface CheckoutModalProps {
    storeId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderNumber: string) => void;
}

export function CheckoutModal({
                                  storeId: propStoreId,
                                  isOpen,
                                  onClose,
                                  onSuccess,
                              }: CheckoutModalProps) {
    const authStoreId = useAuthStore((state) => state.storeId);
    const user = useAuthStore((state) => state.user);

    const {
        customerName,
        customerMobile,
        basketTag,
        notes,
        getBreakdown,
        clearCart,
        setCustomer,
    } = useCartStore();

    const breakdown = getBreakdown();

    const [paymentMethod, setPaymentMethod] = useState<'cash' | 'gcash'>('cash');
    const [paymentStatus, setPaymentStatus] = useState<'paid' | 'unpaid'>('paid');
    const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('pickup');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [cashTendered, setCashTendered] = useState<string>('');
    const [storageLocation, setStorageLocation] = useState('');
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const payable = breakdown.netPayable;
    const tenderedNum = parseFloat(cashTendered) || 0;
    const changeDue = Math.max(0, tenderedNum - payable);

    const handleQuickCash = (amount: number) => {
        setCashTendered(amount.toString());
    };

    const handlePlaceOrder = async (e: React.FormEvent) => {
        e.preventDefault();
        setErrorMessage(null);

        const effectiveStoreId = propStoreId || authStoreId;
        if (!effectiveStoreId) {
            setErrorMessage('Store session error: No active store identified.');
            return;
        }

        if (!customerName.trim() || !customerMobile.trim()) {
            setErrorMessage('Please provide the customer name and contact mobile number.');
            return;
        }

        if (paymentMethod === 'cash' && paymentStatus === 'paid' && tenderedNum < payable) {
            setErrorMessage(
                `Insufficient cash tendered. Total is ${formatPHP(payable)}, received ${formatPHP(tenderedNum)}.`
            );
            return;
        }

        setLoading(true);
        const supabase = createClient();

        try {
            // 1. Discover or create customer scoped to store_id (uses full_name and mobile_number)
            let customerId: string | null = null;
            const cleanMobile = customerMobile.trim();
            const cleanName = customerName.trim();

            const { data: existingCustomer, error: searchError } = await supabase
                .from('customers')
                .select('id')
                .eq('store_id', effectiveStoreId)
                .eq('mobile_number', cleanMobile)
                .maybeSingle();

            if (searchError) {
                console.error('[Customer Search Error]', searchError);
            }

            if (existingCustomer) {
                customerId = existingCustomer.id;
            } else {
                const { data: newCustomer, error: custError } = await supabase
                    .from('customers')
                    .insert({
                        store_id: effectiveStoreId,
                        full_name: cleanName,
                        mobile_number: cleanMobile,
                        address: deliveryAddress.trim() || null,
                    })
                    .select('id')
                    .single();

                if (custError || !newCustomer) {
                    throw new Error(custError?.message || 'Failed to register customer record.');
                }

                customerId = newCustomer.id;
            }

            // 2. Determine unique Order Number / Ticket Tag
            const cleanBasketTag = basketTag?.trim() || `B-${Math.floor(100 + Math.random() * 900)}`;
            const orderNumber = cleanBasketTag.toUpperCase();

            const calculatedDiscount =
                (breakdown as any).discount ?? Math.max(0, breakdown.subtotal - breakdown.netPayable);

            // Validate cashier_id UUID format
            const isCashierUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
                user?.id || ''
            );

            // 3. Insert into orders table with store_id and basket_tag
            const { data: orderData, error: orderError } = await supabase
                .from('orders')
                .insert({
                    store_id: effectiveStoreId,
                    order_number: orderNumber,
                    basket_tag: cleanBasketTag,
                    customer_id: customerId,
                    customer_name: cleanName,
                    customer_mobile: cleanMobile,
                    status: 'received',
                    delivery_mode: deliveryMode,
                    delivery_address: deliveryMode === 'delivery' ? deliveryAddress.trim() : null,
                    storage_location: storageLocation.trim() || null,
                    special_notes: notes ? [notes] : [],
                    subtotal: breakdown.subtotal,
                    delivery_fee: 0,
                    discount: calculatedDiscount || 0,
                    net_payable: breakdown.netPayable,
                    payment_status: paymentStatus,
                    payment_method: paymentMethod,
                    cashier_id: isCashierUuid ? user?.id : null,
                })
                .select('id, order_number')
                .single();

            if (orderError || !orderData) {
                console.error('[Order Insert Error Details]', orderError);
                throw new Error(orderError?.message || 'Failed to register order record.');
            }

            // 4. Insert order line items
            const orderItemsPayload = breakdown.items.map((item) => ({
                order_id: orderData.id,
                catalog_item_id: item.id && item.id.includes('-') ? item.id : null,
                item_name: item.name,
                pricing_type: item.pricingType,
                unit_price: item.unitPrice,
                quantity: item.quantity,
                billable_quantity: item.quantity,
                item_total: item.itemTotal,
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItemsPayload);

            if (itemsError) {
                throw new Error(`Failed to save line items: ${itemsError.message}`);
            }

            // 5. Insert physical basket tracker with store_id
            try {
                await supabase.from('order_baskets').insert({
                    order_id: orderData.id,
                    store_id: effectiveStoreId,
                    basket_tag: cleanBasketTag,
                    status: 'received',
                });
            } catch (basketErr) {
                console.warn('[Order Basket Track Warning]', basketErr);
            }

            // 6. Complete & Reset
            clearCart();
            onSuccess(orderData.order_number);
            onClose();
        } catch (err: any) {
            console.error('[Transaction Error]', err);
            setErrorMessage(err.message || 'Error processing transaction.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 select-none animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
                {/* Header */}
                <div className="px-5 py-3.5 border-b border-slate-800 flex justify-between items-center bg-slate-950/70">
                    <div className="flex items-center space-x-2">
                        <Receipt className="w-5 h-5 text-sky-400" />
                        <h2 className="font-bold text-base text-white">Finalize Transaction</h2>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handlePlaceOrder} className="flex-1 overflow-y-auto p-5 space-y-4">
                    {errorMessage && (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Ticket Total Summary */}
                    <div className="bg-slate-950 border border-slate-800/90 rounded-2xl p-4 flex justify-between items-center">
                        <div>
                            <p className="text-[11px] text-slate-400 uppercase font-bold tracking-wider">
                                Total Due ({breakdown.items.length} items)
                            </p>
                            <p className="text-xs font-mono text-sky-400 mt-0.5">
                                Tag: <span className="font-bold uppercase text-white">{basketTag}</span>
                            </p>
                        </div>
                        <div className="text-right">
              <span className="font-mono text-2xl font-black text-emerald-400">
                {formatPHP(payable)}
              </span>
                        </div>
                    </div>

                    {/* Customer Details Confirmation */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-semibold uppercase">Customer</label>
                            <div className="relative">
                                <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="Customer Name"
                                    value={customerName}
                                    onChange={(e) => setCustomer(e.target.value, customerMobile)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none"
                                />
                            </div>
                        </div>
                        <div className="space-y-1">
                            <label className="text-[11px] text-slate-400 font-semibold uppercase">Mobile #</label>
                            <div className="relative">
                                <Phone className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-500" />
                                <input
                                    type="text"
                                    required
                                    placeholder="0917..."
                                    value={customerMobile}
                                    onChange={(e) => setCustomer(customerName, e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none font-mono"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Delivery vs Store Pickup Toggle */}
                    <div className="space-y-1.5">
                        <label className="text-[11px] text-slate-400 font-semibold uppercase">Fulfillment Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setDeliveryMode('pickup')}
                                className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                                    deliveryMode === 'pickup'
                                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                            >
                                <PackageCheck className="w-4 h-4" />
                                <span>Store Pickup</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setDeliveryMode('delivery')}
                                className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                                    deliveryMode === 'delivery'
                                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                            >
                                <Truck className="w-4 h-4" />
                                <span>Doorstep Delivery</span>
                            </button>
                        </div>
                        {deliveryMode === 'delivery' && (
                            <input
                                type="text"
                                placeholder="Dropoff Delivery Address"
                                value={deliveryAddress}
                                onChange={(e) => setDeliveryAddress(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none mt-1"
                            />
                        )}
                    </div>

                    {/* Payment Method & Status */}
                    <div className="space-y-2 pt-2 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                            <label className="text-[11px] text-slate-400 font-semibold uppercase">Payment Method</label>
                            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => setPaymentStatus('paid')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                        paymentStatus === 'paid'
                                            ? 'bg-emerald-500 text-slate-950'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Paid Now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setPaymentStatus('unpaid')}
                                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                                        paymentStatus === 'unpaid'
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'text-slate-400 hover:text-white'
                                    }`}
                                >
                                    Pay on Claim
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('cash')}
                                className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                                    paymentMethod === 'cash'
                                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                            >
                                <Banknote className="w-4 h-4" />
                                <span>Cash Payment</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setPaymentMethod('gcash')}
                                className={`py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition ${
                                    paymentMethod === 'gcash'
                                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                            >
                                <CreditCard className="w-4 h-4" />
                                <span>GCash / QR</span>
                            </button>
                        </div>
                    </div>

                    {/* Cash Calculation */}
                    {paymentMethod === 'cash' && paymentStatus === 'paid' && (
                        <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-300 font-medium">Cash Received</span>
                                <div className="relative w-36">
                                    <span className="absolute left-3 top-2 text-xs font-mono text-slate-500">₱</span>
                                    <input
                                        type="number"
                                        step="any"
                                        placeholder="0.00"
                                        value={cashTendered}
                                        onChange={(e) => setCashTendered(e.target.value)}
                                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-7 pr-3 py-1.5 text-right font-mono text-sm font-bold text-white focus:border-sky-500 focus:outline-none"
                                    />
                                </div>
                            </div>

                            {/* Quick Cash Buttons */}
                            <div className="flex space-x-1.5 justify-end">
                                {[payable, Math.ceil(payable / 100) * 100, 500, 1000].map((amt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleQuickCash(amt)}
                                        className="px-2 py-1 bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-lg font-mono text-[11px] text-slate-300"
                                    >
                                        ₱{amt}
                                    </button>
                                ))}
                            </div>

                            <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/80">
                                <span className="text-xs text-slate-400 font-semibold uppercase">Change Due</span>
                                <span className="font-mono text-base font-black text-sky-400">
                  {formatPHP(changeDue)}
                </span>
                            </div>
                        </div>
                    )}

                    {/* Storage Slot */}
                    <div className="space-y-1">
                        <label className="text-[11px] text-slate-400 font-semibold uppercase">
                            Storage Slot / Rack Shelf (Optional)
                        </label>
                        <input
                            type="text"
                            placeholder="e.g. Shelf B-2, Hanger Rack 4"
                            value={storageLocation}
                            onChange={(e) => setStorageLocation(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-sky-500 focus:outline-none font-mono"
                        />
                    </div>

                    {/* Submit Action */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 disabled:opacity-50 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-xl mt-4"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Registering Ticket #{basketTag}...</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirm & Print Order ({formatPHP(payable)})</span>
                            </>
                        )}
                    </button>
                </form>
            </div>
        </div>
    );
}