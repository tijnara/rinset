'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { CatalogItem, Order } from '@/types/database';
import { useCatalog } from '@/features/pos/hooks/useCatalog';
import { useCartStore } from '@/features/pos/store/useCartStore';
import { useAudit } from '@/features/audit/hooks/useAudit';
import { CatalogGrid } from '@/features/pos/components/CatalogGrid';
import { CartSidebar } from '@/features/pos/components/CartSidebar';
import { WeightModal } from '@/features/pos/components/WeightModal';
import { CheckoutModal } from '@/features/pos/components/CheckoutModal';
import { ReceiptModal } from '@/features/pos/components/ReceiptModal';
import { CashOutModal } from '@/features/audit/components/CashOutModal';
import { Navbar } from '@/components/layout/Navbar';
import { formatPHP } from '@/lib/formatters';
import { ShoppingBag, ChevronUp, CheckCircle2, MinusCircle } from 'lucide-react';

export function POSView() {
    const {
        catalog,
        categories,
        selectedCategory,
        setSelectedCategory,
        storeName,
        storeId,
    } = useCatalog();

    const { items, addItem, getBreakdown } = useCartStore();
    const breakdown = getBreakdown();
    const { logExpense } = useAudit();

    const [activeWeightItem, setActiveWeightItem] = useState<CatalogItem | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isCashOutOpen, setIsCashOutOpen] = useState(false);
    const [completedOrder, setCompletedOrder] = useState<string | null>(null);
    const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

    const handleItemSelect = (item: CatalogItem) => {
        if (item.pricing_type === 'per_kilo') {
            setActiveWeightItem(item);
        } else {
            addItem(item, 1);
        }
    };

    const totalItemCount = items.reduce(
        (acc, curr) => acc + (curr.pricingType === 'per_kilo' ? 1 : curr.quantity),
        0
    );

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-20 lg:pb-0">
            <Navbar storeName={storeName} />

            <div className="flex-1 flex flex-col lg:flex-row min-h-0">
                {/* Catalog Panel */}
                <div className="flex-1 flex flex-col min-w-0 overflow-visible lg:overflow-y-auto lg:h-[calc(100vh-3.5rem)]">
                    {/* COMBINED STICKY HEADER: Locks right below the 56px Navbar (top-14) on mobile */}
                    <div className="sticky top-14 lg:top-0 z-20 bg-slate-950/98 backdrop-blur border-b border-slate-800 shadow-md">
                        {/* Row 1: Sub-bar (Title + Mobile Ticket trigger + Quick Cash Out) */}
                        <div className="px-3 sm:px-4 py-2 bg-slate-900/60 border-b border-slate-800/80 flex justify-between items-center">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Service & Retail Menu
              </span>

                            <div className="flex items-center space-x-2">
                                {/* Mobile Ticket Button */}
                                <button
                                    type="button"
                                    onClick={() => setIsMobileCartOpen(true)}
                                    className={`lg:hidden h-8 px-2.5 rounded-xl border flex items-center space-x-1.5 transition active:scale-95 ${
                                        items.length > 0
                                            ? 'bg-sky-500/20 border-sky-400/50 text-sky-300 font-bold shadow-sm'
                                            : 'bg-slate-800/80 border-slate-700 text-slate-400'
                                    }`}
                                    title="View Active Ticket"
                                >
                                    <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
                                    <span className="text-xs">Ticket</span>
                                    <span
                                        className={`px-1.5 py-0.5 rounded-full font-mono text-[10px] font-black ${
                                            items.length > 0
                                                ? 'bg-sky-500 text-slate-950'
                                                : 'bg-slate-700 text-slate-300'
                                        }`}
                                    >
                    {totalItemCount}
                  </span>
                                    {items.length > 0 && (
                                        <span className="text-xs font-mono font-bold text-white ml-0.5">
                      {formatPHP(breakdown.netPayable)}
                    </span>
                                    )}
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsCashOutOpen(true)}
                                    className="h-8 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-600 active:text-white border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center space-x-1.5 transition"
                                >
                                    <MinusCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Quick Cash Out</span>
                                </button>
                            </div>
                        </div>

                        {/* Row 2: Category Filter Pills (ALL, RETAIL, BULKY, SERVICES, SPECIALTY) */}
                        <div className="px-3 sm:px-4 py-2 overflow-x-auto flex items-center space-x-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {categories.map((cat) => (
                                <button
                                    key={cat}
                                    type="button"
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition active:scale-95 ${
                                        selectedCategory === cat
                                            ? 'bg-sky-500 text-slate-950 shadow-md'
                                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Catalog Cards Grid */}
                    <CatalogGrid
                        items={catalog}
                        onItemSelect={(item) => handleItemSelect(item)}
                    />
                </div>

                {/* Active Ticket Sidebar (Desktop side-by-side & Mobile drawer) */}
                <CartSidebar
                    isOpenOnMobile={isMobileCartOpen}
                    onCloseMobile={() => setIsMobileCartOpen(false)}
                    onProceedCheckout={() => {
                        setIsMobileCartOpen(false);
                        setIsCheckoutOpen(true);
                    }}
                />
            </div>

            {/* Floating Bottom Ticket Bar on Mobile */}
            {items.length > 0 && !isMobileCartOpen && (
                <div className="lg:hidden fixed bottom-14 left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                        type="button"
                        onClick={() => setIsMobileCartOpen(true)}
                        className="w-full h-12 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold rounded-2xl px-4 flex items-center justify-between shadow-2xl transition"
                    >
                        <div className="flex items-center space-x-2">
                            <ShoppingBag className="w-4 h-4 stroke-[2.4]" />
                            <span className="text-xs font-bold">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
                        </div>
                        <div className="flex items-center space-x-1.5 font-mono font-black text-sm">
                            <span>{formatPHP(breakdown.netPayable)}</span>
                            <ChevronUp className="w-4 h-4 stroke-[3]" />
                        </div>
                    </button>
                </div>
            )}

            {/* Modals */}
            <WeightModal
                item={activeWeightItem}
                onClose={() => setActiveWeightItem(null)}
                onConfirm={(item, weight) => addItem(item, weight)}
            />

            <CheckoutModal
                storeId={storeId}
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                onSuccess={async (orderNum) => {
                    setCompletedOrder(orderNum);
                    const supabase = createClient();
                    const { data } = await supabase
                        .from('orders')
                        .select('*, customer:customers(*), items:order_items(*)')
                        .eq('order_number', orderNum)
                        .single();

                    if (data) setLastCreatedOrder(data as Order);
                }}
            />

            <CashOutModal
                storeId={storeId}
                storeName={storeName}
                isOpen={isCashOutOpen}
                onClose={() => setIsCashOutOpen(false)}
                onSaveExpense={logExpense}
            />

            {completedOrder && !lastCreatedOrder && (
                <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 max-w-sm w-full text-center space-y-4 shadow-2xl">
                        <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                        <div>
                            <h3 className="text-xl font-bold text-white">Order Registered!</h3>
                            <p className="text-sm font-mono text-sky-400 mt-1">Ticket #{completedOrder}</p>
                        </div>
                        <button
                            onClick={() => setCompletedOrder(null)}
                            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-bold transition"
                        >
                            Done & Next Order
                        </button>
                    </div>
                </div>
            )}

            <ReceiptModal
                order={lastCreatedOrder}
                storeName={storeName}
                onClose={() => {
                    setLastCreatedOrder(null);
                    setCompletedOrder(null);
                }}
            />
        </div>
    );
}