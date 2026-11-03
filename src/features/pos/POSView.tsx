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

    const { addItem, getBreakdown } = useCartStore();
    const breakdown = getBreakdown();
    const { logExpense } = useAudit();

    const [activeWeightItem, setActiveWeightItem] = useState<CatalogItem | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState<boolean>(false);
    const [isCashOutOpen, setIsCashOutOpen] = useState<boolean>(false);
    const [completedOrder, setCompletedOrder] = useState<string | null>(null);
    const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

    const handleItemSelect = (item: CatalogItem) => {
        if (item.pricing_type === 'per_kilo') {
            setActiveWeightItem(item);
        } else {
            addItem(item, 1);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-16 md:pb-0">
            <Navbar storeName={storeName} />

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Catalog Main Panel */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* Top Quick Actions Bar */}
                    <div className="px-3 sm:px-4 py-2 bg-slate-900/40 border-b border-slate-800 flex justify-between items-center">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Service & Retail Menu
            </span>
                        <button
                            onClick={() => setIsCashOutOpen(true)}
                            className="h-8 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-600 active:text-white border border-rose-500/20 text-rose-400 font-bold text-xs flex items-center space-x-1.5 transition"
                        >
                            <MinusCircle className="w-3.5 h-3.5" />
                            <span>Quick Cash Out</span>
                        </button>
                    </div>

                    {/* Catalog Grid */}
                    <CatalogGrid
                        items={catalog}
                        categories={categories}
                        selectedCategory={selectedCategory}
                        onSelectCategory={(category: string) => setSelectedCategory(category)}
                        onItemSelect={(item: CatalogItem) => handleItemSelect(item)}
                    />
                </div>

                {/* Cart Sidebar */}
                <CartSidebar
                    isOpenOnMobile={isMobileCartOpen}
                    onCloseMobile={() => setIsMobileCartOpen(false)}
                    onProceedCheckout={() => setIsCheckoutOpen(true)}
                />
            </div>

            {/* Mobile Floating Cart Indicator (Positioned above the mobile bottom navigation bar) */}
            {breakdown.items.length > 0 && !isMobileCartOpen && (
                <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
                    <button
                        onClick={() => setIsMobileCartOpen(true)}
                        className="w-full h-14 bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-slate-950 font-bold rounded-2xl p-4 flex items-center justify-between shadow-2xl transition"
                    >
                        <div className="flex items-center space-x-2">
                            <ShoppingBag className="w-5 h-5" />
                            <span className="text-sm font-semibold">{breakdown.items.length} items</span>
                        </div>
                        <div className="flex items-center space-x-1.5 font-mono">
                            <span className="text-base font-black">{formatPHP(breakdown.netPayable)}</span>
                            <ChevronUp className="w-5 h-5 stroke-[2.5]" />
                        </div>
                    </button>
                </div>
            )}

            {/* Scale Weight Entry Modal */}
            <WeightModal
                item={activeWeightItem}
                onClose={() => setActiveWeightItem(null)}
                onConfirm={(item: CatalogItem, weight: number) => addItem(item, weight)}
            />

            {/* Checkout Modal */}
            <CheckoutModal
                storeId={storeId}
                isOpen={isCheckoutOpen}
                onClose={() => setIsCheckoutOpen(false)}
                onSuccess={async (orderNum: string) => {
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

            {/* Register Cash Out / Petty Cash Modal */}
            <CashOutModal
                storeId={storeId}
                storeName={storeName}
                isOpen={isCashOutOpen}
                onClose={() => setIsCashOutOpen(false)}
                onSaveExpense={logExpense}
            />

            {/* Success Notification */}
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

            {/* 58mm Thermal Receipt Modal */}
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