'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useCartStore } from '@/features/pos/store/useCartStore';
import { useAuthStore } from '@/features/auth/store/useAuthStore';
import { formatPHP } from '@/lib/formatters';
import { TouchNumpad } from '@/components/ui/TouchNumpad';
import {
    X,
    CreditCard,
    Banknote,
    Truck,
    PackageCheck,
    CheckCircle2,
    AlertCircle,
    AlertTriangle,
    Loader2,
    Receipt,
    User,
    Phone,
    Zap,
    ShieldAlert,
    ChevronDown,
    ChevronUp,
    Sparkles,
} from 'lucide-react';

interface CheckoutModalProps {
    storeId?: string | null;
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (orderNumber: string) => void;
}

const COMMON_INSPECTION_TAGS = [
    'Pre-existing Tear',
    'Color Bleed Risk',
    'Deep Stain / Collar',
    'Missing / Loose Button',
    'Delicate Fabric',
];

const isUUID = (val?: string | null): boolean =>
    Boolean(val && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val));

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
    const [isPartialDeposit, setIsPartialDeposit] = useState<boolean>(false);
    const [deliveryMode, setDeliveryMode] = useState<'pickup' | 'delivery'>('pickup');
    const [deliveryAddress, setDeliveryAddress] = useState('');
    const [cashTendered, setCashTendered] = useState<string>('');
    const [activeNumpadField, setActiveNumpadField] = useState<'cash' | 'mobile' | null>(null);
    const [storageLocation, setStorageLocation] = useState('');
    const [isRush, setIsRush] = useState(false);
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    if (!isOpen) return null;

    const RUSH_SURCHARGE = 80;
    const payable = breakdown.netPayable + (isRush ? RUSH_SURCHARGE : 0);
    const tenderedNum = parseFloat(cashTendered) || 0;
    const changeDue = Math.max(0, tenderedNum - payable);

    // Short payment detection
    const isShortPayment =
        paymentMethod === 'cash' &&
        paymentStatus === 'paid' &&
        tenderedNum > 0 &&
        tenderedNum < payable;

    const shortageAmount = Math.max(0, payable - tenderedNum);

    const isZeroCashTendered =
        paymentMethod === 'cash' &&
        paymentStatus === 'paid' &&
        tenderedNum === 0;

    const toggleTag = (tag: string) => {
        setSelectedTags((prev) =>
            prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
        );
    };

    const handleCashTenderedChange = (val: string) => {
        setCashTendered(val);
        const num = parseFloat(val) || 0;
        if (num >= payable) {
            setIsPartialDeposit(false);
        }
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
            setErrorMessage('Please provide customer name and mobile number.');
            return;
        }

        if (paymentMethod === 'cash' && paymentStatus === 'paid' && !isPartialDeposit && tenderedNum < payable) {
            setErrorMessage(
                `Kulang ang bayad: Total is ${formatPHP(payable)}, received ${formatPHP(tenderedNum)}. Kulang ng ${formatPHP(shortageAmount)}.`
            );
            return;
        }

        setLoading(true);
        const supabase = createClient();

        try {
            let customerId: string | null = null;
            const cleanMobile = customerMobile.trim();
            const cleanName = customerName.trim();

            const { data: existingCustomer } = await supabase
                .from('customers')
                .select('id')
                .eq('store_id', effectiveStoreId)
                .eq('mobile_number', cleanMobile)
                .maybeSingle();

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

                if (custError || !newCustomer) throw new Error(custError?.message || 'Failed to register customer.');
                customerId = newCustomer.id;
            }

            const cleanBasketTag = basketTag?.trim() || `B-${Math.floor(100 + Math.random() * 900)}`;
            const orderNumber = cleanBasketTag.toUpperCase();
            const calculatedDiscount =
                (breakdown as any).discount ?? Math.max(0, breakdown.subtotal - breakdown.netPayable);

            const isCashierUuid = isUUID(user?.id);

            const orderNotes: string[] = [];
            if (notes) orderNotes.push(notes);
            if (isPartialDeposit) {
                orderNotes.push(
                    `PARTIAL DEPOSIT (ABONO): Received ${formatPHP(tenderedNum)} cash. BALANCE DUE ON CLAIM: ${formatPHP(shortageAmount)}.`
                );
            }

            const effectivePaymentStatus = isPartialDeposit ? 'unpaid' : paymentStatus;

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
                    special_notes: orderNotes,
                    special_handling_tags: selectedTags,
                    subtotal: breakdown.subtotal,
                    delivery_fee: 0,
                    discount: calculatedDiscount || 0,
                    is_rush: isRush,
                    rush_fee: isRush ? RUSH_SURCHARGE : 0,
                    net_payable: payable,
                    payment_status: effectivePaymentStatus,
                    payment_method: paymentMethod,
                    cashier_id: isCashierUuid ? user?.id : null,
                })
                .select('id, order_number')
                .single();

            if (orderError || !orderData) throw new Error(orderError?.message || 'Failed to create order.');

            const orderItemsPayload = breakdown.items.map((item) => ({
                order_id: orderData.id,
                catalog_item_id: isUUID(item.id) ? item.id : null,
                item_name: item.name,
                pricing_type: item.pricingType || (item as any).pricing_type || 'per_piece',
                unit_price: item.unitPrice ?? (item as any).unit_price ?? 0,
                quantity: item.quantity ?? 1,
                billable_quantity: item.quantity ?? 1,
                item_total: item.itemTotal ?? ((item.unitPrice ?? 0) * (item.quantity ?? 1)),
            }));

            const { error: itemsError } = await supabase.from('order_items').insert(orderItemsPayload);
            if (itemsError) throw new Error(`Failed to save line items: ${itemsError.message}`);

            try {
                await supabase.from('order_baskets').insert({
                    order_id: orderData.id,
                    store_id: effectiveStoreId,
                    basket_tag: cleanBasketTag,
                    status: 'received',
                });
            } catch {}

            clearCart();
            onSuccess(orderData.order_number);
            onClose();
        } catch (err: any) {
            setErrorMessage(err.message || 'Error processing transaction.');
        } finally {
            setLoading(false);
        }
    };

    const isSubmitBlocked =
        loading ||
        (paymentMethod === 'cash' && paymentStatus === 'paid' && !isPartialDeposit && tenderedNum < payable);

    return (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 select-none animate-in fade-in duration-150">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col h-full max-h-[calc(100dvh-1.5rem)] sm:max-h-[680px] overflow-hidden">

                {/* ======================================================== */}
                {/* PINNED TOP HEADER: Visible on Desktop & Mobile Viewports  */}
                {/* ======================================================== */}
                <div className="flex-shrink-0 bg-slate-950 border-b border-slate-800">
                    {/* Top Dialog Bar */}
                    <div className="px-4 py-2.5 sm:px-5 sm:py-3 flex justify-between items-center border-b border-slate-800/80">
                        <div className="flex items-center space-x-2">
                            <Receipt className="w-4 h-4 sm:w-5 sm:h-5 text-sky-400" />
                            <div>
                                <h2 className="font-bold text-xs sm:text-sm text-white">Finalize Transaction</h2>
                                <span className="text-[10px] font-mono font-bold text-sky-400 uppercase">
                  Ticket #{basketTag}
                </span>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center transition active:scale-95"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Total Due & Customer Name Bar */}
                    <div className="p-3 sm:p-3.5 space-y-2.5 bg-slate-950/95">
                        {/* Total Due Row */}
                        <div className="flex justify-between items-center px-0.5">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                    Total Payable ({breakdown.items.length} items)
                                </p>
                                {isRush && (
                                    <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 mt-0.5">
                    <Zap className="w-2.5 h-2.5" /> Priority Express (+₱80)
                  </span>
                                )}
                            </div>
                            <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                {formatPHP(payable)}
              </span>
                        </div>

                        {/* Customer Name Input */}
                        <div className="space-y-1">
                            <div className="flex justify-between items-center px-0.5">
                                <label className="text-[10px] sm:text-[11px] font-bold text-slate-300 uppercase tracking-wide flex items-center gap-1">
                                    <User className="w-3 h-3 text-sky-400" /> Customer Name:
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setCustomer('Walk-in Customer', customerMobile || '09000000000')}
                                    className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-[10px] font-bold text-sky-300 border border-slate-700 transition active:scale-95"
                                >
                                    + Walk-in
                                </button>
                            </div>

                            <input
                                type="text"
                                required
                                placeholder="Type Customer Name (e.g. Maria Santos)"
                                value={customerName}
                                onChange={(e) => setCustomer(e.target.value, customerMobile)}
                                className="w-full min-h-[42px] bg-slate-900 border border-slate-700 focus:border-sky-500 rounded-xl px-3 py-1.5 text-xs sm:text-sm font-semibold text-white placeholder-slate-500 focus:outline-none transition shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                {/* ======================================================== */}
                {/* SCROLLABLE BODY: Secondary Fields & Payment Inputs        */}
                {/* ======================================================== */}
                <form onSubmit={handlePlaceOrder} className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-3.5">
                    {errorMessage && (
                        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span>{errorMessage}</span>
                        </div>
                    )}

                    {/* Customer Mobile # */}
                    <div className="space-y-1">
                        <label className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase flex justify-between px-0.5">
                            <span>Customer Mobile #</span>
                            <span className="text-[10px] text-sky-400 font-normal">Tap to edit</span>
                        </label>
                        <div
                            onClick={() => setActiveNumpadField(activeNumpadField === 'mobile' ? null : 'mobile')}
                            className={`w-full min-h-[44px] bg-slate-950 border rounded-xl pl-9 pr-3 py-2 flex items-center justify-between cursor-pointer transition relative ${
                                activeNumpadField === 'mobile' ? 'border-sky-500 bg-sky-500/5' : 'border-slate-800'
                            }`}
                        >
                            <Phone className="w-4 h-4 absolute left-3 text-slate-500" />
                            <span className="font-mono text-xs sm:text-sm text-white">
                {customerMobile || <span className="text-slate-500">0917...</span>}
              </span>
                            {activeNumpadField === 'mobile' ? (
                                <ChevronUp className="w-4 h-4 text-sky-400" />
                            ) : (
                                <ChevronDown className="w-4 h-4 text-slate-500" />
                            )}
                        </div>
                    </div>

                    {/* Embedded Touch Numpad for Mobile Input */}
                    {activeNumpadField === 'mobile' && (
                        <div className="p-3 bg-slate-950 border border-slate-800 rounded-2xl animate-in fade-in duration-150">
                            <div className="flex justify-between items-center mb-2 px-1">
                                <span className="text-xs font-bold text-slate-300">Customer Mobile Pad</span>
                                <button
                                    type="button"
                                    onClick={() => setActiveNumpadField(null)}
                                    className="text-xs text-sky-400 font-bold"
                                >
                                    Done
                                </button>
                            </div>
                            <TouchNumpad
                                value={customerMobile}
                                onChange={(val) => setCustomer(customerName, val)}
                                onEnter={() => setActiveNumpadField(null)}
                                allowDecimal={false}
                                maxLength={11}
                                enterLabel="Confirm Mobile"
                            />
                        </div>
                    )}

                    {/* Payment Terms & Method */}
                    <div className="space-y-2 pt-1 border-t border-slate-800">
                        <div className="flex justify-between items-center">
                            <label className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase">Payment Terms</label>
                            <div className="flex items-center space-x-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentStatus('paid');
                                        setIsPartialDeposit(false);
                                    }}
                                    className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                                        paymentStatus === 'paid' && !isPartialDeposit
                                            ? 'bg-emerald-500 text-slate-950'
                                            : 'text-slate-400'
                                    }`}
                                >
                                    Paid Now
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setPaymentStatus('unpaid');
                                        setIsPartialDeposit(false);
                                    }}
                                    className={`min-h-[36px] px-2.5 rounded-lg text-xs font-bold transition active:scale-95 ${
                                        paymentStatus === 'unpaid' && !isPartialDeposit
                                            ? 'bg-amber-500 text-slate-950'
                                            : 'text-slate-400'
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
                                className={`min-h-[44px] py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition active:scale-95 ${
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
                                className={`min-h-[44px] py-2 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition active:scale-95 ${
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

                    {/* Cash Calculations & Live Shortfall Handling */}
                    {paymentMethod === 'cash' && paymentStatus === 'paid' && (
                        <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-3 sm:p-3.5 space-y-2.5">
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-slate-300 font-bold uppercase">Cash Received</span>
                                <div
                                    onClick={() => setActiveNumpadField(activeNumpadField === 'cash' ? null : 'cash')}
                                    className={`cursor-pointer px-3.5 py-1.5 border rounded-xl font-mono text-sm sm:text-base font-black flex items-center gap-1.5 transition ${
                                        isShortPayment
                                            ? 'bg-rose-500/10 border-rose-500 text-rose-400'
                                            : 'bg-slate-900 border-slate-700 hover:border-sky-500 text-emerald-400'
                                    }`}
                                >
                                    <span>₱</span>
                                    <span>{cashTendered || '0.00'}</span>
                                </div>
                            </div>

                            {/* Quick Cash Presets */}
                            <div className="grid grid-cols-4 gap-1.5">
                                {[payable, Math.ceil(payable / 100) * 100, 500, 1000].map((amt, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => handleCashTenderedChange(amt.toString())}
                                        className="min-h-[42px] rounded-xl bg-slate-900 border border-slate-800 hover:border-sky-500/50 active:scale-95 font-mono text-xs font-bold text-slate-200 transition"
                                    >
                                        ₱{amt}
                                    </button>
                                ))}
                            </div>

                            {/* Touch Numpad Drawer for Cash Tendered */}
                            {activeNumpadField === 'cash' && (
                                <div className="pt-2 border-t border-slate-800/80 animate-in fade-in duration-150">
                                    <TouchNumpad
                                        value={cashTendered}
                                        onChange={handleCashTenderedChange}
                                        onEnter={() => setActiveNumpadField(null)}
                                        allowDecimal={true}
                                        maxLength={7}
                                        enterLabel="Done Entering Cash"
                                    />
                                </div>
                            )}

                            {/* Short Payment Interactive Banner */}
                            {isShortPayment && !isPartialDeposit && (
                                <div className="p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 space-y-2 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1.5">
                                            <AlertTriangle className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                            <span className="font-bold text-[11px] uppercase tracking-wide text-rose-400">
                        Kulang ang Bayad / Short
                      </span>
                                        </div>
                                        <span className="font-mono text-sm font-black text-rose-400">
                      - {formatPHP(shortageAmount)}
                    </span>
                                    </div>

                                    <p className="text-[10px] text-slate-300 leading-tight">
                                        Received {formatPHP(tenderedNum)} out of {formatPHP(payable)}.
                                    </p>

                                    <div className="grid grid-cols-2 gap-2 pt-0.5">
                                        <button
                                            type="button"
                                            onClick={() => handleCashTenderedChange(payable.toString())}
                                            className="min-h-[40px] px-2 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[11px] transition active:scale-95"
                                        >
                                            <span>Set Exact ({formatPHP(payable)})</span>
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setIsPartialDeposit(true)}
                                            className="min-h-[40px] px-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] transition active:scale-95 shadow-md"
                                        >
                                            <span>Bayad Partial (Abono)</span>
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Confirmed Partial Deposit Mode */}
                            {isPartialDeposit && (
                                <div className="p-3 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-300 space-y-1.5 animate-in fade-in">
                                    <div className="flex items-center justify-between">
                    <span className="font-bold text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Downpayment (Abono) Mode
                    </span>
                                        <button
                                            type="button"
                                            onClick={() => setIsPartialDeposit(false)}
                                            className="text-[10px] text-slate-400 hover:text-white underline font-mono"
                                        >
                                            Cancel
                                        </button>
                                    </div>
                                    <div className="text-xs space-y-0.5 font-mono">
                                        <div className="flex justify-between text-slate-300">
                                            <span>Deposit Paid Now:</span>
                                            <strong className="text-white">{formatPHP(tenderedNum)}</strong>
                                        </div>
                                        <div className="flex justify-between text-amber-400 font-bold">
                                            <span>Balance Due on Claim:</span>
                                            <span>{formatPHP(shortageAmount)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Normal Change Due Display */}
                            {!isShortPayment && !isPartialDeposit && (
                                <div className="flex justify-between items-baseline pt-1.5 border-t border-slate-800/80">
                                    <span className="text-[11px] text-slate-400 font-semibold uppercase">Change Due</span>
                                    <span className="font-mono text-lg font-black text-sky-400">
                    {formatPHP(changeDue)}
                  </span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pre-Wash Garment Inspection Checklist */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase flex items-center gap-1">
                            <ShieldAlert className="w-3 h-3 text-amber-400" /> Pre-Wash Garment Inspection
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {COMMON_INSPECTION_TAGS.map((tag) => {
                                const isSelected = selectedTags.includes(tag);
                                return (
                                    <button
                                        key={tag}
                                        type="button"
                                        onClick={() => toggleTag(tag)}
                                        className={`min-h-[38px] px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition active:scale-95 ${
                                            isSelected
                                                ? 'bg-amber-500/20 border-amber-400 text-amber-300'
                                                : 'bg-slate-950 border-slate-800 text-slate-400'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rush / Express Surcharge Toggle */}
                    <div
                        onClick={() => setIsRush(!isRush)}
                        className="min-h-[46px] flex items-center justify-between p-2.5 rounded-2xl bg-slate-950 border border-slate-800 cursor-pointer active:scale-98 transition"
                    >
                        <div className="flex items-center space-x-2">
                            <Zap className={`w-3.5 h-3.5 ${isRush ? 'text-amber-400' : 'text-slate-500'}`} />
                            <div>
                                <p className="text-xs font-bold text-white">Express / Rush Turnaround (+₱80)</p>
                                <p className="text-[10px] text-slate-400">Guaranteed 4-to-6 hour priority turnaround</p>
                            </div>
                        </div>
                        <input
                            type="checkbox"
                            checked={isRush}
                            onChange={() => {}}
                            className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                        />
                    </div>

                    {/* Fulfillment Mode */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] sm:text-[11px] text-slate-400 font-semibold uppercase">Fulfillment Mode</label>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setDeliveryMode('pickup')}
                                className={`min-h-[44px] py-1.5 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition active:scale-95 ${
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
                                className={`min-h-[44px] py-1.5 px-3 rounded-xl border flex items-center justify-center space-x-2 text-xs font-bold transition active:scale-95 ${
                                    deliveryMode === 'delivery'
                                        ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                                        : 'bg-slate-950 border-slate-800 text-slate-400'
                                }`}
                            >
                                <Truck className="w-4 h-4" />
                                <span>Doorstep Delivery</span>
                            </button>
                        </div>
                    </div>
                </form>

                {/* ======================================================== */}
                {/* PINNED BOTTOM SUBMIT BUTTON                              */}
                {/* ======================================================== */}
                <div className="p-3 sm:p-3.5 bg-slate-950 border-t border-slate-800 flex-shrink-0">
                    <button
                        type="button"
                        onClick={handlePlaceOrder}
                        disabled={isSubmitBlocked}
                        className={`w-full min-h-[48px] sm:min-h-[52px] h-12 font-bold text-xs sm:text-sm rounded-2xl flex items-center justify-center space-x-2 transition shadow-xl active:scale-98 ${
                            isPartialDeposit
                                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                                : isShortPayment
                                    ? 'bg-rose-500/20 border border-rose-500/40 text-rose-300 cursor-not-allowed opacity-90'
                                    : isZeroCashTendered
                                        ? 'bg-slate-800 text-slate-400 cursor-not-allowed'
                                        : 'bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 disabled:opacity-40'
                        }`}
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" />
                                <span>Registering Ticket #{basketTag}...</span>
                            </>
                        ) : isPartialDeposit ? (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>
                  Confirm Deposit {formatPHP(tenderedNum)} ({formatPHP(shortageAmount)} on Claim)
                </span>
                            </>
                        ) : isShortPayment ? (
                            <>
                                <AlertTriangle className="w-4 h-4 text-rose-400" />
                                <span>Kulang ng {formatPHP(shortageAmount)} (Select Action Above)</span>
                            </>
                        ) : isZeroCashTendered ? (
                            <>
                                <span>Enter Cash Received ({formatPHP(payable)})</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 className="w-4 h-4" />
                                <span>Confirm & Print Order ({formatPHP(payable)})</span>
                            </>
                        )}
                    </button>
                </div>

            </div>
        </div>
    );
}