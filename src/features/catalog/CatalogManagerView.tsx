'use client';

import { useState, useMemo } from 'react';
import { useCatalogManager } from './hooks/useCatalogManager';
import { CatalogItemModal } from './components/CatalogItemModal';
import { ChangePinModal } from './components/ChangePinModal';
import { EditStoreNameModal } from './components/EditStoreNameModal';
import { CatalogItem } from '@/types/database';
import { formatPHP } from '@/lib/formatters';
import { Navbar } from '@/components/layout/Navbar';
import { useAuthStore, PinPad } from '@/features/auth';
import {
    Settings,
    Plus,
    Edit2,
    CheckCircle,
    XCircle,
    Lock,
    Shield,
    Unlock,
    KeyRound,
    Store,
    X,
    Search,
} from 'lucide-react';

export function CatalogManagerView() {
    const authStoreName = useAuthStore((state) => state.storeName);
    const authStoreId = useAuthStore((state) => state.storeId);
    const setStore = useAuthStore((state) => state.setStore);
    const { loginWithPin } = useAuthStore();

    const {
        items,
        storeName: hookStoreName,
        isOwner,
        updateStoreName,
        saveItem,
        deleteItem,
        toggleActiveStatus,
    } = useCatalogManager();

    const storeName = authStoreName || hookStoreName || 'Rinset Laundry';

    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChangePinOpen, setIsChangePinOpen] = useState(false);
    const [isEditStoreOpen, setIsEditStoreOpen] = useState(false);
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

    const categories = useMemo(() => {
        const cats = Array.from(new Set(items.map((i) => i.category.toUpperCase())));
        return ['ALL', ...cats];
    }, [items]);

    const filteredItems = useMemo(() => {
        return items.filter((item) => {
            const matchesCategory =
                selectedCategory === 'ALL' || item.category.toUpperCase() === selectedCategory;
            const matchesSearch =
                !searchQuery.trim() ||
                item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                item.category.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesCategory && matchesSearch;
        });
    }, [items, selectedCategory, searchQuery]);

    const handleUpdateStoreName = async (
        newName: string
    ): Promise<{ success: boolean; error?: string }> => {
        try {
            const res = await updateStoreName(newName);
            if (res.success && authStoreId) {
                setStore(authStoreId, newName);
            }
            return res;
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to update store name.' };
        }
    };

    const getUnitSuffix = (pricingType: string) => {
        switch (pricingType) {
            case 'per_kilo':
                return 'kg';
            case 'per_load':
                return 'load';
            case 'per_piece':
            default:
                return 'pc';
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            <main className="flex-1 p-4 md:p-6 max-w-7xl w-full mx-auto space-y-4">
                {/* Header Bar */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 bg-slate-900/60 border border-slate-800 p-4 rounded-2xl">
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                <Settings className="w-5 h-5 text-sky-400" />
                                Service Rates & Store Settings
                            </h2>

                            {isOwner ? (
                                <span className="px-2.5 py-0.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[11px] font-bold rounded-full flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  Owner Mode
                </span>
                            ) : (
                                <span className="px-2.5 py-0.5 bg-slate-800 border border-slate-700 text-slate-400 text-[11px] font-semibold rounded-full flex items-center gap-1">
                  <Lock className="w-3 h-3 text-amber-400" />
                  Cashier Mode (Read-Only)
                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {isOwner
                                ? 'Configure business branding, owner security PIN, per-kilo rates, and retail stock.'
                                : 'Rates are locked. Cashiers can view prices for customer inquiries.'}
                        </p>
                    </div>

                    {/* Action Buttons */}
                    {isOwner ? (
                        <div className="flex items-center gap-2 flex-wrap">
                            <button
                                type="button"
                                onClick={() => setIsEditStoreOpen(true)}
                                className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                            >
                                <Store className="w-3.5 h-3.5 text-sky-400" />
                                <span>Change Business Name</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsChangePinOpen(true)}
                                className="h-10 px-3.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition active:scale-95 shadow-sm"
                            >
                                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                                <span>Change Owner PIN</span>
                            </button>

                            <button
                                type="button"
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
                    ) : (
                        <button
                            type="button"
                            onClick={() => {
                                setUnlockError(null);
                                setIsUnlockModalOpen(true);
                            }}
                            className="h-10 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition"
                        >
                            <Unlock className="w-3.5 h-3.5 text-amber-400" />
                            <span>Unlock to Edit (Owner PIN)</span>
                        </button>
                    )}
                </div>

                {/* Filter and Search Sub-Bar */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-900/40 border border-slate-800/80 p-2.5 rounded-2xl">
                    <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition ${
                                    selectedCategory === cat
                                        ? 'bg-sky-500 text-slate-950 shadow-sm'
                                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="relative w-full sm:w-64">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search items..."
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

                {/* Catalog Items Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {filteredItems.map((item) => {
                        const unitSuffix = getUnitSuffix(item.pricing_type);

                        return (
                            <div
                                key={item.id}
                                className={`border rounded-2xl p-4 flex flex-col justify-between transition ${
                                    item.is_active
                                        ? 'bg-slate-900 border-slate-800'
                                        : 'bg-slate-900/30 border-slate-800/40 opacity-60'
                                }`}
                            >
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.category}
                    </span>

                                        {item.minimum_quantity > 0 && (
                                            <span className="text-[10px] text-amber-400 font-mono">
                        Min {item.minimum_quantity} {unitSuffix}
                      </span>
                                        )}
                                    </div>

                                    <h3 className="font-semibold text-sm text-white line-clamp-2">{item.name}</h3>

                                    <p className="font-mono text-base font-bold text-sky-400">
                                        {formatPHP(item.unit_price)}{' '}
                                        <span className="text-xs font-normal text-slate-400">
                      / {item.pricing_type.replace('_', ' ')}
                    </span>
                                    </p>
                                </div>

                                <div className="pt-3 border-t border-slate-800/80 mt-3 flex items-center justify-between">
                  <span
                      className={`text-[10px] font-bold uppercase tracking-wider ${
                          item.is_active ? 'text-emerald-400' : 'text-slate-500'
                      }`}
                  >
                    {item.is_active ? 'Active' : 'Inactive'}
                  </span>

                                    {isOwner ? (
                                        <div className="flex items-center gap-1.5">
                                            <button
                                                type="button"
                                                onClick={() => toggleActiveStatus(item.id, item.is_active)}
                                                className={`p-1.5 rounded-xl border transition ${
                                                    item.is_active
                                                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                                                        : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-white'
                                                }`}
                                                title={item.is_active ? 'Deactivate' : 'Activate'}
                                            >
                                                {item.is_active ? (
                                                    <CheckCircle className="w-4 h-4" />
                                                ) : (
                                                    <XCircle className="w-4 h-4" />
                                                )}
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setSelectedItem(item);
                                                    setIsModalOpen(true);
                                                }}
                                                className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-400 transition"
                                                title="Edit Rate"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="p-1.5 text-slate-600" title="Locked - Owner permission required to edit">
                                            <Lock className="w-3.5 h-3.5" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Edit / Add Item Modal */}
            {isOwner && (
                <CatalogItemModal
                    item={selectedItem}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={async (itemData) => {
                        await saveItem(itemData);
                    }}
                    onDelete={async (id) => {
                        await deleteItem(id);
                    }}
                />
            )}

            {/* Change Owner PIN Modal */}
            {isOwner && (
                <ChangePinModal
                    isOpen={isChangePinOpen}
                    onClose={() => setIsChangePinOpen(false)}
                />
            )}

            {/* Change Business Name Modal */}
            {isOwner && (
                <EditStoreNameModal
                    isOpen={isEditStoreOpen}
                    onClose={() => setIsEditStoreOpen(false)}
                    currentStoreName={storeName}
                    onSave={handleUpdateStoreName}
                />
            )}

            {/* PIN Unlock Modal for Cashiers */}
            {isUnlockModalOpen && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
                        <button
                            type="button"
                            onClick={() => {
                                setIsUnlockModalOpen(false);
                                setUnlockError(null);
                            }}
                            className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800"
                        >
                            <X className="w-4 h-4" />
                        </button>

                        <PinPad
                            title="Enter Owner PIN"
                            subtitle="Enter 4-digit security PIN to edit rates"
                            errorMessage={unlockError}
                            onComplete={async (pin) => {
                                const res = await loginWithPin(pin);
                                if (res.success && res.role === 'owner') {
                                    setIsUnlockModalOpen(false);
                                    setUnlockError(null);
                                    return true;
                                }
                                setUnlockError('Access Denied: Incorrect Security PIN.');
                                return false;
                            }}
                        />
                    </div>
                </div>
            )}

            {/* App Footer */}
            <footer className="py-6 pb-24 lg:pb-8 text-center border-t border-slate-800/80 mt-auto select-none bg-slate-950">
                <p className="text-xs text-slate-400 font-mono tracking-wider">
                    Rinset 2026 by tijnara
                </p>
            </footer>
        </div>
    );
}