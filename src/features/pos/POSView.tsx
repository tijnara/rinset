'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
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
import {
    ShoppingBag,
    ChevronUp,
    CheckCircle2,
    MinusCircle,
    Search,
    X,
} from 'lucide-react';

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

    const [searchQuery, setSearchQuery] = useState('');
    const [activeWeightItem, setActiveWeightItem] = useState<CatalogItem | null>(null);
    const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
    const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
    const [isCashOutOpen, setIsCashOutOpen] = useState(false);
    const [completedOrder, setCompletedOrder] = useState<string | null>(null);
    const [lastCreatedOrder, setLastCreatedOrder] = useState<Order | null>(null);

    const searchInputRef = useRef<HTMLInputElement>(null);

    // Filter items by category and search
    const filteredCatalog = useMemo(() => {
        let list = catalog;
        if (selectedCategory !== 'ALL') {
            list = list.filter((item) => item.category.toUpperCase() === selectedCategory.toUpperCase());
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            list = list.filter(
                (item) =>
                    item.name.toLowerCase().includes(q) ||
                    item.category.toLowerCase().includes(q) ||
                    item.pricing_type.toLowerCase().includes(q)
            );
        }
        return list;
    }, [catalog, selectedCategory, searchQuery]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            if (e.key === '/' && !isInput) {
                e.preventDefault();
                searchInputRef.current?.focus();
            } else if (e.key === 'F8') {
                e.preventDefault();
                if (items.length > 0) setIsCheckoutOpen(true);
            } else if (e.key === 'F9') {
                e.preventDefault();
                setIsCashOutOpen(true);
            } else if (e.key === 'Escape') {
                if (searchQuery) setSearchQuery('');
                setIsMobileCartOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [items.length, searchQuery]);

    const handleItemSelect = (item: CatalogItem) => {
        if (item.pricing_type === 'per_kilo') {
            setActiveWeightItem(item);
        } else {
            addItem(item, 1);
        }
    };

    const handleEditItemWeight = (cartItemId: string) => {
        const foundCatalogItem = catalog.find((c) => c.id === cartItemId);
        if (foundCatalogItem) {
            setActiveWeightItem(foundCatalogItem);
            return;
        }

        const existingCartItem = items.find((i) => i.id === cartItemId);
        if (existingCartItem) {
            setActiveWeightItem({
                id: existingCartItem.id,
                store_id: storeId || '',
                name: existingCartItem.name,
                category: 'services',
                pricing_type: 'per_kilo',
                unit_price: existingCartItem.unitPrice,
                minimum_quantity: 0,
                is_active: true,
                created_at: '',
            } as CatalogItem);
        }
    };

    const totalItemCount = items.reduce(
        (acc, curr) => acc + (curr.pricingType === 'per_kilo' ? 1 : curr.quantity),
        0
    );

    return (
        <div className="fixed inset-0 top-0 left-0 right-0 bottom-0 w-screen h-screen overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans select-none z-0">
            {/* 1. Header (Fixed 56px) */}
            <Navbar storeName={storeName} />

            {/* 2. Main Body Split (100% of remaining screen height) */}
            <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden w-full">
                {/* Left Column: Full-Height Catalog */}
                <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-slate-950">
                    {/* Sticky Controls Header */}
                    <div className="flex-shrink-0 bg-slate-950/98 border-b border-slate-800 shadow-sm z-10">
                        <div className="px-3 sm:px-5 py-2.5 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2.5">
                            <div className="flex items-center space-x-3 flex-1 min-w-[200px] max-w-md">
                                <div className="relative w-full">
                                    <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                                    <input
                                        ref={searchInputRef}
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Search menu... (Press '/' to focus)"
                                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-7 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition"
                                    />
                                    {searchQuery && (
                                        <button
                                            type="button"
                                            onClick={() => setSearchQuery('')}
                                            className="absolute right-2 top-2 text-slate-500 hover:text-white"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center space-x-2">
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
                                    className="h-8 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 active:bg-rose-600 active:text-white border border-rose-500/25 text-rose-400 font-bold text-xs flex items-center space-x-1.5 transition"
                                    title="Quick Cash Out (F9)"
                                >
                                    <MinusCircle className="w-3.5 h-3.5 flex-shrink-0" />
                                    <span>Quick Cash Out</span>
                                    <span className="hidden xl:inline text-[10px] opacity-70 font-mono">[F9]</span>
                                </button>
                            </div>
                        </div>

                        {/* Category Filter Pills */}
                        <div className="px-3 sm:px-5 py-2 overflow-x-auto flex items-center space-x-2 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                            {categories.map((cat) => {
                                const count =
                                    cat === 'ALL'
                                        ? catalog.length
                                        : catalog.filter((c) => c.category.toUpperCase() === cat.toUpperCase()).length;

                                return (
                                    <button
                                        key={cat}
                                        type="button"
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`px-3.5 py-1.5 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition active:scale-95 flex items-center space-x-1.5 ${
                                            selectedCategory === cat
                                                ? 'bg-sky-500 text-slate-950 shadow-md'
                                                : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <span>{cat}</span>
                                        <span
                                            className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                                                selectedCategory === cat
                                                    ? 'bg-slate-950 text-sky-400'
                                                    : 'bg-slate-800 text-slate-400'
                                            }`}
                                        >
                      {count}
                    </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Catalog Scroll Body */}
                    <div className="flex-1 min-h-0 overflow-y-auto">
                        <CatalogGrid
                            items={filteredCatalog}
                            cartItems={items}
                            onItemSelect={handleItemSelect}
                            onClearSearch={() => {
                                setSearchQuery('');
                                setSelectedCategory('ALL');
                            }}
                        />
                    </div>
                </div>

                {/* Right Column: Full-Height Ticket Sidebar */}
                <CartSidebar
                    isOpenOnMobile={isMobileCartOpen}
                    onCloseMobile={() => setIsMobileCartOpen(false)}
                    onProceedCheckout={() => {
                        setIsMobileCartOpen(false);
                        setIsCheckoutOpen(true);
                    }}
                    onEditItemWeight={handleEditItemWeight}
                />
            </div>

            {/* Floating Bottom Ticket Bar on Mobile */}
            {items.length > 0 && !isMobileCartOpen && (
                <div className="lg:hidden fixed bottom-16 left-3 right-3 z-30 animate-in fade-in slide-in-from-bottom-2 duration-150">
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