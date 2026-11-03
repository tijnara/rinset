'use client';

import { useCartStore } from '@/features/pos/store/useCartStore';
import { CustomerAutocomplete } from './CustomerAutocomplete';
import { formatPHP } from '@/lib/formatters';
import { Bubbles } from '@/components/icons/Bubbles';
import { ShoppingBag, Trash2, Plus, Minus, Tag, X } from 'lucide-react';

interface CartSidebarProps {
    isOpenOnMobile: boolean;
    onCloseMobile: () => void;
    onProceedCheckout: () => void;
}

export function CartSidebar({
                                isOpenOnMobile,
                                onCloseMobile,
                                onProceedCheckout,
                            }: CartSidebarProps) {
    const {
        customerName,
        customerMobile,
        basketTag,
        setCustomer,
        setBasketTag,
        updateQuantity,
        removeItem,
        getBreakdown,
    } = useCartStore();

    const breakdown = getBreakdown();

    return (
        <aside
            className={`w-full lg:w-96 bg-slate-900 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col ${
                isOpenOnMobile
                    ? 'fixed inset-0 z-50 lg:static bg-slate-900/98 backdrop-blur'
                    : 'hidden lg:flex'
            }`}
        >
            {/* Header */}
            <div className="h-14 px-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-sky-400" />
                    <h2 className="font-bold text-base text-white">Active Ticket</h2>
                    {breakdown.items.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono text-xs font-bold border border-sky-500/20">
              {breakdown.items.length}
            </span>
                    )}
                </div>
                {isOpenOnMobile && (
                    <button
                        onClick={onCloseMobile}
                        className="lg:hidden w-9 h-9 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition active:bg-slate-700"
                        aria-label="Close ticket drawer"
                    >
                        <X className="w-5 h-5" />
                    </button>
                )}
            </div>

            {/* Basket Tag & Customer Search Controls */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/50 flex-shrink-0">
                <div className="relative">
                    <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Basket # (e.g. B-01)"
                        value={basketTag}
                        onChange={(e) => setBasketTag(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white uppercase font-mono focus:border-sky-500 focus:outline-none placeholder-slate-500"
                    />
                </div>

                {/* Customer Live Lookup & Autofill */}
                <CustomerAutocomplete
                    customerName={customerName}
                    customerMobile={customerMobile}
                    onSelect={(name, mobile) => setCustomer(name, mobile)}
                    onNameChange={(name) => setCustomer(name, customerMobile)}
                    onMobileChange={(mobile) => setCustomer(customerName, mobile)}
                />
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
                {breakdown.items.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2 select-none">
                        <Bubbles className="w-8 h-8 stroke-1 text-slate-600" />
                        <span>Ticket is empty. Tap items to add.</span>
                    </div>
                ) : (
                    breakdown.items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3 flex justify-between items-center gap-2"
                        >
                            <div className="flex-1 min-w-0 pr-1">
                                <p className="text-xs font-semibold text-slate-200 leading-snug truncate">
                                    {item.name}
                                </p>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  <span>
                    {item.quantity} {item.pricingType === 'per_kilo' ? 'kg' : 'x'}
                  </span>
                                    {item.billableQuantity > item.quantity && (
                                        <span className="text-amber-400 ml-1">
                      (min {item.billableQuantity} billed)
                    </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                <span className="font-mono text-xs sm:text-sm font-bold text-white mr-1">
                  {formatPHP(item.itemTotal)}
                </span>
                                <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                                    aria-label="Decrease quantity"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 active:bg-slate-700 text-slate-300 flex items-center justify-center transition"
                                    aria-label="Increase quantity"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 flex items-center justify-center transition ml-1"
                                    aria-label="Remove item"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Totals & Proceed */}
            <div className="p-4 pb-6 lg:pb-4 border-t border-slate-800 bg-slate-950/90 space-y-3 flex-shrink-0">
                <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>{formatPHP(breakdown.subtotal)}</span>
                    </div>
                    {breakdown.totalWeightKg > 0 && (
                        <div className="flex justify-between text-slate-400">
                            <span>Total Weight</span>
                            <span>{breakdown.totalWeightKg} kg</span>
                        </div>
                    )}
                    <div className="flex justify-between text-emerald-400 font-bold text-base pt-1.5 border-t border-slate-800">
                        <span>Net Payable</span>
                        <span>{formatPHP(breakdown.netPayable)}</span>
                    </div>
                </div>

                <button
                    onClick={onProceedCheckout}
                    disabled={breakdown.items.length === 0}
                    className="w-full h-12 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 active:bg-sky-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-lg"
                >
                    <span>Proceed to Checkout</span>
                    <span className="font-mono">({formatPHP(breakdown.netPayable)})</span>
                </button>
            </div>
        </aside>
    );
}