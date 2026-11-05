'use client';

import { CatalogItem } from '@/types/database';
import { formatPHP } from '@/lib/formatters';

interface CatalogGridProps {
    items: CatalogItem[];
    categories?: string[];
    selectedCategory?: string;
    onSelectCategory?: (category: string) => void;
    onItemSelect: (item: CatalogItem) => void;
}

export function CatalogGrid({ items, onItemSelect }: CatalogGridProps) {
    return (
        <div className="p-3 sm:p-4 md:p-6 pb-36 lg:pb-6">
            {/* Grid of Catalog Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {items.map((item) => (
                    <button
                        key={item.id}
                        type="button"
                        onClick={() => onItemSelect(item)}
                        className="bg-slate-900/90 border border-slate-800/90 hover:border-sky-500/50 active:scale-[0.98] rounded-2xl p-4 flex flex-col justify-between text-left transition h-36 relative group shadow-sm"
                    >
                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {item.category}
                </span>
                                {item.minimum_quantity > 0 && (
                                    <span className="text-[10px] text-amber-400 font-mono">
                    Min {item.minimum_quantity} {item.pricing_type === 'per_kilo' ? 'kg' : 'pc'}
                  </span>
                                )}
                            </div>
                            <h3 className="font-semibold text-slate-100 text-sm line-clamp-2 leading-snug">
                                {item.name}
                            </h3>
                        </div>

                        <div className="flex justify-between items-baseline pt-2 border-t border-slate-800/80">
              <span className="text-[11px] text-slate-400 capitalize">
                {item.pricing_type.replace('_', ' ')}
              </span>
                            <span className="text-base font-bold font-mono text-sky-400">
                {formatPHP(item.unit_price)}
              </span>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}