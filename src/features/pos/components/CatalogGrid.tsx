'use client';

import { CatalogItem } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { Scale, Check, PackageSearch } from 'lucide-react';

interface CartItemSummary {
    id: string;
    quantity: number;
    pricingType: string;
}

interface CatalogGridProps {
    items: CatalogItem[];
    cartItems?: CartItemSummary[];
    onItemSelect: (item: CatalogItem) => void;
    onClearSearch?: () => void;
}

export function CatalogGrid({
                                items,
                                cartItems = [],
                                onItemSelect,
                                onClearSearch,
                            }: CatalogGridProps) {
    const getCategoryColor = (category: string) => {
        switch (category.toLowerCase()) {
            case 'services':
                return 'bg-sky-500/10 text-sky-400 border-sky-500/30';
            case 'retail':
                return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
            case 'bulky':
                return 'bg-violet-500/10 text-violet-400 border-violet-500/30';
            case 'specialty':
                return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
            default:
                return 'bg-slate-800 text-slate-300 border-slate-700';
        }
    };

    // Empty Search / Filter State (only when 0 items match)
    if (items.length === 0) {
        return (
            <div className="py-24 flex flex-col items-center justify-center text-center p-6 space-y-3 select-none">
                <PackageSearch className="w-12 h-12 text-slate-600 stroke-[1.5]" />
                <h3 className="text-base font-bold text-slate-300">No items found</h3>
                <p className="text-xs text-slate-500 max-w-xs">
                    No services or retail products match your current search or category filter.
                </p>
                {onClearSearch && (
                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-xs text-sky-400 font-bold rounded-xl transition mt-2"
                    >
                        Reset Filters
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-5 pb-24 lg:pb-8">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3 sm:gap-3.5">
                {items.map((item) => {
                    const inCart = cartItems.find((c) => c.id === item.id);
                    const isPerKilo = item.pricing_type === 'per_kilo';

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => onItemSelect(item)}
                            className={`rounded-2xl p-4 flex flex-col justify-between text-left transition h-36 relative group shadow-sm active:scale-[0.98] ${
                                inCart
                                    ? 'bg-sky-950/20 border-2 border-sky-500/80 shadow-lg shadow-sky-500/5'
                                    : 'bg-slate-900/90 border border-slate-800/90 hover:border-sky-500/40 hover:bg-slate-900'
                            }`}
                        >
                            {/* Card Header: Category + Min Qty on Left, In-Cart Badge on Right */}
                            <div className="w-full">
                                <div className="flex items-center justify-between gap-1 mb-2">
                                    <div className="flex items-center space-x-1.5 min-w-0">
                    <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-lg border ${getCategoryColor(
                            item.category
                        )}`}
                    >
                      {item.category}
                    </span>

                                        {item.minimum_quantity > 0 && !inCart && (
                                            <span className="text-[10px] text-amber-400 font-mono truncate">
                        Min {item.minimum_quantity} {isPerKilo ? 'kg' : 'pc'}
                      </span>
                                        )}
                                    </div>

                                    {/* Guaranteed non-overlapping in-cart pill */}
                                    {inCart && (
                                        <div className="px-2 py-0.5 rounded-full bg-sky-500 text-slate-950 font-mono text-[10px] font-black flex items-center space-x-1 shadow-sm flex-shrink-0">
                                            <Check className="w-3 h-3 stroke-[3]" />
                                            <span>
                        {isPerKilo ? `${inCart.quantity.toFixed(1)}kg` : `${inCart.quantity}x`}
                      </span>
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-semibold text-slate-100 text-xs sm:text-sm line-clamp-2 leading-snug group-hover:text-white transition">
                                    {item.name}
                                </h3>
                            </div>

                            {/* Card Footer: Pricing Type on Left, Unit Price on Right */}
                            <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/80 w-full">
                <span className="text-[11px] text-slate-400 capitalize flex items-center space-x-1">
                  {isPerKilo && <Scale className="w-3 h-3 text-sky-400 flex-shrink-0" />}
                    <span>{item.pricing_type.replace('_', ' ')}</span>
                </span>

                                <span className="text-base font-bold font-mono text-sky-400">
                  {formatPHP(item.unit_price)}
                </span>
                            </div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}