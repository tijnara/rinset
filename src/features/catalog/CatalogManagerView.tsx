'use client';

import { useState } from 'react';
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
} from 'lucide-react';

export function CatalogManagerView() {
    const { items, storeName, updateStoreName, saveItem, deleteItem, toggleActiveStatus } =
        useCatalogManager();
    const { user, loginWithPin } = useAuthStore();
    const [selectedItem, setSelectedItem] = useState<CatalogItem | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isChangePinOpen, setIsChangePinOpen] = useState(false);
    const [isEditStoreOpen, setIsEditStoreOpen] = useState(false);
    const [isUnlockModalOpen, setIsUnlockModalOpen] = useState(false);
    const [unlockError, setUnlockError] = useState<string | null>(null);

    const isOwner = user?.role === 'owner';

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
            <Navbar storeName={storeName} />

            <main className="flex-1 p-4 md:p-6 max-w-5xl w-full mx-auto space-y-5">
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

                    {/* Action Buttons: Owner Controls vs Cashier Unlock */}
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

                {/* Catalog Items Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {items.map((item) => (
                        <div
                            key={item.id}
                            className={`border rounded-2xl p-4 flex justify-between items-center transition ${
                                item.is_active
                                    ? 'bg-slate-900 border-slate-800'
                                    : 'bg-slate-900/30 border-slate-800/40 opacity-60'
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
                                    {!item.is_active && (
                                        <span className="text-[10px] text-rose-400 font-bold uppercase">
                      Inactive
                    </span>
                                    )}
                                </div>
                                <h3 className="font-semibold text-sm text-white">{item.name}</h3>
                                <p className="font-mono text-base font-bold text-sky-400">
                                    {formatPHP(item.unit_price)}{' '}
                                    <span className="text-xs font-normal text-slate-400">
                    / {item.pricing_type.replace('_', ' ')}
                  </span>
                                </p>
                            </div>

                            {isOwner ? (
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
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
                                        type="button"
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
                            ) : (
                                <div className="p-2 text-slate-600" title="Locked - Owner permission required to edit">
                                    <Lock className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </main>

            {/* Edit / Add Item Modal */}
            {isOwner && (
                <CatalogItemModal
                    item={selectedItem}
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={saveItem}
                    onDelete={deleteItem}
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
                    onSave={updateStoreName}
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
                                setUnlockError('Access Denied: Incorrect Owner PIN.');
                                return false;
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Fixed Non-Editable App Footer */}
            <footer className="py-6 pb-20 md:pb-8 text-center border-t border-slate-900 mt-10 select-none">
                <p className="text-[11px] text-slate-600 font-mono tracking-wider">
                    Rinset 2026 by tijnara
                </p>
            </footer>
        </div>
    );
}