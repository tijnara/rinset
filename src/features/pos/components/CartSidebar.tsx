'use client';

import { useCartStore } from '@/features/pos/store/useCartStore';
import { CustomerAutocomplete } from './CustomerAutocomplete';
import { formatPHP } from '@/lib/formatters';
import { Bubbles } from '@/components/icons/Bubbles';
import {
    ShoppingBag,
    Trash2,
    Plus,
    Minus,
    Tag,
    X,
    RotateCcw,
    Sparkles,
    Scale,
} from 'lucide-react';

interface CartSidebarProps {
    isOpenOnMobile?: boolean;
    onOpenMobile?: () => void;
    onCloseMobile?: () => void;
    onProceedCheckout: () => void;
    onEditItemWeight?: (itemId: string) => void;
}

export function CartSidebar({
                                isOpenOnMobile = false,
                                onCloseMobile,
                                onProceedCheckout,
                                onEditItemWeight,
                            }: CartSidebarProps) {
    const {
        customerName,
        customerMobile,
        basketTag,
        setCustomer,
        setBasketTag,
        updateQuantity,
        removeItem,
        clearCart,
        getBreakdown,
    } = useCartStore();

    const breakdown = getBreakdown();

    const handleClear = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        clearCart();
    };

    const handleClose = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        onCloseMobile?.();
    };

    const generateQuickTag = () => {
        const randomTag = `B-${Math.floor(100 + Math.random() * 900)}`;
        setBasketTag(randomTag);
    };

    return (
        <aside
            className={
                isOpenOnMobile
                    ? 'fixed inset-0 z-50 bg-slate-950 flex flex-col h-screen w-full select-none'
                    : 'hidden lg:flex lg:w-96 xl:w-[420px] flex-col flex-shrink-0 bg-slate-900 border-l border-slate-800 select-none h-full min-h-0'
            }
        >
            {/* 1. Header (Fixed 56px) */}
            <div className="h-14 px-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 flex-shrink-0">
                <div className="flex items-center space-x-2">
                    <ShoppingBag className="w-5 h-5 text-sky-400" />
                    <h2 className="font-bold text-base text-white">Active Ticket</h2>
                    {breakdown.items.length > 0 && (
                        <span className="px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 font-mono text-xs font-bold border border-sky-500/20">
              {breakdown.items.length} {breakdown.items.length === 1 ? 'item' : 'items'}
            </span>
                    )}
                </div>

                <div className="flex items-center space-x-2">
                    {breakdown.items.length > 0 && (
                        <button
                            type="button"
                            onClick={handleClear}
                            className="h-8 px-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-600 active:text-white border border-rose-500/25 text-rose-400 text-xs font-bold flex items-center space-x-1 transition shadow-sm"
                            title="Clear active ticket"
                        >
                            <RotateCcw className="w-3.5 h-3.5" />
                            <span>Clear</span>
                        </button>
                    )}

                    {isOpenOnMobile && (
                        <button
                            type="button"
                            onClick={handleClose}
                            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition active:bg-slate-700 ml-1"
                            aria-label="Close ticket drawer"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* 2. Basket Tag & Customer Search */}
            <div className="p-3.5 border-b border-slate-800 space-y-2 bg-slate-950/50 flex-shrink-0">
                <div className="relative flex items-center gap-1.5">
                    <div className="relative flex-1">
                        <Tag className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Ticket / Basket Tag (e.g. B-01)"
                            value={basketTag}
                            onChange={(e) => setBasketTag(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white uppercase font-mono focus:border-sky-500 focus:outline-none placeholder-slate-500"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={generateQuickTag}
                        className="h-9 px-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center space-x-1 transition"
                        title="Auto-generate basket tag"
                    >
                        <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                        <span className="hidden sm:inline">Auto</span>
                    </button>
                </div>

                <CustomerAutocomplete
                    customerName={customerName}
                    customerMobile={customerMobile}
                    onSelect={(name, mobile) => setCustomer(name, mobile)}
                    onNameChange={(name) => setCustomer(name, customerMobile)}
                    onMobileChange={(mobile) => setCustomer(customerName, mobile)}
                />
            </div>

            {/* 3. Items List Container (Fills middle space & scrolls independently) */}
            <div className="flex-1 min-h-0 overflow-y-auto p-3.5 pr-2.5 space-y-2 overscroll-contain [scrollbar-width:thin] [scrollbar-color:#334155_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-slate-950/50 [&::-webkit-scrollbar-thumb]:bg-slate-700 hover:[&::-webkit-scrollbar-thumb]:bg-sky-500 [&::-webkit-scrollbar-thumb]:rounded-full">
                {breakdown.items.length === 0 ? (
                    <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-slate-500 text-xs space-y-2 select-none">
                        <Bubbles className="w-9 h-9 stroke-1 text-slate-600" />
                        <span>Ticket is empty. Tap catalog items to add.</span>
                    </div>
                ) : (
                    breakdown.items.map((item) => (
                        <div
                            key={item.id}
                            className="bg-slate-950 border border-slate-800/90 rounded-2xl p-3 flex justify-between items-center gap-2 hover:border-slate-700 transition"
                        >
                            <div className="flex-1 min-w-0 pr-1">
                                <p className="text-xs font-semibold text-slate-200 leading-snug truncate">
                                    {item.name}
                                </p>

                                <div className="flex items-center space-x-2 text-[11px] text-slate-400 font-mono mt-1">
                                    {item.pricingType === 'per_kilo' ? (
                                        <button
                                            type="button"
                                            onClick={() => onEditItemWeight?.(item.id)}
                                            className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-lg bg-sky-500/10 border border-sky-500/30 text-sky-400 hover:bg-sky-500/20 transition font-bold"
                                            title="Click to re-weigh"
                                        >
                                            <Scale className="w-3 h-3" />
                                            <span>{item.quantity.toFixed(2)} kg</span>
                                        </button>
                                    ) : (
                                        <span className="font-bold text-slate-300">
                      {item.quantity} {item.pricingType === 'per_load' ? 'load' : 'pc'}
                    </span>
                                    )}
                                    <span className="text-slate-500">•</span>
                                    <span>{formatPHP(item.unitPrice)}</span>
                                </div>
                            </div>

                            <div className="flex items-center space-x-1.5 flex-shrink-0">
                <span className="font-mono text-xs sm:text-sm font-bold text-white mr-1">
                  {formatPHP(item.itemTotal)}
                </span>

                                {item.pricingType !== 'per_kilo' && (
                                    <>
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
                                    </>
                                )}

                                <button
                                    type="button"
                                    onClick={() => removeItem(item.id)}
                                    className="w-8 h-8 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 active:bg-rose-500/30 text-rose-400 flex items-center justify-center transition ml-0.5"
                                    aria-label="Remove item"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* 4. Totals & Checkout Button (Firmly pinned to the bottom of the viewport) */}
            <div className="p-4 border-t border-slate-800 bg-slate-950 space-y-3 flex-shrink-0 mt-auto">
                <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between text-slate-400">
                        <span>Subtotal</span>
                        <span>{formatPHP(breakdown.subtotal)}</span>
                    </div>
                    {breakdown.totalWeightKg > 0 && (
                        <div className="flex justify-between text-slate-400">
              <span className="flex items-center space-x-1">
                <Scale className="w-3 h-3 text-sky-400" />
                <span>Total Laundry Weight</span>
              </span>
                            <span className="text-sky-400 font-bold">{breakdown.totalWeightKg.toFixed(2)} kg</span>
                        </div>
                    )}
                    <div className="flex justify-between text-emerald-400 font-bold text-base pt-2 border-t border-slate-800">
                        <span>Net Payable</span>
                        <span className="text-xl">{formatPHP(breakdown.netPayable)}</span>
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onProceedCheckout}
                    disabled={breakdown.items.length === 0}
                    className="w-full h-12 bg-sky-500 hover:bg-sky-400 disabled:opacity-40 active:bg-sky-600 text-slate-950 font-bold text-sm rounded-xl flex items-center justify-center space-x-2 transition shadow-xl"
                >
                    <span>Proceed to Checkout</span>
                    <span className="font-mono font-black">({formatPHP(breakdown.netPayable)})</span>
                    <span className="hidden xl:inline text-[11px] font-mono opacity-70 ml-1">[F8]</span>
                </button>
            </div>
        </aside>
    );
}