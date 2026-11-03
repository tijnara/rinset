'use client';

import { useCartStore } from '@/features/pos/store/useCartStore';
import { formatPHP } from '@/lib/formatters';
import { ShoppingBag, Trash2, Plus, Minus, Sparkles, User, Tag } from 'lucide-react';

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
            className={`w-full lg:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col ${
                isOpenOnMobile ? 'fixed inset-0 z-40 lg:static' : 'hidden lg:flex'
            }`}
        >
            {/* Cart Header */}
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900">
                <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-sky-400" />
                    <h2 className="font-bold text-base text-white">Active Ticket</h2>
                </div>
                {isOpenOnMobile && (
                    <button
                        onClick={onCloseMobile}
                        className="lg:hidden text-xs text-slate-400 bg-slate-800 px-3 py-1.5 rounded-lg"
                    >
                        Close
                    </button>
                )}
            </div>

            {/* Customer & Basket Tag Controls */}
            <div className="p-4 border-b border-slate-800 space-y-3 bg-slate-950/40">
                <div className="flex space-x-2">
                    <div className="flex-1 relative">
                        <Tag className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Basket # (e.g. B-01)"
                            value={basketTag}
                            onChange={(e) => setBasketTag(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase font-mono focus:border-sky-500 focus:outline-none"
                        />
                    </div>
                </div>

                <div className="space-y-1.5">
                    <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Customer Name (optional)"
                            value={customerName}
                            onChange={(e) => setCustomer(e.target.value, customerMobile)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:border-sky-500 focus:outline-none"
                        />
                    </div>
                    <input
                        type="text"
                        placeholder="Mobile (0917...)"
                        value={customerMobile}
                        onChange={(e) => setCustomer(customerName, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono focus:border-sky-500 focus:outline-none"
                    />
                </div>
            </div>

            {/* Cart Items List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {breakdown.items.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
                        <Sparkles className="w-8 h-8 stroke-1 text-slate-600" />
                        <span>Ticket is empty. Tap items to add.</span>
                    </div>
                ) : (
                    breakdown.items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex justify-between items-center"
                        >
                            <div className="flex-1 pr-2">
                                <p className="text-xs font-semibold text-slate-200 leading-snug">{item.name}</p>
                                <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                  <span>
                    {item.quantity} {item.pricingType === 'per_kilo' ? 'kg' : 'x'}
                  </span>
                                    {item.billableQuantity > item.quantity && (
                                        <span className="text-amber-400 ml-1">
                      (min {item.billableQuantity} charged)
                    </span>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
                <span className="font-mono text-sm font-bold text-white mr-1">
                  {formatPHP(item.itemTotal)}
                </span>
                                <button
                                    onClick={() => updateQuantity(item.id, -1)}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                >
                                    <Minus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => updateQuantity(item.id, 1)}
                                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={() => removeItem(item.id)}
                                    className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Subtotal & Checkout Action */}
            <div className="p-4 border-t border-slate-800 bg-slate-950/80 space-y-3">
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
                    <div className="flex justify-between text-emerald-400 font-bold text-base pt-1 border-t border-slate-800">
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