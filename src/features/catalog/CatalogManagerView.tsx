'use client';

import { useState } from 'react';
import { useCatalogManager } from './hooks/useCatalogManager';
import { CatalogItemModal } from './components/CatalogItemModal';
import { CatalogItem } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { Navbar } from '@/components/layout/Navbar';
import { Settings, Plus, Edit2, CheckCircle, XCircle } from 'lucide-react';

export function CatalogManagerView() {
    const { items, storeName, saveItem, toggleActiveStatus } = useCatalogManager();
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto space-y-5">
                <div className="flex justify-between items-center bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div>
                        <h2 className="text-lg font-bold text-white flex items-center gap-2">
                            <Settings className="w-5 h-5 text-sky-400" />
                            Service Rates & Retail Manager
                        </h2>
                        <p className="text-xs text-slate-400">Configure prices, minimum floors, and active items</p>
                    </div>

                    <button
                        onClick={() => {
                            setSelectedItem(null);
                            setIsModalOpen(true);
                        }}
                        className="h-10 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1.5 transition shadow"
                    >
                        <Plus className="w-4 h-4 stroke-[2.5]" />
                        <span>Add Item</span>
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`border rounded-2xl p-4 flex justify-between items-center transition ${
                                item.is_active ? 'bg-slate-900 border-slate-800' : 'bg-slate-900/30 border-slate-800/40 opacity-60'
                            }`}
                        >
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {item.category}
                  </span>
                                    {item.minimum_quantity > 0 && (
                                        <span className="text-[10px] text-amber-400 font-mono">
                      Min {item.minimum_quantity}kg
                    </span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-sm text-white">{item.name}</h3>
                                <p className="font-mono text-base font-bold text-sky-400">
                                    {formatPHP(item.unit_price)}{' '}
                                    <span className="text-xs font-normal text-slate-400">/ {item.pricing_type.replace('_', ' ')}</span>
                                </p>
                            </div>

                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => toggleActiveStatus(item.id, item.is_active)}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                    title={item.is_active ? 'Deactivate' : 'Activate'}
                                >
                                    {item.is_active ? (
                                        <CheckCircle className="w-4 h-4 text-emerald-400" />
                                    ) : (
                                        <XCircle className="w-4 h-4 text-slate-500" />
                                    )}
                                </button>

                                <button
                                    onClick={() => {
                                        setSelectedItem(item);
                                        setIsModalOpen(true);
                                    }}
                                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                                    title="Edit Rate"
                                >
                                    <Edit2 className="w-4 h-4 text-sky-400" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </main>

            <CatalogItemModal
                item={selectedItem}
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={saveItem}
            />
        </div>
    );
}